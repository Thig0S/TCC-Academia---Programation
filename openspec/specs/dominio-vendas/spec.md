# dominio-vendas Specification

## Purpose

Definir o comportamento financeiro demonstrativo de vendas e parcelas, permitindo que consultas e comandos internos compartilhem datas, valores e projeções reconciliáveis sem depender da interface.

## Requirements

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

### Requirement: Dados de cliente vinculados à venda

O domínio SHALL manter identificadores estáveis para vendas e parcelas e dados de cliente próprios de cada venda, com nome, CPF e telefone obrigatórios e descrição opcional. Cadastro e edição SHALL validar CPF e telefone conforme os requisitos de identificação. SHALL não exigir cadastro mestre, unicidade de CPF ou consulta externa de identificação.

#### Scenario: Cadastrar duas vendas com os mesmos dados de identificação
- **WHEN** dois comandos válidos informarem os mesmos dados de cliente
- **THEN** SHALL existir uma venda distinta para cada comando aceito, com identificadores de venda e parcelas não colidentes
- **AND** descrição ausente SHALL não impedir o cadastro e os dados SHALL não ser compartilhados como cliente mestre mutável

### Requirement: CPF com formato e verificadores válidos

Cadastro e edição SHALL aceitar CPF obrigatório com ou sem pontuação, exigir 11 dígitos com verificadores válidos e rejeitar sequências repetidas. A validação SHALL ser local, sem unicidade entre vendas ou alegação de existência, titularidade ou inexistência de pessoa real.

#### Scenario: Aceitar formatos equivalentes e CPF repetido entre vendas
- **WHEN** cadastro ou edição informar CPF sintético matematicamente válido com ou sem pontuação
- **THEN** SHALL aceitar as representações equivalentes, sem bloquear por CPF já presente em outra venda
- **AND** SHALL não consultar serviços externos ou propagar alterações para outros registros

#### Scenario: Rejeitar identificação inválida sem mutação
- **WHEN** cadastro ou edição informar CPF vazio, com comprimento diferente de 11 dígitos, verificadores inválidos ou sequência repetida
- **THEN** SHALL retornar validação em português sem criar ou alterar venda, parcelas ou recebimentos
- **AND** SHALL não aceitar marcadores textuais sintéticos como substitutos de CPF válido nesses comandos

### Requirement: Telefone brasileiro com DDD e comprimento válido

Cadastro e edição SHALL exigir telefone brasileiro obrigatório com 10 ou 11 dígitos incluindo DDD, aceitando espaços, parênteses e hífen como formatação. SHALL não aceitar código +55, consultar serviços externos, impor lista de DDDs ou validar prefixos de fixo/celular.

#### Scenario: Aceitar telefone com ou sem formatação
- **WHEN** cadastro ou edição informar telefone sintético com 10 ou 11 dígitos, com ou sem espaços, parênteses e hífen
- **THEN** SHALL aceitar os formatos equivalentes sem exigir DDD ou prefixo pertencente a uma lista
- **AND** a aceitação SHALL não comprovar que o número existe ou não pertence a pessoa real

#### Scenario: Rejeitar telefone fora do formato
- **WHEN** informar telefone vazio, com código +55, letras ou comprimento diferente de 10/11 após remover a formatação permitida
- **THEN** SHALL retornar validação em português sem mutação

### Requirement: Edição limitada aos dados do cliente

Após cadastro, a edição SHALL permitir somente nome, CPF, telefone e descrição da venda selecionada em qualquer situação, inclusive Quitada. SHALL preservar ID, data da venda, valor total, entrada, parcelas, recebimentos e todos os derivados financeiros. Alterações SHALL não se propagar para outras vendas.

#### Scenario: Corrigir cliente em qualquer situação financeira
- **WHEN** editar dados válidos do cliente em venda sem recebimentos, com entrada, com parcelas pagas ou quitada
- **THEN** SHALL atualizar somente os quatro campos autorizados da venda selecionada
- **AND** IDs, data da venda, total, existência/valor/data/forma da entrada, quantidade/valores/vencimentos das parcelas, pagamentos e resumos SHALL permanecer inalterados
- **AND** outra venda com o mesmo CPF SHALL permanecer inalterada

#### Scenario: Preservar histórico diante de tentativa de edição financeira
- **WHEN** uma tentativa de edição pretender modificar data da venda, total, entrada, parcelamento ou pagamentos existentes, mesmo antes de qualquer recebimento
- **THEN** SHALL não efetivar nenhuma alteração financeira ou temporal pela edição
- **AND** registrar novo pagamento permitido SHALL continuar sendo operação distinta da edição de cliente, sem autorização para editar recebimentos anteriores

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

### Requirement: Total efetivo com acréscimo externo

O valor-base da venda e de cada parcela SHALL permanecer imutável. Para pagamento individual, valor efetivo SHALL ser ao menos o valor-base da parcela; total efetivo da venda SHALL somar os acréscimos aceitos ao total-base, sem calcular juros ou gerar crédito residual.

#### Scenario: Receber com acréscimo
- **WHEN** uma parcela-base de R$ 100,00 for paga por R$ 110,00
- **THEN** SHALL registrar acréscimo de R$ 10,00, aumentar o total efetivo da venda em R$ 10,00 e o recebido em R$ 110,00
- **AND** parcelas futuras e seus valores-base SHALL permanecer inalterados

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

O domínio SHALL derivar total pago dos recebimentos efetivos aceitos, incluindo uma vez o da entrada e nunca somando novamente entrada ou alocações. Saldo SHALL igualar a soma dos valores-base pendentes e ao total efetivo menos o pago. Quantidade paga SHALL contar parcelas liquidadas, inclusive entrada. Próximo vencimento SHALL ser a menor data pendente, inclusive vencida, ou ausência explícita sem pendências.

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
