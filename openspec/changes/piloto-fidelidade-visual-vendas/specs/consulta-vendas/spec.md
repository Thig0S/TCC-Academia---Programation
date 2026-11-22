# Spec Delta

## ADDED Requirements

### Requirement: Piloto de fidelidade visual da listagem de Vendas

A listagem de Vendas abertas SHALL usar `references/a_clean_modern_dashboard_ui_using_the_mercadão_do.png` como referência principal de hierarquia, composição e acabamento, sem incorporar os quatro cards financeiros nem funções ilustrativas. A mudança SHALL ser perceptível além de alterações isoladas de cor ou raio e SHALL respeitar os contratos de consulta vigentes.

#### Scenario: Comparar a página clara com a referência principal

- **WHEN** a pessoa comparar capturas antes/depois da listagem clara em 1366×768 com a imagem de referência
- **THEN** SHALL reconhecer no conteúdo da página uma nova composição de cabeçalho, critérios, tabela e rodapé, com áreas, alinhamentos e acabamentos coerentes entre si
- **AND** SHALL encontrar “Vendas cadastradas” como título textual, sem os cartões Total em aberto, Valores em atraso, Recebido no mês ou Vendas cadastradas como indicador
- **AND** diferenças funcionais intencionais da imagem SHALL estar documentadas e capturas SHALL ficar disponíveis para revisão humana antes de estender o padrão a outras páginas

#### Scenario: Usar a mesma linguagem nos dois temas e tamanhos

- **WHEN** a pessoa acessar Vendas em claro/escuro e 1366×768 ou 390×844
- **THEN** SHALL encontrar superfícies, contrastes, hierarquia e estados visuais coerentes entre os dois temas, sem conteúdo perdido ou overflow horizontal global
- **AND** em 390×844 a rolagem horizontal da tabela SHALL permanecer interna, com controles e ações alcançáveis por teclado
- **AND** o redesenho SHALL permanecer específico de Vendas abertas, sem alterar a apresentação de Quitadas, Visão Geral, shell/sidebar ou demais páginas nesta etapa

#### Scenario: Preservar consulta e densidade ao redesenhar

- **WHEN** a pessoa pesquisar, filtrar, limpar o termo, acessar Visualizar/Editar ou paginar, inclusive em estados vazio e sem resultados
- **THEN** SHALL manter a busca única local, filtro de situação, Limpar pesquisa preservando situação, CTA Nova venda e oito colunas com dados/ações atuais, sem filtro adicional ou ícone que esconda ações
- **AND** em 1366×768/100% com dez vendas sintéticas curtas, SHALL ver critérios, dez linhas e paginação sem rolagem vertical da página, mantendo fonte tabular de 18 px/20 px e paddings atuais
- **AND** estado vazio e pesquisa sem resultados SHALL conservar mensagens distintas, foco/contraste adequados e contagem/faixa corretas
