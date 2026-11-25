# Tasks

## 1. Navegação vertical das coleções

- [x] 1.1 Agrupar Quitadas, Inativas e Prejuízo em contêiner vertical no template da barra lateral, preservando ordem, destinos, estado ativo e foco; verificar em teste que links permanecem sob Vendas e na ordem especificada.
- [x] 1.2 Acrescentar E2E com medidas geométricas confirmando os três links em linhas separadas nas larguras 1366×768 e 390×844 e nos temas claro/escuro; executar os cenários afetados e registrar resultados reais em `frontend/README.md`.

## 2. Verificação integrada

- [x] 2.1 Executar as verificações existentes pertinentes (formatação, testes e build) e validar a Change com `openspec validate empilhar-links-sidebar --strict`; registrar resultados e limitações reais.

## 3. Refinamento visual dos destinos

- [x] 3.1 Aplicar espaçamento `gap-2` e ícones SVG decorativos semanticamente associados aos três links; ampliar o E2E para validar intervalo, alinhamento, rótulos e ocultação acessível nos dois temas/viewports e registrar resultados reais em `frontend/README.md`.
- [x] 3.2 Reexecutar E2E de navegação, suíte unitária, build, formatação direcionada, `git diff --check` e `openspec validate empilhar-links-sidebar --strict`; registrar resultados e limitações reais.
