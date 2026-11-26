# Design

## Context

Motivação em `proposal.md`; requisitos em PRD/FON-041/RF-024–026/CA-049–052.
TDD/DEC-038 centraliza arquitetura, schema, versões, resultados, fluxos e roadmap
SQL-01–05; este desenho detalha como verificá-los na Change. Desenho confirmado
no Harness, incluindo caminho explícito, inicializador interno e ausência de exclusão.
Apply autorizado. SQL-01/1.1 verificou versões/licenças, restore bloqueado, grafo
isolado da API, build Release e auditoria; SQL-01/1.2 implementou contrato, snapshot,
resultados e testes direcionados; SQL-01/1.3 implementou modelo relacional, contexto,
factory design-time e migration, com testes temporários de constraints; SQL-02/2.1
implementou inicializador explícito e SQL-02/2.2 abertura por operação com comparação
do schema físico; SQL-03/3.1 implementou leitura transacional sem tracking e
reidratação validada; SQL-03/3.2 cobriu entrada, lote, correção, ordem e relatórios
em fixtures SQL. Testes cobriram arquivo novo, repetição, recusa de bancos
desconhecidos/futuros, modo sem criação, lock, liberação de conexão e cenários de
leitura. A decisão de remover a referência preexistente Api → Infraestrutura foi
confirmada no Harness.

Inspeção realizada:

- `Venda.cs`: raiz imutável, construtor privado e coleções defensivas; não é entidade
  de tracking. `DadosReconstrucaoVenda.cs` fornece os dados de reidratação.
- `Venda.Reconstrucao.cs`: valida identidade, parcelamento, calendário, sequência,
  origens e somas; linha de entrada compara alocação/recebimento/base após `0280d3b`.
- `ConjuntoVendas.cs`: valida IDs entre tipos e raízes e totais de todos os status;
  não substitui validação de cada histórico. Não publica/persiste candidatos.
- Aplicacao contém contrato/snapshot/resultados sem EF; Infraestrutura tem contexto,
  entidades de linha, configurações, migration, inicializador, sessão validada e leitor
  interno. Ainda não há implementação do contrato nem gravação.
  API referencia somente Aplicacao; testes de persistência
  devem referenciar Infraestrutura diretamente quando necessária.
- `backend/README.md` e tasks da correção registram regressões e 143 testes backend
  aprovados na Change anterior; esses números não foram reexecutados nesta revisão.
  SQL-03/3.1–3.2 cobrem fixtures válidas; SQL-03/3.3 cobre falha, preservação da
  linha corrompida, restauração explícita e nova leitura, sem reabrir a Change anterior.

## Goals / Non-Goals

**Goals:** round-trip sem perda; reidratação validada; proteção do conjunto e da
revisão na mesma transação; falhas identificáveis sem entregar snapshot parcial.

**Non-Goals:** transformar persistência em serviço de negócio ou wrapper FluentResults;
mapear entidades do domínio via reflexão/setters; prometer idempotência de transporte,
durabilidade contra queda de energia ou recuperação automática de corrupção.
Exclusões funcionais completas estão na proposta e no PRD.

## Decisions

### D1 — Modelos de linha separados e contratos mínimos

Aplicar DEC-038: contrato em `Aplicacao/Persistencia/`; EF/modelos/configuração/
mapeamento/migrations em `Infraestrutura/Persistencia/Sqlite/`. A interface expõe
inicialização, carga e gravação do snapshot, caminho explícito, referência onde
necessária e CancellationToken. Salvar recebe coleção de raízes candidatas, materializada
defensivamente e validada, não um conjunto obrigatoriamente já aceito; assim pode
recusar colisão/overflow do candidato sem burlar encapsulamento. Snapshot de leitura
contém conjunto imutável e revisão long;
resultado de armazenamento discrimina sucesso/falha sem HTTP ou pacotes de aplicação.
Não duplicar `ResultadoDominio` para falhas de negócio: usar suas fábricas e
encapsular falhas de reidratação como dados persistidos inválidos; candidato inválido
é categoria distinta. Códigos e política completa estão em DEC-038.

`IArmazenamentoVendas` usa `Task` com `CancellationToken`: inicialização retorna
resultado de operação sem payload, carga retorna `SnapshotVendas`, e gravação retorna
a revisão long confirmada no commit. Snapshot é classe imutável com `ConjuntoVendas`
e revisão não negativa. `ResultadoOperacaoArmazenamento` e
`ResultadoArmazenamento<T>` distinguem sucesso/falha; `ErroArmazenamento` carrega só
código estável e mensagem segura, nunca exceção/SQL/caminho. Falha não contém valor.
Cancelamento é propagado, não convertido em erro tipado.

