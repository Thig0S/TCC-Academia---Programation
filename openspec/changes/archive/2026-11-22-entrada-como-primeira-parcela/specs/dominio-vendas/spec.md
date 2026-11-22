# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Entrada como recebimento separado`
- TO: `### Requirement: Entrada como primeira parcela paga`

## MODIFIED Requirements

### Requirement: Valores financeiros seguros e limites do parcelamento

O domínio SHALL aceitar somente centavos inteiros seguros, total positivo e N inteiro seguro: mínimo 1 sem entrada e 2 com entrada. Entrada presente SHALL ser positiva e menor que o total. A quantidade de parcelas futuras (N sem entrada, N−1 com entrada) SHALL não superar o saldo em centavos. SHALL rejeitar parcelas inferiores a um centavo, resultados/somas inseguras e cadastro já quitado, sem teto comercial arbitrário.

#### Scenario: Rejeitar entrada integral e valores inválidos
- **WHEN** informar entrada igual/superior ao total, negativa ou zero quando presente, total não positivo, centavos fracionários, N inválido ou mais parcelas futuras que centavos do saldo
- **THEN** SHALL retornar validação sem criar venda, parcela ou recebimento
- **AND** entrada com N=1 SHALL ser rejeitada; sem entrada N=1 SHALL continuar permitido se os demais dados forem válidos

#### Scenario: Aceitar o mínimo com entrada
- **WHEN** cadastrar total de dois centavos, entrada de um centavo e N=2, com datas e forma válidas
- **THEN** SHALL gerar uma parcela de um centavo paga e outra de um centavo pendente

#### Scenario: Rejeitar overflow do conjunto
- **WHEN** uma operação individualmente válida causar soma de centavos fora dos inteiros seguros em alguma projeção do conjunto
- **THEN** SHALL rejeitar a operação sem publicar estado com totais imprecisos

### Requirement: Distribuição exata de centavos

O parcelamento SHALL dividir o saldo após entrada entre N−1 futuras quando houver entrada, ou o total entre N futuras sem entrada. SHALL atribuir o quociente inteiro às futuras e um centavo adicional nas primeiras futuras até consumir o resto. A entrada SHALL conservar o valor informado, podendo diferir das outras. A soma de todas as parcelas SHALL ser o total; diferença máxima de um centavo SHALL aplicar-se somente às futuras.

#### Scenario: Dividir cem reais em três parcelas
- **WHEN** parcelar 10.000 centavos em três parcelas sem entrada
- **THEN** SHALL gerar 3.334, 3.333 e 3.333 centavos nessa ordem
- **AND** a soma SHALL ser 10.000 centavos

#### Scenario: Entrada com valor diferente das parcelas futuras
- **WHEN** cadastrar R$ 2.000,00 em 10 parcelas com entrada de R$ 500,00
- **THEN** a parcela 1 SHALL manter R$ 500,00, seguida de seis de R$ 166,67 e três de R$ 166,66
- **AND** SHALL conservar R$ 2.000,00 no total, sem redistribuir centavos para a entrada

### Requirement: Datas civis e vencimentos mensais

O domínio SHALL tratar datas como dias civis válidos de 0001-01-01 a 9999-12-31 no calendário gregoriano. Venda SHALL não ser futura à referência. A entrada SHALL vencer e ser paga na data da venda; a primeira pendente SHALL vencer no mês seguinte, no dia original ou último dia do mês se inexistente. SHALL preservar o dia-base nos meses posteriores e rejeitar datas irrepresentáveis, considerando somente a quantidade de futuras.

#### Scenario: Preservar dia-base após fevereiro
- **WHEN** gerar três parcelas sem entrada para venda em 31/01/2027
- **THEN** SHALL produzir vencimentos em 28/02/2027, 31/03/2027 e 30/04/2027
- **AND** em ano bissexto fevereiro SHALL admitir o dia 29 sem deslocar março

#### Scenario: Vencer a entrada no dia da venda
- **WHEN** gerar quatro parcelas no total com entrada em venda de 31/01/2027
- **THEN** a parcela 1 SHALL vencer e estar Paga em 31/01/2027, e as parcelas 2 a 4 SHALL vencer em 28/02, 31/03 e 30/04/2027

