# Spec Delta

## MODIFIED Requirements

### Requirement: Coleções de abertas e quitadas consultáveis

A aplicação SHALL apresentar em Vendas somente Ativas com saldo positivo e em Quitadas somente Ativas com saldo zero. Inativas SHALL ser consultáveis por filtro próprio e Prejuízo SHALL ter seção própria, sem aparecer na listagem normal. Todas SHALL preservar identidade e dados da venda e permitir abrir detalhes pelo cliente e ação Visualizar identificável.

#### Scenario: Consultar as duas coleções
- **WHEN** a pessoa acessar Vendas e Quitadas com o conjunto sintético inicial
- **THEN** SHALL encontrar somente Ativas na coleção correspondente ao saldo, sem duplicá-las
- **AND** SHALL ver Cliente, Data da venda, Valor total efetivo, Parcelas pagas/total, Saldo devedor, Próximo vencimento, Situação e Ações
- **AND** quitadas SHALL mostrar Quitada, saldo zero, todas as parcelas pagas e ausência de próximo vencimento, sem data inventada

#### Scenario: Preservar identidade entre nomes semelhantes
- **WHEN** existirem vendas com nomes semelhantes e a pessoa acionar o nome ou Visualizar de uma linha
- **THEN** SHALL abrir somente o detalhe da venda identificada naquela linha
- **AND** o nome acessível da ação SHALL permitir distinguir seu contexto sem depender de hover

#### Scenario: Prejuízo fora das listas normais
- **WHEN** uma venda com saldo aberto for marcada Prejuízo, inclusive com pagamento anterior
- **THEN** SHALL aparecer na seção Prejuízo e desaparecer das listagens normais, mesmo ao alterar pesquisa e filtros
- **AND** reabri-la SHALL restaurar status Ativo e lista normal, preservando a mesma venda

## ADDED Requirements

### Requirement: Status no cabeçalho e consulta de Inativas

O detalhe SHALL indicar status administrativo textual e expor somente ações permitidas pela matriz de `dominio-vendas`, sem excluir registro. Vendas SHALL mostrar Ativas por padrão, com filtro para consultar Inativas; status SHALL não substituir o filtro financeiro de situação das Ativas.

#### Scenario: Inativar lançamento errado sem excluir
- **WHEN** uma venda Ativa for inativada após confirmação
- **THEN** SHALL sair da lista padrão e permanecer consultável por filtro de Inativas e pelo mesmo ID
- **AND** SHALL não existir ação de exclusão definitiva

#### Scenario: Reativar venda Inativa
- **WHEN** uma venda Inativa for reativada a partir do detalhe
- **THEN** SHALL retornar a Ativo e aparecer uma única vez em Vendas ou Quitadas, conforme seu saldo
- **AND** SHALL preservar o mesmo ID, parcelas, recebimentos e situação financeira derivada

#### Scenario: Manter filtros distintos
- **WHEN** selecionar Inativas e retornar ao padrão Ativas
- **THEN** a listagem SHALL filtrar pelo status escolhido, sem incluir Prejuízo ou mudar a situação financeira derivada
- **AND** pesquisa e filtro financeiro SHALL continuar restritos à coleção elegível

### Requirement: Ordenação da lista antes da paginação

Vendas SHALL ordenar a coleção consultável por cliente, data da venda ou primeiro vencimento pendente antes de mostrar até dez itens por página. Empates SHALL ter ordem estável por ID, e venda sem pendência SHALL vir depois das demais por vencimento. Trocar ordenação SHALL voltar à primeira página.

#### Scenario: Ordenar e paginar após buscar
- **WHEN** a coleção filtrada tiver mais de dez vendas e a pessoa ordenar por cliente, data ou vencimento
- **THEN** cada venda SHALL aparecer uma vez no percurso paginado na ordem escolhida, sem mudar a fonte
- **AND** mudar ordenação SHALL selecionar a primeira página e preservar os filtros vigentes

#### Scenario: Não inventar vencimento
- **WHEN** uma venda consultável não tiver parcela pendente
- **THEN** ordenação por vencimento SHALL colocá-la após as vendas com data pendente sem criar data fictícia
