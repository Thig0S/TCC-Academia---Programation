# Tasks

Change implementada e integrada à `main` pelo PR #10 (commit `59af9a2`), com
9/9 tarefas concluídas. Base de planejamento preservada: PRD 1.6, TDD 1.10/DEC-018,
`proposal.md`, `design.md` e três deltas. As 20 tarefas da `fase-005` anterior não
contam como execução desta Change e não devem ser reaplicadas.

Estado conciliado em 17/11/2026: PRD 1.7 e TDD 1.11 registram a entrega sem mudar
regras ou IDs. Specs principais sincronizadas pelo commit `91208a7`, verificadas
contra todos os blocos das três deltas. Consolidação documental e arquivamento
realizados na branch `docs/sincronizar-specs-ajustes-fase-005`, ainda pendentes de
integração na `main`. Evidências anteriores de aplicação em `frontend/README.md`,
seção de verificação integrada final da tarefa 4.3; sem reexecução nesta revisão.

## 1. Listas sem cartões e faixa compacta

- [x] 1.1 No apply autorizado, conferir branch/base/diff e artefatos revisados sem incorporar trabalho alheio; retirar os cartões e referências de apresentação não usadas em `listar-vendas`, preservando `ServicoDemonstracao.resumo`. Atualizar `listas-vendas.spec.ts` e integração que exigiam cartões para provar ausência nas duas coleções e derivados internos invariantes após critérios. Conferir Visão Geral/Relatórios ainda indisponíveis e nenhuma mutação/dependência/seed alterado; registrar resultados incrementais no README do frontend.
- [x] 1.2 Condensar busca, situação, Limpar pesquisa e Limpar critérios em uma faixa desktop, com rótulos, orientação e foco preservados; Quitadas continua somente com busca/limpeza. Verificar componente/E2E nos dois temas em 1366×768/100%, sem busca duplicada; testar limpezas e separação das coleções. Documentar resultados reais, executar formatação/build/testes afetados e criar commit funcional individual com testes/docs/tarefas.

## 2. Paginação de abertas e quitadas

- [x] 2.1 Acrescentar paginação local após `buscarVendas`, com 10 por página, contagem/faixa dos resultados completos, reset de termo/situação/limpezas e limitação após redução da coleção. Usar derivação readonly e seleção dependente conforme design, sem escrever em computed, mudar fonte/ordem/IDs ou acrescentar pacote. Testar 0/1/10/11/21, filtros positivos/negativos, primeira/última/todas as páginas sem duplicação/omissão, redução e posterior crescimento, limpezas com campo já vazio e ausência de mutação. Registrar contrato/resultados incrementais no README.
- [x] 2.2 Integrar apresentação compartilhada de números/anterior/próxima e faixa/total abaixo das duas tabelas, sem navegação fictícia em zero/uma página; reticências não acionáveis, região nomeada, página atual identificada, teclado/foco/anúncios. Verificar 10 linhas e rodapé dentro do viewport em 1366×768/100% nos dois temas usando fixture/host exclusivamente de teste para cardinalidades ausentes no seed, e E2E do seed real sem hooks. Testar com TestBed a atualização reativa por comando interno e ajuste da página inválida. Documentar evidências e limitações, executar scripts afetados e criar commit individual com testes/docs/tarefas.

## 3. Detalhe compacto, temas e links

- [x] 3.1 Reorganizar detalhe com cliente/finanças lado a lado, título/retornos compactos e entrada/descrição preservadas; até 10 parcelas inteiras sem rolagem da página no cenário padrão; excedente com rolagem interna acessível e cabeçalho identificável, sem paginação de parcelas. Testar componentes com 1/10/11 parcelas, entrada presente/ausente e descrição curta/extensa; usar browser real para geometria/teclado/overflow, distinguindo fixture de seed. Preservar rotas, IDs, nulls, centavos, paga/pendente e ausência de mutações. Registrar README, executar verificações afetadas e criar commit funcional individual.
- [x] 3.2 Refinar superfícies/densidade/tipografia/bordas/selos e links de menu/perfil, cliente, Visualizar e retorno/breadcrumb conforme imagens light/dark; sem azul/sublinhado padrão permanente, mantendo hover/foco, semântica, indicação ativa além da cor, URLs e skip link. Resolver o sublinhado ativo na lateral sem alterar logo/identidade. Comparar capturas com referências e medir contraste normal/hover/foco/ativo (texto 4,5:1; grande/foco/controles essenciais 3:1, incluindo degradê). Verificar todos os destinos afetados e ausência de ações fictícias/dados pessoais copiados; registrar evidências, executar scripts afetados e criar commit individual de estilos/links com testes/docs/tarefas.

## 4. Verificação integrada dos ajustes

