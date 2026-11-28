# recebimentos-parcelas Specification

## Purpose

Garantir que a simulação de recebimentos liquide parcelas integralmente e na ordem correta, inclusive em lote antecipado, sem saltos, duplicidade ou alterações financeiras parciais.

## Requirements

### Requirement: Seleção sequencial desde a primeira parcela pendente

 O recebimento SHALL aceitar seleção não vazia da mesma venda, correspondente às primeiras parcelas pendentes consecutivas por número. SHALL rejeitar saltos, IDs repetidos/ausentes/de outra venda e parcelas pagas, inclusive a parcela 1 de entrada já liquidada no cadastro. A entrada SHALL ser ignorada ao formar o prefixo de pendentes, não representar novo valor a receber nem deslocar uma seleção obsoleta.

#### Scenario: Proibir pagamento fora de ordem
 - **WHEN** janeiro, fevereiro e março estiverem pendentes e for solicitado fevereiro sozinha ou janeiro e março
 - **THEN** SHALL rejeitar a operação inteira e manter as três pendentes

#### Scenario: Aceitar uma ou mais parcelas em ordem
 - **WHEN** janeiro estiver paga e for solicitado fevereiro ou fevereiro e março pendentes
- **THEN** SHALL aceitar a seleção se os demais dados forem válidos
 - **AND** ordem textual dos IDs SHALL não autorizar saltos nem alterar a ordem canônica

#### Scenario: Rejeitar identificadores inválidos
- **WHEN** houver seleção vazia, ID duplicado, parcela paga, parcela desconhecida ou de outra venda
 - **THEN** SHALL rejeitar sem criar recebimento ou liquidar qualquer parcela

#### Scenario: Entrada já paga não integra novo lote
- **WHEN** abrir recebimento de venda cuja entrada é a parcela 1 Paga e a parcela 2 é a primeira pendente
- **THEN** o prefixo elegível SHALL começar na parcela 2 e não oferecer a entrada como valor a receber
- **AND** comando que inclua a entrada SHALL ser rejeitado integralmente, sem novo recebimento

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

### Requirement: Recebimento visual com conferência de lote

O detalhe de venda Ativa SHALL oferecer Pagar somente na primeira parcela pendente, inclusive futura, sem selecionar lote. O modal SHALL mostrar parcela, valor-base e vencimento e permitir informar valor recebido pelo menos igual ao valor-base, data, forma e observação opcional de até 20 caracteres. Histórico em lote SHALL continuar íntegro sem aceitar excedente retroativo.

#### Scenario: Selecionar e receber uma ou mais parcelas
- **WHEN** a pessoa acionar Pagar na primeira pendente de uma venda Ativa e confirmar valor ao menos igual ao base, data e forma válidos
- **THEN** SHALL registrar exatamente um recebimento dessa parcela, atualizar total efetivo, recebido e saldo sem alteração parcial
- **AND** SHALL permitir antecipar parcelas futuras na ordem correta sem alterar vencimentos

#### Scenario: Impedir salto e valor divergente pela interface
- **WHEN** tentar saltar pendências, selecionar parcela paga, pagar venda Inativa/Prejuízo ou confirmar valor inferior ao base, data fora dos limites ou forma ausente
- **THEN** SHALL impedir a operação e explicar o problema sem publicar alterações
- **AND** erros de valor/data/forma SHALL ficar associados aos campos, preservando entradas para correção

#### Scenario: Avisar atraso antes da baixa
- **WHEN** abrir pagamento de parcela com vencimento anterior à referência da sessão
- **THEN** SHALL exibir “Checar juros do Crediloja!” sem calcular nem exigir acréscimo

#### Scenario: Revalidar seleção antiga sem deslocá-la
- **WHEN** o estado atual não admitir mais as parcelas escolhidas ou a mesma confirmação for repetida após sucesso
- **THEN** SHALL rejeitar a operação sem segundo recebimento, sem selecionar automaticamente as próximas pendentes e sem sucesso fictício

### Requirement: Corrigir pagamento individual sem substituição da parcela

Pagamento individual criado pela interface SHALL permitir corrigir valor efetivo não inferior ao valor-base, data civil entre venda e referência, forma aceita e observação até 20 caracteres. SHALL preservar IDs e vínculo da parcela e recalcular total efetivo, histórico mensal e demais projeções atomicamente. Entrada e lotes históricos SHALL não ser editáveis neste fluxo.

