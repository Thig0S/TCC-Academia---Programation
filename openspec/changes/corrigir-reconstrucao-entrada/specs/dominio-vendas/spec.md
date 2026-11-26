# Spec Delta

## MODIFIED Requirements

### Requirement: Entrada como primeira parcela paga

No cadastro ou na reconstrução, uma entrada presente SHALL exigir valor e forma aceitos, data igual à venda e representar a parcela 1 Paga, incluída nas N parcelas e na contagem de pagas, com alocação igual à base e ao recebimento. SHALL reduzir o saldo futuro e integrar total pago e recebimentos do período uma única vez como liquidação integral dessa parcela, nunca como valor adicional separado. SHALL não admitir novo recebimento da entrada.

#### Scenario: Conciliar venda com entrada
- **WHEN** cadastrar venda de R$ 2.000,00 em 10x com R$ 200,00 de entrada
- **THEN** SHALL obter dez parcelas: uma entrada Paga de R$ 200,00 e nove futuras de R$ 200,00
- **AND** SHALL resultar em pago R$ 200,00, saldo R$ 1.800,00, 1/10 paga e recebimento de R$ 200,00 na data da venda uma vez

#### Scenario: Validar forma e ausência de entrada
- **WHEN** houver entrada sem forma aceita ou com data diferente da venda
- **THEN** SHALL rejeitar o cadastro sem mutação
- **AND** sem entrada SHALL não inventar data ou forma de recebimento, e todas as N parcelas SHALL iniciar pendentes

#### Scenario: Recusar alocação de entrada inferior ao valor recebido
- **WHEN** reconstruir histórico sintético válido nos demais campos, com total-base de 20.000 centavos, duas parcelas de 10.000, entrada recebida de 10.000 e alocação de 1 ou 9.999 centavos à parcela 1
- **THEN** SHALL rejeitar a reconstrução com falha de validação, código `historico-invalido`, campo `recebimentos.alocacoes` e mensagem pública em pt-BR
- **AND** SHALL não disponibilizar venda como sucesso, alterar os dados de entrada ou ajustar o valor informado silenciosamente

#### Scenario: Recusar alocação de entrada superior ao valor recebido
- **WHEN** reconstruir o mesmo contrato com entrada recebida de 10.000 centavos e alocação de 10.001 centavos à parcela 1
- **THEN** SHALL rejeitar a reconstrução com falha de validação, código `historico-invalido` e campo `recebimentos.alocacoes`, antes de devolver a venda
- **AND** SHALL preservar os dados de entrada e qualquer conjunto anterior, sem normalizar a divergência ou adiar a rejeição para uma projeção

#### Scenario: Reconstruir entrada exata e manter projeções reconciliadas
- **WHEN** reconstruir venda sintética Ativa de 20.000 centavos, em duas parcelas de 10.000, com entrada recebida e alocada de 10.000 na data da venda e sem outros recebimentos
- **THEN** SHALL aceitar o histórico e sua inclusão em conjunto válido, preservando IDs, origens e valores
- **AND** a projeção na mesma referência válida SHALL ter base e efetivo de 20.000, recebido de 10.000, saldo de 10.000 e 1/2 paga
- **AND** a consulta do período que contém a entrada SHALL somar 10.000 uma única vez, sem modificar o histórico ou o conjunto
