# Tasks

Rastreabilidade: PRD/FON-041/RF-024–026/CA-049–052 → TDD/DEC-038 →
proposal → `specs/persistencia-vendas/spec.md` → design/D1–D6 → SQL-01–05.
Apply autorizado. SQL-01/1.1–1.3 e SQL-02/2.1–2.2 estão concluídos; itens restantes seguem a ordem abaixo.
Não há decisão de produto bloqueante. Verificar segurança/disponibilidade dos pacotes
antes de implementar código dependente; se precisar alterar baseline, revisar
PRD/TDD/SDD primeiro.

Usar `feature/fase-003-persistencia-sqlite`. Cada funcionalidade coerente deve levar
testes, README e atualização de tarefas no próprio commit em português, após suas
verificações. Planejamento independente pode ter commit próprio. Um único PR apenas
após todo o escopo aplicado; nenhum PR antecipado ou merge implícito. Builds/testes
sequenciais na mesma saída. Fixtures sempre sintéticas e arquivos próprios.

## 1. SQL-01 — Contratos, dependências e schema

- [x] 1.1 Confirmar SDK 10.0.404/runtime 10.0.15/MSTest 4.5.3 conforme DEC-036 e revisar metadados/licenças/segurança de EF Core Sqlite/Design e dotnet-ef 10.0.15 e transitivas/nativas. Fixar pacotes apenas na Infraestrutura, Design privado e ferramenta local sob backend; remover a referência Api → Infraestrutura para que EF/SQLite não transitem ao host técnico. Gerar lockfiles e comprovar restore bloqueado, grafo da API sem dependência de persistência e auditoria sem vulnerabilidades conhecidas não tratadas. Registrar fontes, versões efetivas, comandos e limitações em backend/README.md; não instalar MediatR, FluentResults ou ferramenta global.
- [x] 1.2 Criar contrato de armazenamento, snapshot imutável/revisão e resultados tipados em Aplicacao/Persistencia, sem HTTP/EF e sem handlers. Cobrir sucesso/falha sem valor na falha, códigos de DEC-038 e isolamento do snapshot em MSTest, com referência direta a Aplicacao quando necessária. Documentar assinatura e semântica de revisão no README; verificar build e testes direcionados.
- [x] 1.3 Criar modelos de linha, VendasDbContext/configurações e migration inicial/ModelSnapshot em Infraestrutura/Persistencia/Sqlite conforme D2/DEC-038. Incluir registro global de IDs, ordens, dinheiro INTEGER, datas TEXT, enums, cliente por venda, FKs compostas e exclusão restrita. Adicionar factory design-time sem iniciar API ou criar banco ao gerar migration. Conferir ausência de mudança pendente entre modelo/migration e inspecionar schema gerado; MSTest em arquivo temporário comprova FKs, colisões entre tipos, ordens únicas, CHECK monetário e CPF repetido permitido. Documentar modelo e comandos reais de scaffolding no README.

## 2. SQL-02 — Preparação explícita e ciclo de arquivo

- [x] 2.1 Implementar inicializador interno com caminho absoluto/pai existente e migrations explícitas, sem EnsureCreated/seed/CLI e sem chamada no host. MSTest comprova criação em caminho novo, revisão zero, inicialização repetida preservando dados, caminho relativo/pai ausente recusados e banco alheio/schema futuro desconhecido intocados. Documentar operação, códigos e exemplos com caminhos sintéticos no README.
- [x] 2.2 Implementar abertura por operação com foreign_keys, timeout finito de 5 s e modo que não crie arquivo na carga/escrita; conferir schema atual antes do uso. Testar arquivo ausente sem criação, arquivo ilegível/incompatível, bloqueio conhecido e liberação das conexões. Verificar que preparar/testar banco não altera Program.cs nem contrato health; documentar limites de acesso, lock de migration e ausência de recuperação automática.

## 3. SQL-03 — Reidratação integral e fidelidade

