# Design

## Context

Motivação em `proposal.md`. Base: PRD 1.10 RF-009/010/012, RN-013/014/015,
CA-014/015/020/025 e TDD 1.14 DEC-020, que centraliza a decisão técnica.

Inspeção em 20/11/2026, sem executar aplicação:

- `ServicoDemonstracao` é raiz, publica agregado congelado e expõe `vendas`,
  `resumo`, `referencia` e `consultarPeriodo(inicio, fim)`.
- `venda.calculos.ts` já fornece resumo global e consulta inclusiva. Esta última
  retorna vendas do período e recebido total, não o detalhamento dos recebimentos.
- As páginas em `visao-geral/` e `relatorios/` são placeholders OnPush com cabeçalho.
- `conteudo.spec.ts` e `e2e/demonstracao-inicial.spec.ts` exigem ausência de dados e
  ações nesses destinos; devem migrar junto à funcionalidade, não ser ignorados.
- A spec principal de navegação e a de estado também exigem indisponibilidade;
  os deltas desta Change substituem explicitamente esses trechos. Não fazer sync agora.
- Angular 22.2.6 e Bootstrap 5.3.9 estão fixados no manifesto; não atualizar pacotes.

## Goals / Non-Goals

**Goals:** derivar apresentação financeira da fonte existente, manter rastreabilidade
dos valores até suas vendas e verificar reatividade e calendário com funções puras.

**Non-Goals:** segunda store, comandos novos, recálculo independente de situações,
componentes genéricos sem reutilização, nova biblioteca visual/gráfica, alteração do
seed ou das regras. Não executar FASE-008 ou concluir aceite global nesta Change.

## Decisions

### D1 — Derivações sem novo estado canônico

Reutilizar injeção da fonte raiz e `computed`, sem effects sincronizando totais.
O painel consome `resumo()` diretamente e deriva seleções de `vendas()` por funções
puras em `visao-geral/visao-geral.calculos.ts`. Copiar antes de ordenar; usar situações
das parcelas projetadas para respeitar a janela e o calendário, inclusive 9999.
Ordenação estável mantém ordem de entrada em empates; limitar somente após filtrar e
ordenar. O limite de cinco nunca afeta métricas ou relatórios.

Alternativa rejeitada: duplicar saldos/situações no componente ou nova store, criando
divergência após mutações. `computed` readonly e invalidação por dependências foram
confirmados via Context7 em https://angular.dev/guide/signals (20/11/2026); consulta
geral não comprova execução no patch instalado.

### D2 — Relatório mensal e posição atual são projeções distintas

Em `relatorios/relatorios.calculos.ts`, derivar o mês por `limitesDoMes(referencia)`
e detalhar entradas e lotes por data inclusiva, não por vencimento ou data da venda.
Uma linha por entrada/lote, com chave composta por venda e tipo/ID; nunca somar
alocações além do lote. Cada linha preserva referência à venda de origem.
Conferir soma com `consultarPeriodo`; usar `somarCentavos`, sem fração monetária.

A derivação do componente lê explicitamente `vendas()` e depois consulta o período:
`consultarPeriodo` é método, não signal de leitura pública. Isso mantém o vínculo
reativo sem depender de leitura incidental do signal privado dentro do serviço.
Vendas mensais seguem data de venda. Saldos e atrasos leem todas as projeções,
independentemente do mês de cadastro. Ordenação de Relatórios preserva a ordem da
fonte e das entradas/recebimentos; não introduzir filtros ou paginação.

Alternativas rejeitadas: usar somente o resultado agregado da consulta, que não
permite conferir recebimentos; restringir saldos às vendas do mês, que daria uma
posição incompleta; reconstruir posição histórica, não autorizada pelo produto.

### D3 — Apresentação local, sem ampliar o domínio

