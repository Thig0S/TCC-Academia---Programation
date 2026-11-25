# Tasks

PRD/FON-018/RF-018–020/CA-042–043/CA-007, TDD/DEC-032/DEC-019, `proposal.md`, deltas e `design.md`. O dashboard foi implementado nas tarefas 1–5.2 e verificado em 6.1–6.2. Em 25/11, o solicitante autorizou ampliar a conclusão para corrigir o bloqueio E2E preexistente de foco na edição de cliente, conforme contrato de formulário já existente, antes da regressão final; sem alteração financeira ou remoção de cenários.

**Verificação documental em 25/11/2026:** `openspec validate dashboard-relatorios --strict` aprovado; `openspec status --change dashboard-relatorios` informa 4/4 artefatos presentes; `git diff --check` sem erros de whitespace (somente avisos locais LF/CRLF). Diff relativo à `main` restrito a PRD, TDD e artefatos desta Change. Testes da aplicação, builds, capturas e inspeções de interface não executados nesta etapa. Presença de artefatos não comprova implementação ou aprovação.

## 1. Base visual da mudança autorizada

- [x] 1.1 Após pedido explícito de apply, capturar Relatórios antes das mudanças em 1366×768/390×844, claro/escuro, com dados sintéticos; registrar baseline, caminhos das capturas e composição existente em `frontend/README.md`, verificando que os arquivos de evidência existem (D4; CA-043).

## 2. Período mensal e série diária

- [x] 2.1 Estender `calcularRelatorio` com mês opcional sem quebrar chamadas de dois argumentos; em `relatorios.calculos.spec.ts`, verificar limites inclusivos, meses vazios/futuros, fevereiro bissexto, dezembro/janeiro, anos 0001/9999 e invariância de saldos/vencidas/Prejuízo/referência ao trocar mês. Documentar contrato e resultados reais em `frontend/README.md` (D1/D2; CA-042).
- [x] 2.2 Derivar série de todos os dias a partir dos mesmos recebimentos, com zeros e soma em centavos; testar entrada/lote/individual de todos os status, valores desiguais, correção entre meses sem novo ID, reativação, totais efetivos de vendas Ativas e igualdade série/total/tabela. Registrar testes/documentação no commit da projeção (D3; CA-042).

## 3. Seleção e cartões contextuais

- [x] 3.1 Implementar rascunhos de mês/ano, sinal de seleção aplicada e ação Aplicar local à página, com erro associado/anunciável; testar seleção inválida/vazia preservando último resultado, ano decimal/fora dos limites, atualização mensal sem mudar posição, foco e restauração ao recriar a página, sem URL/storage. Registrar resultados em `frontend/README.md` (D2; CA-042).
- [x] 3.2 Apresentar dois cartões mensais e três de posição atual com quantidade de vendas, intervalo/referência e explicações sobre sobreposição de vencidas e restrição do total de Prejuízo; testar cinco totais, zeros, mudanças de status/pagamento e ausência de faixa global duplicada. Verificar identidade atual e empilhamento em temas/viewports e documentar no commit da apresentação (D4; CA-042/043).

## 4. Gráfico diário acessível

- [x] 4.1 Implementar somente gráfico de barras diário local em SVG com eixos/unidade, título/descrição e tabela HTML equivalente acessível também visualmente, fora dos cinco detalhes; testar todos os dias, soma exata, dias zero, mês vazio, escala sem divisão por zero, valores desiguais, leitura sem hover e sem gráficos/resumos extras. Verificar temas/viewports, ausência de overflow global e de nova dependência, documentando evidências no commit do gráfico (D3/D5; CA-042/043).

## 5. Detalhes completos em expansão