#### Scenario: Rejeitar datas inválidas e preservar o dia entre fusos
- **WHEN** validar 29/02/2027, venda posterior à referência ou parcelamento cujas futuras ultrapassem 9999
- **THEN** SHALL rejeitar sem mutação
- **AND** parse, comparação e apresentação de data válida SHALL preservar seu dia em fusos distintos

#### Scenario: Não contar entrada como mês futuro
- **WHEN** cadastrar em novembro/9999 uma venda em duas parcelas com entrada e referência que admita a data
- **THEN** SHALL aceitar o calendário com entrada no dia da venda e única futura em dezembro/9999
- **AND** exigir mais uma futura além do calendário SHALL rejeitar o cadastro

### Requirement: Entrada como primeira parcela paga

Uma entrada presente SHALL exigir valor e forma aceitos, data igual à venda e representar a parcela 1 Paga, incluída nas N parcelas e na contagem de pagas. SHALL reduzir o saldo futuro e integrar total pago e recebimentos do período uma única vez como liquidação integral dessa parcela, nunca como valor adicional separado. SHALL não admitir novo recebimento da entrada.

#### Scenario: Conciliar venda com entrada
- **WHEN** cadastrar venda de R$ 2.000,00 em 10x com R$ 200,00 de entrada
- **THEN** SHALL obter dez parcelas: uma entrada Paga de R$ 200,00 e nove futuras de R$ 200,00
- **AND** SHALL resultar em pago R$ 200,00, saldo R$ 1.800,00, 1/10 paga e recebimento de R$ 200,00 na data da venda uma vez

#### Scenario: Validar forma e ausência de entrada
- **WHEN** houver entrada sem forma aceita ou com data diferente da venda
- **THEN** SHALL rejeitar o cadastro sem mutação
- **AND** sem entrada SHALL não inventar data ou forma de recebimento, e todas as N parcelas SHALL iniciar pendentes

### Requirement: Saldos e próximo vencimento reconciliáveis

O domínio SHALL derivar total pago dos recebimentos aceitos, incluindo uma vez o da entrada, e nunca somar novamente entrada ou alocações. Saldo SHALL ser total menos pago e igualar a soma das pendentes. Quantidade paga SHALL contar todas as parcelas liquidadas, inclusive a entrada. Próximo vencimento SHALL ser a menor data pendente, inclusive vencida, ou ausência explícita sem pendências.

#### Scenario: Liquidar duas parcelas com entrada prévia
- **WHEN** uma venda de R$ 2.000,00 em 10x, entrada de R$ 200,00 já paga, receber as parcelas 2 e 3 num lote de R$ 400,00
- **THEN** SHALL resultar em pago R$ 600,00, saldo R$ 1.400,00 e 3/10 pagas
- **AND** SHALL contar o lote uma única vez e usar a parcela 4 como próximo vencimento

### Requirement: Resumos globais e períodos civis explícitos

As projeções SHALL somar saldos no total em aberto, somente pendentes vencidas no atraso e recebimentos aceitos por data efetiva no mês civil, incluindo a entrada uma vez. SHALL contar todas as vendas, inclusive quitadas. Busca e filtros SHALL não alterar resumos. Períodos SHALL ser civis inclusivos, com vendas pela data da venda; entrada ou alocações SHALL não ser somadas novamente ao recebimento.

#### Scenario: Conciliar mês e universos
- **WHEN** consultar mês com entrada no primeiro dia, lote no último, recebimentos fora do mês e vendas quitadas
- **THEN** SHALL incluir as duas bordas nos recebimentos e excluir os valores externos ao período
- **AND** SHALL contar quitadas entre cadastradas, não incluir futuras ou entrada paga nos valores em atraso e não alterar totais ao filtrar listas
- **AND** a entrada SHALL contribuir uma vez, mesmo visível no resumo e na tabela de parcelas

#### Scenario: Consultar coleção vazia e intervalo inválido
- **WHEN** consultar projeções sem vendas
- **THEN** totais e contagens SHALL ser zero e coleções vazias
- **AND** intervalo invertido ou data inválida SHALL retornar validação sem interpretação silenciosa
