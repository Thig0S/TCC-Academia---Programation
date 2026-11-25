# Tasks

## 1. Harmonização dos controles

- [x] 1.1 Aplicar às seções de pesquisa de Quitadas e da tela administrativa as classes de apresentação de Vendas abertas, preservando IDs, rótulos, atributos acessíveis e handlers; não adicionar filtro por situação nem outros controles.
- [x] 1.2 Acrescentar testes direcionados que confirmem a consistência dos campos/botões nas quatro rotas, a ausência de filtro por situação em Quitadas/Inativas/Prejuízo e a preservação do filtro em Vendas abertas.

## 2. Verificação

- [x] 2.1 Executar os testes de componente afetados, build do frontend, formatação dos arquivos alterados e `openspec validate harmonizar-consultas-colecoes --strict`; registrar comandos e resultados reais.
- [x] 2.2 Revisar o diff para confirmar que não houve alterações de comportamento, dependências, navegação, tabelas ou componentes compartilhados.
