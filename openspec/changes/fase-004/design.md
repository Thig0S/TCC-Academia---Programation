# Design

> Complemento aprovado durante apply em 14/11/2026: TDD 1.7, DEC-016 refinada;
> PRD 1.3 inalterado. Apply autorizado, 9/21 tarefas concluídas. As afirmações de
> ausência de implementação/autorização abaixo pertencem ao planejamento original.
> O adaptador de preparação definido nesta revisão ainda aguarda implementação.

## Context

Motivação e escopo estão em `proposal.md`. Este desenho aplica PRD 1.3 e TDD 1.6,
especialmente DEC-004/005/008/011/015/016, às três capacidades novas desta Change.
É planejamento: não há código financeiro implementado nem autorização de apply.

Inspeção local de 14/11/2026:
- `frontend/src/app/app.ts` já injeta tema e gerencia foco/navegação; `app.config.ts`
  registra Router, sem inicializador ou fonte financeira.
- `nucleo/configuracao/servico-tema.ts` demonstra o padrão raiz com signal privado;
  seu teste usa RouterTestingHarness para verificar identidade entre rotas lazy.
- `reatividade.spec.ts` usa host exclusivo de teste, `computed` e `whenStable` sem ZoneJS.
- `funcionalidades/conteudo.spec.ts` exige indisponibilidade comercial sem tabelas,
  formulários ou números; essas asserções continuam corretas nesta fase.
- Manifesto fixa Angular/Router 22.2.6; não há Forms ou biblioteca de domínio.
  Scripts existentes: `format:check`, `build`, `test`, `test:e2e`; runner E2E inicia
  servidor próprio, não reutiliza processo, com dois viewports Chromium/Windows.
- PRD/TDD antigos e trechos do README ainda registram estado histórico da FASE-003.
  PRD/TDD foram conciliados nesta revisão; não inferir aceite comercial ou PR remoto.

## Goals / Non-Goals

**Goals:**
- Separar cálculos puros de gerenciamento da sessão e permitir observação consistente
  de cadastro/recebimento por comandos internos, sem depender de páginas ou formulários.
- Tornar lote, entrada, seed e resumos verificáveis em centavos e datas civis.
- Preservar contrato visível da FASE-003 e preparar integrações das FASE-005/006/007.

**Non-Goals:**
- Não implementar edição, busca, filtros ou validação completa de CPF/telefone.
- Não introduzir interface comercial, modal, Forms, rotas, endpoint de testes, storage,
  backend, persistência, biblioteca ou upgrade. Não medir nem prometer desempenho.
- Não declarar CA de interação concluído apenas com teste de serviço ou host de teste.

## Decisions

### 1. Fronteiras de arquivos e dependências

Seguir TDD/DEC-003: funções e modelos do domínio não importam Angular, Router ou DOM;
o serviço importa esses contratos, nunca páginas. Criar somente arquivos consumidos.
Árvore proposta, toda a criação sujeita a apply posterior:

```text
frontend/src/app/
  nucleo/demonstracao/
    demonstracao.modelos.ts
    referencia-demonstracao.ts
    dados-demonstrativos.ts
    preparador-recebimento.ts
    servico-demonstracao.ts
  funcionalidades/vendas/
    venda.modelos.ts
    venda.validacoes.ts
    venda.calculos.ts
    dinheiro.ts
    data-civil.ts
  funcionalidades/parcelas/
    parcela.modelos.ts
    parcela.calculos.ts
    pagamento.modelos.ts
    pagamento.validacoes.ts
  app.ts                     (somente inicializacao do nucleo)
```

Testes `*.spec.ts` ficam junto aos arquivos. Dinheiro e datas começam junto ao domínio
consumidor; não criar uma biblioteca compartilhada ou camadas globais sem necessidade.
Rejeitada uma store externa: Signals e funções pequenas atendem ao volume demonstrativo
sem mudar dependências. Tipos e mensagens próprios permanecem em português.

### 2. Agregado e relacionamentos — TDD/DEC-015

