# Spec Delta

## MODIFIED Requirements

### Requirement: Seleção sequencial desde a primeira parcela pendente

O recebimento SHALL aceitar somente a primeira parcela pendente por número da venda, uma por confirmação. SHALL rejeitar múltiplas parcelas, IDs ausentes/desconhecidos/de outra venda, pagas e saltos. A entrada, parcela 1 já paga, SHALL não ser recebível. Confirmação obsoleta SHALL não ser deslocada para outra parcela.

#### Scenario: Proibir pagamento fora de ordem
- **WHEN** janeiro, fevereiro e março estiverem pendentes e for solicitado fevereiro ou mais de uma parcela na mesma confirmação
- **THEN** SHALL rejeitar a operação inteira e manter todas pendentes

#### Scenario: Aceitar uma ou mais parcelas em ordem
- **WHEN** janeiro estiver paga e for solicitado somente fevereiro pendente
- **THEN** SHALL aceitar se os demais dados forem válidos, liberando março somente após o sucesso
- **AND** pagar março SHALL exigir nova confirmação com sua própria data e forma

#### Scenario: Rejeitar identificadores inválidos
- **WHEN** não houver ID único válido, a parcela for paga, desconhecida ou de outra venda
- **THEN** SHALL rejeitar sem criar recebimento ou liquidar qualquer parcela

#### Scenario: Entrada já paga não integra novo lote
- **WHEN** a entrada for parcela 1 Paga e a parcela 2 for a primeira pendente
- **THEN** a elegível SHALL ser a parcela 2 e a entrada SHALL não oferecer Pagar
- **AND** comando que tente receber a entrada SHALL ser rejeitado sem novo recebimento

### Requirement: Valor integral exato do lote

Cada novo recebimento SHALL ter o valor integral derivado da parcela elegível, sem valor informado pelo operador, e uma única alocação. Valores parciais ou excedentes, juros, descontos, estorno e crédito residual SHALL não ser aceitos. Recebimentos históricos com múltiplas alocações SHALL permanecer legíveis sem alteração financeira.

#### Scenario: Confirmar soma integral
- **WHEN** confirmar pagamento válido da primeira pendente de 3.334 centavos
- **THEN** SHALL criar um recebimento e uma alocação de 3.334 centavos sem solicitar valor
- **AND** total pago e recebimentos do período SHALL crescer somente 3.334 centavos

#### Scenario: Rejeitar valor diferente da soma
- **WHEN** um novo pagamento for preparado para uma parcela de 3.333 centavos
- **THEN** o valor SHALL ser obtido do registro atual e SHALL não ser substituível por valor externo, arredondado, parcial ou excedente
- **AND** outra parcela de 3.334 centavos SHALL conservar seu próprio valor sem assumir igualdade entre parcelas

#### Scenario: Preservar lote histórico
- **WHEN** consultar uma venda com recebimento histórico de 60.000 centavos e três alocações de 20.000
- **THEN** SHALL preservar ID, valor, data, forma e alocações sem dividi-lo em novos recebimentos
- **AND** total pago e recebimentos do período SHALL contar os 60.000 uma vez

### Requirement: Antecipação com data e forma comuns

O pagamento individual SHALL admitir parcela futura quando for a primeira pendente e usar uma data civil entre venda e referência fixa da sessão, inclusive. A data inicial SHALL ser essa referência. Forma SHALL exigir Dinheiro, Pix, Cartão de débito ou Cartão de crédito, inicialmente sem seleção válida. SHALL registrar apenas categoria, sem processamento financeiro nem dados bancários/cartão.

#### Scenario: Antecipar parcelas futuras
- **WHEN** em janeiro a primeira pendente vencer em fevereiro e for confirmada com data válida e Pix
- **THEN** SHALL aceitar a antecipação sem juros/descontos ou alteração do vencimento e liberar a próxima pendente
- **AND** antecipar a próxima SHALL exigir outra confirmação, sem seleção múltipla

#### Scenario: Validar bordas de data e forma
- **WHEN** a data for igual à venda ou à referência e a forma for aceita
- **THEN** SHALL admitir o recebimento se o restante for válido
- **AND** data inválida, anterior à venda ou posterior à referência, ou forma ausente/desconhecida SHALL rejeitar sem alterações
- **AND** SHALL não exigir datas crescentes entre pagamentos além desse intervalo

#### Scenario: Preservar data inicial após meia-noite
- **WHEN** a sessão iniciada no dia D abrir o modal depois da meia-noite
- **THEN** a data inicial e o limite superior SHALL permanecer D até a recarga, sem consultar o novo dia para esse pagamento

### Requirement: Confirmação atômica e revalidação de elegibilidade

A confirmação SHALL revalidar a parcela no estado atual e publicar venda, histórico e projeções como uma única alteração. Qualquer erro ou falha de preparação SHALL preservar integralmente o estado anterior e produzir resultado sem sucesso. Abrir, preparar ou cancelar SHALL não registrar recebimento nem deslocar o ID capturado para a próxima pendente.

#### Scenario: Falhar em parte posterior do lote
- **WHEN** a preparação da alocação única ou a validação final do agregado falhar em teste controlado
- **THEN** SHALL não existir alocação, pagamento ou alteração parcial de saldo
- **AND** SHALL retornar falha sem sucesso e permitir nova tentativa válida

