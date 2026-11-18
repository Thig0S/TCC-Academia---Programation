# Spec Delta

## MODIFIED Requirements

### Requirement: Conjunto inicial fictício e válido

A sessão SHALL iniciar com 12 vendas sintéticas válidas em relação à referência em 0001–9999, com e sem entrada e nomes semelhantes. SHALL incluir abertas, atrasadas, próximas e quitadas onde possíveis pelo calendário, adaptando datas/parcelas nas bordas sem mudar referência ou invariantes financeiras. SHALL não copiar dados de pessoas, planilhas, entrevistas ou capturas. CPF e telefone SHALL atender às validações de dominio-vendas, sem afirmar inexistência de titulares.

#### Scenario: Inicializar nas extremidades do calendário
- **WHEN** a referência estiver nas bordas de 0001–9999
- **THEN** SHALL produzir 12 vendas válidas, limitando o mês da venda entre janeiro/0001 e novembro/9999 e ajustando o dia ao mês
- **AND** SHALL usar até quatro parcelas conforme os meses disponíveis até dezembro/9999, com valores e pagamentos integrais recalculados
- **AND** SHALL preservar a referência e não gerar venda futura, ano zero ou vencimento além do calendário
- **AND** SHALL dispensar uma situação somente onde impossível, preservando o conjunto anterior onde couber
- **AND** SHALL variar também dia-base sintético e prefixo pago quando necessário para representar situações possíveis, sem alterar as regras do domínio

#### Scenario: Inicializar e isolar o conjunto demonstrativo
- **WHEN** duas sessões independentes forem inicializadas com a mesma referência
- **THEN** SHALL produzir conjuntos iniciais equivalentes, sem objetos mutáveis compartilhados
- **AND** alterar uma sessão SHALL não modificar o conjunto original nem a outra sessão
- **AND** entradas e pagamentos históricos SHALL obedecer calendário, integralidade, sequência e limites de data aprovados

#### Scenario: Substituir marcadores por identificação sintética compatível
- **WHEN** iniciar o conjunto após a adequação das validações da FASE-006
- **THEN** CPF-DEMO/TEL-DEMO SHALL ser substituídos por números sintéticos aceitos pelas regras de identificação, sem coletar ou copiar dados reais
- **AND** SHALL preservar 12 vendas, IDs e comportamento financeiro/temporal do conjunto existente
- **AND** SHALL identificar a demonstração como sintética sem alegar que números matematicamente válidos não pertençam a pessoas reais

### Requirement: Fonte única preservada entre rotas

Todas as consultas e comandos internos SHALL usar a mesma fonte de vendas durante a sessão. Navegar entre páginas SHALL não reinicializar ou duplicar registros. Cadastros, edições de cliente e recebimentos aceitos SHALL ser refletidos coerentemente em todas as projeções, sem copiar vendas entre coleções de abertas e quitadas. Edição de cliente SHALL não alterar resumos financeiros ou outras vendas.

#### Scenario: Navegar depois de uma mutação interna
- **WHEN** um comando válido for aceito em teste de integração e a navegação percorrer os destinos existentes
- **THEN** a fonte SHALL manter a alteração e a mesma referência
- **AND** todas as consultas SHALL refletir o mesmo estado, sem nova instância por destino

#### Scenario: Refletir edição de cliente sem repercussão financeira
- **WHEN** comando interno editar validamente os dados do cliente de uma venda
- **THEN** consultas e busca SHALL refletir os novos dados nessa venda, mantendo seu ID e a coleção financeira correspondente
- **AND** as demais vendas, parcelas, recebimentos, saldos e resumos SHALL permanecer inalterados

### Requirement: Consultas imutáveis e comandos protegidos

Consultas SHALL não permitir alterar o estado por referências retornadas. Comandos de cadastro, edição de cliente e recebimento SHALL copiar entradas, validar o agregado completo e publicar no máximo uma alteração aceita, distinguindo sucesso, validação, ausência, inelegibilidade e falha inesperada com mensagens em português. Rascunhos e comandos rejeitados SHALL não produzir mutações.

#### Scenario: Impedir alteração por referência externa
- **WHEN** um consumidor tentar modificar objetos ou listas de uma consulta, ou alterar seu rascunho após cadastrar ou editar
- **THEN** o estado e suas projeções SHALL permanecer inalterados por essas tentativas
- **AND** uma consulta nova SHALL refletir somente comandos aceitos pelo núcleo

#### Scenario: Validar cadastro e registro ausente
- **WHEN** um cadastro válido com identificação conforme dominio-vendas e descrição ausente for confirmado por comando interno
- **THEN** SHALL criar uma única venda com parcelas válidas e entrada apenas quando informada
- **AND** identificação obrigatória ausente ou inválida SHALL ser rejeitada sem mutação
- **AND** uma consulta a ID inexistente SHALL informar ausência distinta de coleção vazia, sem inventar registro

#### Scenario: Editar sem publicar estado parcial
- **WHEN** uma edição tiver identificação inválida, ID inexistente, cancelamento antes da confirmação ou falha controlada de preparação em teste
- **THEN** SHALL preservar o agregado anterior completo, sem sucesso fictício ou alteração financeira parcial
- **AND** uma nova tentativa válida SHALL poder concluir sem estado de envio travado e publicar somente a alteração aceita

#### Scenario: Preservar interface somente leitura durante preparação interna
- **WHEN** o núcleo oferecer edição interna testável sem a futura interface da FASE-006
- **THEN** as páginas SHALL preservar os limites de consulta da FASE-005, sem adicionar botão ou formulário fictício
- **AND** a preparação interna SHALL não comprovar a entrega da UI comercial, avaliação ou aceite da ótica