- [x] 3.1 Implementar mapeador/leitura transacional sem tracking e com ordenação persistida; usar fábricas de valores/cliente, Venda.Reconstruir e ConjuntoVendas.Criar antes de entregar snapshot. Preparar fixtures por SQL de teste usando a migration, sem depender da escrita ainda não implementada. MSTest compara todos os campos, revisão, coleção vazia, mesma identificação em duas vendas, datas civis extremas válidas, centavos extremos, descrição nula e observação Unicode. Não normalizar dados inválidos; registrar oráculos SQL-REP-01 e contrato de carga no README.
- [x] 3.2 Cobrir SQL-HIS-01/SQL-COR-01/SQL-ORD-01 em arquivos reais: entrada 10.000 em base 20.000/2; lote sintético; Individual base 10.000 corrigido 11.000→10.500 e data em outro mês; ordem de histórico não determinada pela data. Conferir IDs/alocações/origens, recebido/saldo/acréscimo, universos de status e soma mensal/diária por valores explícitos. Executar testes direcionados e documentar fixtures/resultados sintéticos no README.
- [x] 3.3 Implementar/testar rejeição integral de dados persistidos inválidos: SQL-HIS-02 com alocação 9.999 e 10.001 contra entrada recebida/base 10.000, sem snapshot parcial; após cada falha restaurar explicitamente fixture válida e reler com nova conexão. Acrescentar data/enum/identificação/ordem/vínculo/registro de IDs inválidos e soma global insegura, inclusive em Inativas/Prejuízo. Quando constraint impedir fixture inválida, comprovar a rejeição pela constraint e usar adulteração controlada de teste apenas para provar a defesa na carga. Verificar ausência de reparo/omissão e registrar rastreabilidade HIS-005–007 → SQL-HIS-02 no README.

## 4. SQL-04 — Escrita atômica, revisão e preservação

- [x] 4.1 Implementar gravação do conjunto validado em transação de escrita não diferida, conferindo integridade atual, revisão esperada e limite da revisão; atualizar token condicionalmente e persistir todas as linhas no mesmo commit. Reconciliar por ID sem apagar/recriar toda a base, evitando colisões temporárias de ordens. MSTest fecha/reabre arquivo após salvar e confere round-trip completo de 3.1/3.2, revisão +1 e snapshot idêntico com revisão atual sem duplicação. Documentar garantias/custo do snapshot no README.
- [x] 4.2 Proteger vendas existentes e histórico: recusar omissão de raiz, remoção de parcela/recebimento, alteração de contrato-base/entrada/lote e perda de identidade/alocação Individual. Testar cada recusa sem mudança de dados/revisão e sucessos por operações de cliente/status/baixa/correção do domínio, preservando outras vendas. Testar candidato com IDs globais colidentes ou overflow sem gravar, usando coleção candidata validável que permita informar falha, sem burlar encapsulamento do domínio. Atualizar README e executar regressões de armazenamento.
- [x] 4.3 Cobrir dois consumidores/conexões na mesma revisão com sincronização determinística: no máximo um commit, revisão obsoleta recusa e recarga mostra versão íntegra. Testar leitura consistente durante escrita, timeout de banco ocupado sem auto-retry e limite long.MaxValue sem overflow. Executar casos concorrentes com arquivo isolado e registrar resultados, sem alegar concorrência operacional homologada.
- [x] 4.4 Testar rollback após primeira alteração e antes do commit por composição/interceptor exclusivo de teste; nova conexão deve observar estado/revisão anteriores e nova operação válida deve confirmar. Cobrir token previamente cancelado, cancelamento observado antes do commit, token tardio após commit confirmado, exceção inesperada propagada e confirmação indeterminada sem retry/alegação falsa de rollback. Testar mensagens sem SQL/CPF/telefone/caminho pessoal e sensitive-data logging desligado. Documentar códigos/limites no README e executar toda a suíte de persistência.

## 5. SQL-05 — Verificação integrada e fechamento de evidências

- [x] 5.1 Em backend, executar sequencialmente tool restore, restore da solução em modo bloqueado, build Release sem restore, dotnet test --solution VendasEmAberto.slnx -c Release --no-build e dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore. Confirmar descoberta não vazia dos testes de domínio/técnicos/SQLite e ausência de regressão; registrar comandos exatos, versões, contagens, códigos de saída e auditoria de dependências. Conferir ignore limitado a artefatos locais do backend, ausência de bancos/dados reais no diff e limpeza somente de temporários próprios.
- [x] 5.2 Iniciar DLL Release como processo real sem banco preparado, conferir listener apenas loopback, /health 200 text/plain Healthy e /vendas 404, sem criação/acesso a banco; conferir que o grafo da API continua sem Infraestrutura/EF/SQLite. Encerrar apenas o processo iniciado e conferir porta liberada. Com API desligada, executar em frontend npm.cmd test -- --watch=false e npm.cmd run build. Registrar evidências novas no README; E2E/visual/zoom não executados por não haver UI alterada, sem alegar homologação operacional.
- [x] 5.3 Auditar cada requisito/cenário da delta contra testes e CA-049–052, com matriz final no README; verificar que todos os resultados registrados são execuções reais e que não há handlers/endpoints/Angular/importação/dados reais/sync ou archive alheios. Executar openspec validate fase-003-persistencia-sqlite --strict e git diff --check; revisar diff e marcar tarefas somente com evidências. Atualizar estado de execução no PRD/TDD e Change ao concluir o apply, preservando a distinção entre plano original e entrega.

