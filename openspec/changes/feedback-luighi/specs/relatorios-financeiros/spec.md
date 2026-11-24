# Spec Delta

## MODIFIED Requirements

### Requirement: Análises mensais identificadas

Relatórios SHALL apresentar Recebimentos no mês de todos os status por data efetiva e Vendas no mês apenas de Ativas, pelo mês civil da referência com início/fim inclusivos. O total de vendas SHALL usar o total efetivo com acréscimos aceitos; a entrada SHALL contar como recebimento da parcela 1 uma vez. SHALL não oferecer seletor, gráfico ou faixa de quatro indicadores nesta Change; o dashboard é planejado separadamente.

#### Scenario: Conferir recebimentos sem dupla contagem
- **WHEN** o mês contiver entrada e lote de várias parcelas, inclusive de venda de outro mês
- **THEN** SHALL listar entrada e lote uma vez cada, com origem, venda, data, forma, valor e soma exata em BRL
- **AND** SHALL incluir primeiro e último dia do mês e excluir recebimentos externos
- **AND** SHALL não somar alocações ou valor separado da entrada novamente nem confundir vencimento e data efetiva
- **AND** a linha de origem Entrada SHALL corresponder à parcela 1 Paga no detalhe

#### Scenario: Conferir vendas do mês
- **WHEN** houver vendas Ativas, Inativas e Prejuízo dentro e fora do mês da referência
- **THEN** SHALL listar apenas Ativas do período, abertas ou quitadas, com cliente, data e total efetivo
- **AND** SHALL informar quantidade e total vendido sem filtrar pela data de pagamentos ou situação financeira atual

#### Scenario: Reconciliar entrada e lote na mesma venda
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e pagar parcelas 2 e 3 por R$ 400,00 no mesmo mês
- **THEN** recebimentos SHALL totalizar R$ 600,00, em uma entrada e um lote
- **AND** detalhe SHALL mostrar 3/10 pagas e saldo R$ 1.400,00; indicadores e consulta por período SHALL reconciliar sem duplicação

#### Scenario: Preservar dinheiro recebido de venda inativada
- **WHEN** uma venda com recebimento no mês for inativada ou marcada Prejuízo
- **THEN** SHALL manter esse recebimento na seção mensal, mas retirar a venda do total operacional de Vendas no mês

#### Scenario: Incluir venda reativada nas posições operacionais
- **WHEN** uma venda Inativa for reativada como Ativa
- **THEN** SHALL voltar uma única vez às seções operacionais aplicáveis conforme período e saldo atual
- **AND** seus recebimentos históricos SHALL permanecer no mês da data efetiva, sem duplicação

### Requirement: Posição de saldos e parcelas vencidas

Relatórios SHALL apresentar Parcelas em aberto como posição de saldos positivos por venda Ativa e Parcelas vencidas como pendências atrasadas somente de Ativas, na referência da sessão. SHALL exibir CPF e telefone em ambas, primeiro vencimento pendente na posição em aberto e ordenar essa posição e as vencidas pelas datas respectivas crescentes. SHALL manter totais próprios separados das análises mensais.

#### Scenario: Distinguir posição atual de movimentação mensal
- **WHEN** uma venda Ativa de mês anterior ainda tiver saldo e parcela atrasada na referência
- **THEN** SHALL aparecer na posição em aberto e sua parcela na seção de vencidas, mesmo ausente das vendas do mês
- **AND** posição em aberto SHALL identificar cliente, CPF, telefone, data da venda, primeiro vencimento pendente e saldo; vencidas SHALL identificar venda, CPF, telefone, número, vencimento e valor da parcela
- **AND** após receber a parcela SHALL atualizar ambas as posições coerentemente com os detalhes, sem alterar a referência

#### Scenario: Ordenar vencimentos sem perder origem
- **WHEN** houver datas diferentes, empates e múltiplas parcelas vencidas
- **THEN** Parcelas em aberto SHALL ordenar pelo primeiro vencimento pendente e vencidas SHALL ordenar por vencimento crescente, mantendo empates estáveis
- **AND** o link existente no nome do cliente SHALL abrir o detalhe identificado pelo mesmo ID

## ADDED Requirements

### Requirement: Grid separado de contratos em Prejuízo

Relatórios SHALL exibir pendências das vendas Prejuízo em grid próprio, sem incluí-las no total operacional em aberto. SHALL mostrar contratos com ou sem pagamentos, mas somar no total de prejuízo somente parcelas pendentes de contratos sem nenhum pagamento, distinguindo visualmente linhas não somadas.

#### Scenario: Mostrar contrato com recebimento anterior sem somar
- **WHEN** uma venda Prejuízo tiver entrada ou outra parcela paga e ainda tiver parcelas pendentes
- **THEN** SHALL mostrar suas pendências no grid, sem contribuir para o total de prejuízo
- **AND** o pagamento anterior SHALL continuar visível no relatório mensal da data efetiva

#### Scenario: Somar somente contratos sem pagamento
- **WHEN** uma venda Prejuízo não tiver recebimentos e tiver duas parcelas pendentes
- **THEN** SHALL somar ambas pelo valor-base uma vez no total separado de prejuízo, sem modificar saldo ou registrar recebimento
