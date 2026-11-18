# recebimentos-parcelas Specification

## Purpose

Garantir que a simulação de recebimentos liquide parcelas integralmente e na ordem correta, inclusive em lote antecipado, sem saltos, duplicidade ou alterações financeiras parciais.

## Requirements

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

### Requirement: Recebimento visual com conferência de lote

O detalhe de venda com pendências SHALL permitir abrir modal de recebimento com seleção não vazia do prefixo de parcelas pendentes, números, valores e soma exigida. SHALL permitir informar valor recebido, data e forma únicas, confirmar ou cancelar. Regras de sequência, integralidade, antecipação e revalidação existentes SHALL continuar obrigatórias.

#### Scenario: Selecionar e receber uma ou mais parcelas
- **WHEN** abrir o recebimento, selecionar uma ou mais parcelas consecutivas desde a primeira pendente e confirmar valor exato, data e forma válidos
- **THEN** SHALL registrar um único recebimento demonstrativo, atualizar parcelas e saldos da mesma venda e anunciar sucesso somente após aceitação
- **AND** SHALL permitir antecipar parcelas futuras sem desconto nem alterar vencimentos

#### Scenario: Impedir salto e valor divergente pela interface
- **WHEN** tentar saltar pendências, selecionar parcela paga ou confirmar seleção vazia, valor parcial/excedente, data fora dos limites ou forma ausente
- **THEN** SHALL impedir a operação e explicar o problema sem publicar alterações
- **AND** erros de valor/data/forma SHALL ficar associados aos campos, preservando entradas para correção

#### Scenario: Revalidar seleção antiga sem deslocá-la
- **WHEN** o estado atual não admitir mais as parcelas escolhidas ou a mesma confirmação for repetida após sucesso
- **THEN** SHALL rejeitar a operação sem segundo recebimento, sem selecionar automaticamente as próximas pendentes e sem sucesso fictício

### Requirement: Modal de recebimento acessível e cancelável

O modal SHALL ter título associado, foco inicial, navegação modal por teclado e ações explícitas de confirmar e cancelar. Escape ou fechamento sem confirmação aceita SHALL descartar o rascunho. Após fechar SHALL devolver foco ao acionador existente ou a destino lógico do detalhe se o acionador desaparecer.

#### Scenario: Cancelar sem efeito e reabrir
- **WHEN** alterar seleção, valor, data ou forma e cancelar pelo botão ou Escape
- **THEN** SHALL fechar sem alterar registros, pagamentos, saldos ou resumos e restaurar foco corretamente
- **AND** reabrir SHALL preparar novo rascunho a partir do estado atual, sem recuperar confirmação descartada

#### Scenario: Falhar sem fechar nem perder valores
- **WHEN** ocorrer falha controlada durante confirmação em teste de componente/integração
- **THEN** SHALL manter modal e entradas, mostrar falha sem sucesso, preservar todo o agregado e permitir nova tentativa sem envio travado

#### Scenario: Usar modal em ambos os temas e tamanhos
- **WHEN** operar o modal por teclado nos dois temas, em 1366×768, 390×844 e zoom nativo 200%
- **THEN** SHALL manter foco dentro do modal enquanto aberto, conteúdo rolável acessível, título, erros e ações alcançáveis, sem acessar controles inertes da página
- **AND** SHALL preservar contraste 4,5:1 para texto comum e 3:1 para foco/controles essenciais, sem depender somente de cor

### Requirement: Quitação visível reconciliada

Após receber as últimas parcelas pendentes, o detalhe SHALL mostrar Quitada, saldo zero, todas as parcelas pagas e ausência de próximo vencimento. A venda SHALL sair de abertas e aparecer exatamente uma vez em Quitadas, mantendo seu ID e histórico. SHALL não oferecer novo recebimento de venda sem pendências.

#### Scenario: Concluir lote final e conferir coleções
- **WHEN** confirmar o pagamento integral do prefixo que contém todas as parcelas restantes
- **THEN** SHALL atualizar o detalhe, fechar o modal e orientar foco para um destino remanescente do detalhe
- **AND** ao navegar às listas SHALL haver exclusão de abertas e inclusão única em Quitadas, com a mesma identidade
- **AND** entrada e lote SHALL compor os resumos internos uma única vez, sem antecipar cartões na interface
