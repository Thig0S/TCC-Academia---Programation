# Tasks

## 1. Referência e baseline da listagem

- [x] 1.1 Capturar antes de editar Vendas e Quitadas em claro/escuro, 1366×768 e 390×844, com seed sintético e caso de dez linhas na fixture; registrar em `frontend/README.md` caminhos, medidas de décima linha/rodapé/largura global e mapa das diferenças contra `references/a_clean_modern_dashboard_ui_using_the_mercadão_do.png`.
- [x] 1.2 Registrar quadro de equivalências visual↔contrato (topo, busca, KPI omitidos, filtros, CTA, oito colunas, ações, selos, paginação) e verificar contra PRD RF-002/003, CA-027/028, TDD e delta `consulta-vendas` antes de editar a aplicação.

## 2. Composição do piloto de Vendas

- [x] 2.1 Redesenhar a hierarquia do cabeçalho, título textual e faixa única de critérios em `listar-vendas.html` sem duplicar a busca ou mover a ação fora da faixa; verificar com testes de componente e E2E busca/filtro/Limpar pesquisa/CTA e captura antes/depois da página clara e escura. E2E visual direcionado 2/2, consulta 2/2 em servidor isolado e unitários 31 arquivos/373 testes passaram; capturas e medidas no README.
- [x] 2.2 Dar à tabela, situações, estados e rodapé de Vendas acabamento contextual coerente com o PNG, preservando oito colunas, links textuais, fonte 18 px, paddings e componentes compartilhados; verificar E2E de resultados/ausências, contraste/foco/teclado e comparação de capturas/estilos de Quitadas antes/depois sem mudança visual indevida. Variantes opt-in desligadas em Quitadas; consulta automatizada passou 2/2, fixture completa 24/24. Medições desktop/mobile, contraste, foco/teclado e comparação visual estão no README e em `frontend/evidencias/piloto-fidelidade-visual-vendas/`.
- [x] 2.3 Registrar em `frontend/README.md` as diferenças efetivamente implementadas, adaptação para o tema escuro e desvios intencionais (sem busca global/KPIs/filtro de data/reticências), com capturas sintéticas lado a lado verificáveis. Comparação versionada em `frontend/evidencias/piloto-fidelidade-visual-vendas/comparacao.md`.

## 3. Verificação e apresentação do piloto

- [x] 3.1 Executar unitários da listagem/componentes, E2E de consulta e fixture de paginação para 10/11/21 registros nos dois temas e viewports; medir dez linhas/paginação em 1366×768 e rolagem interna/largura global em 390×844, registrando resultados, falhas e correções no README. Resultado final: 373 unitários, consulta 2/2, fixture 24/24; medições e estados no README.
- [x] 3.2 Executar regressão integrada aplicável (`npm.cmd test -- --watch=false`, `npm.cmd run test:e2e`, `npm.cmd run test:e2e:paginacao-fixture`, `npm.cmd run build`, `npm.cmd run format:check` em `frontend/`) e `openspec validate piloto-fidelidade-visual-vendas --strict` na raiz; registrar comandos reais, contagens, avisos e limitações, inclusive zoom nativo somente se reinspecionado. Final: 116 E2E, 24 fixture, 373 unitários; build, formatação, OpenSpec e diff-check aprovados. E2E usou config temporária na porta 4310 porque 4200 estava ocupada.
- [ ] 3.3 Apresentar comparação antes/depois versus PNG principal e quadro de fidelidade por área para avaliação visual explícita do solicitante; verificar que nenhuma outra página foi redesenhada, que o diff é de apresentação/testes/documentação e que a expansão para outros módulos permanece fora desta Change sem aprovação específica.

## Workflow follow-up

- Após execução autorizada e conclusão integral das tarefas/verificações, atualizar o PR único da `feature/redesign` conforme `AGENTS.md`; não abrir PR por este planejamento isolado nem mesclar sem autorização explícita.
- A aprovação ou rejeição humana da estética do piloto orientará eventual Change posterior para outras páginas; não considerar essa expansão concluída por este checklist.