## Workflow follow-up

- SQL-01/1.1: SDK/runtime/MSTest confirmados; EF/Design/dotnet-ef 10.0.15 e
  SQLitePCLRaw 2.1.14 fixados; lockfiles atualizados; restore bloqueado, tool restore,
  build Release e auditoria NuGet passaram sem vulneráveis reportados. API não tem
  referência de projeto a Infraestrutura nem dependência EF/SQLite. Licenças/fontes,
  comandos e limitações registrados no `backend/README.md`.
- SQL-01/1.2: contrato, snapshot/revisão, resultados e códigos estáveis criados em
  Aplicacao, sem HTTP/EF; seis testes direcionados passaram e o build Release da
  solução passou sem avisos/erros. README documenta assinatura e semântica; esta
  entrega isolada não incluía schema nem acesso a banco.
- SQL-01/1.3: modelos de linha, contexto/configurações, factory design-time, migration
  inicial e snapshot criados. Restore bloqueado, build Release (zero avisos/erros),
  cinco testes temporários de schema/constraints, format verify, `has-pending-model-
  changes` sem alterações e `openspec validate --strict` passaram. Scaffolding exigiu
  caminho absoluto e não criou o arquivo de design-time; detalhes e comandos em
  `backend/README.md`. O inicializador foi entregue em SQL-02/2.1 e o leitor interno
  em SQL-03/3.1; a gravação permanece pendente.
- SQL-02/2.1: inicializador interno validou caminho absoluto/pai, arquivo vazio ou
  schema com histórico conhecido e migration futura/alheia sem alterações. Cria o
  schema por `MigrateAsync` e insere a linha técnica de revisão zero sem seed de vendas;
  repetição preserva revisão. Seis testes direcionados e os cinco testes de schema
  passaram. Build Release da solução (zero avisos/erros), `dotnet format --verify-no-changes`,
  validação estrita e `git diff --check` passaram após a implementação. API e contrato
  de health não foram alterados. Naquele marco, carga/gravação ainda permaneciam
  pendentes; leitura validada foi concluída em SQL-03/3.1.
- SQL-02/2.2: `AbridorVendasSqlite` abre sessão descartável apenas para arquivo
  existente, em `ReadWrite`, foreign_keys habilitado e timeout de 5 s. Valida migration
  completa e modelo físico (colunas, PK, índices, CHECKs e FKs), linha de revisão e
  lock ativo; não cria banco, migra, limpa lock nem faz retry. Seis testes direcionados
  passaram para ausência, arquivo incompatível sem alteração, schema corrente/adulterado,
  lock preservado e liberação por descarte. Reexecutados os seis testes de 2.1 e cinco
  de schema. Build Release (zero avisos/erros) e format verify passaram; diff confirma
  que `Program.cs`/health não foram alterados. Leitura validada foi entregue em
  SQL-03/3.1; gravação permanece pendente.
- SQL-03/3.1: `LeitorVendasSqlite` carrega estado e linhas em transação, com
  `AsNoTracking` e revisão na mesma transação. Confere sequência de ordens e registro
  global de IDs/tipos; reconstrói dinheiro, cliente sem normalização, vendas e conjunto
  pelas fábricas do domínio antes de construir o snapshot. Quatro fixtures SQL
  sintéticas cobrem conjunto vazio/revisão, todos os campos, ordem, duas vendas com CPF
  repetido, descrição nula, nota Unicode, datas extremas e centavos no limite.
  `LeitorVendasSqliteTests`: 4/4; suíte `FullyQualifiedName~Persistencia`: 21/21;
  build Release sem avisos/erros. README registra SQL-REP-01 e limita que o leitor ainda
  não implementa `IArmazenamentoVendas`.
