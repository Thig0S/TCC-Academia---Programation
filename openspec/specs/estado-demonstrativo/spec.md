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

 A sessão SHALL iniciar com 12 vendas sintéticas válidas na referência 0001–9999, com/sem entrada e nomes semelhantes. Entradas SHALL ser parcelas 1 Pagas, com contagens ajustadas sem mudar valores financeiros, histórico ou vencimentos pendentes. SHALL preservar situações possíveis nas bordas sem mudar referência/invariantes. SHALL não copiar dados reais; CPF/telefone SHALL cumprir as validações locais, sem afirmar inexistência de titulares.

#### Scenario: Inicializar nas extremidades do calendário
- **WHEN** a referência estiver nas bordas de 0001–9999
- **THEN** SHALL produzir 12 vendas válidas, limitando o mês da venda entre janeiro/0001 e novembro/9999 e ajustando o dia ao mês
 - **AND** SHALL usar até quatro parcelas futuras conforme meses até dezembro/9999, acrescentando a parcela 1 paga quando houver entrada; valores/pagamentos integrais SHALL permanecer compatíveis com o conjunto anterior na mesma referência
- **AND** SHALL preservar a referência e não gerar venda futura, ano zero ou vencimento além do calendário
- **AND** SHALL dispensar uma situação somente onde impossível, preservando o conjunto anterior onde couber
 - **AND** SHALL variar dia-base sintético e prefixo pago somente quando necessário para situações possíveis, sem alterar regras do domínio

#### Scenario: Inicializar e isolar o conjunto demonstrativo
- **WHEN** duas sessões independentes forem inicializadas com a mesma referência
- **THEN** SHALL produzir conjuntos iniciais equivalentes, sem objetos mutáveis compartilhados
- **AND** alterar uma sessão SHALL não modificar o conjunto original nem a outra sessão
 - **AND** entradas e pagamentos históricos SHALL obedecer calendário, integralidade, sequência e limites aprovados

#### Scenario: Substituir marcadores por identificação sintética compatível
- **WHEN** iniciar o conjunto após a adequação das validações da FASE-006
- **THEN** CPF-DEMO/TEL-DEMO SHALL ser substituídos por números sintéticos aceitos pelas regras de identificação, sem coletar ou copiar dados reais
 - **AND** SHALL preservar 12 vendas, IDs de venda e comportamento financeiro/temporal, exceto a inclusão planejada da entrada nas parcelas e contagens
 - **AND** SHALL identificar a demonstração como sintética sem alegar que números matematicamente válidos não pertençam a pessoas reais

#### Scenario: Uniformizar a entrada sem alterar saldos ou histórico
- **WHEN** comparar a geração anterior e a nova para a mesma referência e venda com entrada e K parcelas futuras
- **THEN** a nova SHALL conter a entrada como parcela 1 Paga e K parcelas posteriores, quantidade total K+1, preservando total/pago/saldo e valores recebidos por período
- **AND** SHALL manter valores e vencimentos das pendentes, IDs de venda e vínculos das liquidações anteriores, renumerando parcelas sem duplicar recebimentos
- **AND** sem entrada SHALL permanecer com as mesmas parcelas, contagens e finanças
- **AND** recarregar SHALL recriar esse novo seed uniforme, sem persistir ou migrar sessão anterior

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
- **WHEN** uma venda percorrer Ativo→Inativo→Ativo ou Ativo→Prejuízo→Ativo
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
- **AND** cadastro, edição e recebimento funcionais SHALL usar os comandos protegidos somente na confirmação explícita

#### Scenario: Rejeitar correção ou transição obsoleta
- **WHEN** uma correção tiver ID de pagamento ausente/obsoleto, valor inválido ou uma mudança de status não for elegível
- **THEN** SHALL preservar todos os registros e totais sem anunciar sucesso nem deslocar a ação para outro ID

#### Scenario: Rejeitar transição direta entre Inativo e Prejuízo
- **WHEN** uma mudança direta Inativo→Prejuízo ou Prejuízo→Inativo for solicitada
- **THEN** SHALL rejeitar a transição e preservar o agregado e suas projeções