#### Scenario: Corrigir valor, data e forma
- **WHEN** corrigir pagamento de R$ 110,00 para R$ 105,00 em parcela-base de R$ 100,00, alterar data para outro mês válido, forma e observação
- **THEN** SHALL conservar o ID e a quitação, alterar apenas o mesmo recebimento, reduzir o acréscimo de R$ 10,00 para R$ 5,00 e movê-lo entre meses uma vez
- **AND** os demais pagamentos e parcelas SHALL permanecer inalterados

#### Scenario: Rejeitar correção inválida ou obsoleta
- **WHEN** tentar corrigir valor abaixo do base, nota acima de 20 caracteres, data inválida, entrada, lote histórico ou pagamento inexistente
- **THEN** SHALL rejeitar sem alterar venda, histórico ou relatórios e permitir nova tentativa válida

#### Scenario: Cancelar e acessar por teclado
- **WHEN** abrir correção e cancelar ou fechar por Escape em qualquer tema/viewport
- **THEN** SHALL preservar o estado e devolver foco ao acionador existente ou ao destino lógico quando ausente

### Requirement: Modal de recebimento acessível e cancelável

O modal SHALL ter título associado, foco inicial, navegação modal e ações explícitas.
Cancelar/Escape antes de enviar SHALL descartar rascunho sem mutação e restaurar foco.
Após envio local, fechar SHALL não prometer rollback; acompanhamento SHALL continuar
na aba e o foco SHALL retornar ao acionador ou destino lógico. Recusa SHALL preservar
entradas; resposta incerta SHALL bloquear confirmações até consulta e reconhecimento
explícitos, sem reenviar pagamento.

#### Scenario: Cancelar sem efeito e reabrir
- **WHEN** alterar seleção, valor, data ou forma e cancelar pelo botão ou Escape antes de enviar
- **THEN** SHALL fechar sem alterar registros, pagamentos, saldos ou resumos e restaurar foco corretamente
- **AND** reabrir SHALL preparar novo rascunho a partir do estado atual, sem recuperar confirmação descartada

#### Scenario: Falhar sem fechar nem perder valores
- **WHEN** ocorrer falha controlada antes de envio ou recusa identificável durante confirmação
- **THEN** SHALL manter modal e entradas, mostrar falha sem sucesso e preservar agregado anterior
- **AND** SHALL liberar correção sem envio travado; confirmação indeterminada ou resposta perdida local SHALL exigir conferência, não retry imediato

#### Scenario: Usar modal em ambos os temas e tamanhos
- **WHEN** operar o modal por teclado nos dois temas, em 1366×768, 390×844 e zoom nativo 200%
- **THEN** SHALL manter foco no modal enquanto aberto, conteúdo rolável, título/erros/ações alcançáveis e página inerte
- **AND** SHALL preservar contraste 4,5:1 para texto comum e 3:1 para foco/controles, sem depender somente de cor

#### Scenario: Fechar após envio em andamento
- **WHEN** pessoa fechar modal ou navegar após enviar pagamento/correção local ainda pendente
- **THEN** SHALL manter acompanhamento da operação na aba, sem anunciar cancelamento transacional nem enviar novamente
- **AND** resultado incerto SHALL preservar rascunho em memória e permitir sair para conferir sem liberar outros comandos

#### Scenario: Confirmar pagamento e falhar na atualização
- **WHEN** baixa/correção retornar resposta confirmada e consulta dependente falhar
- **THEN** SHALL manter sucesso e identidade/revisão confirmados com aviso separado de atualização pendente
- **AND** SHALL oferecer recarga de consultas, não repetição de pagamento como solução de apresentação

### Requirement: Quitação visível reconciliada

 Após receber as últimas pendentes, o detalhe SHALL mostrar Quitada, saldo zero, N/N pagas incluindo a entrada e ausência de próximo vencimento. A venda SHALL sair de abertas e aparecer uma vez em Quitadas com mesmo ID/histórico. SHALL não oferecer recebimento sem pendências e SHALL contar cada recebimento, inclusive entrada, uma vez nos resumos.

#### Scenario: Concluir lote final e conferir coleções
 - **WHEN** confirmar o lote integral que contém todas as pendentes restantes de uma venda com entrada já paga
- **THEN** SHALL atualizar o detalhe, fechar o modal e orientar foco para um destino remanescente do detalhe
 - **AND** SHALL excluir de abertas e incluir uma vez em Quitadas com a mesma identidade, N/N pagas e saldo zero
 - **AND** entrada e lote SHALL compor resumos uma vez cada, sem somar alocações ou o valor da entrada novamente
