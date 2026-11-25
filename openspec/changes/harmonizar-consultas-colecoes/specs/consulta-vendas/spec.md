# Spec Delta

## ADDED Requirements

### Requirement: Consistência visual dos controles de pesquisa das coleções

As coleções Vendas abertas, Quitadas, Inativas e Prejuízo SHALL apresentar busca e ação Limpar pesquisa com linguagem visual consistente, incluindo altura, superfície, borda, arredondamento, espaçamento e foco visível. O tratamento SHALL preservar os IDs, rótulos, orientação, busca local e handlers existentes.

#### Scenario: Consultar coleções sem filtros financeiros

- **WHEN** a pessoa acessar Quitadas, Inativas ou Prejuízo
- **THEN** SHALL encontrar somente o campo de busca e a ação Limpar pesquisa com o padrão visual consistente com Vendas abertas
- **AND** SHALL não encontrar filtro por situação, ordenação ou controles novos
- **AND** a busca SHALL continuar restrita à coleção atual e Limpar pesquisa SHALL manter o comportamento e foco existentes

#### Scenario: Preservar controles de Vendas abertas

- **WHEN** a pessoa acessar a listagem de Vendas abertas
- **THEN** SHALL continuar encontrando busca, filtro de situação, ordenação, Limpar pesquisa e Nova venda com os comportamentos existentes
- **AND** a consistência visual com as demais coleções SHALL não remover nem alterar esses controles

#### Scenario: Usar a tela administrativa em Inativas e Prejuízo

- **WHEN** a pessoa navegar entre Inativas e Prejuízo, que compartilham o template administrativo
- **THEN** ambas SHALL apresentar a mesma composição e acabamento para busca e Limpar pesquisa
- **AND** título, descrição, coleção, resultados, mensagens vazias e paginação SHALL continuar correspondendo à rota atual
