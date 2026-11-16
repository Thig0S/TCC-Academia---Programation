# Spec Delta

## Purpose

Manter uma fonte demonstrativa única e confiável durante a sessão, com dados fictícios, referência temporal estável e comandos internos verificáveis, sem persistência nem antecipação das telas comerciais.

## ADDED Requirements

### Requirement: Referência civil capturada na abertura

A demonstração SHALL capturar o dia civil local na abertura da aplicação e usá-lo como referência única para dados sintéticos, situações e mês corrente durante toda a sessão. SHALL não mudar a referência à meia-noite nem na primeira visita comercial; nova abertura ou recarga SHALL capturar novamente o dia local.

#### Scenario: Preservar referência entre destinos e mudança de dia
- **WHEN** a aplicação abrir no dia D, navegar entre destinos e continuar aberta após a meia-noite
- **THEN** o núcleo SHALL continuar usando D até encerrar ou recarregar a aplicação
- **AND** uma nova aplicação aberta em D+1 SHALL usar D+1, sem recuperar referência persistida

### Requirement: Conjunto inicial fictício e válido

A sessão SHALL iniciar com 12 vendas sintéticas válidas em relação à referência em 0001–9999, com e sem entrada e nomes semelhantes. SHALL incluir abertas, atrasadas, próximas e quitadas onde possíveis pelo calendário, adaptando datas/parcelas nas bordas sem mudar referência ou invariantes financeiras. SHALL não copiar dados de pessoas, planilhas, entrevistas ou capturas.

#### Scenario: Inicializar nas extremidades do calendário
- **WHEN** a referência estiver nas bordas de 0001–9999
- **THEN** SHALL produzir 12 vendas válidas, limitando o mês da venda entre janeiro/0001 e novembro/9999 e ajustando o dia ao mês
- **AND** SHALL usar até quatro parcelas conforme os meses disponíveis até dezembro/9999, com valores e pagamentos integrais recalculados
- **AND** SHALL preservar a referência e não gerar venda futura, ano zero ou vencimento além do calendário
- **AND** SHALL dispensar uma situação somente onde impossível, preservando o conjunto anterior onde couber

#### Scenario: Inicializar e isolar o conjunto demonstrativo
- **WHEN** duas sessões independentes forem inicializadas com a mesma referência
- **THEN** SHALL produzir conjuntos iniciais equivalentes, sem objetos mutáveis compartilhados
- **AND** alterar uma sessão SHALL não modificar o conjunto original nem a outra sessão
- **AND** entradas e pagamentos históricos SHALL obedecer calendário, integralidade, sequência e limites de data aprovados

### Requirement: Fonte única preservada entre rotas

Todas as consultas e comandos internos SHALL usar a mesma fonte de vendas durante a sessão. Navegar entre páginas SHALL não reinicializar ou duplicar registros. Cadastros aceitos e recebimentos SHALL ser refletidos coerentemente em todas as projeções, sem copiar vendas entre coleções de abertas e quitadas.

#### Scenario: Navegar depois de uma mutação interna
- **WHEN** um comando válido for aceito em teste de integração e a navegação percorrer os destinos existentes
- **THEN** a fonte SHALL manter a alteração e a mesma referência
- **AND** todas as consultas SHALL refletir o mesmo estado, sem nova instância por destino

### Requirement: Consultas imutáveis e comandos protegidos

Consultas SHALL não permitir alterar o estado por referências retornadas. Comandos SHALL copiar entradas, validar o agregado completo e publicar no máximo uma alteração aceita, distinguindo sucesso, validação, ausência, inelegibilidade e falha inesperada com mensagens em português. Rascunhos e comandos rejeitados SHALL não produzir mutações.

#### Scenario: Impedir alteração por referência externa
- **WHEN** um consumidor tentar modificar objetos ou listas de uma consulta, ou alterar seu rascunho após cadastrar
- **THEN** o estado e suas projeções SHALL permanecer inalterados por essas tentativas
- **AND** uma consulta nova SHALL refletir somente comandos aceitos pelo núcleo

#### Scenario: Validar cadastro e registro ausente
- **WHEN** um cadastro válido com identificação presente e descrição ausente for confirmado por comando interno
- **THEN** SHALL criar uma única venda com parcelas válidas e entrada apenas quando informada
- **AND** identificação obrigatória ausente SHALL ser rejeitada sem mutação
- **AND** uma consulta a ID inexistente SHALL informar ausência distinta de coleção vazia, sem inventar registro

### Requirement: Descarte de sessão sem persistência ou serviços de dados

O núcleo SHALL manter dados e referência apenas em memória e descartar mutações ao recriar a aplicação. SHALL não consultar APIs de dados, coletar dados reais, criar cookies, gravar storage, banco do navegador ou arquivo, nem exigir login. Recursos da aplicação SHALL continuar locais.

#### Scenario: Recriar aplicação após alteração
- **WHEN** uma sessão tiver alterações internas aceitas e uma nova aplicação for inicializada
- **THEN** SHALL restaurar o conjunto inicial correspondente à nova referência, sem recuperar alterações anteriores
- **AND** SHALL não existir armazenamento persistente ou transmissão de dados de negócio

### Requirement: Núcleo sem promessa de interface comercial

A introdução do núcleo SHALL preservar a estrutura, temas, aviso e conteúdo comercial indisponível existentes. Nesta fase, comandos e projeções SHALL ser consumíveis internamente e testáveis, sem novos formulários, tabelas, indicadores financeiros visíveis, rotas comerciais, filtros ou botões de cadastro, pagamento, edição e exportação.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações
- **THEN** SHALL continuar encontrando o conteúdo e os controles previstos na FASE-003
- **AND** a existência de registros internos SHALL não ser apresentada como consulta realizada, coleção vazia ou funcionalidade comercial pronta