- [x] 4.1 Reutilizar/complementar testes de `parcela.calculos.spec.ts` e projeções para RN-014 mantida: vence 10/11, Próximos dias em 10/11, Atrasado em 11/11, Paga com precedência; limites +7/+8, mês/ano e reconciliação dos derivados. Não alterar relógio, seed ou criar tolerância; registrar resultados reais e incluir eventual complemento no commit funcional pertinente.
- [x] 4.2 Consolidar CA-027/028/029: capturas e medições de critérios, dez linhas inteiras/rodapé e detalhe com até dez parcelas em 1366×768/100%, nos dois temas; comparar referências com diferenças funcionais registradas. Conferir excedente interno, textos extensos, 390×844, zoom nativo 200%, teclado, foco, contraste e movimento reduzido sem perda de aviso/dados/ações. Registrar método e origem de cada evidência (seed real, fixture/host de teste ou manual). Se não houver prova de encaixe legível, bloquear conclusão e revisar com o solicitante, sem ocultar campos ou relaxar aceite.
- [x] 4.3 Executar em `frontend/` os scripts existentes `npm.cmd ci`, `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false` e `npm.cmd run test:e2e`, preservando processos alheios e usando servidor próprio do runner; na raiz, `openspec validate ajutes-fase-005 --strict` e `git diff --check`. Registrar saídas/contagens/ambiente/budgets/warnings reais no README; revisar PRD → TDD → três deltas → testes e diff integral da Change, sem atribuir evidências anteriores aos ajustes. Somente após todas as tarefas/verificações aplicáveis concluídas, preparar o PR único da Change usando `.github/pull_request_template.md`, referências e limites explícitos; não abrir PR de planejamento nem mesclar sem autorização.

## Planning Evidence

Os registros abaixo descrevem exclusivamente o planejamento de 16/11/2026,
anterior ao apply e ao PR #10. As contagens, restrições de escopo e declarações de
ausência de implementação/sync são históricas, não o estado atual da Change.

- Raiz local confirmada por `openspec list --json` e `openspec context --json`.
  Schema configurado `spec-driven`; nome `ajutes-fase-005` preservado como solicitado.
- Branch pertinente `feature/ajustes-fase-005`; documentos da sessão anterior já
  modificados, reconhecidos como trabalho do agente, não descartados silenciosamente.
  Usuário confirmou transferir apenas as revisões dos cinco arquivos da Change
  anterior, mantendo PRD 1.6, TDD 1.10 e README. Sem troca de branch/fetch/commit.
- Proposta, três deltas, desenho e tarefas gerados a partir dos documentos e de
  inspeção read-only de páginas, estilos, domínio, testes, manifesto e configuração
  E2E. Caminhos de saída sob a raiz da Change; ancestrais existentes sem reparse point.
- Spec principal de temas exige sublinhado e preservação das demais superfícies;
  delta explícita acrescentada para conciliar esse conflito com as decisões do
  solicitante. Nenhuma spec principal ou código foi alterado.
- Context7 consultado para seleção dependente com linkedSignal; desenho proposto,
  não compatibilidade executada no patch local. Referências visuais e decisões do
  Harness reutilizadas da revisão documental anterior, sem copiar dados pessoais.
- Não executados: instalação, build, testes de aplicação, revisão visual da aplicação,
  medição de contraste/geometria, desempenho ou aceite da ótica. Sem apply/PR/merge,
  sync ou archive.
- Validação documental: primeira execução estrita saiu 1 por notas antes da
  primeira seção das deltas transferidas; notas removidas por já constarem no
  desenho/proposta. Reexecução de `openspec validate ajutes-fase-005 --strict` saiu
  0, Change válida sem avisos. `git diff --check` saiu 0, apenas avisos LF/CRLF.
- `openspec status --change ajutes-fase-005` confirmou 4/4 artefatos completos;
  `openspec list --json` confirmou 0/9 tarefas da nova Change e 20/20 da anterior.
  `git diff --stat -- openspec/changes/fase-005` não apresenta diferenças de conteúdo:
  restauradas somente as revisões do agente autorizadas para transferência.
- README/PRD/TDD preservam as revisões anteriores, com referências ajustadas para
  `ajutes-fase-005`. As specs principais permanecem intactas. Validação documental
  não comprova compatibilidade executada, geometria, contraste ou implementação.

## Workflow follow-up

- Implementação concluída e integrada pelo PR #10; não aguardar nem executar novo
  apply desta Change. A base `fase-005` foi arquivada pelo PR #11; não reaplicar suas
  deltas para restaurar cartões ou substituir os refinamentos atuais.
- Deltas dos ajustes sincronizadas antes do arquivamento; preservar os requisitos
  principais atuais. A integração da consolidação documental desta branch ainda
  depende do fluxo de revisão/PR, sem confundir arquivamento local com merge.
- A Visão Geral recebe os indicadores somente na FASE-007, mediante planejamento
  e implementação próprios; não é tarefa pendente desta Change.

## Archive Evidence

- Em 17/11/2026, o solicitante autorizou as correções documentais e confirmou no
  Harness o arquivamento sem reaplicar deltas já sincronizadas.
- Antes de mover: `openspec status --change ajutes-fase-005 --json` confirmou 4/4
  artefatos completos; `openspec list --json`, 9/9 tarefas. Comparação dos blocos
  confirmou correspondência integral de 13 requisitos de consulta, um de estado e
  dois de temas com as specs principais. `openspec validate ajutes-fase-005 --strict`
  e `openspec validate --specs --strict` passaram, saída 0.
- Diretório movido para `openspec/changes/archive/2026-11-17-ajutes-fase-005/`,
  preservando `.openspec.yaml`, proposta, desenho, deltas e as nove tarefas concluídas.
- Após mover: `openspec list --json` retornou nenhuma Change ativa;
  `openspec validate --all --strict` aprovou as sete specs; em `frontend/`,
  `npm.cmd run format:check` passou. `git diff --check` passou com avisos LF/CRLF.
- Não executados: instalação, build, testes unitários/componentes/E2E, nova revisão
  visual ou avaliação da ótica, pois este fechamento altera apenas documentação.
  Resultados anteriores permanecem em `frontend/README.md`; arquivamento local
  não comprova publicação, revisão, aprovação ou merge desta branch documental.