EF Core Sqlite/Design e dotnet-ef locais 10.0.15 fixados; Design privado. EF SQLite
declara SQLitePCLRaw >=2.1.13, então fixar SQLitePCLRaw.bundle_e_sqlite3 2.1.14 na
Infraestrutura e transitivas por lockfile. Não adicionar pacote ao Dominio ou ativar
persistência na API. Remover a referência preexistente Api → Infraestrutura, sem
alterar Program/health, para que EF/SQLite não transitem ao host técnico; testes de
persistência referenciam Infraestrutura diretamente quando necessário. Restore
bloqueado e auditoria NuGet dos seis projetos passaram sem vulneráveis reportados;
README registra licenças e limites da auditoria nativa/tool.
Alternativa de entidade compartilhada rejeitada para não contornar a fábrica;
contrato genérico de CRUD rejeitado por esconder revisão e validação do conjunto.

### D2 — Schema preserva identidade e ordem, não derivados

Usar seis tabelas da aplicação e constraints de DEC-038: EstadoArmazenamento,
Identificadores, Vendas, Parcelas, Recebimentos, Alocacoes e tabela de histórico de
migrations gerenciada pelo EF. Registro de IDs com PK TEXT BINARY garante unicidade
entre tipos; garantir Tipo correto também na leitura. FKs compostas de alocação
impedem vínculo a parcela de outra venda. Ordem de vendas/recebimentos/alocações
explícita, parcelas por Numero; unicidade local de ordens/números. Em atualização
que remapeie ordem com índice único, usar etapa intermediária não colidente dentro
da mesma transação, sem observar estado temporário fora dela.

Centavos long/INTEGER, CHECK limites seguros; datas ISO exatas como TEXT,
identificação e descrição na linha da venda; enumeração explícita; strings não
reinterpretadas como números. Não persistir referência ou projeções como saldo,
pois o consumidor fornece referência e o domínio deriva esses valores.
Alternativa de ordenar por data rejeitada: correção de pagamento pode mover datas
sem alterar a sequência de liquidação. JSON integral foi rejeitado por enfraquecer
constraints verificáveis e vínculos.

### D3 — Ciclo do arquivo explícito e schema reconhecido

Inicializador aceita caminho absoluto com pai existente e aplica migrations sem
seed, sem EnsureCreated e sem host. Carga/escrita abrem em modo que não cria arquivo,
exigem schema atual e recusam ausência/futuro/incompatibilidade. Antes de aplicar
migrations em arquivo existente, conferir se é vazio ou banco próprio com histórico
reconhecido; não inferir propriedade só pela extensão `.db`. Histórico de migrations
futuro ou tabelas alheias sem histórico são incompatíveis. Reaplicar migrations
conhecidas é idempotente e não zera revisão. Não tratar `__EFMigrationsLock` travado
como autorização para apagar lock automaticamente.

Factory design-time reutiliza modelo/provider e recebe caminho explícito; gerar
migration não deve preparar arquivo real. Sem CLI própria. Contexto/conexão por
operação, foreign_keys habilitado sempre, timeout finito de 5 s, journal DELETE
padrão. Não prometer I/O SQLite verdadeiramente assíncrono/cancelamento imediato.
Alternativa de migration no startup foi rejeitada para preservar API técnica sem I/O
de banco e permitir manutenção controlada posterior.

### D4 — Reidratar tudo antes de devolver snapshot

Ler linhas/revisão em transação consistente, sem tracking; ordenar por campos
persistidos, validar representação, reconstruir cada agregado e validar conjunto.
Sem sucesso parcial se houver erro em qualquer venda. Não normalizar linha inválida:
rejeitar identificação não canônica em vez de mascarar corrupção por normalização
das fábricas; comparar representação normalizada quando aplicável.
O mapeador não tem construtores alternativos do domínio. Leitura de histórico inválido
não altera arquivo nem contamina contexto futuro.

Oráculos de integração incluem:

| Caso | Entrada/ação | Resultado esperado |
| --- | --- | --- |
| SQL-HIS-01 | Base 20.000, duas parcelas, entrada 10.000 | Pago 10.000, saldo 10.000, 1/2 paga; mês recebe uma vez |
| SQL-HIS-02 | Adulterar alocação para 9.999/10.001 mantendo recebido 10.000 | Falha integral; restaurar explicitamente para 10.000 e reler com sucesso |
| SQL-COR-01 | Base 10.000, Individual 11.000→10.500 e nova data | Mesmo ID/vínculo; acréscimo 500; deslocamento de mês sem duplicação |
| SQL-ORD-01 | Lote + Individual com data corrigida anterior à de outro pagamento | Mesma ordem persistida, sem classificar histórico por data |
| SQL-REP-01 | Datas civis extremas válidas, dinheiro no limite, nota com Rune | Mesmos valores exatos; inválidos recusados sem arredondar |

Usar casos independentes para extremos não combináveis (por exemplo, venda em
dezembro/9999 com parcela futura seria inválida antes da persistência).

### D5 — Escrita do conjunto sob revisão global

Validar candidato antes do DML e novamente sob o estado atual consistente. Iniciar
transação SQLite não diferida antes de ler estado/revisão atual; pode ser conexão
SQLite com transação não diferida associada ao contexto EF. Token global atualizado
condicionalmente com revisão esperada, exigindo uma linha afetada. Limite long.MaxValue
recusado. A trava de escrita mais revisão protege também validações entre vendas;
rowversion nativo não existe no SQLite.