#### Scenario: Repetir o status atual sem nova mutação
- **WHEN** um comando solicitar o status administrativo que a venda já possui
- **THEN** SHALL aceitar o comando como no-op idempotente
- **AND** SHALL preservar o agregado e não publicar efeitos duplicados

### Requirement: Descarte de sessão sem persistência ou serviços de dados

No modo demonstrativo padrão, o núcleo SHALL manter dados e referência apenas em
memória e descartar mutações ao recriar a aplicação. SHALL não consultar APIs de dados,
coletar dados reais, criar cookies, gravar storage, banco do navegador ou arquivo, nem
exigir login. Recursos SHALL continuar locais. O modo local persistido SHALL ser
selecionado separadamente e nunca ativado como fallback da demonstração ou vice-versa.

#### Scenario: Recriar aplicação após alteração
- **WHEN** uma sessão demonstrativa tiver alterações internas aceitas e uma nova aplicação demonstrativa for inicializada
- **THEN** SHALL restaurar o conjunto inicial correspondente à nova referência, sem recuperar alterações anteriores
- **AND** SHALL não existir armazenamento persistente ou transmissão de dados de negócio nesse modo

#### Scenario: Executar demonstração sem backend
- **WHEN** iniciar execução/build padrão ou Pages com API desligada e sem segredo configurado
- **THEN** SHALL oferecer a demonstração funcional com seu seed e descartes existentes
- **AND** SHALL não fazer requisições comerciais, recuperar dados do SQLite ou exigir configuração local

#### Scenario: Não trocar fonte por falha
- **WHEN** modo local apresentar indisponibilidade de API ou credencial
- **THEN** SHALL não iniciar o núcleo demonstrativo para preencher a tela ou anunciar dados sintéticos como persistidos
- **AND** a falha SHALL continuar identificada no modo local

### Requirement: Núcleo sem promessa de interface comercial

O núcleo demonstrativo SHALL preservar temas, limites e uma fonte comum. Projeções
SHALL alimentar listas paginadas sem cartões globais em Vendas/Quitadas e análises;
quatro indicadores SHALL permanecer exclusivos da Visão Geral. Cadastro, edição e
recebimento SHALL continuar funcionais no demo sem promessa de persistência, exportação
ou uso operacional. No modo local SHALL usar fonte persistida e mensagens próprias, sem
contradizer o SQLite.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações no modo demonstrativo
- **THEN** SHALL encontrar consultas reais da sessão, acesso aos detalhes e conteúdos financeiros disponíveis
- **AND** Visão Geral e Relatórios SHALL consultar a mesma fonte e referência
- **AND** Configurações, aviso e temas SHALL permanecer disponíveis sem controles fictícios
- **AND** os quatro indicadores globais SHALL permanecer exclusivos da Visão Geral

#### Scenario: Consultar sem expor comandos de mutação
- **WHEN** a pessoa pesquisar, filtrar situação nas abertas, limpar critérios, paginar ou navegar entre listas, detalhes, painel e relatórios
- **THEN** SHALL consultar a fonte do modo selecionado sem criar ou alterar vendas ou recebimentos
- **AND** cadastro, edição e recebimento SHALL depender de confirmação explícita; exportação SHALL permanecer ausente em Vendas e ilustrativa em Relatórios
- **AND** disponibilidade de consultas e mutações SHALL não prometer uso operacional

#### Scenario: Preservar mutações somente durante a sessão
- **WHEN** confirmar cadastro, edição ou recebimento demonstrativos, navegar e depois recarregar a demonstração
- **THEN** SHALL manter alteração e referência na navegação e restaurar conjunto inicial na recarga
- **AND** SHALL não salvar rascunhos ou registros em storage nem transmitir dados de negócio nesse modo

#### Scenario: Atualizar análises após publicação aceita
- **WHEN** cadastrar com entrada ou confirmar recebimento permitido e voltar à Visão Geral ou Relatórios
- **THEN** indicadores, listas e totais SHALL refletir a fonte aceita do modo, sem duplicação de entrada, recebimento e alocações
- **AND** editar apenas identificação SHALL atualizar rótulos sem alterar totais financeiros
- **AND** cancelar antes do envio ou rejeitar operação SHALL preservar projeções; incerteza local SHALL seguir o protocolo de conferência
