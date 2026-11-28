# integracao-local-vendas Specification

## Purpose

Permitir consultar e confirmar vendas pela interface sobre a API local persistida,
preservando precisão, revisão observada e conferência explícita quando o resultado é incerto.

## Requirements

### Requirement: Modo local explícito e isolado

A aplicação SHALL oferecer modo local persistido por configuração de execução separada
do demonstrativo padrão. Falha da API SHALL não ativar dados demonstrativos, apagar
SQLite ou inserir seed. O modo local SHALL informar persistência sintética, referência
da sessão e ausência de uso operacional, sem exigir login humano.

#### Scenario: Abrir banco vazio sem inventar registros
- **WHEN** abrir modo local com banco preparado vazio
- **THEN** SHALL consultar a API e apresentar vazio somente após sucesso
- **AND** SHALL não copiar dados do modo demonstrativo ou criar registros por consulta

#### Scenario: Preservar dados e renovar referência
- **WHEN** cadastrar no modo local, recarregar o browser e reiniciar API no mesmo banco
- **THEN** SHALL recuperar IDs, histórico e revisão persistidos, sem seed ou reset
- **AND** a recarga SHALL renovar o dia civil da referência, mantendo-o fixo até nova abertura

### Requirement: Conexão intermediada sem credencial no browser

O modo local SHALL usar proxy de desenvolvimento somente em loopback, com segredo
técnico fornecido por ambiente ao processo servidor e destino fixo da API local.
Credencial SHALL não ser publicada em bundle, browser, URL, resposta, storage ou logs.
CORS da API SHALL permanecer desabilitado; a ponte SHALL não aceitar destino arbitrário.

#### Scenario: Encaminhar chamada da mesma origem
- **WHEN** a interface local enviar requisição comercial admitida pelo proxy
- **THEN** SHALL encaminhar ao contrato `/api/v1` com a credencial técnica apenas no trecho servidor→API
- **AND** query, IDs, corpo, status e valores SHALL ser preservados sem retry

#### Scenario: Recusar configuração inválida
- **WHEN** faltar segredo, seu formato for inválido ou a porta upstream não for válida
- **THEN** SHALL impedir a execução local antes de encaminhar operações
- **AND** diagnóstico SHALL não ecoar valores de configuração

#### Scenario: Credencial não corresponde à API
- **WHEN** proxy configurado com segredo de formato válido encaminhar à API configurada com outro segredo
- **THEN** SHALL apresentar a recusa de acesso local sem executar comando comercial
- **AND** SHALL não pedir conta/senha humana nem publicar qualquer das credenciais

### Requirement: Proveniência obrigatória antes de encaminhar

O proxy SHALL admitir operações apenas com Host único `127.0.0.1:4200` e
`Sec-Fetch-Site: same-origin`. Origin presente SHALL ser exatamente
`http://127.0.0.1:4200`, obrigatório nos comandos. Headers duplicados/contraditórios,
origem null/externa ou Fetch Metadata ausente SHALL ser recusados antes de encaminhar
ou injetar credencial. Apenas GET, POST e PUT comerciais SHALL ser encaminhados.

#### Scenario: Negar origem web indevida
- **WHEN** houver Host indevido/duplicado, Origin externo/null/duplicado ou Sec-Fetch-Site ausente, cross-site, same-site ou none
- **THEN** SHALL recusar com resposta genérica sem encaminhamento nem alteração de revisão
- **AND** SHALL não aceitar autorização fornecida pelo chamador como bypass da proteção

#### Scenario: Exigir origem em comandos e negar canais alternativos
- **WHEN** comando não tiver Origin válido, ou houver OPTIONS/upgrade/tentativa de alvo arbitrário
- **THEN** SHALL não encaminhar a operação à API nem fornecer credencial ou CORS permissivo
- **AND** recusa SHALL não depender de executar o corpo comercial

### Requirement: Precisão do transporte e referência estável

O cliente SHALL preservar revisão como texto decimal canônico no intervalo long não
negativo, dinheiro como inteiro seguro em centavos, datas civis ISO e enums explícitos.
IDs SHALL permanecer opacos, sem trim ou dupla decodificação. Cada chamada SHALL usar
a referência fixa da sessão; mês selecionado SHALL não alterá-la.