Um agregado de sessão contém referência, vendas e contador local de IDs. Cada venda
contém seus dados de cliente, data, total, entrada opcional, parcelas e recebimentos.
Cliente não é cadastro mestre. Entrada ausente é `null`; quando presente tem valor,
data igual à venda e forma aceita. Não representar recebimento zero como entrada.

Parcelas contêm ID, número, valor e vencimento, não saldo pago editável. Um recebimento
contém ID, data/forma comuns, total e lista não vazia de alocações de parcelas da venda.
Cada parcela é alocada zero ou uma vez e por seu valor integral. Identificadores serão
strings estáveis alocadas por contador monotônico dentro da sessão, sem depender de
nome ou índice da lista; o contador avança somente no agregado aceito. IDs iniciais
ocupam um namespace ou sequência reservada para não colidir com cadastros posteriores.
Não são IDs globais, esquema SQL ou contrato para futura API.

Alternativas rejeitadas: copiar metadados em um pagamento independente por parcela
perderia a unidade do lote; guardar apenas total sem alocações perderia a conferência.
Não duplicar data/forma na parcela: a consulta deriva do recebimento associado.

### 3. Dinheiro, calendário e classificações — PRD/RN-011 a RN-017

Dinheiro entra no comando como centavos inteiros seguros. Soma, subtração e resultados
intermediários são verificados, inclusive totais do conjunto antes da publicação.
O utilitário textual adota contrato técnico estrito pt-BR: dígitos inteiros sem grupo,
ou decimal com vírgula de uma/duas casas, permitindo pontos de milhar somente com
vírgula decimal e agrupamento correto. `1234`, `1234,5` e `1.234,56` são válidos;
`1.234`, `1.23`, expoentes, sinais, símbolos monetários e texto ambíguo são rejeitados.
Espaços externos podem ser removidos. Esse utilitário não define máscara de formulário.
Construir centavos pela parte inteira/fracionária textual, sem arredondar float.
Exibir BRL somente na apresentação; testes de parse incluem extremos seguros.

Datas são strings civis `AAAA-MM-DD` validadas com calendário gregoriano 0001–9999;
apresentação `DD/MM/AAAA`. Não converter datas civis em instantes UTC nem somar horas.
Para parcelas, calcular ano/mês pela posição desde o mês original e limitar dia ao
último do mês-alvo. Validar último mês e limites antes de alocar arrays grandes.
Testar 1900 não bissexto, 2000 bissexto e 31 de janeiro nos dois tipos de ano.

Centavos residuais, classificações e limites seguem as specs, sem policy alternativa.
`Paga` é derivada da alocação; venda usa a precedência aprovada. Próximo vencimento
é o menor vencimento pendente, mesmo atrasado; `null` se inexistente. Um mapa derivado
de alocações pode evitar varreduras repetidas, sem tornar projeções fonte financeira.

### 4. Comandos e transação local

Contratos internos propostos: `cadastrarVenda` e `registrarPagamento`; consultas por ID,
projeções de abertas/quitadas e resumos por referência ou intervalo civil inclusivo.
Não incluir `editarVenda` enquanto PRD/PEN-008 permanecer aberta. Cadastro valida
presença de nome/CPF/telefone e descrição opcional, mas não checksum, máscara ou
unicidade presumidos. A FASE-006 deverá resolver a identificação antes de expor envio.

```text
Comando + estado atual
          |
          v
Validar entrada, elegibilidade, IDs e regras
          |
          v
Preparar copia completa + alocacoes + IDs
          |
          v
Validar invariantes e projecoes seguras
          |
          v
Congelar agregado e publicar uma vez

Qualquer falha antes de publicar --> resultado sem sucesso, estado anterior intacto
```

No lote, normalizar a seleção por número, rejeitar duplicatas e comparar o conjunto
exatamente com o prefixo de pendentes de mesmo tamanho. A normalização não preenche
lacunas. Revalidar esse prefixo no instante do comando; nunca trocar uma seleção antiga
pelas próximas parcelas disponíveis. Um lote repetido inclui parcelas já pagas e é
rejeitado, sem exigir infraestrutura de idempotência futura.