- [x] 5.1 Integrar cinco `details`/`summary` inicialmente fechados, com títulos/totais visíveis, quantidade em Vendas, tabelas e vazios completos; testar Enter/Espaço, estado, foco, duas expansões simultâneas e preservação de abertura ao aplicar mês. Preservar exportação ilustrativa sem download e documentar testes do componente (D6; CA-043).
- [x] 5.2 Adaptar `relatorios.spec.ts`, `e2e/relatorios-cobranca.spec.ts` e demais testes que presumem tabelas sempre abertas/ausência de seletor, abrindo detalhes antes de consultar; preservar asserções de todas as linhas (>5), IDs opacos, CPF/telefone, ordenação, primeiro vencimento, Prejuízo fora do total e rolagem local. Executar testes direcionados e registrar resultados em `frontend/README.md` no commit de detalhes (D6; CA-042/043).
- [x] 5.3 Investigar o foco no primeiro erro da edição de cliente conforme spec `formularios-vendas`, mantendo rascunho, erro associado e dados financeiros; dividir a matriz E2E em dez casos independentes, sem remover os cinco viewports, dois temas ou as asserções de foco, contraste, rolagem e preservação financeira. O erro histórico de foco não se reproduziu nos retestes e `onInvalid`/`focusBoundControl()` já segue a API documentada; não foi feita alteração especulativa no formulário. Teste de componente 10/10 e matriz E2E 10/10 passaram; resultados registrados em `frontend/README.md` (PRD/CA-007/RNF-002; TDD/DEC-019/DEC-032).

## 6. Verificação integrada e conclusão

- [x] 6.1 Executar cenário integrado com pagamento/acréscimo, correção de data entre meses, inativação/Prejuízo/reativação e recarga; verificar conciliação cartões/gráfico/detalhes, independência das posições e demais telas, consulta sem mutação, descarte da sessão e ausência de transmissão/download. Registrar comandos e evidências reais (CA-042/043).
- [x] 6.2 Comparar capturas antes/depois em 1366×768/390×844 e claro/escuro; verificar contraste, teclado/foco, controles, tabela diária, tabelas de 18 px/20 px, overflow localizado e zoom nativo 200% quando verificável. Documentar medições, diferenças intencionais, falhas/limitações e eventual evidência manual sem alegar aceite visual/operacional automático (D4–D6; CA-043).

**Zoom nativo 200% em 25/11/2026:** verificação manual informada pelo solicitante nas configurações já documentadas; relata ausência de distorção e elementos exibidos corretamente. Evidência, ambiente e limitações em `frontend/README.md`; não é medição independente nem aceite da ótica.

- [ ] 6.3 Executar regressão unitária/componentes, E2E da aplicação e fixture aplicável, builds correspondentes, `format:check`, `git diff --check` e `openspec validate dashboard-relatorios --strict`; registrar resultados reais e bloqueios preexistentes sem enfraquecer expectativas/budgets. Conciliar PRD/TDD/SDD, evidências e tarefas antes de declarar o escopo implementado (CA-042/043).

**Resultado parcial de 6.3 em 25/11/2026:** unitários/componentes 430/430, build,
fixture 24/24, `git diff --check` e validação estrita OpenSpec passaram. A suíte E2E
completa da aplicação foi interrompida após timeout em teste preexistente de foco no
fluxo de edição de cliente, fora do escopo; isoladamente, esse teste falhou em 390×844
por foco não movido ao CPF e excedeu 30 s em 1366×768. `format:check` global também
falha somente no README, cuja falha já existia em `HEAD`. A tarefa permanece aberta
até a regressão E2E da aplicação poder concluir com sucesso e a verificação de formato
global deixar de estar bloqueada; detalhes e comandos em `frontend/README.md`.

**Atualização após autorização — 25/11/2026:** a matriz de edição foi dividida sem
reduzir cenários/assertions; unitários 430/430, fixture 24/24, build e regressão E2E
completa 156/156 passaram, além de `git diff --check` e validação OpenSpec estrita. O
único item pendente de 6.3 é `npm.cmd run format:check`, ainda falhando exclusivamente
no README por formatação preexistente, documentada em `frontend/README.md`. Por isso
6.3 permanece desmarcada e o PR não foi aberto: o fluxo deste repositório só permite
abri-lo depois de concluir todas as tarefas e verificações aplicáveis.

## Workflow follow-up

- Fazer commits por funcionalidade com seus testes/documentação na branch `feature/dashboard-relatorios`; mensagens objetivas em português com prefixos adequados. Não reimplementar `feedback-luighi` nem iniciar código nesta etapa de planejamento.
- Abrir um PR independente para a `main` apenas após concluir todas as tarefas autorizadas e verificações aplicáveis, usando `.github/pull_request_template.md`; não abrir PR por planejamento parcial.
- Sincronizar/arquivar a Change no fluxo apropriado após implementação/revisão; mesclar somente com autorização explícita do usuário.
