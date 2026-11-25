# Design

## Context

Motivação e escopo em `proposal.md`; decisões centrais em TDD/DEC-037 e requisitos
em PRD/FON-040/RF-023/CA-046–048. Respostas no Harness confirmaram domínio completo,
operações imutáveis, falhas tipadas, long com limite seguro do TypeScript e DateOnly.
Este desenho traduz essas decisões em tarefas futuras, sem implementar.

### Avaliação da fase 001

| Área inspecionada | Observação | Consequência para a fase 002 |
| --- | --- | --- |
| Solução e projetos | Quatro projetos net10.0, grafo previsto e bibliotecas sem tipos de negócio | Reutilizar estrutura, sem refazer fundação |
| SDK/testes | global.json, MSTest.Sdk 4.5.3, MTP, Mvc.Testing 10.0.15 e lockfiles | Manter baseline DEC-036, sem outro runner |
| Program/configuração | Loopback explícito, validação antes do host, health e falhas genéricas | Não adicionar endpoint nem registrar domínio na API |
| Testes | Casos de porta/configuração, health, 404 e falha exclusiva de teste | Preservar; somar casos puros com referência direta a Dominio |
| Evidências | README registra 16 UnitTests + 8 IntegrationTests, smoke real e 430 testes frontend | Evidências históricas, não execuções desta revisão |
| Lacuna esperada | Não há entidade, regra financeira ou persistência | Próximo incremento é núcleo isolado; ausência não é defeito |
| Dívida documental | Preâmbulo das tasks e trechos do PRD/TDD ainda dizem somente planejado | Novo diagnóstico datado, sem modificar artefatos da Change anterior |

Não foi realizada auditoria abrangente da API nem reexecução de testes. A avaliação
é de adequação ao incremento, não certificação de produção ou segurança completa.
A configuração de erros deve continuar protegida pelos testes existentes.

**Conflitos de specs observados:** `recebimentos-parcelas` conserva requisitos
históricos de lote junto ao fluxo visual individual atual. O núcleo aceita somente
nova baixa individual e reconstrói lote sintético para consulta; não altera a UI.
`relatorios-financeiros` principal ainda exclui seletor/gráfico, mas PRD/RF-018/019,
TDD/DEC-032, Change `dashboard-relatorios` e fonte atual já contemplam período e
série diária. A fase 002 segue essas decisões posteriores para cálculo puro; não
faz sync/archive de outras Changes nem muda contratos de apresentação. A extensão
fica na capability `dominio-vendas` existente, sem duplicar seu modelo financeiro.

## Goals / Non-Goals

**Goals:** agregado sempre válido, estado protegido, resultados determinísticos,
identidade estável, validação de conjunto e paridade exata por catálogo sintético.

**Non-Goals:** DTO/JSON, HTTP, DI, handlers CQRS, repositórios, serialização de
entidades, schema de banco, leitura do XLSX, política de legado incompleto,
concorrência/distribuição, auditoria persistente ou apresentação. Não portar
serviço demonstrativo, busca/paginação ou shell Angular para o domínio.

## Decisions

### D1 — Domínio sem dependências e organização por responsabilidade

Preservar dependências de DEC-033. Produção muda apenas em
`backend/src/VendasEmAberto.Dominio/`, com `Valores/`, `Vendas/`, `Recebimentos/` e
`Projecoes/`; testes em `backend/tests/VendasEmAberto.UnitTests/Dominio/`.
UnitTests mantém referência Api dos testes técnicos e adiciona referência explícita
Dominio. Não adicionar pacotes de produção ou framework de testes.

Alternativa de implementar casos de uso/HTTP agora foi rejeitada: exigiria contratos
e licenças fora do recorte. MediatR e FluentResults continuam decisões futuras da
Aplicacao; seu adiamento não é substituição do padrão aprovado.

### D2 — Valores seguros, datas civis e identificação

Dinheiro em value object com long limitado a 9.007.199.254.740.991, checagem de
intervalo/overflow em toda operação. Não usar double ou ampliar limite por existir
long. Quantidade validada antes de converter/alocar; alcance do calendário restringe
naturalmente futuras sem teto comercial inventado. Total > 0, N ≥ 1 sem entrada,
N ≥ 2 com entrada, futuras ≤ saldo em centavos. Resto vai às primeiras futuras.

DateOnly, sem relógio/fuso. Calcular cada vencimento da base original por deslocamento
mensal, não encadear `AddMonths` sobre fevereiro já ajustado. Validar último mês
antes de materializar. Janela por diferença de dias, sem somar sete em MaxValue.
Período civil inclusivo validado; mês padrão = mês da referência explícita, escolha
mensal recebida como ano/mês válidos. Parse textual quando necessário é ISO exato,
não interpretação cultural flexível. Formatação visual fica fora.

