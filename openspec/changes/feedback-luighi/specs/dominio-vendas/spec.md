# Spec Delta

## ADDED Requirements

### Requirement: Status administrativo independente da situação financeira

Cada venda SHALL ter status Ativo, Inativo ou Prejuízo, inicialmente Ativo, independente da situação financeira derivada. As únicas transições permitidas SHALL ser Ativo→Inativo, Ativo→Prejuízo com saldo aberto, Inativo→Ativo e Prejuízo→Ativo. Transição direta Inativo↔Prejuízo SHALL ser rejeitada; solicitar o status atual novamente SHALL ser aceito como no-op idempotente, sem mutação.

#### Scenario: Marcar e reabrir prejuízo
- **WHEN** uma venda Ativa com parcelas pendentes for marcada Prejuízo e depois reaberta
- **THEN** SHALL passar de Ativo para Prejuízo e retornar a Ativo preservando ID, parcelas, vencimentos e recebimentos
- **AND** a situação de atraso ou quitação SHALL continuar derivada, sem inferir Prejuízo automaticamente

#### Scenario: Reativar venda Inativa
- **WHEN** uma venda Inativa for reativada
- **THEN** SHALL voltar a Ativo e à coleção normal correspondente ao saldo, preservando o mesmo ID
- **AND** parcelas, recebimentos e valores SHALL permanecer inalterados

#### Scenario: Rejeitar transição direta entre Inativo e Prejuízo
- **WHEN** for solicitada transição direta Inativo→Prejuízo ou Prejuízo→Inativo
- **THEN** SHALL rejeitar a solicitação sem alterar status, parcelas, recebimentos ou projeções

#### Scenario: Repetir o status atual
- **WHEN** for solicitado novamente o status administrativo que a venda já possui
- **THEN** SHALL aceitar a solicitação como no-op idempotente
- **AND** SHALL preservar integralmente o registro e não duplicar efeitos nas projeções

#### Scenario: Recusar prejuízo em venda quitada
- **WHEN** a venda não tiver parcelas pendentes e a pessoa solicitar Prejuízo
- **THEN** SHALL rejeitar a mudança sem alterar o registro

### Requirement: Total efetivo com acréscimo externo

O valor-base da venda e de cada parcela SHALL permanecer imutável. Para pagamento individual, valor efetivo SHALL ser ao menos o valor-base da parcela; total efetivo da venda SHALL somar os acréscimos aceitos ao total-base, sem calcular juros ou gerar crédito residual.

#### Scenario: Receber com acréscimo
- **WHEN** uma parcela-base de R$ 100,00 for paga por R$ 110,00
- **THEN** SHALL registrar acréscimo de R$ 10,00, aumentar o total efetivo da venda em R$ 10,00 e o recebido em R$ 110,00
- **AND** parcelas futuras e seus valores-base SHALL permanecer inalterados

## MODIFIED Requirements

### Requirement: Classificação derivada de parcelas e vendas

Uma parcela SHALL ser Paga quando liquidada; pendente anterior à referência SHALL ser Atrasado; entre referência e +7 dias inclusive, Próximos dias; depois, Aberto. Uma venda SHALL ser Quitada se não houver pendentes; senão Atrasada se houver atraso; senão Próximos dias se houver parcela nessa janela; senão Em aberto. Status administrativo SHALL ser independente dessas situações.

#### Scenario: Cobrir bordas de vencimento e precedência
- **WHEN** classificar parcelas pendentes vencendo ontem, hoje, em +7 e em +8 dias
- **THEN** SHALL obter Atrasado, Próximos dias, Próximos dias e Aberto, respectivamente
- **AND** uma parcela paga SHALL permanecer Paga independentemente do vencimento
- **AND** uma venda com atraso e parcela próxima SHALL ser Atrasada

#### Scenario: Separar abertas de quitadas
- **WHEN** consultar vendas Ativas com saldo positivo e vendas Ativas com saldo zero
- **THEN** a projeção normal de abertas SHALL incluir somente Ativas de saldo positivo, mesmo Atrasadas ou Próximos dias
- **AND** Ativas quitadas SHALL aparecer somente na projeção de quitadas, preservando dados e parcelas
- **AND** Inativas e Prejuízo SHALL conservar sua situação financeira no detalhe, mas permanecer fora das duas coleções normais

### Requirement: Saldos e próximo vencimento reconciliáveis

O domínio SHALL derivar total pago dos recebimentos efetivos aceitos, incluindo uma vez o da entrada e nunca somando novamente entrada ou alocações. O saldo SHALL igualar a soma dos valores-base pendentes e ao total efetivo menos o pago. Quantidade paga SHALL contar parcelas liquidadas, inclusive entrada. Próximo vencimento SHALL ser a menor data pendente, inclusive vencida, ou ausência explícita sem pendências.

#### Scenario: Liquidar duas parcelas com entrada prévia
- **WHEN** uma venda de R$ 2.000,00 em 10x, entrada de R$ 200,00 já paga, receber as parcelas 2 e 3 num lote de R$ 400,00
- **THEN** SHALL resultar em pago R$ 600,00, saldo R$ 1.400,00 e 3/10 pagas
- **AND** SHALL contar o lote uma única vez e usar a parcela 4 como próximo vencimento

#### Scenario: Corrigir acréscimo sem alterar saldo-base
- **WHEN** corrigir pagamento de R$ 110,00 para R$ 105,00 em parcela-base de R$ 100,00
- **THEN** o total efetivo SHALL reduzir R$ 5,00, o recebido SHALL reduzir R$ 5,00 e o saldo das demais pendentes SHALL permanecer igual
- **AND** a identidade da parcela e do pagamento SHALL permanecer estável

### Requirement: Resumos globais e períodos civis explícitos

As projeções SHALL somar saldos e atrasos apenas de Ativas e contar vendas Ativas, inclusive quitadas, nos indicadores operacionais e períodos de vendas. Recebimentos aceitos de qualquer status SHALL permanecer no mês da data efetiva, incluindo a entrada uma vez. Busca/filtros SHALL não alterar resumos. Períodos SHALL ser civis inclusivos; alocações e entrada SHALL não ser somadas novamente ao pagamento.

#### Scenario: Conciliar mês e universos
- **WHEN** consultar mês com entrada no primeiro dia, lote no último, recebimentos fora do mês e vendas Ativas quitadas
- **THEN** SHALL incluir as duas bordas nos recebimentos e excluir os valores externos ao período
- **AND** SHALL contar Ativas quitadas entre cadastradas, não incluir futuras ou entrada paga nos valores em atraso e não alterar totais ao filtrar listas
- **AND** a entrada SHALL contribuir uma vez, mesmo visível no resumo e na tabela de parcelas

#### Scenario: Consultar coleção vazia e intervalo inválido
- **WHEN** consultar projeções sem vendas
- **THEN** os totais e contagens SHALL ser zero e as coleções SHALL ser vazias
- **AND** um intervalo de consulta invertido ou com data inválida SHALL retornar erro de validação, sem interpretação silenciosa

#### Scenario: Preservar recebimento histórico após inativar
- **WHEN** uma venda com pagamento no mês for inativada ou marcada Prejuízo
- **THEN** saldo, atraso, contagem e valor de vendas operacionais SHALL excluir a venda
- **AND** recebimento efetivamente registrado SHALL continuar incluído uma vez no mês de sua data, sem estorno fictício