#### Scenario: Transportar revisão grande, IDs e bordas civis
- **WHEN** transportar revisão `9007199254740993` ou `9223372036854775807`, ID com barras/reservados/Unicode e datas válidas 0001–9999
- **THEN** SHALL conservar valores literalmente, inclusive em resumos aninhados
- **AND** SHALL não converter revisão para number ou datas para instantes UTC

#### Scenario: Recusar resposta incompatível
- **WHEN** resposta tiver revisão numérica, dinheiro fracionário/inseguro, data impossível, enum desconhecido ou estrutura obrigatória ausente
- **THEN** SHALL não publicar os dados como consulta/sucesso válido
- **AND** após comando enviado sem representação confirmada confiável SHALL iniciar conferência de resultado incerto

#### Scenario: Atravessar meia-noite ou mudar mês
- **WHEN** sessão atravessar meia-noite ou pessoa selecionar outro mês de relatório
- **THEN** SHALL manter referência original em todas as consultas e confirmações
- **AND** nova abertura SHALL capturar novo dia local sem apagar negócios persistidos

### Requirement: Consultas integrais com apresentação local

A interface local SHALL consumir quatro coleções completas, detalhe, Visão Geral
consolidada e relatório mensal da API. Busca, situação, ordenação e paginação SHALL
operar sobre a coleção recebida, sem mutação. Saldos, situações financeiras, universos,
resumos e série mensal SHALL vir da API sem novo cálculo financeiro no cliente.

#### Scenario: Consultar telas e filtrar coleção completa
- **WHEN** consultar Abertas/Quitadas/Inativas/Prejuizo, aplicar busca/ordenação e percorrer 11 ou 21 resultados
- **THEN** SHALL preservar semântica/rotas existentes, todos os registros elegíveis e páginas de até dez
- **AND** SHALL não limitar indicadores ao filtro nem exigir consultas por venda para montar o painel

#### Scenario: Conferir painel e mês
- **WHEN** consultar Visão Geral e alternar mês no relatório com entrada, individual e histórico em lote sintético
- **THEN** SHALL apresentar resultados consolidados da API, sem dupla contagem, recálculo de dívida ou fan-out por venda
- **AND** SHALL manter cinco seções do dashboard, série diária completa e posições na referência

### Requirement: Leitura assíncrona sem publicação obsoleta

Consultas SHALL distinguir inicial/carregando/pronto/erro/registro ausente. Vazio SHALL
existir apenas após sucesso; erro físico ou de transporte SHALL não virar vazio/404.
Trocar ID/mês ou invalidar dados SHALL impedir publicação de resposta anterior como
atual. Dados antigos retidos SHALL ser identificados e não habilitar confirmação.

#### Scenario: Receber respostas fora de ordem
- **WHEN** trocar ID ou mês e a consulta anterior terminar depois da atual
- **THEN** SHALL publicar apenas dados da seleção/referência e geração atuais
- **AND** SHALL não mostrar dados do ID anterior no novo detalhe nem substituir relatório pelo mês anterior

#### Scenario: Distinguir inexistência de indisponibilidade
- **WHEN** detalhe retornar código contratual de venda ausente, ou armazenamento/HTTP falhar
- **THEN** SHALL apresentar respectivamente Venda não encontrada com retorno, ou falha com ação de recarregar
- **AND** SHALL não exibir coleção vazia como se a API tivesse respondido com sucesso

### Requirement: Comandos com revisão observada e confirmação única

A interface SHALL enviar os cinco comandos existentes uma vez por confirmação,
com referência, revisão observada na preparação e alvo explícito. SHALL impedir
confirmações concorrentes na aba enquanto houver envio e não reenviar automaticamente.
Sucesso SHALL exigir resposta confirmada; abrir/preparar/cancelar antes de enviar
SHALL não executar comando.

#### Scenario: Confirmar operações sem duplicar requisição
- **WHEN** confirmar cadastro, edição de cliente, status, baixa ou correção e repetir acionamento durante envio
- **THEN** SHALL enviar somente uma requisição para a confirmação em andamento
- **AND** SHALL preservar regras/no-ops, identidade e contrato da API, sem atualização financeira otimista