Identificação segue `identificacao.validacoes.ts`: nome/descrição aparados, CPF
normalizado removendo ponto/espaço/hífen permitido e com verificadores, telefone
10/11 dígitos removendo espaço/parênteses/hífen, sem +55/lista de DDDs. Aceitar só
dígitos ASCII para paridade, não `\d` Unicode permissivo. Descrição vazia é ausência.
Sem limites comerciais de texto inventados ou consulta de titularidade.

Alternativa de decimal para dinheiro e DateTime para datas adicionaria conversões
sem benefício neste contrato. Fonte DateOnly consultada via Context7 em 25/11/2026:
<https://learn.microsoft.com/dotnet/standard/datetime/how-to-use-dateonly-timeonly>.

### D3 — Agregado imutável e reconstrução validada

Raiz Venda possui dados do cliente, data/base, parcelas, recebimentos/alocações e
status administrativo. IDs opacos não vazios fornecidos pelo chamador para venda,
parcelas e recebimentos, sem formato imposto ou geração aleatória. Impedir colisão
interna e global entre todos os IDs no conjunto validado.

Construtores/fábricas e operações protegem invariantes; nenhuma via pública de
setter/`with` ou coleção mutável pode montar venda inválida. Copiar entradas e
proteger coleções aninhadas; somente tipar como IReadOnlyList não resolve aliases.
Sucesso retorna novo estado; não alterar referência antiga. Preferível a mutação
seguida de rollback, que amplia caminhos de falha.

Origens explícitas Entrada, Individual e HistoricoLote, sem inferir pelo número de
alocações: lote pode ter uma. Reconstrução é fábrica validada para estado completo,
não importador nem comando de lote: conferir parcelamento-base, entrada e sequência
integral de pagamentos. Histórico em lote aceita só valor exato das bases e data/
forma comuns. Individual tem uma alocação pelo efetivo e acréscimo = efetivo − base.
Entrada vincula parcela 1 e um recebimento idêntico ao valor/data/forma informados.

### D4 — Falhas mínimas de domínio e aceitação do conjunto

Resultado de domínio mínimo com variantes sucesso/falha; sucesso contém valor e
falha contém erro tipado (categoria, código, mensagem pública e campo opcional).
Não oferecer Value em falha, Reasons ou composição de erros FluentResults.
Categorias sem referência HTTP: Validacao, Inexistencia, Conflito e RegraNegocio.
Futuro adaptador da Aplicacao poderá traduzi-las para FluentResults, não criado aqui.

| Condição | Categoria/código de domínio proposto |
| --- | --- |
| CPF/telefone | Validacao: cpf-invalido / telefone-invalido |
| Dinheiro/calendário/período | Validacao: valor-invalido / limite-financeiro-excedido / data-invalida / periodo-invalido |
| Identidade já em uso | Conflito: identificador-duplicado |
| Venda/recebimento não localizado no conjunto | Inexistencia: venda-inexistente / recebimento-inexistente |
| Parcela inexistente ou fora da primeira pendente | RegraNegocio: selecao-nao-sequencial |
| Venda não Ativa | RegraNegocio: venda-nao-ativa |
| Valor inferior à base ou nota longa | Validacao: valor-recebido-inferior-ao-base / observacao-longa-demais |
| Corrigir entrada/lote | RegraNegocio: recebimento-historico-nao-editavel |
| Recebimento de outra venda | RegraNegocio: recebimento-de-outra-venda |
| Status inválido/inelegível | Validacao: status-invalido / RegraNegocio: transicao-nao-permitida |

Códigos são contrato interno proposto para esta fase, não prometem igualdade textual
com frontend nem contrato HTTP. Testar categoria/código/campo; não decidir por
mensagem. Validar estrutura/valores de entrada antes de elegibilidade; referências
ausentes são tratadas antes de operar o alvo. Não exigir agregação de categorias
mistas. Exceção inesperada propaga, sem catch-all que finja validação.

Operações locais preparam novo agregado; um componente puro de conjunto valida
IDs/somas e só então devolve conjunto candidato aceito. Consumidor que precise da
garantia global usa essa fronteira, não publica primeiro o agregado. Não manter
store global mutável nem serviço de aplicação disfarçado. Sem persistência não há
garantia de concorrência, transação ou idempotência de transporte.

### D5 — Operações de negócio preservadas

Cadastro cria Ativa e parcelamento exato; edição aceita apenas dados do cliente,
inclusive em quitadas/Inativas/Prejuízo, sem propagar por CPF. Baixa exige primeira
pendente da Ativa e ID novo; data entre venda e referência, quatro formas vigentes,
valor ≥ base, antecipação permitida sem alterar vencimento. Nota opcional normaliza
ausência para texto vazio e conta até 20 escalares Unicode com Rune, não string.Length.
Não calcular juros nem mover aviso visual do Crediloja ao núcleo.