#### Scenario: Revalidar seleção obsoleta e confirmação repetida
- **WHEN** a parcela tiver sido paga depois da abertura ou o mesmo comando for repetido após sucesso
- **THEN** SHALL rejeitar sem criar segundo recebimento nem pagar a próxima parcela automaticamente

#### Scenario: Descartar preparação e tratar venda ausente
- **WHEN** o rascunho for descartado antes da confirmação ou houver tentativa de pagar venda inexistente
- **THEN** SHALL não alterar nenhum registro
- **AND** venda inexistente SHALL informar ausência sem inventar venda ou anunciar sucesso

### Requirement: Recebimento visual com conferência de lote

O detalhe SHALL abrir “Pagar parcela” pela primeira pendente, com cliente, número, vencimento e valor não editável para conferência. SHALL pedir somente data e forma, oferecer confirmar/cancelar e informar demonstração com descarte ao recarregar. SHALL não oferecer quantidade, seleção de lote ou valor digitável. Integralidade, ordem, antecipação e revalidação SHALL permanecer obrigatórias.

#### Scenario: Selecionar e receber uma ou mais parcelas
- **WHEN** acionar Pagar na primeira pendente e confirmar data e forma válidas
- **THEN** SHALL registrar somente essa parcela, anunciar sucesso após aceitação, atualizar saldos e disponibilizar a seguinte
- **AND** SHALL permitir antecipação sem desconto, sem alterar vencimentos ou solicitar quantidade/valor

#### Scenario: Impedir salto e valor divergente pela interface
- **WHEN** consultar uma venda com pendências ou tentar confirmar data fora dos limites ou forma ausente
- **THEN** somente a primeira pendente SHALL oferecer Pagar e pagas SHALL não oferecer ação
- **AND** data/forma inválidas SHALL impedir a confirmação, com erros associados aos campos e entradas preservadas

#### Scenario: Revalidar seleção antiga sem deslocá-la
- **WHEN** o estado atual não admitir mais a parcela acionada ou a mesma confirmação for repetida após sucesso
- **THEN** SHALL rejeitar sem segundo recebimento, sem selecionar automaticamente a próxima e sem sucesso fictício

### Requirement: Modal de recebimento acessível e cancelável

O modal SHALL ter título associado, foco inicial na data, navegação modal por teclado e confirmar/cancelar explícitos. Escape ou fechamento sem sucesso SHALL descartar o rascunho. Cancelar SHALL devolver foco ao acionador existente; sucesso SHALL focar o próximo Pagar ou o título das parcelas na quitação. Se o destino previsto desaparecer, SHALL usar destino lógico do detalhe.

#### Scenario: Cancelar sem efeito e reabrir
- **WHEN** alterar data ou forma e cancelar pelo botão ou Escape
- **THEN** SHALL fechar sem alterar registros, pagamentos, saldos ou resumos e devolver foco ao acionador existente
- **AND** reabrir SHALL iniciar data na referência fixa e forma sem seleção válida, sem recuperar confirmação descartada

#### Scenario: Falhar sem fechar nem perder valores
- **WHEN** ocorrer falha controlada durante confirmação em teste de componente/integração
- **THEN** SHALL manter modal e entradas, mostrar falha sem sucesso, preservar todo o agregado e permitir nova tentativa sem envio travado

#### Scenario: Usar modal em ambos os temas e tamanhos
- **WHEN** operar o modal por teclado nos dois temas, em 1366×768, 390×844 e zoom nativo 200%
- **THEN** SHALL manter foco dentro do modal, conteúdo rolável acessível, título, erros e ações alcançáveis, sem acessar controles inertes da página
- **AND** SHALL preservar contraste 4,5:1 para texto comum e 3:1 para foco/controles essenciais, sem depender somente de cor
- **AND** envio inválido SHALL focar o primeiro campo inválido ou uma mensagem focalizável para inelegibilidade, sem focar campos removidos

#### Scenario: Focar próxima ação após sucesso
- **WHEN** confirmar pagamento válido e ainda houver pendências
- **THEN** SHALL fechar o modal, anunciar sucesso e focar Pagar na nova primeira pendente sem abrir outro modal automaticamente

### Requirement: Quitação visível reconciliada

Após pagar a última pendente, o detalhe SHALL mostrar Quitada, saldo zero, N/N pagas incluindo entrada e ausência de próximo vencimento. A venda SHALL sair de abertas e aparecer uma vez em Quitadas com mesmo ID/histórico. SHALL não oferecer Pagar sem pendências e SHALL contar cada recebimento, inclusive entrada e lotes históricos, uma vez nos resumos.

#### Scenario: Concluir lote final e conferir coleções
- **WHEN** confirmar separadamente em ordem todas as pendentes restantes de venda com entrada já paga
- **THEN** após a última SHALL atualizar detalhe, fechar modal e focar o título das parcelas
- **AND** SHALL excluir de abertas e incluir uma vez em Quitadas com a mesma identidade, N/N pagas e saldo zero
- **AND** entrada, pagamentos individuais e lotes históricos SHALL compor resumos uma vez cada, sem somar suas alocações novamente