#### Scenario: Enviar revisão antiga sem renovação silenciosa
- **WHEN** outro consumidor gravar após preparar o rascunho ou abrir o detalhe
- **THEN** SHALL enviar a revisão originalmente observada e apresentar conflito sem retry
- **AND** SHALL conservar rascunho/alvo, exigir leitura e confirmação novas, sem mover baixa para a próxima parcela

#### Scenario: Navegar durante confirmação
- **WHEN** navegar ou fechar modal depois de enviar um comando ainda pendente
- **THEN** SHALL continuar acompanhando seu resultado na aba sem nova requisição
- **AND** SHALL não afirmar rollback pela navegação ou liberar outra confirmação antes de conhecer o resultado

### Requirement: Atualização após sucesso sem repetir escrita

Após resposta confirmada, a interface SHALL conservar detalhe/revisão recebidos e
invalidar consultas dependentes. Erro na atualização posterior SHALL ser distinguido
do resultado da escrita. Resposta de leitura anterior SHALL não sobrescrever o estado
confirmado e nenhuma falha de atualização SHALL disparar novo comando.

#### Scenario: Confirmar e falhar ao atualizar relatório
- **WHEN** pagamento confirmar e a consulta posterior falhar
- **THEN** SHALL comunicar pagamento confirmado e falha de atualização separadamente
- **AND** SHALL permitir recarregar consultas, nunca reenviar pagamento para corrigir a apresentação

#### Scenario: Atualizar outros contextos
- **WHEN** cadastrar, editar cliente, mudar status, baixar ou corrigir com sucesso
- **THEN** futuras consultas às coleções, detalhe, painel e mês SHALL refletir o estado persistido pertinente
- **AND** consultas antigas em voo SHALL não substituir o resultado confirmado

### Requirement: Conferência de resultado incerto por aba

Após comando enviado com resposta perdida/não confiável ou confirmação indeterminada,
a interface SHALL preservar rascunho em memória, informar incerteza e bloquear os cinco
comandos em toda a aba. SHALL não anunciar sucesso/rollback, inferir cadastro por
semelhança ou repetir automaticamente. Consultas e navegação SHALL continuar disponíveis.

#### Scenario: Perder resposta antes ou depois do commit
- **WHEN** transporte perder resposta de cadastro/baixa, quer tenha havido commit ou não
- **THEN** SHALL assumir resultado incerto e bloquear novas confirmações ao navegar entre telas
- **AND** SHALL preservar rascunho/alvo em memória sem afirmar que houve rollback ou deduplicação

#### Scenario: Consultar e reconhecer sem reenviar
- **WHEN** pessoa acionar conferência, consultar dados com sucesso e reconhecer explicitamente que os conferiu
- **THEN** SHALL liberar novas confirmações sem reenviar nem declarar o comando anterior confirmado
- **AND** falha na consulta SHALL manter bloqueio e reconhecimento indisponível

#### Scenario: Reabrir após resultado incerto
- **WHEN** recarregar ou reabrir a aplicação após resposta perdida
- **THEN** SHALL consultar dados persistidos sem recuperar ou enviar comando pendente
- **AND** orientação SHALL exigir conferência antes de repetir operações sem resposta, sem prometer lembrar bloqueio descartado ou identificar cadastro automaticamente

### Requirement: Falhas e rascunhos acessíveis

A interface SHALL apresentar mensagens seguras pt-BR, associar erros conhecidos aos
campos e preservar rascunhos diante de recusa ou incerteza. SHALL distinguir 401 de
login humano e erro desconhecido de validação. Loading/erro/conferência SHALL ser
anunciáveis e operáveis por teclado nos dois temas, sem depender apenas de cor.

#### Scenario: Corrigir campo e manter foco
- **WHEN** API recusar campo conhecido ou retornar campo não mapeado
- **THEN** SHALL respectivamente associar erro ao campo pertinente e orientar foco, ou apresentar resumo seguro
- **AND** SHALL manter valores para correção sem inventar mensagem técnica ou perder erro silenciosamente

#### Scenario: Operar loading e recuperação em temas e viewports
- **WHEN** percorrer estados assíncronos, modais e conferência nos dois temas em 1366×768, 390×844 e zoom nativo 200% quando disponível
- **THEN** SHALL manter rótulos, foco perceptível, anúncios e ações alcançáveis, com rolagem localizada quando necessária
- **AND** SHALL preservar densidade no estado pronto, contraste vigente e exportação indisponível
