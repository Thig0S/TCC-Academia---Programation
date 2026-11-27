# Spec Delta

## MODIFIED Requirements

### Requirement: Confirmação explícita e recuperação sem perda de rascunho

Somente confirmação explícita válida SHALL publicar cadastro ou edição. Cancelar
antes de enviar SHALL descartar rascunho sem mutação. Recusa SHALL preservar entradas,
comunicar ausência de sucesso e permitir correção. No modo local, resultado incerto
SHALL exigir consulta e reconhecimento explícitos antes de liberar confirmações na
aba; fechar após envio SHALL não prometer rollback ou autorizar replay.

#### Scenario: Cancelar e retornar ao contexto
- **WHEN** alterar campos e acionar Cancelar no cadastro ou edição antes de enviar
- **THEN** SHALL retornar à lista ou detalhe de origem com foco no acionador quando presente e alternativa lógica quando ausente
- **AND** registros, parcelas, saldos e resumos SHALL permanecer inalterados

#### Scenario: Falhar e tentar novamente
- **WHEN** ocorrer falha controlada antes de envio ou recusa identificável sem escrita na confirmação
- **THEN** SHALL mostrar falha compreensível sem sucesso, preservar rascunho e estado anterior e liberar correção/nova confirmação
- **AND** repetição durante envio SHALL não publicar segunda operação; resultado incerto local SHALL bloquear confirmações em vez de orientar retry

#### Scenario: Usar teclado e ambos os temas
- **WHEN** percorrer e enviar cadastro/edição nos dois temas em 1366×768, 390×844 e zoom nativo 200%
- **THEN** rótulos, erros, prévia, ações e limites do modo SHALL permanecer legíveis e alcançáveis com foco perceptível e rolagem quando necessária
- **AND** texto comum SHALL alcançar contraste 4,5:1 e foco/controles essenciais 3:1, sem depender somente de cor

#### Scenario: Aguardar confirmação persistida e tratar conflito
- **WHEN** confirmar cadastro/edição local e receber sucesso ou conflito de revisão
- **THEN** SHALL respectivamente publicar representação confirmada, ou preservar rascunho e exigir recarga com novo aceite sem atualizar revisão silenciosamente
- **AND** SHALL não executar retry, publicar sucesso antecipado ou duplicar requisição por envio concorrente

#### Scenario: Perder resposta sem descartar rascunho
- **WHEN** comando enviado perder resposta ou retornar confirmação indeterminada
- **THEN** SHALL manter rascunho em memória e aviso de conferência ao navegar, sem afirmar rollback ou cadastro confirmado
- **AND** SHALL bloquear comandos na aba até consulta bem-sucedida e reconhecimento explícito, sem reenviar automaticamente