Comparar raízes atuais/candidatas: nenhum ID de venda atual pode faltar; mesmos
contratos-base, IDs/números/bases/vencimentos de parcelas e entrada/lotes protegidos.
Recebimentos existentes não podem desaparecer; Individual mantém origem, identidade
e alocação, admitindo somente campos corrigíveis. Inserir novos registros e atualizar
os existentes por ID, sem apagar/recriar toda a base. Não oferecer comandos de
exclusão ou importação. Usar parâmetros nas operações SQL pontuais de token/ordem.
Commit único inclui a revisão e todas as linhas; descartar contexto após qualquer
falha. Sem auto-retry ou merge de snapshots.

Salvar snapshot idêntico com revisão atual incrementa revisão; repetir com revisão
anterior conflita. A revisão é metadado técnico, não ID do domínio nem prova de autor.
Alternativas de token só por venda e validação fora da transação foram rejeitadas
por deixarem correr colisões/somas globais.

### D6 — Limites de falhas, cancelamento e evidência

Aplicar códigos de DEC-038; não capturar exceção inesperada como regra de negócio.
Falha conhecida de arquivo/SQLite é armazenamento, não ErroDominio/HTTP. Mensagens
sem SQL, CPF/telefone ou caminho pessoal; sensitive-data logging desligado.
Cancelamento antes de commit reverte; depois de commit confirmado não vira falsa
falha. Commit sem confirmação confiável informa `confirmacao-indeterminada`, exige
recarregar/conferir revisão e não permite retry automático. Não alegar restauração
quando não for comprovável.

Testes MSTest usam provider SQLite real e arquivo temporário por fixture; nova conexão
após fechar/reabrir, dois contextos/conexões para concorrência. Injeção de falha antes
de commit por composição/interceptor exclusivo de teste, não switch público ou rota.
Inspecionar schema/constraints por SQL parametrizado de teste. Não usar EF InMemory
ou apenas um banco `:memory:` como prova de reabertura/durabilidade.

## Risks / Trade-offs

- [Histórico aceito mas financeiramente inválido] → Fábricas e conjunto na carga;
  regressão SQL-HIS-02 derivada de HIS-005–007, sem conserto silencioso.
- [Snapshot completo custa leitura proporcional à base] → Escopo técnico explícito,
  sem meta inventada; otimização posterior não pode remover validação global.
- [Bloqueio de arquivo/commit incerto] → Timeout finito e sem retry; revisão global,
  códigos seguros e recarga explícita; não prometer exactly-once.
- [SQLite nativo vulnerável ou incompatível] → Auditoria de grafo/versões no apply
  antes de consolidar, atualizando PRD/TDD/SDD se a baseline mudar.
- [Arquivo técnico interpretado como base operacional] → Fixtures sintéticas,
  caminhos temporários e documentação de ausência de backup/criptografia/aceite.
- [Testes concorrentes conflitam em DLL] → Builds sequenciais por saída; arquivos
  isolados por fixture e limpeza apenas dos recursos criados pelo teste.

## Migration Plan

1. Revisar PRD/TDD e todos os artefatos, validar proposta e obter autorização explícita
   de apply. Concluído; SQL-01/1.1–1.3 auditaram dependências, isolaram a API e
   entregaram contrato/schema/migration inicial.
2. SQL-02/2.1: implementar inicializador explícito, reconhecimento de banco e estado
   inicial; concluído em arquivos temporários.
3. SQL-02/2.2: abrir por operação sem criação implícita, validar schema/migration,
   foreign_keys, timeout e descarte de conexão; concluído em arquivos temporários. Não
   há base anterior a converter.
4. SQL-03: leitura fiel e inválida testada; SQL-04: gravação/revisão com rollback,
   concorrência, cancelamento e preservação. Testes/documentação em cada entrega.
5. SQL-05: restore bloqueado, build Release, toda suíte MSTest, format, smoke real
   health/loopback/404 sem banco, frontend test/build com API desligada e evidências
   reais. E2E/visual/zoom não executados sem UI; não alegar homologação.
6. Commit por funcionalidade em português, usando a mesma feature branch; PR único
   com template somente após todo escopo autorizado concluído. Sem PR de planejamento
   e sem merge sem autorização. Não sincronizar/arquivar outras Changes.

Rollback desta biblioteca consiste em interromper seu consumo e reverter o código
por PR revisado; não apagar/rebaixar arquivo com dados automaticamente. Testes limpam
somente arquivos próprios. Recuperação operacional/backup exige planejamento próprio.

Fontes e resultados de consulta estão em DEC-038 e nas consultas Context7 EF Core
(SQLite, chaves compostas, CHECK constraints, DateOnly, migrations e factory), além
do NuGet 10.0.15. Restore bloqueado e auditoria ocorreram em SQL-01/1.1; migration,
`has-pending-model-changes`, build e cinco testes de schema com banco temporário
ocorreram em SQL-01/1.3. Nenhum acesso a banco operacional foi executado.
