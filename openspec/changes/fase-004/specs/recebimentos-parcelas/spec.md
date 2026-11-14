# Spec Delta

## Purpose

Garantir que a simulação de recebimentos liquide parcelas integralmente e na ordem correta, inclusive em lote antecipado, sem saltos, duplicidade ou alterações financeiras parciais.

## ADDED Requirements

### Requirement: Seleção sequencial desde a primeira parcela pendente

O recebimento SHALL aceitar uma seleção não vazia de parcelas da mesma venda que corresponda exatamente às primeiras parcelas ainda pendentes, consecutivas por número. SHALL rejeitar salto de pendência anterior, identificadores repetidos, ausentes ou pertencentes a outra venda e parcelas já pagas.

#### Scenario: Proibir pagamento fora de ordem
- **WHEN** janeiro, fevereiro e março estiverem pendentes e for solicitado pagar fevereiro sozinha ou janeiro e março
- **THEN** SHALL rejeitar toda a operação e manter as três parcelas pendentes

#### Scenario: Aceitar uma ou mais parcelas em ordem
- **WHEN** janeiro estiver paga e for solicitado liquidar fevereiro, ou fevereiro e março, ainda pendentes
- **THEN** SHALL aceitar a seleção se os demais dados forem válidos
- **AND** a ordem textual dos IDs informados SHALL não autorizar saltos nem afetar a ordem canônica das parcelas

#### Scenario: Rejeitar identificadores inválidos
- **WHEN** houver seleção vazia, ID duplicado, parcela paga, parcela desconhecida ou de outra venda
- **THEN** SHALL retornar rejeição identificável sem criar recebimento ou liquidar qualquer parcela

### Requirement: Valor integral exato do lote

O valor recebido SHALL ser exatamente a soma segura dos saldos das parcelas selecionadas. O recebimento SHALL liquidar integralmente cada parcela, com uma alocação por parcela. Valores parciais ou excedentes, juros, descontos, estorno e crédito residual SHALL não ser aceitos por este fluxo.

#### Scenario: Confirmar soma integral
- **WHEN** selecionar três parcelas pendentes de 20.000 centavos e informar 60.000 centavos
- **THEN** SHALL criar um recebimento de 60.000 com três alocações de 20.000, liquidando as três parcelas
- **AND** total pago e recebimentos do período SHALL crescer somente 60.000 centavos

#### Scenario: Rejeitar valor diferente da soma
- **WHEN** a soma selecionada for 60.000 centavos e o valor informado for 59.999 ou 60.001
- **THEN** SHALL rejeitar o lote inteiro, sem arredondamento, crédito ou alocação parcial

### Requirement: Antecipação com data e forma comuns

Um lote sequencial SHALL admitir parcelas futuras e usar uma única data civil entre a data da venda e a referência da sessão, inclusive, e uma única forma: Dinheiro, Pix, Cartão de débito ou Cartão de crédito. SHALL registrar apenas a categoria, sem processamento financeiro nem dados de cartão ou bancários.

#### Scenario: Antecipar parcelas futuras
- **WHEN** em janeiro for solicitado liquidar janeiro, fevereiro e março consecutivamente com data válida e Pix
- **THEN** SHALL aceitar a antecipação sem juros ou descontos e atribuir a mesma data e forma às três liquidações

#### Scenario: Validar bordas de data e forma
- **WHEN** a data for igual à data da venda ou à referência e a forma for aceita
- **THEN** SHALL admitir o recebimento se o restante for válido
- **AND** data inválida, anterior à venda ou posterior à referência, ou forma ausente/desconhecida SHALL rejeitar todo o lote

### Requirement: Confirmação atômica e revalidação de elegibilidade

A confirmação SHALL revalidar todas as parcelas no estado atual e publicar venda, histórico e projeções como uma única alteração. Qualquer erro de validação ou falha durante a preparação SHALL preservar integralmente o estado anterior e produzir resultado sem sucesso. Preparar uma seleção ou cancelá-la SHALL não registrar recebimento.

#### Scenario: Falhar em parte posterior do lote
- **WHEN** a primeira parcela puder ser preparada, mas outra parcela ou a validação final do agregado falhar em teste controlado
- **THEN** SHALL não existir alocação, pagamento ou alteração parcial de saldo
- **AND** SHALL retornar falha sem sucesso, mantendo a possibilidade de nova tentativa válida

#### Scenario: Revalidar seleção obsoleta e confirmação repetida
- **WHEN** um lote for aceito e o mesmo comando for repetido, ou outra seleção previamente preparada contiver parcelas agora pagas
- **THEN** SHALL rejeitar a nova operação sem criar segundo recebimento
- **AND** a seleção antiga SHALL não ser deslocada automaticamente para as próximas parcelas

#### Scenario: Descartar preparação e tratar venda ausente
- **WHEN** uma seleção for descartada antes da confirmação ou for confirmado pagamento de venda inexistente
- **THEN** SHALL não alterar nenhum registro
- **AND** a confirmação de venda inexistente SHALL informar ausência, sem inventar venda ou anunciar sucesso
