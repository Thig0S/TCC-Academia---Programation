# Spec Delta

## MODIFIED Requirements

### Requirement: Análises mensais identificadas

Relatórios SHALL apresentar recebimentos e vendas do mês civil completo da referência fixa, com início/fim inclusivos. SHALL usar data efetiva do recebimento para entrada e lotes e data da venda para vendas, incluindo quitadas. Entrada SHALL identificar o recebimento da parcela 1 paga na data da venda, uma vez, sem segunda linha/valor pelo metadado ou pelas alocações. SHALL não oferecer seletor, gráfico ou faixa de quatro indicadores.

#### Scenario: Conferir recebimentos sem dupla contagem
- **WHEN** o mês contiver entrada e lote de várias parcelas, inclusive de venda de outro mês
- **THEN** SHALL listar entrada e lote uma vez cada, com origem, venda, data, forma, valor e soma exata em BRL
- **AND** SHALL incluir primeiro e último dia do mês e excluir recebimentos externos
- **AND** SHALL não somar alocações ou valor separado da entrada novamente nem confundir vencimento e data efetiva
- **AND** a linha de origem Entrada SHALL corresponder à parcela 1 Paga no detalhe

#### Scenario: Conferir vendas do mês
- **WHEN** houver vendas dentro e fora do mês da referência
- **THEN** SHALL listar todas as vendas do período, abertas ou quitadas, com cliente, data e total
- **AND** SHALL informar quantidade e total vendido sem filtrar pela data de pagamentos ou situação atual

#### Scenario: Reconciliar entrada e lote na mesma venda
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e pagar parcelas 2 e 3 por R$ 400,00 no mesmo mês
- **THEN** recebimentos SHALL totalizar R$ 600,00, em uma entrada e um lote
- **AND** detalhe SHALL mostrar 3/10 pagas e saldo R$ 1.400,00; indicadores e consulta por período SHALL reconciliar sem duplicação
