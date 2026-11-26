# Spec Delta

## Purpose

Conservar e recuperar o conjunto de vendas no armazenamento local, preservando as
invariantes financeiras e impedindo publicação parcial, perda de histórico ou
sobrescrita por consumidores com estado desatualizado.

## ADDED Requirements

### Requirement: Preparação explícita do armazenamento

O armazenamento SHALL exigir caminho absoluto fornecido pelo consumidor e preparação
explícita do schema. Leitura e gravação SHALL não criar arquivo nem aplicar atualizações
implicitamente. Preparação repetida de banco próprio atualizado SHALL preservar dados;
arquivo alheio ou schema desconhecido SHALL ser recusado sem reset.

#### Scenario: Preparar arquivo novo e repetir a preparação
- **WHEN** o consumidor preparar um caminho absoluto inexistente em diretório existente, gravar dados e repetir a preparação
- **THEN** a primeira preparação SHALL criar banco próprio vazio com revisão zero
- **AND** a repetição SHALL preservar dados e revisão, sem seed ou duplicação

#### Scenario: Recusar caminho ou arquivo incompatível
- **WHEN** for informado caminho relativo, pai inexistente, arquivo de outro sistema ou schema futuro/desconhecido
- **THEN** a operação SHALL falhar com código estável e mensagem pt-BR, sem recriar, migrar destrutivamente ou apagar o arquivo

#### Scenario: Ler ou gravar sem preparação
- **WHEN** uma leitura ou gravação apontar para arquivo ausente ou schema não atualizado
- **THEN** SHALL falhar identificando ausência ou incompatibilidade sem criar arquivo ou atualizar schema

### Requirement: Recuperação integral e fiel do conjunto

A leitura SHALL receber referência civil explícita e devolver snapshot imutável do
conjunto com revisão, preservando identificadores opacos, ordem, cliente por venda,
status, datas civis, centavos, parcelas, origens, recebimentos e alocações. SHALL
validar cada histórico e o conjunto inteiro antes de devolver sucesso, sem persistir
projeções como fonte financeira.

#### Scenario: Reabrir venda com entrada
- **WHEN** gravar e reabrir venda-base 20.000 com duas parcelas e entrada recebida/alocada de 10.000
- **THEN** SHALL preservar IDs, forma, origem e datas e obter base/efetivo 20.000, recebido 10.000, saldo 10.000 e uma de duas parcelas paga
- **AND** consulta do mês da entrada SHALL contar 10.000 uma única vez

#### Scenario: Preservar correção individual e histórico em lote
- **WHEN** gravar e reabrir conjunto com entrada, lote sintético e pagamento Individual de base 10.000 corrigido de 11.000 para 10.500 com nova data
- **THEN** SHALL preservar identidade, vínculos, ordem e origens, com acréscimo Individual de 500 e recebido de 10.500 nessa parcela
- **AND** o mês efetivo SHALL refletir a data corrigida sem duplicar o lançamento nem reordenar o histórico pela data

#### Scenario: Preservar representação e universos
- **WHEN** reabrir fixtures válidas com datas-limite civis, centavos seguros extremos, notas Unicode, descrição ausente e dois clientes com mesmo CPF em vendas distintas
- **THEN** SHALL conservar valores exatos e nulabilidade sem exigir unicidade de CPF
- **AND** vendas Ativas, Inativas e Prejuízo SHALL manter suas coleções e recebimentos mensais segundo as regras vigentes

#### Scenario: Ler banco preparado vazio
- **WHEN** carregar banco próprio preparado sem vendas
- **THEN** SHALL devolver conjunto vazio válido, revisão atual e projeções com totais zero

### Requirement: Rejeição de dados persistidos inconsistentes

Uma linha inválida ou histórico inconsistente SHALL invalidar a leitura inteira com
código estável, sem conjunto parcial, reparo, normalização ou omissão silenciosa.
SHALL validar valores, datas, identificação, enumerações, vínculos, ordem,
unicidade global e somas inclusive de vendas não operacionais.

#### Scenario: Recusar entrada divergente antes de entregar snapshot
- **WHEN** fixture armazenada tiver recebimento/base de entrada 10.000 e alocação de 9.999 ou 10.001
- **THEN** SHALL falhar como dados persistidos inválidos sem devolver venda ou conjunto parcial
- **AND** após restauração explícita da fixture para alocação 10.000, nova leitura SHALL funcionar sem estado de erro residual

#### Scenario: Recusar outros estados inválidos
- **WHEN** o arquivo contiver data inválida, enum desconhecido, recebimento fora de sequência, vínculo indevido, identificador colidente ou soma agregada insegura
- **THEN** SHALL recusar o conjunto inteiro e preservar o arquivo sem autocorreção

### Requirement: Gravação atômica com revisão global

A gravação SHALL receber candidato completo, referência civil e revisão esperada,
validar a integridade atual e candidata e confirmar dados e incremento de revisão
numa única transação. Revisão obsoleta SHALL falhar sem retry automático. Duas
gravações a partir da mesma revisão SHALL não confirmar ambas; leitura SHALL
devolver um snapshot consistente, nunca mistura de versões.

