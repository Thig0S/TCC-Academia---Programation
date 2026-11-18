# dominio-vendas Specification

## Purpose

Definir o comportamento financeiro demonstrativo de vendas e parcelas, permitindo que consultas e comandos internos compartilhem datas, valores e projeções reconciliáveis sem depender da interface.

## Requirements

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

O domínio SHALL aceitar somente centavos inteiros seguros, total positivo, entrada ausente de valor zero ou presente entre zero e total estritamente, e quantidade inteira positiva não superior ao saldo em centavos. SHALL rejeitar parcelas inferiores a um centavo e resultados ou somas inseguras, sem impor teto comercial arbitrário.

#### Scenario: Rejeitar entrada integral e valores inválidos
- **WHEN** o comando informar entrada igual ou superior ao total, entrada negativa, total não positivo, valor fracionário em centavos, quantidade inválida ou quantidade superior ao saldo em centavos
- **THEN** SHALL retornar erro de validação e não criar venda, parcela ou recebimento

#### Scenario: Rejeitar overflow do conjunto
- **WHEN** uma operação individualmente válida causar soma de centavos fora dos inteiros seguros em alguma projeção do conjunto
- **THEN** SHALL rejeitar a operação sem publicar estado com totais imprecisos

### Requirement: Distribuição exata de centavos

O parcelamento SHALL dividir o saldo após entrada em centavos inteiros, atribuindo o quociente a todas as parcelas e distribuindo um centavo adicional nas primeiras até consumir o resto. A soma SHALL conservar o saldo e a diferença entre parcelas SHALL ser de no máximo um centavo.

#### Scenario: Dividir cem reais em três parcelas
- **WHEN** parcelar 10.000 centavos em três parcelas sem entrada
- **THEN** SHALL gerar 3.334, 3.333 e 3.333 centavos nessa ordem
- **AND** a soma SHALL ser 10.000 centavos

### Requirement: Datas civis e vencimentos mensais

O domínio SHALL tratar datas como dias civis válidos de 0001-01-01 a 9999-12-31 no calendário gregoriano. Venda SHALL não ser futura em relação à referência. A primeira parcela SHALL vencer no mês seguinte, no dia original ou no último dia do mês se inexistente, preservando o dia-base nos meses posteriores e rejeitando datas fora do intervalo.

#### Scenario: Preservar dia-base após fevereiro
- **WHEN** gerar três parcelas para venda em 31/01/2027
- **THEN** SHALL produzir vencimentos em 28/02/2027, 31/03/2027 e 30/04/2027
- **AND** em ano bissexto fevereiro SHALL admitir o dia 29 sem deslocar março

#### Scenario: Rejeitar datas inválidas e preservar o dia entre fusos
- **WHEN** validar 29/02/2027, uma venda posterior à referência ou um parcelamento que ultrapasse o ano 9999
- **THEN** SHALL rejeitar o caso sem mutação
- **AND** parse, comparação e apresentação de uma data válida SHALL preservar seu dia em fusos distintos

### Requirement: Entrada como recebimento separado

Uma entrada presente SHALL ter valor e forma obrigatórios e data igual à data da venda. SHALL compor total pago e recebimentos do período uma vez, reduzir o saldo parcelado e permanecer separada dos pagamentos de parcelas, sem incrementar a quantidade de parcelas pagas.

#### Scenario: Conciliar venda com entrada
- **WHEN** cadastrar venda de 100.000 centavos com entrada de 20.000 e quatro parcelas
- **THEN** SHALL obter pago de 20.000, saldo de 80.000, quatro parcelas de 20.000 e zero parcelas pagas
- **AND** a entrada SHALL aparecer nos recebimentos pela data da venda, nunca como parcela

#### Scenario: Validar forma e ausência de entrada
- **WHEN** houver entrada sem forma aceita ou com data diferente da venda
- **THEN** SHALL rejeitar o cadastro sem mutação
- **AND** um cadastro sem entrada SHALL não inventar data ou forma de recebimento para o valor zero

### Requirement: Classificação derivada de parcelas e vendas

Uma parcela SHALL ser Paga quando liquidada; pendente anterior à referência SHALL ser Atrasado; entre referência e +7 dias inclusive, Próximos dias; depois, Aberto. Uma venda SHALL ser Quitada se saldo zero; senão Atrasada se houver atraso; senão Próximos dias se houver parcela nessa janela; senão Em aberto.

#### Scenario: Cobrir bordas de vencimento e precedência
- **WHEN** classificar parcelas pendentes vencendo ontem, hoje, em +7 e em +8 dias
- **THEN** SHALL obter Atrasado, Próximos dias, Próximos dias e Aberto, respectivamente
- **AND** uma parcela paga SHALL permanecer Paga independentemente do vencimento
- **AND** uma venda com atraso e parcela próxima SHALL ser Atrasada

#### Scenario: Separar abertas de quitadas
- **WHEN** consultar vendas com saldo positivo e vendas com saldo zero
- **THEN** a projeção de abertas SHALL incluir todas as de saldo positivo, mesmo Atrasadas ou Próximos dias
- **AND** quitadas SHALL aparecer somente na projeção de quitadas, preservando dados e parcelas

### Requirement: Saldos e próximo vencimento reconciliáveis

O domínio SHALL derivar total pago da entrada mais recebimentos aceitos, saldo do total menos pago e quantidade paga das parcelas liquidadas. O saldo SHALL igualar a soma das parcelas pendentes. Próximo vencimento SHALL ser a menor data pendente, inclusive vencida, ou ausência explícita quando não houver pendências.

#### Scenario: Liquidar duas parcelas com entrada prévia
- **WHEN** uma venda de 100.000 centavos, entrada de 20.000 e quatro parcelas de 20.000 receber as duas primeiras em um lote de 40.000
- **THEN** SHALL resultar em pago de 60.000, saldo de 40.000 e duas de quatro parcelas pagas
- **AND** SHALL contar o recebimento uma única vez e usar a terceira parcela como próximo vencimento

### Requirement: Resumos globais e períodos civis explícitos

As projeções SHALL somar saldos pendentes no total em aberto, somente parcelas pendentes vencidas no atraso, entradas e pagamentos por data de recebimento no mês civil da referência e todas as vendas na contagem de cadastradas. Busca e filtros de lista SHALL não alterar esses resumos. Consultas por período SHALL usar limites civis inclusivos, com vendas pela data da venda.

#### Scenario: Conciliar mês e universos
- **WHEN** consultar um mês com entrada no primeiro dia, pagamento no último, recebimentos fora do mês e vendas quitadas
- **THEN** SHALL incluir as duas bordas nos recebimentos e excluir valores fora do mês
- **AND** SHALL contar quitadas entre cadastradas e não contar parcelas futuras nos valores em atraso
- **AND** filtros de lista SHALL não modificar os valores globais

#### Scenario: Consultar coleção vazia e intervalo inválido
- **WHEN** consultar projeções sem vendas
- **THEN** os totais e contagens SHALL ser zero e as coleções SHALL ser vazias
- **AND** um intervalo de consulta invertido ou com data inválida SHALL retornar erro de validação, sem interpretação silenciosa