- SQL-03/3.2: fixture SQL adiciona entrada 10.000 em venda-base 20.000/2, lote de
  20.000 alocado em duas parcelas, estado final de Individual corrigido para 10.500
  (+500) em março e outro Individual de 11.000 (+1.000) em fevereiro. A ordem guardada
  mantém o lote de 20/03 antes do pagamento de 15/02. Recebimentos adicionais verificam
  Inativa e Prejuízo. Projeções conferem base/efetivo/recebido/saldo e quatro universos;
  relatório de março fecha 40.500 (10.500 + 10.000 + 20.000) e a soma diária reconcilia;
  fevereiro fecha 11.000 e não contém o ID corrigido. Teste direcionado: 1/1; suíte de
  persistência: 22/22; build Release sem avisos/erros. Não há escrita de produção; a
  fixture representa o estado final, sem persistir a versão antiga da correção.
- SQL-03/3.3: 16 adulterações de leitura em fixtures descartáveis (entrada 9.999/10.001,
  data impossível, forma/status desconhecidos, ID vazio/tipo incorreto/ausente, lacunas
  nas três ordens, alocação cruzada, observação nula, total-base zero e soma global
  insegura separadamente em Inativa e Prejuízo). Para cada adulteração o leitor retorna
  `dados-persistidos-invalidos`; SQL confirma que não houve reparo/omissão; a fixture é
  restaurada explicitamente e relida por nova conexão com três vendas e revisão zero.
  CHECK/FK e PK globais também são exercitados: constraints recusam primeiro e alterações
  de defesa usam apenas PRAGMA local de teste. Teste direcionado: 17/17 contando a
  colisão de ID; suíte `FullyQualifiedName~Persistencia`: 39/39; build Release (zero
  avisos/erros). README registra a matriz, os comandos e HIS-005–007 → SQL-HIS-02.
- SQL-04/4.1: implementação interna do contrato delega a `GravadorVendasSqlite`; abre
  transação SQLite não diferida, lê/valida estado atual na mesma transação e faz revisão
  condicional + upserts por ID para raízes/filhos, sem exclusões. Ordens antigas passam
  por faixa temporária dentro da transação para respeitar índices únicos. Teste com
  fixture de 4 vendas cobre entrada, lote, correção Individual/data, ordem, Inativa e
  Prejuízo; grava em banco preparado vazio, fecha/reabre, compara profundamente todos
  os campos e salva o mesmo snapshot na revisão atual: revisão 1→2, sem linhas duplicadas.
  Teste focado: 1/1; suíte `FullyQualifiedName~Persistencia`: 40/40; build Release (zero
  avisos/erros); `dotnet format --verify-no-changes` passou. A primeira execução
  identificou contenção ao validar por uma segunda conexão; o leitor foi extraído para
  aceitar o contexto/transação corrente e a execução repetida passou. README registra
  garantias e custo proporcional à leitura e reconciliação do snapshot completo.
- SQL-04/4.2: preserva data/base e toda a sequência de parcelas por ID/número/valor/
  vencimento; recibos existentes permanecem no prefixo e ordem originais. Entrada e
  lote são imutáveis incluindo metadados/alocações; Individual conserva ID, origem e
  parcela, permitindo campos corrigíveis pela regra do domínio. Novos recebimentos em
  venda existente só podem ser Individual. Testes rejeitam omissão de raiz, remoção ou
  troca de parcela, base alterada, remoção de recebimento, reescrita de entrada/lote,
  ID/alocação Individual trocados, colisão global e overflow; cada recusa mantém revisão
  e snapshot. Sucesso exercita edição de cliente, status, baixa e correção Individual,
  preserva venda não alterada e as demais raízes. A classe do gravador passou 6/6
  (um teste de round-trip de 4.1 e cinco novos testes de 4.2);
  suíte `FullyQualifiedName~Persistencia`: 45/45; build Release sem avisos/erros e format
  verify passaram. Detalhes e limitações permanecem no README.
- SQL-04/4.3: dois consumidores aguardam barreira determinística e salvam candidatos
  diferentes com revisão 0; exatamente um retorna sucesso, o outro conflito, revisão
  final é 1 e o conjunto relido corresponde integralmente ao vencedor. Repetição com
  revisão antiga conflita sem alterar estado. Leitura usa transação deferred: sob writer
  imediato com cliente/revisão alterados mas não confirmados, lê conjunto/revisão
  anteriores; após commit, lê ambos os novos. Timeout de writer concorrente retorna
  `banco-ocupado` em 5,248 s (limite configurado 5 s), sem nova tentativa; revisão e
  dados permanecem iguais. `long.MaxValue` retorna `limite-revisao-excedido` sem overflow
  ou alteração. Os 4 testes novos passam; classe do gravador 10/10, suíte de persistência
  49/49, build Release sem avisos/erros e format verify aprovados. São testes locais em
  arquivos temporários, não homologação de concorrência operacional.
