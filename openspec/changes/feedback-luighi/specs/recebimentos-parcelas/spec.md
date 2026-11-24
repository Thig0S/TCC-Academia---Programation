# Spec Delta

## MODIFIED Requirements

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

#### Scenario: Revalidar seleção antiga sem deslocá-la
- **WHEN** o estado atual não admitir mais a parcela escolhida ou a mesma confirmação for repetida após sucesso
- **THEN** SHALL rejeitar a operação sem segundo recebimento, sem selecionar automaticamente a próxima pendente e sem sucesso fictício

#### Scenario: Avisar atraso antes da baixa
- **WHEN** abrir pagamento de parcela com vencimento anterior à referência da sessão
- **THEN** SHALL exibir “Checar juros do Crediloja!” sem calcular nem exigir acréscimo

## ADDED Requirements

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