Data deve estar no intervalo venda–referência; não impor sequência cronológica entre
as datas de lotes distintos sem decisão de produto. Uma única data/forma é gravada
no recebimento. Total pago soma entrada e recebimentos, nunca recebimentos e suas
alocações juntos. Saldo deve coincidir com a soma pendente antes de aceitar o agregado.

Resultado é união discriminada: sucesso, validação, inexistência, inelegibilidade,
falha inesperada. Erros trazem código estável e mensagem em português sem dados pessoais.
Não introduzir Promise, atraso ou rede fictícia em operação síncrona. Preparação sem
commit e cancelamento não chamam a mutação. Falhas inesperadas são testadas por doubles
tipados da fronteira de preparação em TestBed, não por mock de exportação de módulo
nem por controles de falha na interface.

**Refinamento conforme TDD 1.7 / DEC-016:** `prepararPagamento` continua pura, sem
importar Angular, recebendo operações específicas de alocar uma parcela e validar
o conjunto final. As operações padrão chamam as funções puras existentes; o seed
pode usar esse caminho diretamente. `PreparadorRecebimento` é um serviço raiz sem
estado que fornece essas operações e delega a preparação pura. O serviço da sessão
injeta esse adaptador, mas continua sendo o único responsável pela publicação e IDs.
O adaptador não mantém estado, relógio, flags de falha ou infraestrutura genérica.

O runner instalado não suporta mocks de imports relativos (`build-options.js` de
`@angular/build` 22.2.6); `vi.spyOn` de exportação compilada falhou com propriedade
não redefinível. Não mudar runner, versões ou caminhos para contornar a restrição.
Testes TestBed substituirão métodos/instância do adaptador por doubles que lançam
na alocação posterior ou validação final. Comparar snapshots completos e comprovar
nova tentativa válida; ao integrar a sessão, conferir contador/histórico/publicação.
Todos os cenários permanecem obrigatórios; a falha do mock anterior não os comprova.

### 5. Estado imutável e inicialização — TDD/DEC-016

`ServicoDemonstracao` usa `providedIn: 'root'`, signal privado e `computed` puros.
Tipos readonly não bastam: copiar as entradas e congelar recursivamente os objetos e
arrays próprios antes de expor agregado e projeções. Testar tentativas de mutação por
referência; não supor que `asReadonly()` faz congelamento profundo.

Um token interno de referência civil, com factory local, captura o relógio somente
quando a instância raiz é criada. `App` injeta e inicializa o núcleo na abertura, sem
mudar HTML ou foco. Escolha em vez de instanciar na primeira consulta comercial: serviços
raiz são lazy e isso capturaria o dia errado se o app atravessasse a meia-noite antes
do primeiro acesso. Não fornecer o serviço novamente em páginas ou componentes lazy.
Testes substituem o token por data explícita; nova aplicação/injetor cria estado novo.

Seed é fábrica pura de 12 vendas a partir da referência, com cenários de venda atual
e histórica, pagos em sequência e meses/datas válidos. Usa as mesmas funções e não
contém dados copiados de imagens ou entrevistas. Identificação tem marcadores claros
de demonstração; CPF/telefone não terão checksum arbitrariamente exigido nesta etapa.
Datas são construídas por calendário e não por número fixo de dias para simular meses.
Fixtures vazias/subconjuntos existem somente nas suítes, sem botão de reset público.

### 6. Projeções e períodos

Projeções leem o mesmo agregado. Resumos globais não recebem termos de busca ou filtros
de listas. Consulta por período recebe início/fim explícitos, valida ordem e inclui as
bordas; contagem de vendas usa data da venda, recebimentos usam sua própria data e
entrada usa data da venda. Mês atual é mês civil da referência, não últimos 30 dias.
Expor totais, listas necessárias e ausência distinta de coleção vazia, sem implementar
gráfico, ranking, configuração de intervalo ou filtros visuais não aprovados.