Manter componentes standalone OnPush, HTML separado, `@for` com chaves estáveis,
nomes pt-BR e formatação BRL/data civil conforme padrões existentes. Listas do painel
identificam cliente e data; parcelas também número, vencimento e valor. Relatórios
usa quatro seções completas: recebimentos mensais, vendas mensais, saldos positivos
por venda e parcelas vencidas, com totais e referência/período explícitos.

Reutilizar cabeçalho, tokens, tema e estilos Bootstrap; criar SCSS local somente
para layout necessário. Não introduzir componente compartilhado para cartões antes
de haver reutilização real. Não duplicar a faixa global em Relatórios. Tabelas têm
nomes acessíveis e cabeçalhos; rolagem interna quando necessária, sem esconder dados.
Links Router são construídos por segmentos como nos detalhes existentes, nunca
concatenando IDs com barras em uma URL. O foco de rota continua a cargo da estrutura.

Exportar relatório é um botão com explicação permanente vinculada e mensagem
`role="status"` após acionamento. Não exige modal, download, rede ou alteração da
fonte. Alternativa de botão sem resposta foi rejeitada por não comunicar o limite.

### D4 — Verificação faz parte de cada entrega

Funções puras: zero, uma e mais de cinco entradas, empate, parcelas pagas,
ontem/hoje/+7/+8, primeiro/último dia de mês, ano bissexto e bordas 0001/9999.
Relatórios: entrada + lote de várias alocações, recebimento no mês de venda anterior,
quitadas, ausência de seções e soma em centavos; garantir fonte não mutada.

Componentes: doubles de fonte via TestBed para vazio e publicação reativa, sem API
de teste no produto. Cancelamento/falha e edição não podem alterar totais. Atualizar
os testes de placeholders por destino, preservando Configurações. E2E percorre
cadastro com entrada, recebimento/quitação e edição, compara painel/relatório/detalhe
antes/depois e após recarga; não criar rota de teste em produção.

Verificar teclado, foco, IDs com barras, ambos os temas e 1366×768/390×844,
contraste textual 4,5:1 e controles/foco 3:1, além de zoom nativo 200%. Registrar
ambiente e evidências; Chromium não equivale ao Chrome alvo e relato manual não é
medição independente. PEN-013/014/HIP-006 permanecem abertas.

## Risks / Trade-offs

- [Relatório confundido com histórico] → rótulos separados para mês e posição atual.
- [Snapshot sem invalidação] → leitura explícita de `vendas()` e testes após comandos.
- [Dupla contagem de lotes] → linhas por recebimento, reconciliação com consulta existente.
- [Janela além do calendário] → usar classificação projetada, sem criar data irrepresentável.
- [Testes antigos bloqueiam a nova UI] → migrar expectativas junto a cada funcionalidade.
- [Relatórios extensos] → conteúdo completo e rolagem acessível; paginação exige novo recorte.
- [Bundle já com aviso] → sem dependências novas, executar build sem aumentar orçamento
  para mascarar avisos; registrar resultado real e limitações.

## Migration Plan

Somente após revisão e pedido explícito de apply: projeções puras/testes, painel e
seus testes, Relatórios e seus testes, regressão integrada e documentação de evidências.
Comandos existentes em `frontend/`: `npm test -- --watch=false`, `npm run test:e2e`,
`npm run test:e2e:paginacao-fixture`, `npm run build`, `npm run format:check`.
Cada funcionalidade verificada recebe commit próprio; um único PR da Change completa
usa o template do repositório. Não abrir PR de planejamento agora nem mesclar sem autorização.

Sem migração de dados, pois a sessão é efêmera. Uma reversão futura pelo fluxo normal
de revisão deve restabelecer os placeholders e seus testes coerentemente, sem reset
destrutivo ou persistência. Sync/archive dependem de solicitação própria posterior.

Verificação documental do planejamento em 20/11/2026: `openspec validate fase-007
--strict` aprovado e `git diff --check` sem erros (somente avisos LF/CRLF nos
documentos existentes). Todos os artefatos exigidos existem; nenhuma tarefa de
implementação foi executada. Build, testes e avaliação visual não executados aqui.