Correção substitui dados do mesmo Individual de venda Ativa (inclusive quitada),
preserva IDs/base e revalida tudo. Não impõe ordem cronológica adicional entre
pagamentos; data corrigida move o movimento de mês. Repetir baixa falha sem avançar
alvo; repetir status é no-op; correção não gera registro adicional. Status segue
matriz já confirmada, sem exclusão ou estorno. Descartar resultado/cancelar antes
de chamar não altera origem; não criar I/O ou CancellationToken artificial.
Para distinguir recebimento de outra venda de um ID inexistente, a correção recebe
o conjunto de vendas conhecidas somente como contexto de localização e retorna a
raiz corrigida; validação/aceitação do conjunto candidato continua no DOM-06.

### D6 — Projeções puras e catálogo de paridade

Projeção da venda valida histórico e deriva total-base, acréscimos, total efetivo,
pago, saldo, pagas/N, próximo vencimento e situação com precedência Quitada →
Atrasada → Próximos dias → Em aberto. Projeção do conjunto confere unicidade e
somas globais, inclusive excluídas das visões operacionais, e separa coleções.
Mensal usa todos os recebimentos por data efetiva, apenas vendas Ativas por data
da venda/total efetivo, série de 28–31 dias e zeros. Posições são na referência,
independentes do mês selecionado; saldos e atrasos só Ativas. Prejuízo lista todas
as pendências, soma só contratos sem pagamento algum (entrada também conta).
Ordenar saldos por primeiro vencimento e atrasadas por vencimento, preservando
ordem de entrada nos empates, como fonte atual. Sem paginação ou limite de cinco.

Catálogo no apply em Markdown sob `backend/tests/VendasEmAberto.UnitTests/Dominio/`
liga IDs de casos às specs, fontes/testes TypeScript, entradas e saídas explícitas.
Testes MSTest correspondentes não executam Node nem reutilizam a própria fórmula
C# como oráculo. Não ler XLSX ou copiar titulares; todos os dados são sintéticos.
Casos mínimos: identificação, distribuição/entrada, bissexto/dia-base/extremos,
Unicode, status completo, baixa repetida, correção entre meses, origem histórica,
coleções protegidas, soma individual/agregada e vazios. Incluir soma insegura de
registro oculto para provar que filtro não mascara erro.

## Risks / Trade-offs

- [Cópia rasa permite corrupção] → Testar aliases das coleções de entrada e saída,
  inclusive alocações e outra venda com mesmo CPF.
- [Paridade reproduz bug da fonte] → Oráculo explícito por regra, registrar conflito
  real no PRD/TDD antes de mudar regra; não decidir silenciosamente por código.
- [Modelo histórico confundido com importação] → Somente reconstrução sintética
  integralmente validada; legado incompleto permanece bloqueado em Change própria.
- [long amplia precisão e muda aceitação] → Limite comum aplicado em toda soma,
  inclusive globais não operacionais; não apenas valores individuais.
- [Imutabilidade aumenta alocações] → Custo aceito neste recorte, sem benchmark
  inventado; validar alcance antes de gerar parcelas evita alocação descontrolada.
- [Testes de domínio herdam dependência transitiva Api] → Referência direta e casos
  sem host; não reestruturar a suíte técnica nem criar novo runner.

## Migration Plan

Não há banco, dados reais ou alteração de endpoint a migrar. No apply explícito:
DOM-01 valores/identificação → DOM-02 agregado/cadastro/reconstrução → DOM-03 edição,
DOM-04 baixa/correção e DOM-05 status → DOM-06 projeções → DOM-07 regressão/catálogo.
Os marcos de DEC-037 definem critérios e dependências; DOM-03/04/05 são independentes
após DOM-02, mas comandos de build/teste devem ser sequenciais na mesma saída.

Cada funcionalidade tem testes, documentação, tasks e commit em português. Ao fim,
restore bloqueado, Release, suítes MSTest não vazias, format sem alterações, smoke
health/loopback/404, build e unitários frontend com API desligada, OpenSpec strict
e diff. Registrar comandos/contagens/SDK e não executados. Não alegar nova auditoria
NuGet por reutilizar a evidência antiga; repetir consulta se relatar segurança atual.
E2E/zoom/inspeção visual não se aplicam sem mudança de UI.

Publicar PR único apenas após todo apply e verificação, conforme template do repo;
merge requer autorização explícita. Não abrir PR por planejamento. Rollback futuro
é reversão revisada dos commits da fase via PR, sem reset destrutivo e sem dados a
restaurar. Próximas fases de aplicação/persistência/importação/desktop exigem novas
decisões, contratos e autorização; não são critérios de fechamento desta Change.

### Verificação documental desta proposta — 25/11/2026

`openspec validate fase-002-dominio --strict` passou. `git diff --check` passou
para os arquivos rastreados, com avisos de conversão LF/CRLF nos documentos.
O status identificou proposal, specs, design e tasks presentes; todas as tarefas
de implementação permanecem desmarcadas. Conferidos caminhos dos artefatos e
ausência de links que os retirem da raiz da Change. Diff limitado a PRD/TDD e
planejamento; `.gitignore` preexistente preservado, sem staging ou commit.
Nenhum build, teste de aplicação, smoke ou auditoria de dependências foi executado
nesta proposta. Não há aprovação operacional, implementação ou PR decorrente dela.
