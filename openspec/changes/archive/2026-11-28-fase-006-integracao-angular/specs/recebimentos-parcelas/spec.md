# Spec Delta

## MODIFIED Requirements

### Requirement: Modal de recebimento acessível e cancelável

O modal SHALL ter título associado, foco inicial, navegação modal e ações explícitas.
Cancelar/Escape antes de enviar SHALL descartar rascunho sem mutação e restaurar foco.
Após envio local, fechar SHALL não prometer rollback; acompanhamento SHALL continuar
na aba. Recusa SHALL preservar entradas; resposta incerta SHALL bloquear confirmações
até consulta e reconhecimento explícitos, sem reenviar pagamento.

#### Scenario: Cancelar sem efeito e reabrir
- **WHEN** alterar seleção, valor, data ou forma e cancelar pelo botão ou Escape antes de enviar
- **THEN** SHALL fechar sem alterar registros, pagamentos, saldos ou resumos e restaurar foco corretamente
- **AND** reabrir SHALL preparar novo rascunho do estado atual sem recuperar confirmação descartada

#### Scenario: Falhar sem fechar nem perder valores
- **WHEN** ocorrer falha controlada antes de envio ou recusa identificável durante confirmação
- **THEN** SHALL manter modal e entradas, mostrar falha sem sucesso e preservar agregado anterior
- **AND** SHALL liberar correção sem envio travado; confirmação indeterminada ou resposta perdida local SHALL exigir conferência, não retry imediato

#### Scenario: Usar modal em ambos os temas e tamanhos
- **WHEN** operar modal por teclado nos dois temas em 1366×768, 390×844 e zoom nativo 200%
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
