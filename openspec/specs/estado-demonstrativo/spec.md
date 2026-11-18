# estado-demonstrativo Specification

## Purpose

Manter uma fonte demonstrativa única e confiável durante a sessão, com dados fictícios, referência temporal estável e comandos internos verificáveis, sem persistência nem antecipação das telas comerciais.

## Requirements

### Requirement: Referência civil capturada na abertura

A demonstração SHALL capturar o dia civil local na abertura da aplicação e usá-lo como referência única para dados sintéticos, situações e mês corrente durante toda a sessão. SHALL não mudar a referência à meia-noite nem na primeira visita comercial; nova abertura ou recarga SHALL capturar novamente o dia local.

#### Scenario: Preservar referência entre destinos e mudança de dia
- **WHEN** a aplicação abrir no dia D, navegar entre destinos e continuar aberta após a meia-noite
- **THEN** o núcleo SHALL continuar usando D até encerrar ou recarregar a aplicação
- **AND** uma nova aplicação aberta em D+1 SHALL usar D+1, sem recuperar referência persistida

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

### Requirement: Descarte de sessão sem persistência ou serviços de dados

O núcleo SHALL manter dados e referência apenas em memória e descartar mutações ao recriar a aplicação. SHALL não consultar APIs de dados, coletar dados reais, criar cookies, gravar storage, banco do navegador ou arquivo, nem exigir login. Recursos da aplicação SHALL continuar locais.

#### Scenario: Recriar aplicação após alteração
- **WHEN** uma sessão tiver alterações internas aceitas e uma nova aplicação for inicializada
- **THEN** SHALL restaurar o conjunto inicial correspondente à nova referência, sem recuperar alterações anteriores
- **AND** SHALL não existir armazenamento persistente ou transmissão de dados de negócio

### Requirement: Núcleo sem promessa de interface comercial

O núcleo SHALL preservar estrutura, temas e aviso demonstrativo. Na FASE-005, projeções SHALL alimentar listas paginadas e detalhes somente leitura, sem cartões globais em Vendas/Quitadas e sem eliminar projeções financeiras internas. Comandos SHALL continuar internos e testáveis, sem interface de cadastro, pagamento, edição ou exportação. Visão Geral e Relatórios SHALL manter conteúdo indisponível; Configurações SHALL preservar suas explicações.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações
- **THEN** SHALL encontrar consultas reais em Vendas e Quitadas, com acesso aos detalhes, sem anunciar que nenhuma consulta foi realizada
- **AND** Visão Geral e Relatórios SHALL continuar explicando a indisponibilidade de seus conteúdos comerciais
- **AND** Configurações, aviso e temas SHALL permanecer disponíveis sem controles fictícios
- **AND** a retirada dos cartões de Vendas SHALL não antecipar os indicadores exclusivos da Visão Geral, planejados na FASE-007

#### Scenario: Consultar sem expor comandos de mutação
- **WHEN** a pessoa pesquisar, filtrar situação nas abertas, limpar critérios, paginar ou navegar entre listas e detalhes
- **THEN** SHALL consultar a mesma fonte sem criar ou alterar vendas ou recebimentos
- **AND** SHALL não encontrar ações de cadastro, edição, pagamento ou exportação nesta fase
- **AND** a disponibilidade das consultas SHALL não prometer persistência nem uso operacional
