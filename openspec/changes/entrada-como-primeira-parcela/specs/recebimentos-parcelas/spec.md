# Spec Delta

## MODIFIED Requirements

### Requirement: Seleção sequencial desde a primeira parcela pendente

O recebimento SHALL aceitar seleção não vazia da mesma venda, correspondente às primeiras parcelas pendentes consecutivas por número. SHALL rejeitar saltos, IDs repetidos/ausentes/de outra venda e parcelas pagas, inclusive a parcela 1 de entrada já liquidada no cadastro. A entrada SHALL ser ignorada ao formar o prefixo de pendentes, não representar novo valor a receber nem deslocar uma seleção obsoleta.

#### Scenario: Proibir pagamento fora de ordem
- **WHEN** janeiro, fevereiro e março estiverem pendentes e for solicitado fevereiro sozinha ou janeiro e março
- **THEN** SHALL rejeitar a operação inteira e manter as três pendentes

#### Scenario: Aceitar uma ou mais parcelas em ordem
- **WHEN** janeiro estiver paga e for solicitado fevereiro ou fevereiro e março pendentes
- **THEN** SHALL aceitar se os demais dados forem válidos
- **AND** ordem textual dos IDs SHALL não autorizar saltos nem alterar a ordem canônica

#### Scenario: Rejeitar identificadores inválidos
- **WHEN** houver seleção vazia, ID duplicado, parcela paga, desconhecida ou de outra venda
- **THEN** SHALL rejeitar sem criar recebimento ou liquidar qualquer parcela

#### Scenario: Entrada já paga não integra novo lote
- **WHEN** abrir recebimento de venda cuja entrada é a parcela 1 Paga e a parcela 2 é a primeira pendente
- **THEN** o prefixo elegível SHALL começar na parcela 2 e não oferecer a entrada como valor a receber
- **AND** comando que inclua a entrada SHALL ser rejeitado integralmente, sem novo recebimento

### Requirement: Quitação visível reconciliada

Após receber as últimas pendentes, o detalhe SHALL mostrar Quitada, saldo zero, N/N pagas incluindo a entrada e ausência de próximo vencimento. A venda SHALL sair de abertas e aparecer uma vez em Quitadas com mesmo ID/histórico. SHALL não oferecer recebimento sem pendências e SHALL contar cada recebimento, inclusive entrada, uma vez nos resumos.

#### Scenario: Concluir lote final e conferir coleções
- **WHEN** confirmar o lote integral que contém todas as pendentes restantes de uma venda com entrada já paga
- **THEN** SHALL atualizar o detalhe, fechar o modal e orientar foco a destino remanescente
- **AND** SHALL excluir de abertas e incluir uma vez em Quitadas com a mesma identidade, N/N pagas e saldo zero
- **AND** entrada e lote SHALL compor resumos uma vez cada, sem somar alocações ou o valor da entrada novamente
