# Spec Delta

## MODIFIED Requirements

### Requirement: Consultas imutáveis e comandos protegidos

Consultas SHALL não permitir alterar o estado por referências retornadas. Comandos de cadastro, edição de cliente e recebimento SHALL copiar entradas, validar o agregado completo e publicar no máximo uma alteração aceita, distinguindo sucesso, validação, ausência, inelegibilidade e falha inesperada com mensagens em português. Rascunhos e comandos rejeitados SHALL não produzir mutações.

#### Scenario: Impedir alteração por referência externa
- **WHEN** um consumidor tentar modificar objetos ou listas de uma consulta, ou alterar seu rascunho após cadastrar ou editar
- **THEN** o estado e suas projeções SHALL permanecer inalterados por essas tentativas
- **AND** uma consulta nova SHALL refletir somente comandos aceitos pelo núcleo

#### Scenario: Validar cadastro e registro ausente
- **WHEN** um cadastro válido com identificação conforme dominio-vendas e descrição ausente for confirmado por comando interno ou pela interface
- **THEN** SHALL criar uma única venda com parcelas válidas e entrada apenas quando informada
- **AND** identificação obrigatória ausente ou inválida SHALL ser rejeitada sem mutação
- **AND** uma consulta a ID inexistente SHALL informar ausência distinta de coleção vazia, sem inventar registro

#### Scenario: Editar sem publicar estado parcial
- **WHEN** uma edição tiver identificação inválida, ID inexistente, cancelamento antes da confirmação ou falha controlada de preparação em teste
- **THEN** SHALL preservar o agregado anterior completo, sem sucesso fictício ou alteração financeira parcial
- **AND** uma nova tentativa válida SHALL poder concluir sem estado de envio travado e publicar somente a alteração aceita

#### Scenario: Preservar interface somente leitura durante preparação interna
- **WHEN** o núcleo oferecer preparação interna ou rascunho antes de confirmação pela interface
- **THEN** as consultas SHALL continuar sem efeitos colaterais, sem publicar alterações por preparar ou abandonar rascunhos
- **AND** a preparação interna isolada SHALL não comprovar entrega da UI comercial, avaliação ou aceite da ótica
- **AND** cadastro, edição e recebimento funcionais da FASE-006 SHALL usar os comandos protegidos somente na confirmação explícita

### Requirement: Núcleo sem promessa de interface comercial

O núcleo SHALL preservar estrutura, temas e aviso demonstrativo. Projeções SHALL alimentar listas paginadas e detalhes sem cartões globais em Vendas/Quitadas. A FASE-006 SHALL permitir confirmar cadastro, edição de cliente e recebimento pela interface, sem exportação. Visão Geral e Relatórios SHALL manter conteúdo indisponível; Configurações SHALL preservar suas explicações. A interface SHALL não prometer persistência ou uso operacional.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações
- **THEN** SHALL encontrar consultas reais em Vendas e Quitadas, com acesso aos detalhes, sem anunciar que nenhuma consulta foi realizada
- **AND** Visão Geral e Relatórios SHALL continuar explicando a indisponibilidade de seus conteúdos comerciais
- **AND** Configurações, aviso e temas SHALL permanecer disponíveis sem controles fictícios
- **AND** a retirada dos cartões de Vendas SHALL não antecipar os indicadores exclusivos da Visão Geral, planejados na FASE-007

#### Scenario: Consultar sem expor comandos de mutação
- **WHEN** a pessoa pesquisar, filtrar situação nas abertas, limpar critérios, paginar ou navegar entre listas e detalhes
- **THEN** SHALL consultar a mesma fonte sem criar ou alterar vendas ou recebimentos por essas operações
- **AND** ações de cadastro, edição e recebimento SHALL abrir fluxos reais, sem publicar antes de confirmação; exportação SHALL continuar ausente
- **AND** a disponibilidade das consultas e mutações demonstrativas SHALL não prometer persistência nem uso operacional

#### Scenario: Preservar mutações somente durante a sessão
- **WHEN** confirmar um fluxo da FASE-006, navegar entre destinos e depois recarregar a aplicação
- **THEN** SHALL manter a alteração e referência na navegação e restaurar o conjunto inicial na recarga
- **AND** SHALL não salvar rascunhos ou registros em armazenamento persistente nem transmitir dados de negócio