### 7. Verificação e rastreabilidade

| Contrato | Verificação planejada | Rastreabilidade |
| --- | --- | --- |
| Centavos e entrada | Soma exata, zero/negativo/overflow, distribuição e contagem paga | PRD/CA-008/009; dominio-vendas |
| Datas e situações | Fusos, bordas 0/+7/+8, fevereiro e dia-base | PRD/CA-020; dominio-vendas |
| Lotes | Uma/várias parcelas, antecipação, salto, IDs repetidos, valor errado e seleção obsoleta | PRD/CA-011/013/024; recebimentos-parcelas |
| Atomicidade | Snapshot anterior igual após validação/falha controlada; uma versão no sucesso | PRD/CA-017/024; recebimentos-parcelas e estado-demonstrativo |
| Resumos | Entrada + lote, bordas do mês, quitadas incluídas, zero/vazio, intervalo inválido | PRD/CA-014/025; dominio-vendas |
| Sessão | Referência injetada, meia-noite, nova aplicação/injetor e seed não compartilhado | PRD/CA-021/025; estado-demonstrativo |
| Integração | RouterTestingHarness preserva instância/mutações; host de teste zoneless observa `computed` | TDD/DEC-008/016; estado-demonstrativo |
| UI preservada | Testes existentes de conteúdo, navegação/tema e E2E sem rede/storage | Specs principais preservadas |

Comandos já existentes, a executar somente no apply em `frontend/`: `npm.cmd ci`,
`npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false`,
`npm.cmd run test:e2e`. Testes de funções cobrem formatos civis em processos com fusos
distintos usando variável `TZ` antes da inicialização do runner; registrar o fuso efetivo,
sem alegar teste de fusos se o ambiente não aplicar a variável. Não criar endpoint ou
expor serviço global no navegador para forçar recebimento via E2E nesta fase.

## Risks / Trade-offs

- [Dupla contagem de lote/entrada] → Invariantes em centavos e fixture de reconciliação
  com entrada, parcelas e meses distintos; alocações não são recebimentos adicionais.
- [Regressão de inicialização/foco] → Integração mínima em App e preservação integral dos
  testes de navegação, conteúdo e tema; nenhum HTML comercial.
- [Dados falsos confundidos com reais] → Aviso existente, marcadores sintéticos, sem
  transmissão, cópia de fontes pessoais ou alegação de validade de CPF.
- [Limites técnicos tratados como regra da ótica] → Centavos seguros e calendário
  representável documentados como contrato técnico; sem teto comercial presumido.
- [Volume arbitrário de parcelas] → Validar alcance do calendário antes de alocar;
  testes não precisam materializar entradas inválidas gigantes. Desempenho com volume
  operacional e limites de UX não são comprovados pelo seed de 12 vendas.
- [Readonly superficial ou seed compartilhado] → Cópias defensivas, congelamento e
  testes contra mutação externa e isolamento entre novas aplicações.
- [E2E passa sem validar o domínio] → Evidências separadas: regras em funções/serviço,
  navegação/tema no navegador; a UI de negócios aguarda FASE-005/006.
- [Budget de build já próximo do aviso] → Medir no apply sem aumentar limites ou alterar
  versões silenciosamente; registrar qualquer warning e investigar regressão real.

## Migration Plan

Não há dados persistidos ou migração de banco. O apply adicionará funções e modelos,
recebimentos, fonte e seed, depois conectará a inicialização sem expor novas telas.
Commits serão por funcionalidade coerente, com testes e evidências correspondentes;
todos integrarão um único PR somente após concluir a Change completa. Planejamento
isolado não gera PR antecipado. Merge exige autorização explícita.

Em caso de problema durante apply, interromper a tarefa e preservar trabalho alheio;
corrigir na mesma feature branch, sem reset amplo, descarte ou rollback automático.
Como só há memória, recarga descarta alterações da sessão; isso não é recuperação
de dados operacionais. Não sincronizar specs principais nem arquivar no planejamento.
