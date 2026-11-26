# Spec Delta

## MODIFIED Requirements

### Requirement: Resumos globais e períodos civis explícitos

As projeções SHALL somar saldos e atrasos apenas de Ativas e contar vendas Ativas, inclusive quitadas, nos indicadores operacionais e períodos de vendas. A coleção de vendas de uma consulta por período SHALL incluir somente Ativas cuja data da venda pertença ao intervalo inclusivo, preservando a ordem de origem. Recebimentos aceitos de qualquer status SHALL permanecer no período da data efetiva, incluindo a entrada uma vez. Busca/filtros SHALL não alterar resumos. Períodos SHALL ser civis inclusivos; alocações e entrada SHALL não ser somadas novamente ao pagamento.

#### Scenario: Conciliar mês e universos
- **WHEN** consultar mês com entrada no primeiro dia, lote no último, recebimentos fora do mês e vendas quitadas
- **THEN** SHALL incluir as duas bordas nos recebimentos e excluir os valores externos ao período
- **AND** SHALL contar Ativas quitadas entre cadastradas, não incluir futuras ou entrada paga nos valores em atraso e não alterar totais ao filtrar listas
- **AND** a entrada SHALL contribuir uma vez, mesmo visível no resumo e na tabela de parcelas

#### Scenario: Preservar recebimento histórico após inativar
- **WHEN** uma venda com pagamento no mês for inativada ou marcada Prejuízo
- **THEN** saldo, atraso, contagem e valor de vendas operacionais SHALL excluir a venda
- **AND** recebimento efetivamente registrado SHALL continuar incluído uma vez no mês de sua data, sem estorno fictício

#### Scenario: Consultar coleção vazia e intervalo inválido
- **WHEN** consultar projeções sem vendas
- **THEN** os totais e contagens SHALL ser zero e as coleções SHALL ser vazias
- **AND** um intervalo de consulta invertido ou com data inválida SHALL retornar erro de validação, sem interpretação silenciosa

#### Scenario: Separar vendas e recebimentos em período com status mistos
- **WHEN** consultar intervalo com Ativas abertas e quitadas, Inativas e Prejuízo, incluindo vendas e recebimentos em ambas as bordas e fora do intervalo
- **THEN** a coleção de vendas SHALL conter somente Ativas vendidas dentro do intervalo, abertas ou quitadas, na ordem de origem
- **AND** recebimentos de qualquer status dentro do intervalo SHALL contribuir uma vez, mesmo quando a venda tiver data fora do intervalo
- **AND** recebimentos externos SHALL não contribuir e a consulta SHALL preservar todas as vendas, parcelas e recebimentos originais

#### Scenario: Consultar período sem vendas Ativas e com recebimentos
- **WHEN** todas as vendas do intervalo forem Inativas ou Prejuízo e houver recebimentos aceitos no intervalo
- **THEN** a coleção de vendas SHALL ser vazia e o recebido SHALL manter a soma exata desses recebimentos
- **AND** a consulta SHALL não reativar, excluir ou modificar contratos para produzir a resposta

## ADDED Requirements

### Requirement: Reconstrução independente de tentativas rejeitadas

A reconstrução SHALL permitir uma tentativa válida após rejeitar histórico de entrada inconsistente, sem estado residual da falha. A tentativa rejeitada SHALL não alterar dados de entrada nem conjunto anteriormente aceito; a tentativa válida SHALL preservar identidade e reconciliação financeira.

#### Scenario: Rejeitar entrada divergente e reconstruir entrada exata em seguida
- **WHEN** um consumidor tentar reconstruir venda-base de 20.000 centavos em duas parcelas de 10.000 com entrada recebida de 10.000 e alocação de 9.999, e em seguida reconstruir a versão válida com alocação de 10.000 na mesma referência civil
- **THEN** a primeira tentativa SHALL falhar com categoria de validação, código `historico-invalido` e campo `recebimentos.alocacoes`, sem disponibilizar venda nem normalizar a alocação
- **AND** a segunda SHALL produzir venda com base e efetivo de 20.000, recebido de 10.000, saldo de 10.000 e 1/2 paga, preservando IDs e origem da entrada
- **AND** incluir a venda válida em conjunto candidato e consultar o período da entrada SHALL contar os 10.000 uma única vez e preservar o conjunto anterior e os dados de ambas as tentativas
