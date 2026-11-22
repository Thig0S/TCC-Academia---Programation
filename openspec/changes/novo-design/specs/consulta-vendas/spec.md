# Spec Delta

## ADDED Requirements

### Requirement: Painel de vendas abertas com identificação textual

A listagem de vendas abertas SHALL apresentar “Vendas cadastradas” como título textual do painel que reúne critérios, resultados e paginação; SHALL não apresentar esse título como cartão de métrica ou criar um indicador adicional.

#### Scenario: Consultar vendas abertas no painel

- **WHEN** a pessoa acessar Vendas com registros disponíveis
- **THEN** SHALL encontrar o título da página “Vendas” e, no painel da listagem, “Vendas cadastradas” acima dos critérios e da tabela
- **AND** SHALL continuar a consultar a mesma coleção e suas ações e paginação, sem cartões financeiros ou busca adicional no cabeçalho.

#### Scenario: Consultar estado vazio ou pesquisa sem resultados

- **WHEN** a coleção aberta estiver vazia ou a combinação de pesquisa e situação não encontrar registros
- **THEN** o painel SHALL conservar a identificação textual “Vendas cadastradas” e mostrar o estado vazio correspondente
- **AND** SHALL não sugerir que o título seja um total financeiro nem substituir controles, mensagens ou dados por conteúdo demonstrativo fixo.
