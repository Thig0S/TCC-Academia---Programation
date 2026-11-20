# Tasks

Planejamento somente; todas as tarefas aguardam novo pedido explícito de apply após
revisão. Referências: PRD 1.10 RF-009/010/012, CA-014/015/020/025; TDD 1.14
DEC-020; quatro deltas em `specs/`. Não há decisões bloqueantes neste recorte.

## 1. Visão Geral e resumos da sessão

- [x] 1.1 Criar seleções puras em `visao-geral/visao-geral.calculos.ts`, sem mutar a fonte; verificar testes de zero/uma/mais de cinco vendas e parcelas, ordem/empates, inclusão de quitadas, liquidação, ontem/hoje/+7/+8 e bordas 0001/9999 conforme `visao-geral`.
- [x] 1.2 Integrar os quatro indicadores de `resumo()` e os três resumos reativos à página, com referência/mês, identificação, limite e vazios próprios; verificar testes de componente com fonte substituída, links de ID opaco, atualização após cadastro/recebimento e invariância financeira após edição/rejeição.
- [x] 1.3 Migrar somente as expectativas de indisponibilidade de Visão Geral em `conteudo.spec.ts` e `e2e/demonstracao-inicial.spec.ts`; adicionar E2E de resumos e navegação por teclado com foco no título e IDs com barras, mantendo cobertura de Relatórios ainda indisponível até o grupo 2; verificar suítes afetadas aprovadas sem ignorar testes.
- [x] 1.4 Documentar a entrega e resultados reais do painel em `frontend/README.md`, incluindo ambos os temas, 1366×768/390×844 e limites observados; verificar consistência com CA-014/020 e testes executados, atualizar tarefas e criar commit próprio da funcionalidade apenas após verificações aplicáveis.

## 2. Relatórios mensais e posição atual

- [ ] 2.1 Criar detalhamento puro em `relatorios/relatorios.calculos.ts` para entradas/lotes e vendas do mês, saldos e vencidas na referência; verificar testes de intervalo inclusivo, primeiro/último dia, ano bissexto/0001/9999, venda anterior recebida no mês, quitadas, zero e mais de cinco, soma segura e reconciliação com `consultarPeriodo` sem dupla contagem ou mutação da fonte.
- [ ] 2.2 Integrar as quatro seções completas à página, com leitura reativa explícita de `vendas()`, mês/posição diferenciados, totais próprios, links e vazios; verificar componentes após publicações aceitas, edição, cancelamento e falha, sem seletor/gráfico/faixa global nem truncamento silencioso.
- [ ] 2.3 Adicionar Exportar relatório com explicação permanente e mensagem anunciável; verificar componente e E2E por teclado, ausência de download/requisição de dados, falso sucesso e mutação, conforme `relatorios-financeiros` e CA-015.
- [ ] 2.4 Migrar as expectativas restantes de indisponibilidade em `conteudo.spec.ts` e `e2e/demonstracao-inicial.spec.ts`; verificar navegação direta/interna, foco e manutenção das quatro explicações de Configurações, aviso e temas conforme deltas de navegação/estado.
- [ ] 2.5 Documentar entrega e resultados reais de Relatórios em `frontend/README.md`, incluindo tabelas extensas, temas e viewports; verificar alinhamento com RF-010/CA-014/015 e testes executados, atualizar tarefas e criar commit próprio da funcionalidade após verificações aplicáveis.

## 3. Verificação integrada e fechamento técnico

- [ ] 3.1 Adicionar/executar cenário E2E integrado de cadastro com entrada, recebimento de lote/quitação, edição da identificação, navegação e recarga; verificar reconciliação em centavos entre detalhe, abertas/quitadas, painel e relatórios, referência fixa, filtros sem efeito nos cartões e descarte de mutações na recarga.
- [ ] 3.2 Verificar teclado, foco, mensagens, textos extensos, contraste 4,5:1 textual e 3:1 controles/foco nos dois temas e em 1366×768/390×844, além de zoom nativo 200%; registrar evidências, ambiente e impedimentos reais sem usar CSS zoom ou declarar aceite global; comparar Configurações e ausência de cartões em Vendas/Quitadas/Relatórios.
- [ ] 3.3 Executar em `frontend/` os scripts `npm test -- --watch=false`, `npm run test:e2e`, `npm run test:e2e:paginacao-fixture`, `npm run build` e `npm run format:check`; registrar saídas/contagens/avisos reais no README e corrigir regressões do escopo sem ampliar budgets para mascarar falhas.
- [ ] 3.4 Conciliar estado de implementação/verificações em PRD, TDD e tarefas preservando IDs e pendências PEN-013/014/HIP-006; verificar rastreabilidade dos quatro deltas e `openspec validate fase-007 --strict`, sem marcar requisitos implementados sem evidência ou confundir conclusão técnica com aceite da ótica.

## Workflow follow-up

- Apresentar estes artefatos para revisão e aguardar novo pedido de apply; não iniciar implementação por esta lista.
- Manter commits funcionais e verificações na mesma `feature/fase-007`; somente após concluir todo o escopo autorizado, abrir o PR único para `main` usando `.github/pull_request_template.md`, com referências e limitações.
- Sync/archive são etapas posteriores mediante solicitação, não parte do planejamento atual. Merge exige autorização explícita e confirmação posterior de integração.
