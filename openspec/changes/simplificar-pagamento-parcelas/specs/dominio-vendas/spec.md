# Spec Delta

## MODIFIED Requirements

### Requirement: Saldos e próximo vencimento reconciliáveis

O domínio SHALL derivar total pago dos recebimentos aceitos, incluindo uma vez o da entrada, e nunca somar novamente entrada ou alocações. Saldo SHALL ser total menos pago e igualar a soma das pendentes. Quantidade paga SHALL contar todas as parcelas liquidadas, inclusive a entrada. Próximo vencimento SHALL ser a menor data pendente, inclusive vencida, ou ausência explícita sem pendências.

#### Scenario: Liquidar duas parcelas com entrada prévia
- **WHEN** uma venda de R$ 2.000,00 em 10x, entrada de R$ 200,00 já paga, receber parcela 2 e depois parcela 3 em duas confirmações individuais de R$ 200,00
- **THEN** SHALL resultar em pago R$ 600,00, saldo R$ 1.400,00 e 3/10 pagas
- **AND** SHALL contar cada recebimento uma única vez e usar a parcela 4 como próximo vencimento

#### Scenario: Preservar reconciliação de recebimentos históricos em lote
- **WHEN** uma venda contiver recebimento histórico com várias alocações e depois aceitar pagamento individual da primeira pendente
- **THEN** SHALL preservar ID, valor, data, forma e alocações do recebimento histórico
- **AND** total pago SHALL somar cada recebimento uma vez, saldo SHALL igualar as pendentes e próximo vencimento SHALL ignorar todas as já liquidadas

### Requirement: Resumos globais e períodos civis explícitos

As projeções SHALL somar saldos no total em aberto, somente pendentes vencidas no atraso e recebimentos aceitos por data efetiva no mês civil, incluindo a entrada uma vez. SHALL contar todas as vendas, inclusive quitadas. Busca e filtros SHALL não alterar resumos. Períodos SHALL ser civis inclusivos, com vendas pela data da venda; entrada ou alocações SHALL não ser somadas novamente ao recebimento.

#### Scenario: Conciliar mês e universos
- **WHEN** consultar mês com entrada no primeiro dia, pagamento individual no último, recebimentos históricos em lote e recebimentos fora do mês e vendas quitadas
- **THEN** SHALL incluir as duas bordas nos recebimentos e excluir os valores externos ao período
- **AND** SHALL contar quitadas entre cadastradas, não incluir futuras ou entrada paga nos valores em atraso e não alterar totais ao filtrar listas
- **AND** entrada, pagamentos individuais e lotes históricos SHALL contribuir uma vez cada, sem somar novamente suas alocações

#### Scenario: Consultar coleção vazia e intervalo inválido
- **WHEN** consultar projeções sem vendas
- **THEN** os totais e contagens SHALL ser zero e as coleções SHALL ser vazias
- **AND** um intervalo de consulta invertido ou com data inválida SHALL retornar erro de validação, sem interpretação silenciosa
