# Spec Delta

## MODIFIED Requirements

### Requirement: Fonte única preservada entre rotas

Todas as consultas e comandos internos SHALL usar a mesma fonte de vendas durante a sessão. Navegar entre páginas SHALL não reinicializar ou duplicar registros. Cadastros, edições de cliente, alterações de status, recebimentos e correções aceitas SHALL ser refletidos coerentemente em todas as projeções, sem copiar vendas entre coleções. Edição de cliente SHALL não alterar resumos financeiros ou outras vendas.

#### Scenario: Navegar depois de uma mutação interna
- **WHEN** um comando válido for aceito em teste de integração e a navegação percorrer os destinos existentes
- **THEN** a fonte SHALL manter a alteração e a mesma referência
- **AND** todas as consultas SHALL refletir o mesmo estado, sem nova instância por destino

#### Scenario: Refletir edição de cliente sem repercussão financeira
- **WHEN** comando interno editar validamente os dados do cliente de uma venda
- **THEN** consultas e busca SHALL refletir os novos dados nessa venda, mantendo seu ID e a coleção financeira correspondente
- **AND** as demais vendas, parcelas, recebimentos, saldos e resumos SHALL permanecer inalterados

#### Scenario: Reclassificar sem duplicar nem apagar venda
- **WHEN** uma venda Ativa for inativada ou marcada Prejuízo e, no segundo caso, reaberta
- **THEN** o ID SHALL permanecer único na fonte e as projeções SHALL refletir o status atual sem alterar os pagamentos já registrados

### Requirement: Consultas imutáveis e comandos protegidos

Consultas SHALL não permitir alterar o estado por referências retornadas. Comandos de cadastro, edição de cliente, mudança de status, recebimento e correção de pagamento individual SHALL copiar entradas, validar o agregado completo e publicar no máximo uma alteração aceita, distinguindo sucesso, validação, ausência, inelegibilidade e falha inesperada em português. Rascunhos e comandos rejeitados SHALL não produzir mutações.

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

#### Scenario: Rejeitar correção ou transição obsoleta
- **WHEN** uma correção tiver ID de pagamento ausente/obsoleto, valor inválido ou uma mudança de status não for elegível
- **THEN** SHALL preservar todos os registros e totais sem anunciar sucesso nem deslocar a ação para outro ID
