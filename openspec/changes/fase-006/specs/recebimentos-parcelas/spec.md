# Spec Delta

## ADDED Requirements

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