#### Scenario: Confirmar candidato válido
- **WHEN** salvar conjunto válido na revisão atual e reabrir por nova conexão
- **THEN** SHALL recuperar integralmente o candidato com revisão anterior mais um, sem observar gravação parcial
- **AND** salvar novamente com a revisão antiga SHALL resultar em conflito sem duplicação

#### Scenario: Concorrência entre consumidores
- **WHEN** dois consumidores tentarem confirmar candidatos distintos com a mesma revisão esperada
- **THEN** no máximo um SHALL confirmar e o outro SHALL receber conflito ou bloqueio identificável
- **AND** após recarregar, o consumidor SHALL encontrar um conjunto completo válido e sua revisão, sem mesclar candidatos automaticamente

#### Scenario: Rejeitar candidato inválido ou limite de revisão
- **WHEN** houver colisão entre IDs de tipos diferentes, overflow agregado mesmo em Inativas/Prejuízo ou revisão no limite representável
- **THEN** SHALL rejeitar sem alteração de dados ou revisão

#### Scenario: Salvar o mesmo snapshot com revisão atual
- **WHEN** o consumidor salvar snapshot idêntico fornecendo a revisão corrente
- **THEN** SHALL aceitar e incrementar a revisão uma vez, sem duplicar vendas ou recebimentos
- **AND** SHALL não prometer deduplicação de transporte

### Requirement: Preservação das vendas e do histórico

A gravação SHALL permitir novas vendas e atualizações válidas de existentes sem
excluir vendas omitidas. SHALL recusar remoção de parcelas/recebimentos existentes
ou alteração de contrato-base, entrada e lote histórico, preservando os limites das
operações do domínio. Inativação e Prejuízo SHALL conservar o histórico.

#### Scenario: Omitir venda existente
- **WHEN** o candidato completo omitir uma venda armazenada
- **THEN** SHALL retornar exclusão não permitida sem remover qualquer dado nem avançar revisão

#### Scenario: Tentar apagar ou reescrever histórico protegido
- **WHEN** o candidato remover recebimento/parcela existente ou alterar contrato-base, entrada ou lote histórico
- **THEN** SHALL retornar alteração de histórico não permitida sem gravar parcialmente

#### Scenario: Atualizar cliente e status sem perda de histórico
- **WHEN** salvar candidato válido produzido por edição de cliente ou mudança administrativa permitida
- **THEN** SHALL preservar contrato, parcelas, recebimentos e outras vendas, inclusive outra com o mesmo CPF

### Requirement: Falhas e cancelamento sem publicação parcial

Falha antes do commit ou cancelamento observado antes de confirmá-lo SHALL desfazer
dados e revisão. Bloqueio e indisponibilidade SHALL ter códigos estáveis e mensagens
seguras pt-BR. Exceções inesperadas e cancelamento SHALL não virar erro comercial.
Confirmação incerta SHALL exigir recarga, sem afirmar rollback ou repetir escrita.

#### Scenario: Falha intermediária e tentativa válida posterior
- **WHEN** ocorrer falha após a primeira alteração e antes do commit
- **THEN** nova leitura SHALL recuperar dados e revisão anteriores completos
- **AND** nova operação válida SHALL poder confirmar sem resíduos da tentativa anterior

#### Scenario: Cancelar antes ou depois da confirmação
- **WHEN** o token já estiver cancelado ou for observado durante a preparação antes do commit
- **THEN** SHALL propagar cancelamento sem alteração persistente
- **AND** cancelamento recebido somente após commit confirmado SHALL não ser apresentado como rollback

#### Scenario: Arquivo ocupado ou inacessível
- **WHEN** houver bloqueio além do tempo finito configurado ou falha conhecida de acesso
- **THEN** SHALL devolver banco ocupado ou armazenamento indisponível sem expor SQL, caminho pessoal ou dados do cliente

#### Scenario: Confirmação de commit indeterminada
- **WHEN** não for possível determinar se o commit foi confirmado
- **THEN** SHALL informar confirmação indeterminada e exigir recarga/conferência da revisão
- **AND** SHALL não repetir automaticamente a gravação nem alegar que os dados foram revertidos

### Requirement: Isolamento da API e da demonstração

A persistência SHALL ser consumida internamente e testada com dados sintéticos em
arquivos temporários. A API SHALL permanecer sem endpoints de negócio e sem abrir,
criar ou migrar banco ao iniciar; health SHALL não verificar banco. A demonstração
Angular SHALL continuar independente, sem usar dados persistidos.

#### Scenario: Iniciar API sem banco
- **WHEN** iniciar a API técnica sem arquivo SQLite preparado
- **THEN** SHALL manter listener só loopback, health 200 textual Healthy e rota /vendas 404 sem criar arquivo
- **AND** testes/build frontend SHALL continuar executáveis com API desligada

#### Scenario: Executar integração em isolamento
- **WHEN** os testes de persistência criarem e reabrirem arquivos SQLite
- **THEN** SHALL usar apenas fixtures sintéticas e diretórios temporários próprios, liberando conexões antes da limpeza
- **AND** SHALL não ler planilha real, registrar dados pessoais em logs ou alterar uma base operacional