- SQL-04/4.4: injetor interno de teste falha após a atualização inicial da revisão,
  antes do commit; exceção inesperada propaga, a conexão nova observa snapshot/revisão
  originais e uma gravação posterior válida confirma. Token pré-cancelado e cancelamento
  após essa primeira alteração propagam `OperationCanceledException` e deixam estado
  original. Interceptor confirma o commit e cancela o token tardiamente: retorno mantém
  sucesso/revisão confirmada. Interceptor também confirma e simula perda do ACK: retorno
  é `confirmacao-indeterminada`, sem retry (uma chamada), e recarga encontra o snapshot
  salvo, não falsa alegação de rollback. Mensagens de `banco-ocupado` e confirmação
  indeterminada não contêm SQL, CPF, telefone ou caminho; opções EF mantêm sensitive-data
  logging desligado. Cinco métodos novos: classe do gravador 15/15; suíte de persistência
  54/54; build Release sem avisos/erros e format verify passaram. Fixtures em arquivos
  temporários. O seam é interno e não integra o contrato de Aplicacao/API.
- SQL-05/5.1: no diretório `backend/`, `dotnet tool restore` e
  `dotnet tool run dotnet-ef --version` passaram (EF CLI 10.0.15); `dotnet restore
  VendasEmAberto.slnx --locked-mode` passou; build Release `--no-restore` passou com
  zero avisos/erros; `dotnet test --solution VendasEmAberto.slnx -c Release --no-build`
  passou 203/203 (62 integração e 141 unitários); `dotnet format VendasEmAberto.slnx
  --verify-no-changes --no-restore` passou. Descoberta explícita listou 203 testes.
  `dotnet list VendasEmAberto.slnx package --vulnerable --include-transitive` não
  reportou pacote vulnerável. SDK 10.0.404/runtime 10.0.15; API referencia somente
  Aplicacao e não tem dependências EF/SQLite no grafo. `.gitignore` do backend limita-se
  a `bin`, `obj`, `TestResults` e arquivos locais de usuário/lock temporário; não há
  arquivo SQLite versionado nem dado operacional no diff.
- SQL-05/5.2: smoke da DLL Release iniciou apenas o processo próprio em
  `127.0.0.1:59617`; `/health` respondeu 200 `text/plain`/`Healthy`, `/vendas` 404,
  nenhum arquivo SQLite surgiu no diretório temporário. Processo encerrado e porta
  liberada. No frontend, `npm ci` no diretório original falhou com EPERM ao tentar
  remover o binário Lightning CSS em uso. Dois `ng serve` já existentes foram mantidos
  conforme decisão do usuário; não se repetiu comando nesse
  `node_modules`. Em cópia temporária do frontend e lockfile, excluindo `node_modules`
  e `.angular`, `npm ci` passou (301 pacotes adicionados, zero vulnerabilidades),
  `npm.cmd test -- --watch=false` passou 33 arquivos/430 testes e `npm.cmd run build`
  concluiu. Ambiente: Node v24.21.0/npm 11.19.0; a API estava desligada durante a
  validação frontend. E2E/visual/zoom não executados porque não houve alteração de UI.
- SQL-05/5.3: matriz CA-049–052 e rastreabilidade RF-024–026 → DEC-038 → delta OpenSpec
  → testes/evidências registradas no README. Revisão confirmou ausência de endpoints,
  handlers, conexão API/SQLite, alterações Angular, dados reais ou sync/archive de
  outras Changes. `openspec validate fase-003-persistencia-sqlite --strict` e
  `git diff --check` passaram; evidências finais revisadas. A limitação do
  `node_modules` original e verificações não executadas estão explícitas; sem alegação
  de homologação operacional.
- `openspec validate --strict` passou após a revisão de cada etapa.
- Após conclusão integral, publicar a mesma feature
  branch e abrir PR único para main com `.github/pull_request_template.md`, referências
  PRD/FON-041/RF-024–026/CA-049–052, TDD/DEC-038, esta Change e verificações/limitações.
- Não abrir PR apenas pelo planejamento. Merge exige autorização explícita e revisão
  exigida; não fazer push direto na main.
- Sync/archive somente em etapa solicitada. Não sincronizar ou arquivar Changes
  anteriores como requisito artificial para implementar esta persistência.
