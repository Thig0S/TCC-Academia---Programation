# PRD — Mercadão dos Óculos - Vendas em Aberto

## Fase 005 do backend — contrato e API local (26/11/2026)

### 1. Identificação e resumo executivo

Planejamento original de `fase-005-contrato-e-api-local`, elaborado sem autorização
de implementação; a autorização e execução posteriores estão registradas na atualização
de 27/11/2026 abaixo.
O objetivo é disponibilizar os casos de uso persistidos a consumidores HTTP locais,
incluindo uma consulta consolidada da Visão Geral. Público imediato: desenvolvedor,
testes e futuro host desktop; beneficiários futuros: funcionários da loja.
Responsáveis por homologação operacional continuam não definidos.

### 2. Contexto, problema e fontes

| Fonte | Referência | Evidência e limite |
| --- | --- | --- |
| FON-045 | Solicitação desta Change e respostas no Harness em 26/11/2026 | Confirmados: API dos casos existentes + Visão Geral; preparação explícita ao iniciar; segredo técnico obrigatório; referência fornecida por operação; revisão textual no JSON; IDs em query/body; CORS desligado; caminho absoluto com pai existente; planejamento em PRD/TDD/SDD, sem código. |
| FON-046 | Documentação ASP.NET Core via Context7 `/dotnet/aspnetcore.docs`, consultada em 26/11/2026 | Problem Details, falhas de binding em .NET 10, configuração por ambiente e esquema de autenticação customizado; fundamentação técnica em DEC-041. Não comprova execução local. |
| FON-043/044 | Seção da fase 004 e Change arquivada | Aplicação interna implementada; evidências anteriores de 285 testes backend e 430 frontend, não repetidas neste planejamento. |

Inspeção confirma API somente com `/health`, `Api.csproj` sem Infraestrutura e Angular
com `ServicoDemonstracao`. O PR #40 da fase 004 foi integrado, conforme consulta ao
GitHub; menções anteriores a PR pendente são registros históricos, não estado atual.
Ainda não existem endpoints comerciais ou integração desktop.

### 3. Objetivos e não objetivos

Reutiliza OBJ-001–004: consultar e alterar vendas sem duplicar coordenação financeira
nos consumidores. Resultado técnico esperado: cadastrar, baixar, consultar e reabrir
via HTTP local, com revisão e valores preservados. Não objetiva conectar Angular,
entregar Tauri, permitir acesso em rede ou homologar uso operacional.

### 4. Público e necessidades

Consumidor técnico precisa de contratos verificáveis, identificação segura das falhas
e persistência entre reinicializações. Não introduz perfis humanos, login ou permissões
por funcionário. Acessibilidade visual não muda porque nenhuma tela será alterada.

### 5. Escopo e prioridades

Essenciais: cinco comandos e cinco consultas da fase 004; consulta de Visão Geral;
contrato externo; proteção técnica; composição e preparação do banco pelo host;
testes HTTP reais e de integração. A prioridade decorre da dependência das próximas
etapas de integração. Autorização é apenas de planejamento.

Fora: Angular/SDK cliente, Tauri/sidecar, instalador, CORS para navegador, login/JWT,
TLS de distribuição, descoberta de porta, importação, seed, dados reais, exportação,
backup/restauração operacional, mudanças de schema e manutenção de outras Changes.
Esses itens são evolução futura, não compromissos desta fase.

### 6. Jornadas técnicas desta fase

- Inicialização (RF-031/032): fornecer destino e segredo → validar configuração →
  preparar explicitamente o banco → disponibilizar API. Falha impede servir requisições.
- Operação (RF-033/034): consultar revisão → enviar comando autenticado → receber
  representação confirmada ou falha identificável → reconsultar em consumidor novo.
- Painel (RF-035): consultar uma referência → receber indicadores e três resumos do
  mesmo snapshot, sem chamadas por venda e sem alterar dados.

### 7. Requisitos funcionais

Todos Essenciais; origem FON-045. O escopo foi confirmado; os detalhes do contrato
ficam propostos para revisão em TDD/DEC-041, sem alegar aprovação operacional.

| ID | Entradas e pré-condições | Comportamento e resultado | Alternativas/aceite |
| --- | --- | --- | --- |
| RF-031 | Host local, caminho absoluto de banco em pai existente e segredo válido fornecidos externamente | Validar configuração antes de I/O; compor aplicação/infraestrutura e preparar explicitamente o banco antes de aceitar requisições. Banco novo fica vazio, sem seed. | Repetir preserva revisão/dados; destino relativo, pai ausente, segredo ausente ou schema incompatível impedem inicialização. CA-061. |
| RF-032 | Requisição comercial em loopback com credencial técnica | Exigir segredo por execução em header, sem contas/cookies/redirecionamento; manter health textual sem credencial e CORS desabilitado. | Sem credencial válida, recusar antes de executar caso de uso; segredo nunca em URL, corpo de erro ou logs. CA-062. |
| RF-033 | Commands da fase 004 com referência, revisão observada e IDs existentes quando necessários | Expor cadastro, edição de cliente, status, baixa e correção individuais, com o mesmo domínio, atomicidade e no-op; devolver somente representação confirmada e revisão. | Sem exclusão, retry automático, edição contratual ou baixa em lote. Recusa sem efeitos e conflito exigem nova decisão do consumidor. CA-063/066. |
| RF-034 | Consultas autenticadas, referência explícita e seletores pertinentes | Expor detalhe, quatro coleções completas, resumo, período e mês, com revisão do snapshot. Datas civis, centavos seguros, revisão textual e IDs opacos preservados no transporte. | Vazio é sucesso; detalhe ausente é inexistência; binding inválido é validação. Não serializar resultados internos. CA-064/067. |
| RF-035 | Consulta autenticada de Visão Geral com referência | Devolver quatro indicadores e até cinco itens em cada resumo, selecionados das Ativas e derivados de um snapshot único; recibos mensais incluem todos os status. | Respeitar regras vigentes de ordem, empate e bordas; bloco vazio independente. Sem filtro/paginação novos. CA-065. |
| RF-036 | Falha esperada, falha técnica ou cancelamento na fronteira HTTP | Distinguir validação, inexistência, conflito, regra comercial, indisponibilidade e confirmação indeterminada, com código/mensagem segura e campo pertinente. | Falha inesperada não vira validação; desconexão não prova rollback; nenhuma repetição automática. CA-066/068. |

### 8. Regras e dados conceituais

Preservar RF-023–030 e RN-025/026: venda é raiz; identificação/histórico/contrato
mantidos; dinheiro exato; entrada e recebimentos sem dupla contagem. A API adapta,
não recalcula. Revisão continua global e não negativa; sua representação externa
não altera o tipo interno. A referência não é inferida do relógio pelo handler.

Visão Geral reutiliza `openspec/specs/visao-geral/spec.md`: recentes Ativas por data
decrescente; parcelas pendentes Ativas próximas de hoje a +7 inclusive e atrasadas
antes da referência, por vencimento crescente. Até cinco após selecionar/ordenar;
empates seguem ordem de vendas e parcelas; recentes incluem Ativas quitadas.
Nenhuma alteração financeira ou nova regra comercial é autorizada.

### 9. Restrições não funcionais

Aplicar RNF-001/005/008 quanto a pt-BR, integridade e separação. RNF-004/010 do
protótipo continuam valendo para o Angular demonstrativo, mas não proíbem a evolução
backend explicitamente solicitada. Exceção delimitada à API local: acesso SQLite
pelo host via Infraestrutura e preparação explícita na inicialização (DEC-041).

Verificações: falhas/logs sem dados pessoais, segredo ou SQL; listener apenas
loopback; nenhuma criação em consultas; testes com temporários sintéticos; restore
bloqueado/build/test/format e auditoria no apply. Não há meta nova de latência,
benchmark, proteção contra comprometimento do usuário local ou criptografia prometida.

### 10. Experiência e estados

Nenhuma UI muda. Os contratos distinguem vazio, erro, conflito e confirmação incerta
para futura apresentação; esta fase não implementa foco, loading ou mensagens nas
telas. O aviso demonstrativo e a independência Angular permanecem.

### 11. Critérios de aceite

- **CA-061 (RF-031):** dado destino absoluto em pai existente e segredo válido,
  quando iniciar host novo, então preparar banco vazio antes de servir; reiniciar
  conserva registros/revisão. Configuração inválida falha antes de I/O; banco alheio,
  futuro ou inválido não é sobrescrito. Pai ausente não é criado implicitamente.
- **CA-062 (RF-032):** dada API em loopback, quando acessar operação sem segredo ou
  com segredo incorreto, então obter 401 sem executar handler nem alterar revisão;
  segredo válido libera. Health continua 200 `text/plain` `Healthy`, sem cookies;
  origem arbitrária não recebe permissão CORS. Credencial anterior falha após troca.
- **CA-063 (RF-033):** dado banco vazio preparado, quando cadastrar, editar cliente,
  mudar status, baixar e corrigir via HTTP, então recuperar em nova conexão os mesmos
  IDs/valores/histórico, com revisão confirmada. No-op válido não avança revisão;
  comando obsoleto falha inclusive no no-op, sem retry ou deslocar parcela-alvo.
- **CA-064 (RF-034):** dado estado misto com entrada/lote sintético/Individual,
  quando consultar detalhe, coleções, resumo, período e mês, então reconciliar com
  regras vigentes, incluindo todos os dias do mês, ordens e universos; vazio retorna
  sucesso, ID ausente falha e nenhuma consulta prepara ou grava armazenamento.
- **CA-065 (RF-035):** dado mais de cinco itens por bloco e status mistos, quando
  consultar painel, então indicadores e três resumos têm mesma referência/revisão,
  uma carga e zero escrita. Selecionar e ordenar antes de limitar, preservar empates,
  excluir não Ativas dos resumos e manter seus recebimentos mensais nos indicadores.
  Cobrir ontem/hoje/+7/+8, pagas, blocos vazios e anos 0001/9999 sem transbordo.
- **CA-066 (RF-033/036):** dados concorrência e falhas de confirmação, quando enviar
  comandos, então no máximo um confirma a revisão disputada; conflito não grava.
  Confirmação indeterminada não anuncia sucesso/rollback e exige conferência, sem
  reenviar automaticamente. Desconexão após commit não autoriza repetir cadastro/baixa.
- **CA-067 (RF-034):** dados IDs com barras/caracteres reservados, datas extremas,
  nulabilidade, centavos máximos e revisão maior que o inteiro seguro JavaScript,
  quando transportar pelo contrato, então preservar valores literalmente; revisão
  numérica, formato de data inválido e enum desconhecido são recusados sem negócio.
- **CA-068 (RF-036):** dado JSON malformado, binding inválido, tipo incompatível,
  falha conhecida ou exceção inesperada em Development/Production, quando chamar API,
  então retornar status e Problem Details coerentes e seguros, sem serializar Result,
  Reasons, exceção, SQL, token ou dados pessoais. Cancelamento não vira erro comercial.

Rastreabilidade: OBJ-001–004 → FON-045/046 → RF-031–036/CA-061–068 → DEC-041 →
`openspec/changes/fase-005-contrato-e-api-local/`. Cada tarefa deve identificar
cenários/testes que comprovem seu aceite, sem contagens históricas como expectativa fixa.

### 12. Sucesso e validação

Sucesso técnico: cenários CA-061–068 demonstrados e resultados reais registrados no
apply. Métricas são os resultados verificáveis dos cenários, não telemetria ou ganho
comercial medido. Homologação com a loja fica fora; responsáveis e uso real indefinidos.

### Atualização de execução da Change — 27/11/2026

O apply autorizado de `fase-005-contrato-e-api-local` foi concluído na feature
`feature/fase-005-contrato-e-api-local`: 21/21 tarefas verificadas, com specs e
evidências detalhadas em `backend/README.md` e na Change. O smoke da DLL Release em
Production usou segredo aleatório no ambiente, banco sintético temporário e loopback;
confirmou preparação antes do health, health 200 textual, 401 sem credencial, cadastro
201 com Location, consulta, recebimento da única parcela/revisão 2, reinício conservando
venda/recebimento e rejeitando o segredo anterior. Os processos próprios foram
encerrados, a porta temporária liberada e arquivos de smoke removidos; a saída dos
processos não continha os marcadores sintéticos auditados.

| Critério | Evidência principal registrada | Resultado |
| --- | --- | --- |
| CA-061 — inicialização/persistência | `ConfiguracaoHostApiTests`, `Primeiro uso e reinicialização`, `Configuração inválida antes de I/O`, `Destino indisponível ou incompatível`, `Conservar fronteira de rede`; smoke real de startup/reinício/loopback | Atendido nos cenários sintéticos; sem acesso a banco operacional. |
| CA-062 — proteção local/health/CORS | `AutenticacaoBearerLocalTests`, `HealthEndpointTests`, `RotasNaoImplementadasTests`; `Negar antes de executar operação`, `Aceitar credencial da execução corrente`, `Body inválido sem autenticação`, cenários de health/rotas; smoke 401 e rotação | Atendido em testes e smoke técnico; não é garantia contra comprometimento do processo/usuário local. |
| CA-063 — comandos confirmados | Testes HTTP/SQLite de cadastro, cliente, status, recebimento e correção; cenários `Rotas e entradas dos comandos`, `Cadastrar e reabrir pela localização confirmada`, `No-op e conflito`, `Receber e corrigir sem alterar identidade`; smoke cadastro/Location/baixa/reabertura | Atendido com dados sintéticos e revisão confirmada. |
| CA-064 — consultas | Testes HTTP/SQLite de detalhe, coleções, resumo, período e mensal; cenários `Rotas e seletores das consultas`, `Consulta vazia e detalhe inexistente`, `Respeitar universos e período` | Atendido; consultas verificadas sem mutação/preparação implícita. |
| CA-065 — Visão Geral | Testes unitários/SQLite/HTTP do handler e endpoint; cenários de indicadores, banco vazio, ordenação/desempate, bordas/calendário e mudança administrativa na delta de casos de uso | Atendido com snapshot único, listas protegidas, limites e bordas. |
| CA-066 — concorrência/certeza | `ConcorrenciaCommandsEndpointTests`; cenários `Dois consumidores disputam revisão`, `Confirmação indeterminada`, `Cancelamento e desconexão` | Atendido para concorrência SQLite e double controlado de confirmação incerta; não simula falha nativa de commit nem prova entrega após desconexão real. |
| CA-067 — tipos exatos | Testes de contrato/query e endpoints; cenários de revisão/dinheiro, ID reservado, data/referência, enums/nulabilidade e binding estrutural | Atendido; revisões textuais, centavos inteiros, IDs e datas preservados/recusados conforme contrato. |
| CA-068 — falhas privadas | `FalhasTecnicasTests`, `PrivacidadeHttpTests`, `AdaptadorResultadosApiTests`; cenários de binding/content type, categorias, falha técnica, corpo/cache; auditoria Development/Production | Atendido para os casos cobertos; logs futuros/provedores externos, telemetria, dumps e desconexão física estão fora da prova automatizada. |

A validação integral/backend/frontend e as limitações estão registradas no README; o
frontend não foi conectado à API, não houve mudança de schema, Tauri, seed ou dados
operacionais, e não se afirma homologação/aceite da ótica. A conclusão técnica da
Change não equivale a merge ou autorização para uso real.

### 13. Riscos e mitigação

Segredo em ambiente não protege de processo comprometido do mesmo usuário; restringir
escopo local/sintético e não alegar isolamento de SO. Escrever após timeout/desconexão
pode duplicar operações se consumidor repetir: exigir conferência, sem retry. Snapshot
completo continua proporcional à base; painel deve usar uma carga, sem N+1. Mudança da
composição invalida smoke antigo sem banco: atualizar os testes afetados, não apagá-los.

### 14. Decisões e pendências

Escolhas materiais foram confirmadas no Harness/FON-045. API concreta, códigos HTTP
e estrutura são desenho proposto em DEC-041 para revisão. Não há regra comercial
bloqueante nova; integração Angular, porta dinâmica, proteção desktop, backup e
homologação permanecem fora. Aprovação do desenho não autoriza apply.

### 15. Entregas e próximos passos

Contrato/composição → Visão Geral interna → consultas HTTP → comandos HTTP →
regressão/smoke/auditoria. Implementação depende de pedido novo de apply após revisão.
Um commit por funcionalidade coerente; archive e PR único somente quando todo o escopo
implementado e verificado estiver concluído, nunca ao concluir apenas este planejamento.

### 16. Glossário e revisão

Credencial técnica identifica acesso ao processo, não funcionário; preparação é chamada
explícita do host antes de servir; revisão é versão global do snapshot; TDD é desenho
técnico. Revisão de 26/11/2026 acrescenta RF-031–036/CA-061–068/FON-045/046, preserva
IDs e evidências históricos e reconhece integração da fase 004 pelo PR #40.

## Fase 004 do backend — aplicação interna (26/11/2026)

### Identificação, fontes e situação

**FON-043:** pedido `fase-004-aplicacao` e entrevista no Harness desta conversa.
O solicitante confirmou aplicação completa sem transporte; referência civil explícita
por operação; IDs novos gerados na aplicação; revisão esperada fornecida pelo consumidor;
caminho de banco configurado por composição; preparação explícita; no-op sem gravação;
coleções completas sem controles de busca; handlers explícitos e DTOs próprios.
Autorizou registrar PRD/TDD e artefatos OpenSpec, **não implementar**. Não confundir
com a FASE-004 histórica do protótipo Angular.

**FON-044:** consulta documental em 26/11/2026 ao NuGet e às fontes oficiais de
MediatR/FluentResults, detalhada em TDD/DEC-040. A opção inicialmente apresentada como
versão anterior MIT foi corrigida: MediatR 12.5.0 é Apache-2.0; o solicitante aceitou
explicitamente essa licença e versão, com FluentResults 4.0.0 MIT. Não se presume
licença comercial ou suporte da linha antiga. No baseline do PRD, a auditoria ainda
não havia sido executada; seu resultado posterior consta na atualização de execução.

**Situação no baseline deste PRD:** planejamento confirmado para o recorte; naquele
momento, implementação não iniciada e apply não autorizado. A atualização de execução
registrada ao fim deste documento prevalece para o estado atual. Não há aceite
operacional, dados reais ou responsáveis de homologação definidos.

### Problema, objetivos, público e estado observado

Reutilizar OBJ-001–004: permitir que futuros consumidores internos executem operações
completas e consultem resultados persistidos sem coordenar manualmente domínio e
SQLite nem duplicar cálculos financeiros. Consumidor imediato é código/testes;
beneficiário futuro continua a equipe local da loja, sem contas ou perfis de acesso.

Inspeção: domínio imutável, projeções, armazenamento transacional e contrato
`Aplicacao/Persistencia/IArmazenamentoVendas.cs` existem. Não há handlers ou pacotes
MediatR/FluentResults. A API expõe somente health, sem composição SQLite, e Angular usa
`ServicoDemonstracao`. PRs #34–39 estão integrados. `backend/README.md`, seção VER-01,
registra a última regressão de 205 testes backend e 430 frontend; são evidências
anteriores, não novas execuções desta fase. Prevalece este diagnóstico sobre trechos
históricos que ainda descrevem camadas vazias ou integração pendente.

### Escopo, requisitos e prioridades

Todos os requisitos abaixo são **Essenciais**, de origem FON-043, confirmados para
planejamento. Eles reutilizam RF-023–026 e RN-025/026; não criam regras financeiras.

| ID | Comportamento, entradas e pré-condições | Resultado e alternativas | Aceite |
| --- | --- | --- | --- |
| RF-027 | Oferecer casos de uso de cadastro, edição dos quatro campos do cliente, mudança administrativa, baixa individual e correção individual. Commands recebem dados próprios, referência civil e revisão esperada não negativa; banco preparado. IDs novos são gerados internamente; IDs existentes são informados. | Havendo alteração, sucesso somente após gravação confirmada, com DTO e revisão; no-op segue RF-029. Preservar demais vendas e histórico. Falhas existentes de identificação, elegibilidade, sequência, valores e datas não gravam. Sem nova baixa em lote, exclusão, estorno ou edição de contrato-base. | CA-054–056 |
| RF-028 | Consultar detalhe por ID, coleções Abertas/Quitadas/Inativas/Prejuízo, resumo, período inclusivo e relatório mensal. Receber referência explícita; mês pode ser selecionado sem trocar a referência. | DTOs com revisão lida do mesmo snapshot; detalhe ausente é inexistência, coleções vazias são sucesso. Coleções completas preservam ordem de origem; relatórios preservam as ordenações existentes. Sem busca, filtros adicionais, paginação ou reconstrução de posição histórica. | CA-057 |
| RF-029 | Commands exigem a revisão observada pelo consumidor e usam a mesma referência durante carga, domínio e gravação. Conferir revisão antes de operar ou aceitar no-op. | Revisão obsoleta falha sem retry; escrita confirma nova revisão. Status já aplicado ou quatro campos de cliente normalizados idênticos retornam sucesso sem gravar e sem incrementar revisão. Revisão devolvida em consulta/no-op é a observada, não garantia de que não ocorreu escrita posterior. | CA-055/058 |
| RF-030 | Configurar caminho absoluto uma vez por composição interna e preparar banco somente por chamada explícita separada. Consultas/Commands não criam/migram arquivo; API e frontend continuam independentes. | Respostas próprias da aplicação, com centavos inteiros, datas civis e coleções protegidas; erros tipados/códigos estáveis/mensagens seguras pt-BR. Cancelamento e exceções inesperadas propagam. Confirmação indeterminada não é sucesso nem promessa de rollback: exige recarga, sem retry automático. | CA-058–060 |

### Jornadas técnicas e regras conceituais

- **Preparar e cadastrar (RF-027/030):** compor com caminho temporário → preparar
  explicitamente → consultar revisão zero → cadastrar → receber IDs/revisão → descartar
  composição → reabrir e consultar. Arquivo ausente não preparado é falha, nunca seed.
- **Alterar e conferir (RF-027/029):** consultar detalhe/revisão → editar cliente, mudar
  status, baixar ou corrigir → validar novo conjunto → gravar → consultar em nova
  composição. Conflito exige recarregar e decidir novamente, não reenviar às cegas.
- **Consultar (RF-028):** carregar um snapshot por Query → derivar pelo domínio →
  devolver DTO/revisão. Mudar mês altera movimentação, não a posição na referência.

Venda continua raiz com cliente próprio, parcelas, recebimentos e alocações. IDs do
domínio permanecem strings opacas; a geração padrão não altera IDs persistidos nem
promete deduplicação de requisições. Total/saldo/entrada/acréscimos, status e datas
seguem RF-023 e RN-025/026, inclusive recebimentos de todos os status e vendas do
período somente Ativas. A aplicação não substitui as fábricas ou cálculos existentes.

### Critérios de aceite e rastreabilidade

- **CA-054 (RF-027):** dado banco preparado vazio, quando cadastrar total 10.000 sem
  entrada em três parcelas, então gerar IDs distintos e bases 3.334/3.333/3.333,
  confirmar revisão +1 e reabrir com os mesmos dados. Com base 20.000, entrada 10.000
  e duas parcelas, pago/saldo são 10.000/10.000, 1/2 paga e entrada conta uma vez.
  Dados inválidos, colisão do gerador e overflow do conjunto não publicam candidato.
- **CA-055 (RF-027/029):** dado snapshot válido, quando editar cliente ou aplicar
  transição permitida, então preservar contrato/histórico e demais vendas, inclusive
  CPF repetido. Mesmo status ou cliente normalizado idêntico, com revisão vigente,
  não chama gravação nem incrementa revisão; revisão obsoleta falha inclusive no no-op.
- **CA-056 (RF-027):** dada parcela-base 10.000, quando baixar por 11.000 e corrigir
  para 10.500 com data em outro mês, então preservar IDs na correção, acréscimo 500,
  saldo-base das demais e recebimento no mês correto. Repetição, salto, valor abaixo
  da base, venda não Ativa e edição de entrada/lote falham sem gravação parcial.
- **CA-057 (RF-028):** dado snapshot de status mistos e movimentos nas bordas, quando
  consultar detalhe/coleções/resumo/período/mês, então DTOs reconciliam literalmente
  com o domínio, com dados de cliente e histórico quando pertinentes e revisão do
  mesmo snapshot. Vendas somente Ativas no período; recebimentos de todos os status;
  série diária soma o mês e posição permanece na referência. Banco vazio tem zeros,
  mês vazio é válido, ID ausente falha, intervalo invertido/mês inválido falham sem
  escrita; saída não permite mutar estado e nenhuma Query inicializa/salva banco.
- **CA-058 (RF-029/030):** dados dois consumidores na mesma revisão, quando enviarem
  alterações distintas, então no máximo um confirma; o outro recebe conflito/bloqueio
  identificável, sem retry. Falha/cancelamento antes do commit preservam estado;
  cancelamento tardio não muda sucesso já confirmado. Confirmação indeterminada exige
  recarga sem alegar rollback; erro inesperado não vira validação ou mensagem técnica.
- **CA-059 (RF-030):** dada composição interna sem banco, quando apenas compor ou
  consultar, então não criar arquivo; preparação explícita separada cria banco vazio
  e é idempotente. API mantém loopback, health textual e `/vendas` 404 sem acessar
  SQLite. EF/SQLite não transitam à API; MediatR/FluentResults podem transitar via
  Aplicacao sem registro de handlers no host. Angular não chama a aplicação.
- **CA-060 (RF-027–030):** dado apply posteriormente autorizado, quando executar
  MSTest dos handlers com doubles e integração via ISender/SQLite real em temporários,
  restore bloqueado, build Release, format, auditoria e smoke, então registrar resultados
  reais e limitações; manter regressão frontend com API desligada. Contagens históricas
  não são expectativa fixa; licença e grafo de dependências precisam ser verificados.

Matriz: OBJ-001–004 → FON-043/044 → RF-027–030/CA-054–060 → TDD/DEC-040 →
`openspec/changes/fase-004-aplicacao/` → APP-01–06 e testes futuros. Não atribuir
aprovação de produto às respostas de desenho ou ao status de existência dos artefatos.

### Restrições, riscos, métricas e evolução

Mensagens públicas pt-BR, dinheiro em centavos seguros e DateOnly; formatação BRL/JSON
fica para consumidores. Sem UI nova: navegação, teclado, foco, temas e acessibilidade
do protótipo não mudam; E2E/visual/zoom não se aplicam ao recorte sem mudança de tela.
Usar somente fixtures sintéticas e diretórios próprios; não registrar CPF/telefone,
SQL ou caminho pessoal em erros. Não há nova meta de desempenho nem telemetria.
Sucesso técnico é a comprovação de CA-054–060, não ganho operacional medido.

Riscos: gerador colidente, DTO que omite histórico, erro de mapeamento de centavos,
no-op confundido com escrita, confirmação incerta repetida e dependência antiga sem
correção disponível. Mitigar com valores literais, doubles que verificam chamadas,
reabertura real e gate de segurança/licenças no APP-01. Vulnerabilidade relevante
exige revisar TDD/SDD antes de implementar código dependente; não reduzir baseline.

Fora: endpoints/adaptador HTTP, Angular, busca/ordenação/paginação de coleções,
autenticação, Tauri/IPC, importação, dados reais, seed, backup operacional, criptografia,
instalador, CI e manutenção/archive de outras Changes. Pendências do legado e aceite
da loja continuam futuras e não bloqueiam biblioteca interna sintética.

Roadmap original: contratos/composição → cadastro/consulta → cliente/status → recebimentos
→ demais Queries → regressão/evidências. No baseline do PRD, todas as entregas estavam
não implementadas. O estado aplicado atualizado está registrado abaixo; PR único
somente após concluir/verificar a Change e arquivá-la conforme AGENTS.md; merge exige
autorização.

### Atualização de execução da Fase 004 — 26/11/2026

O apply de `fase-004-aplicacao` foi autorizado após revisão dos artefatos. As tarefas
APP-01 a APP-05 e APP-06/6.1–6.5 estão implementadas e verificadas. A suíte completa
backend passou com 285 testes, 0 falhas e 0 ignorados; discovery contou 197 UnitTests e
88 IntegrationTests. Restore bloqueado, build Release, format, auditoria NuGet e grafo
isolado da API estão registrados em `backend/README.md`. Smoke real confirmou health
textual em loopback e 404 para `/vendas`; com a API desligada, frontend passou 430 testes
em 33 arquivos e build. A versão usada foi o SDK isolado `10.0.404` (runtime `10.0.15`).

As evidências cobrem CA-054–060 por testes unitários, SQLite temporário, doubles de
protocolo e execução real do host/frontend, conforme matriz final no README. Isso
comprova verificações técnicas, não homologação operacional, aceite da loja ou uso com
vendas reais. Permanecem fora do escopo endpoints, integração Angular e alterações de
schema/migration. A Change passou pela validação estrita, foi sincronizada e arquivada
em `openspec/changes/archive/2026-11-26-fase-004-aplicacao/`; a abertura do PR único é
o próximo passo do fluxo. Nenhuma autorização de merge é inferida.

## Correção da descoberta dos testes de backend (26/11/2026)

**Problema:** a extensão C# do VS Code pode iniciar o restore por uma solução
temporária fora de `backend/`; nesse contexto, não encontra o mapeamento
`MSTest.Sdk` em `backend/global.json` e falha ao carregar os projetos de teste.
O aviso `NU1503` decorre do projeto não carregado e não é, isoladamente, a causa.

**Objetivo e aceite:** tornar a versão do SDK de teste resolvível pelo próprio
projeto, sem mudar framework, runner ou baseline. CA-053: ambos os projetos de
teste declaram MSTest.Sdk 4.5.3, igual ao mapeamento em `global.json`; restore e
testes iniciados com a solução versionada em `backend/` resolvem os projetos, e
as instruções distinguem esse pin do SDK .NET requerido (10.0.404 ou patch
permitido na mesma feature band). A resolução da extensão deve ser confirmada
quando disponível; sem ela, não alegar verificação no VS Code.

**Escopo:** somente configuração do projeto, instruções e verificações de
restore/build/testes. Sem atualização de versões, instalação local por agente,
alteração de CI ou comportamento funcional. Origem FON-042. Rastreabilidade:
TDD/DEC-039 e OpenSpec `corrigir-resolucao-sdk-mstest`.

**Resultado observado nesta Change:** restore `--locked-mode`, build Release e
203 testes passaram usando a instalação temporária .NET SDK 10.0.404. A extensão
do VS Code na máquina do solicitante não foi executada neste ambiente; sua
confirmação permanece pendente.

**Reconciliação de rastreabilidade e período (26/11/2026):** referências históricas
à correção MSTest como FON-041/CA-049/TDD-DEC-038 passam a ser aliases históricos
de FON-042/CA-053/TDD-DEC-039. Os identificadores canônicos FON-041/CA-049/DEC-038
permanecem reservados à persistência SQLite abaixo. Esta correção documental não
altera critérios nem resultados já registrados. Em RF-023/RN-026 e TDD/DEC-037,
`ConsultarPeriodo.Vendas` corresponde às vendas Ativas com data civil dentro do
intervalo inclusivo; os recebimentos permanecem de todos os status, pela data
efetiva, inclusive os de vendas Inativas ou Prejuízo. Trata-se da explicitação
coerente de regra existente, não de novo critério de aceite.

## Fase 003 do backend — persistência SQLite (25/11/2026)

**FON-041:** pedido de avaliar a correção recente e planejar a fase 003; no Harness,
o solicitante escolheu persistência SQLite e aprovou EF Core, modelos persistentes
separados, migrations explícitas e gravação transacional do conjunto com revisão
global. Confirmou caminho absoluto fornecido pelo consumidor, inicializador interno
sem CLI e proibição de excluir vendas omitidas. A autorização inicial cobria somente
planejamento; o apply foi autorizado posteriormente no Harness.
Não confundir com a FASE-003 histórica de navegação Angular.

### Problema, objetivo, público e evidências

O domínio imutável existe, mas seu estado não sobrevive ao encerramento do processo.
Preparar armazenamento local fiel para a evolução offline da equipe da loja, sem
transformar a demonstração Angular em aplicação operacional. Reutilizar OBJ-001–004
e regras de RF-023: identidade, centavos, datas civis, entrada única e histórico.
Consumidor imediato é código interno/testes, não um operador via nova tela.

Inspeção do commit `0280d3b`: a reconstrução agora rejeita alocação de entrada
divergente do recebimento/base antes de criar o agregado; preserva o ramo Individual.
Testes cobrem 1/9.999/10.001 contra 10.000 e round-trip de projeção/conjunto/período.
O caso positivo não executa tentativa inválida anterior no mesmo método, apesar do
texto do planejamento anterior; não invalida a guarda, mas a nova integração cobrirá
leitura inválida seguida de leitura válida. README registra 143 testes backend e
430 frontend aprovados. São evidências anteriores, não reexecuções desta proposta.
Na inspeção que fundamentou o planejamento, Aplicacao/Infraestrutura não tinham
tipos de negócio ou pacotes de persistência. SQL-01/1.1 adicionou dependências
somente à Infraestrutura; SQL-01/1.2 adicionou o contrato em Aplicacao e SQL-01/1.3
o modelo relacional, `VendasDbContext` e migration inicial. SQL-02/2.1 implementou
inicializador explícito/revisão zero; SQL-03/3.1–3.3 implementou leitura transacional,
cobertura de histórico/relatórios e rejeição adversarial em fixtures SQL; SQL-04/4.1
implementou a primeira gravação atômica e round-trip. A persistência continua interna,
sem registro na API; proteção detalhada de histórico, concorrência/revisão e rollback,
cancelamento e confirmação indeterminada foram verificados em SQL-04/4.2–4.4.
SQL-05 fechou a regressão backend, smoke isolado da API, testes/build frontend em cópia
temporária, auditoria de critérios e evidências; a limitação do `node_modules` original
está registrada, sem encerrar os servidores ativos.

### Escopo, requisitos e prioridade

**RF-024 — Armazenamento local fiel (Essencial):** dado um conjunto válido e uma
referência civil explícita, permitir preparar banco SQLite vazio, gravar e recuperar
vendas, cliente por venda, parcelas, recebimentos e alocações preservando IDs,
ordem, origens, valores-base/efetivos, formas, observações e datas. Reconstruir pelas
fábricas vigentes e validar o conjunto antes de devolver sucesso; banco vazio
preparado retorna conjunto vazio. Histórico inválido não é normalizado, ignorado ou
parcialmente devolvido. Origem FON-041, escopo confirmado; desenho em DEC-038.

**RF-025 — Gravação atômica e proteção de estado (Essencial):** o consumidor fornece
snapshot completo e revisão esperada. Aceitar novas vendas e atualizações sem
omitir vendas já armazenadas; conflito de revisão, candidato inválido, falha antes
do commit ou cancelamento confirmado antes do commit não publicam estado parcial.
Sucesso só após commit confirmado. Revisão obsoleta exige recarregar, nunca repetir
automaticamente a escrita. Revisão protege o conjunto, inclusive somas e IDs globais.
Não oferece exclusão, estorno, histórico de auditoria nem deduplicação de transporte.

**RF-026 — Preparação controlada e isolamento (Essencial):** consumidor informa
caminho absoluto e chama operação interna explícita de migrations; leitura/gravação
não criam banco ou atualizam schema implicitamente. Banco ausente, incompatível,
ilegível ou inconsistente gera falha identificável e segura, sem reset ou reparo
automático. API permanece só técnica, sem criar/abrir banco ao iniciar; `/health`
não passa a representar disponibilidade financeira. Prioridade essencial para
evitar gravação no local errado e perda silenciosa; origem FON-041 confirmada.

### Jornadas e critérios de aceite

Fluxo técnico: preparar caminho temporário → inicializar → carregar snapshot/revisão
→ produzir candidato com domínio → salvar com revisão esperada → fechar conexões
→ reabrir e conferir. Alternativas: arquivo ausente, conflito, inválido, bloqueio e
cancelamento retornam sem substituir o snapshot anterior; recuperação é explícita.

- **CA-049 (RF-024):** dado banco preparado e fixtures sintéticas sem/com entrada,
  Individual com acréscimo e lote, quando gravar, fechar e reabrir, então todos os
  campos e a ordem reconciliam; base 20.000/entrada 10.000 mantém pago 10.000, saldo
  10.000 e 1/2 paga. Correção 11.000→10.500 em parcela-base 10.000 preserva IDs e
  altera recebido/acréscimo e mês conforme a data; status e coleções permanecem fiéis.
- **CA-050 (RF-024/025):** dado banco válido, quando houver revisão obsoleta, omissão
  de venda, colisão global, overflow agregado, falha intermediária ou cancelamento
  antes do commit, então não há escrita parcial nem avanço da revisão. Dois
  escritores com a mesma revisão não podem ambos confirmar. Após falha, leitura por
  nova conexão preserva o estado; nova operação válida pode concluir.
- **CA-051 (RF-024/026):** dado arquivo ausente, schema desconhecido ou linha inválida
  (inclusive alocação de entrada 9.999/10.001 contra 10.000), quando carregar, então
  falhar sem conjunto parcial, reparo ou recriação; após restauração explícita da
  fixture válida, nova leitura funciona. Inicialização repetida do schema atual
  preserva dados; caminho relativo é recusado. Banco vazio inicializado é válido.
- **CA-052 (RF-026):** dado apply autorizado, quando executar MSTest com SQLite real
  em arquivos temporários, restore bloqueado, build e format, então comprovar os
  critérios anteriores e preservar testes de domínio/API. Smoke mantém loopback,
  health e `/vendas` 404 sem acesso ao banco. Frontend independente conserva testes e
  build; documentar resultados reais, limitações e testes não executados.

### Restrições, riscos, validação e próximos passos

Não incluir MediatR/FluentResults, handlers, endpoints, Angular, Tauri/IPC, importação
XLSX, carga real, seed automático, backup operacional, criptografia, autenticação,
instalador ou CI. Persistência não torna dados reais autorizados. Interface,
acessibilidade, foco, temas, BRL e apresentação de datas não mudam; mensagens internas
públicas continuam pt-BR. Não armazenar projeções derivadas nem criar cliente mestre.

Riscos: round-trip que reordena recebimentos, contorna reconstrução ou perde centavos;
gravação concorrente que invalida somas; arquivo técnico confundido com base homologada.
Mitigar com CA-049–052 e dados exclusivamente sintéticos, sem logs de CPF/telefone,
SQL com valores ou caminhos pessoais. Sem nova meta de latência/volume ou telemetria;
sucesso é verificável pelos critérios, não por ganho operacional ainda não medido.
Backup/restauração de produção e conciliação legada continuam dependências de fase
posterior, não bloqueiam esta biblioteca técnica isolada. Não há decisão de produto
bloqueante neste recorte; aprovação do desenho por si só não equivale a autorização
de apply, que foi concedida posteriormente para esta Change.

Roadmap: contrato/schema → inicializador → leitura validada → gravação/revisão →
regressão e evidências. FON-041 → RF-024–026/CA-049–052 → TDD/DEC-038 →
`openspec/changes/fase-003-persistencia-sqlite/`. SQL-01/1.1–1.3, SQL-02/2.1–2.2 e
SQL-03/3.1–3.3 e SQL-04/4.1–4.4 (dependências, isolamento da API, contrato, schema,
inicializador, abertura validada, leitura fiel, rejeição de dados inválidos, gravação
transacional, preservação de contratos/histórico, revisão concorrente, leitura consistente,
rollback, cancelamento e confirmação indeterminada) estão aplicados e verificados em
SQL-05. Backend: 203/203 testes; persistência: 54/54. Frontend: 430 testes e build em
cópia isolada devido a EPERM no `node_modules` original em uso. Smoke confirmou loopback,
health, 404 e nenhum banco criado. E2E/visual/zoom não aplicáveis por não haver mudança
de UI; sem dados reais ou homologação operacional. Preservar histórico e IDs anteriores.
PR único somente após escopo integral verificado; nenhum PR antecipado ou merge implícito.

## Fase 002 — domínio C# independente (25/11/2026)

**FON-040:** solicitação `fase-002-dominio` e duas respostas no Harness: planejar
o domínio completo, sem banco ou endpoints; adotar operações imutáveis com erros
tipados, centavos inteiros compatíveis com TypeScript e datas civis. Autoriza apenas
planejamento PRD → TDD → SDD. Não autoriza apply, publicação de PR ou uso operacional.

**Problema, objetivo e público:** a fase 001 já fornece solução, camadas e host
técnico; suas bibliotecas de negócio ainda estão vazias por desenho. Consolidar em
C# as regras atuais do protótipo para futura aplicação local da equipe da loja,
sem substituir a demonstração ou inventar regras para a planilha legada. Reutilizar
OBJ-001–004, jornadas de cadastro/edição/recebimento e regras vigentes, incluindo
RF-013/015/016/018/019, RN-021–026 e CA-036–038/042; não portar apresentação.

**RF-023 — Núcleo de domínio completo e isolado (Essencial):** oferecer operações
internas de cadastro, edição dos quatro campos do cliente, entrada/parcelamento,
pagamento individual sequencial, correção individual e mudança administrativa,
além de projeções puras por venda, conjunto e período mensal. Entradas incluem
identificadores explícitos e referência civil fornecida pelo chamador; não consultar
relógio, rede, arquivos ou banco. Cliente pertence à venda, sem cadastro mestre ou
unicidade de CPF. Entrada, recebimentos individuais e históricos em lote têm origem
distinta; histórico sintético válido pode ser reconstruído e consultado, mas não há
comando para novas baixas em lote, edição de entrada/lote ou importação. Sucesso
produz novo estado validado; falhas esperadas informam código estável, mensagem
pt-BR e campo quando aplicável, mantendo o estado original. Prioridade essencial
para preparar os futuros casos de uso, confirmada por FON-040.

**CA-046 — Paridade financeira e temporal (RF-023):** dado um catálogo sintético
de casos com resultados explícitos derivados das regras vigentes, quando exercitado
em C#, então cadastro, distribuição dos centavos, vencimentos, entrada única,
baixa/correção, matriz administrativa e projeções devem reconciliar exatamente.
Incluir 10.000/3 = 3.334+3.333+3.333; janeiro dia 31 → fevereiro → março dia 31;
entrada nas N parcelas; base 100, recebido 110, corrigido 105; calendário 0001–9999,
bordas hoje/+7/+8, mês vazio, mudança de mês e Prejuízo com/sem recebimentos.

**CA-047 — Falha sem mutação e isolamento (RF-023):** dado estado válido, quando
houver CPF/telefone inválido, overflow individual ou agregado, data/forma inválida,
salto, repetição de baixa, identidade duplicada, correção de entrada/lote ou tentativa
de baixa/correção em venda não Ativa, então retornar falha tipada sem publicação parcial nem alteração do
original ou de outras vendas. Repetir o status atual é no-op; não prometer
idempotência distribuída ou concorrência persistente. Validar limites antes de
alocar parcelamentos. O domínio não depende de HTTP, ORM, MediatR ou FluentResults.

**CA-048 — Verificação e não regressão (RF-023/RF-021/022):** dado checkout com
baseline da fase 001, quando executados restore bloqueado, build Release, MSTest
e formatação, então a suíte de domínio não vazia e os testes técnicos existentes
devem passar. Conferir referência direta dos testes ao domínio, catálogo de paridade,
ausência de pacotes de produção novos e preservação de `/health`, loopback e 404
de negócio. Frontend permanece independente; registrar build/testes unitários e
limitações, sem exigir E2E visual de código que não mudou.

**Escopo e exclusões:** RF-023 relaxa a exclusão de regras C# apenas para biblioteca
isolada. Não incluir handlers/aplicação, adaptador HTTP/FluentResults, EF/SQLite,
migrations, repositórios, autenticação, IPC/Tauri, backup, Angular, seed, busca,
paginação, componentes de dashboard, CI ou leitura da planilha real. Mensagens
pt-BR, dinheiro BRL e dias civis permanecem; foco/teclado/temas não têm alterações
nesta etapa. Não há nova meta de desempenho ou pesquisa com usuários: sucesso
técnico será avaliado por CA-046–048, não por redução de erros ainda não medida.
Pendências do legado e da homologação continuam fora do recorte e não autorizam
flexibilizar identificação ou recalcular contratos históricos reais.

**Avaliação da base e próximos passos:** arquivos de produção e testes da fase 001
foram inspecionados; `backend/README.md` registra 16 testes unitários e 8 de
integração aprovados, smoke real e independência Angular. Não foram reexecutados
nesta revisão. Textos antigos de PRD/TDD e o preâmbulo de tasks da fase 001 ainda
dizem “planejado”; são históricos, não ausência atual de implementação. Esta seção
prevalece para o diagnóstico sem reescrever aquela Change. Próximos marcos:
tipos/identificação → cadastro/entrada → recebimentos/status → projeções/conjunto →
regressão e evidências. Tudo depende de revisão e novo pedido explícito de apply.

**Rastreabilidade:** FON-040 → RF-023 → CA-046–048 → TDD/DEC-037 →
`openspec/changes/fase-002-dominio/`; fontes de comportamento em
`frontend/src/app/funcionalidades/{vendas,parcelas,relatorios}/` e capabilities
`dominio-vendas`, `recebimentos-parcelas` e `relatorios-financeiros`. A extensão C#
será especificada na capability existente `dominio-vendas`, preservando os contratos
demonstrativos e evitando outra capability para as mesmas invariantes.
Estado: escopo confirmado, implementação não iniciada; sem aceite operacional.

### Atualização de execução da Change — 25/11/2026

Após a revisão do planejamento, o solicitante autorizou explicitamente o apply de
`fase-002-dominio`. As tarefas DOM-01–DOM-07 foram implementadas; o estado inicial
acima registra a autorização original de planejamento e não descreve o estado atual.
As evidências de catálogo, auditoria, verificações integradas e limitações estão em
`backend/README.md` e nos artefatos da Change. A suíte backend aprovou 139 testes
(115 de domínio, 16 técnicos unitários e 8 de integração), com build Release e
formatação aprovados; restore em modo bloqueado passou. O smoke real confirmou
`/health` em loopback e `/vendas` 404. Com a API desligada, o frontend aprovou 430
testes em 33 arquivos e o build de produção.

O fechamento documental validou rastreabilidade PRD → TDD → SDD → catálogo/testes/
evidências e os critérios CA-046–048. E2E, inspeção visual e zoom não foram
executados por não haver alteração de interface. Isso comprova as verificações
técnicas registradas, não homologação operacional, aceite da ótica ou prontidão para
uso com vendas reais; persistência, endpoints de negócio e integração permanecem fora
do escopo. A Change foi concluída na feature branch; a publicação do PR é uma etapa
separada e não representa autorização de merge.

## Revisão de baseline por segurança — 25/11/2026

**FON-039:** durante o apply da Change `fase-001-backend`, verificou-se que a
baseline planejada (.NET SDK 10.0.103/runtime 10.0.3 e
Microsoft.AspNetCore.Mvc.Testing 10.0.3) precede correções de segurança atuais.
O solicitante autorizou revisar PRD/TDD/SDD antes de implementar. Manter .NET 10,
mas fixar a baseline de SDK/runtime/pacotes de servicing no release corrigido
10.0.15, usando SDK 10.0.404, `rollForward=latestPatch` e pacote de teste ASP.NET
Core 10.0.15. MSTest.Sdk permanece 4.5.3, com metadados e avisos a confirmar no
início do apply. A baseline precisa ser validada com o SDK efetivamente selecionado;
esta revisão documental não instala SDK nem comprova restore/build.

**Rastreabilidade:** FON-039 → RF-021 (baseline corrigida sem alterar o objetivo da
fase) → TDD/DEC-036 → proposal/design/tasks de
`openspec/changes/fase-001-backend/`. A decisão aplica o menor servicing corrigido
observado na fonte oficial consultada em 25/11/2026; antes de consolidar pacotes,
verificar advisories e versões exatas novamente, sem presumir que 10.0.15 continuará
sendo o patch mais recente. Referências: calendário de suporte .NET e página de
download .NET 10 (release 10.0.15 em 10/11/2026; suporte até 14/11/2028).

## Resultados da aplicação e respostas da API — 25/11/2026

**FON-038:** o solicitante definiu **FluentResults** como padrão interno de retorno
da camada Aplicacao para a API, complementando MediatR/CQRS/Vertical Slices de
FON-037. No Harness, confirmou sucesso com DTO e status HTTP adequado, falhas
esperadas com Problem Details e exceções inesperadas com 500 genérico. Não expor
objetos internos de resultado no JSON público.

**Mapeamento confirmado para futuros endpoints de negócio:** validação → 400;
recurso inexistente → 404; conflito → 409; regra de negócio/inelegibilidade → 422.
Mensagens públicas devem ser seguras, em pt-BR, e acompanhadas de códigos estáveis,
sem depender do texto para classificar o erro. O contrato de cada endpoint definirá
se o sucesso usa 200, 201 ou 204 e os respectivos DTOs; esta decisão não cria
endpoints, regras de negócio ou um envelope JSON genérico obrigatório.

**Limite:** revisão exclusivamente documental da `fase-001-backend`, sem instalar
FluentResults, criar resultados/erros/mapeadores ou alterar `/health`. A API técnica
continua com health checks nativos e tratamento genérico de falhas inesperadas.
Versão e compatibilidade da biblioteca e contratos públicos detalhados serão
fechados na Change que autorizar a primeira adoção efetiva, antes de implementá-la.
MSTest permanece o padrão de testes do backend.

**Rastreabilidade:** FON-038 → RF-021 (padrão documentado, sem ampliar comportamento
executável) → TDD/DEC-035 → design/D8 e tasks/1.4 de
`openspec/changes/fase-001-backend/`. CA-044/045 e a especificação de execução local
permanecem inalterados. Nenhuma funcionalidade foi implementada nesta revisão.

## Organização dos futuros casos de uso do backend — 25/11/2026

**FON-037:** o solicitante definiu MediatR combinado com CQRS e Vertical Slice
Architecture como padrão para os futuros casos de uso da camada de aplicação.
Cada funcionalidade deve ter responsabilidade própria, distinguindo operações de
escrita de consultas, em vez de concentrar ações independentes em um serviço
genérico. O detalhamento técnico fica em TDD/DEC-034; essa é uma escolha do projeto,
não uma exigência universal do desenvolvimento .NET.

**Limite confirmado:** nesta `fase-001-backend`, documentar o padrão e as fronteiras,
preservando os projetos de camadas e MSTest. Não incluir pacote, configuração de
MediatR ou handlers de exemplo nesta fase. `/health` continua endpoint técnico
nativo. Não antecipar funcionalidades financeiras, persistência ou novos contratos
HTTP para demonstrar a arquitetura. Versão e licenciamento do MediatR devem ser
resolvidos antes da primeira Change que autorizar sua adoção efetiva; isso não
bloqueia a base técnica sem essa dependência.

**Rastreabilidade:** FON-037 → RF-021 (organização documentada, sem ampliar seu
comportamento executável) → TDD/DEC-034 → design/D7 e tasks/1.4 de
`openspec/changes/fase-001-backend/`. CA-044/045 e a especificação de execução local
permanecem inalterados. Não há autorização de implementação nesta revisão.

## Fase 001 do backend — base técnica planejada (25/11/2026)

**FON-036:** solicitação `fase-001-backend`, refinada no Harness: preparar uma base
C# com API local, estrutura de camadas, testes e comandos documentados. O solicitante
determinou **MSTest** para os testes do backend. Esta autorização cobre planejamento
PRD → TDD → SDD, não execução da implementação. A fase não substitui nem conclui as
fases históricas do protótipo que também usam numeração 001.

**Problema e objetivo:** o repositório tem uma demonstração Angular funcional, mas
não dispõe de solução C#, API ou testes .NET. Criar, em etapa de apply própria, uma
fundação reproduzível para desenvolver o backend sem alterar a demonstração e sem
introduzir regras financeiras ou dados reais prematuramente.

**RF-021 — Base independente de backend:** disponibilizar solução C#/.NET 10 em
`backend/`, com projetos de API, aplicação, domínio e infraestrutura e testes em
MSTest. Restaurar, compilar, testar, verificar formatação e iniciar a API por
comandos documentados, sem depender de IDE, banco, Angular em execução ou planilha.
Somente a API precisa de comportamento executável nesta fase; camadas restantes
estabelecem fronteiras de dependência, sem entidades ou serviços fictícios.

**RF-022 — Disponibilidade técnica local:** oferecer somente `GET /health` como
endpoint técnico de disponibilidade do processo, sem informações pessoais,
configuração sensível ou promessa de banco disponível. Escutar apenas em loopback,
sem login, contas ou perfis, conforme FON-035. Não disponibilizar endpoints de
vendas, pagamentos, importação ou outras operações de negócio. Falhas inesperadas
devem ter resposta genérica sem stack trace exposta ao cliente.

**CA-044 — Ambiente reproduzível e testes:** de um checkout com o SDK documentado,
restaurar dependências, compilar em Release, executar testes MSTest não vazios e
verificar formatação com saída de sucesso. Os testes devem cobrir configuração
válida/inválida e restrições da API e seu contrato HTTP por integração. Registrar
SDK, versões exatas das dependências, comandos e resultados reais; falha de teste
deve resultar em código de saída não zero. A instalação/restauração inicial pode
exigir internet; o processo da API restaurado não exige serviços externos.

**CA-045 — Isolamento e não regressão:** iniciar a API em loopback e obter HTTP 200
com corpo textual `Healthy` em `/health`, sem redirecionamento, credencial ou banco.
Rota de negócio inexistente retorna 404; configuração que exponha endereço não
loopback é rejeitada. Confirmar disponibilidade em processo real, sem confundir
TestServer com socket de rede, e encerramento sem processo residual. O frontend
continua exclusivamente demonstrativo, sem chamadas à nova API, alteração de seed,
rotas ou dados e sem mudança no deploy do Pages. Build e testes unitários existentes
do frontend devem continuar passando quando a fase for implementada.

**Exclusão excepcional e limitada:** as exclusões históricas de backend do MVP são
relaxadas apenas para esta base técnica independente. Continuam fora desta fase:
EF Core/SQLite e migrations, entidades/regras financeiras C#, endpoints de negócio,
integração Angular, importação/uso da planilha real, Tauri/instalador, autenticação,
proteção de IPC de produção, backup, implantação do backend e novo workflow CI.
Não considerar a API técnica pronta para operar dados reais ou como aprovação da
arquitetura completa. Pendências de migração e homologação não bloqueiam esta base,
pois nenhum caso dependente delas será implementado.

**Rastreabilidade:** FON-036 + FON-035 → RF-021/022 → CA-044/045 → TDD/DEC-033 →
`openspec/changes/fase-001-backend/`. A implementação e as verificações acima são
planejadas; não foram executadas nesta revisão. PR único apenas após apply autorizado
e conclusão integral da fase; sem PR antecipado por planejamento pronto.

## Equipe usuária e ausência de autenticação — 25/11/2026

**FON-035:** confirmação explícita do solicitante: a aplicação será utilizada por
uma única equipe específica da loja, no cenário já informado de um computador com
funcionamento offline. **Não será necessária autenticação de usuários**, inclusive
na evolução operacional local; não se trata apenas de uma dispensa do protótipo.

Não haverá login/logout, contas individuais, cadastro de usuários, senhas,
recuperação de senha ou perfis de permissão por pessoa no escopo definido. Os perfis
de atendimento e gestão da seção 4 descrevem tarefas, não papéis de autorização no
software. A equipe utiliza as funcionalidades disponibilizadas sem diferenciação
de acesso por usuário; o rótulo estático “Administrador” não identifica uma sessão.

Esta decisão resolve a definição do público operacional e a necessidade de auth;
não exige número ou nomes de integrantes para avançar no desenho. PEN-014 continua
restrita à avaliação e ao aceite: responsável pela homologação, metas, participantes
da avaliação e validação das entrevistas. A escolha de quem confere a importação e
autoriza o corte operacional também não implica criar contas ou permissões.

**Limites:** ausência de login não dispensa proteção do computador, arquivos,
backups e comunicação local. Sem identidade autenticada, não se deve prometer
atribuição confiável de cada operação a um integrante. Exposição em rede, acesso
remoto ou uso por outras equipes exigem revisão explícita deste escopo antes de
implementação. Esta atualização é exclusivamente documental e não autoriza backend,
migração ou mudanças na interface.

## Fonte local de vendas para evolução futura — 25/11/2026

**FON-034:** planilha fornecida pelo solicitante em
`docs/planilha-loja/00 - VENDAS LIBERAÇÃO LUIGHI CORRETO.xlsx`, inspecionada
somente para documentação estrutural. Inventário, mapeamento preliminar e limitações
em [docs/planilha-loja/README.md](../planilha-loja/README.md). O arquivo contém dados
reais, permanece local e está ignorado pela configuração atual do Git; não deve ser
publicado nem usado como fixture. A documentação não reproduz registros pessoais.

**Evidência e limites:** há quatro abas, com cabeçalhos DATA VENDA, CLIENTE, PC,
VALOR, VENCIMENTO, STATUS e DATA PAGTO. Existem textos livres em campos de valor,
situação e data, cabeçalho repetido, células mescladas e conteúdo auxiliar fora da
estrutura principal. Linhas não equivalem necessariamente a vendas. Não há colunas
principais próprias de CPF, telefone ou identificador estável de contrato; não se
presume que esses dados possam ser recuperados de anotações.

**Impacto no planejamento:** a fonte passa a estar disponível para estudo da futura
migração, mas não define regras comerciais nem autoriza carga real. Antes de
especificar a importação, confirmar agrupamento de contratos, significado de PC e
VALOR, tratamento das entradas, recebimentos incompletos e correspondência das abas
com os status da aplicação. Ausências de CPF/telefone não autorizam inventar dados
ou flexibilizar silenciosamente as regras atuais de cadastro. O nome de uma aba não
comprova quitação nem elegibilidade para o total de Prejuízo de RN-026.

**Escopo desta revisão:** documentação da fonte, sem novo requisito funcional,
mudança de regras, backend, importador ou migração. O cenário de evolução informado
pelo solicitante é um computador com funcionamento offline; isso não aprova ainda
a arquitetura de produção. As exclusões vigentes do MVP demonstrativo continuam
válidas até uma proposta própria de evolução.

## Dashboard de Relatórios — escopo revisado (25/11/2026)

**FON-018:** pedido original de dashboard, refinado por decisões explícitas no Harness em 25/11/2026: equilíbrio entre visão financeira e cobrança, escolha de mês/ano, cinco cartões, somente um gráfico diário de recebimentos, cinco detalhes expansíveis e identidade visual atual. O solicitante autorizou substituir os três gráficos e resumos extras do plano anterior por esse recorte. Reutilizar `dashboard-relatorios` e `feature/dashboard-relatorios`. As projeções de `feedback-luighi` já estão na `main` e foram incorporadas à base desta branch; não reimplementar aquele escopo. O apply foi autorizado e o dashboard implementado na feature; a regressão integrada está em andamento. Isso não representa aceite da ótica ou autorização de merge.

**Problema e objetivo:** o formato de planilhas da aba Relatórios dificulta a leitura rápida de recebimentos e cobranças. Apresentar um resumo visual claro preservando a consulta integral a cada registro e a distinção entre movimentação mensal e posição atual. Público: atendimento e gestão na demonstração sintética, sem persistência.

**RF-018 — Dashboard de Relatórios:** apresentar “Movimentação do mês” com cartões **Recebimentos no mês** (todos os status, data efetiva) e **Vendas no mês** (somente Ativas, data da venda, total efetivo e quantidade); apresentar “Posição atual” com **Parcelas em aberto**, **Parcelas vencidas** e **Prejuízo**, identificando a referência fixa e preservando RF-016/RN-026. Vencidas são parte do saldo aberto, não um valor adicional a somar. Prejuízo elegível permanece separado e sua restrição a contratos sem recebimentos fica explícita. Não copiar a faixa de quatro indicadores globais da Visão Geral.

**RF-019 — Seleção mensal e gráfico:** iniciar no mês da referência e permitir mês/ano válido no calendário civil 0001–9999, inclusive meses sem movimentos. Atualizar apenas cartões, tabelas e gráfico mensais; não reconstruir posição histórica de dívida nem alterar referência, dados ou outras telas. O mês civil completo tem limites inclusivos; o mês corrente não projeta recebimentos futuros. A seleção é local à página, sem persistência ou URL; ao recriar a página, voltar ao mês da referência. Valor vazio/inválido não substitui a última seleção válida e informa erro acessível. Exibir um gráfico de barras com recebido agregado por dia efetivo, todos os dias do mês (zero quando não houver movimento), unidade BRL, datas/valores equivalentes em tabela acessível e vazio explícito. Não incluir comparação mensal, tendências, outros gráficos ou resumos extras por cliente.

**RF-020 — Detalhes e identidade visual:** manter as cinco tabelas completas em seções expansíveis independentes, inicialmente recolhidas, abaixo dos painéis. Título e total ficam visíveis; Vendas também informa quantidade. Mais de uma seção pode ficar aberta, e mudar o mês não recolhe seções nem desloca foco. Preservar linhas, ordem, CPF/telefone, primeiro vencimento, links por ID, estados vazios e indicação de linhas de Prejuízo fora do total. Reutilizar a identidade visual, tokens e tipografia atuais em claro/escuro; cartões sóbrios, grupos distintos e adaptação ao celular, sem redesenhar shell ou outras páginas. Manter exportação explicitamente indisponível.

**CA-042 — Reconciliação e seleção:** conferir cinco cartões com suas tabelas; soma diária igual ao recebido mensal em centavos, entrada/lote/individual sem duplicação, recebimentos de todos os status e vendas apenas Ativas. Trocar mês/ano (inclusive dezembro/janeiro, fevereiro bissexto, meses vazios e extremos do calendário) altera só movimentação mensal; posições e referência permanecem. Corrigir data entre meses move o recebimento para o dia/mês correto; alterações de status preservam dinheiro recebido. Seleção inválida mantém resultado anterior com erro anunciado. Recriar a página restaura o mês da referência, sem persistência.

**CA-043 — Design e detalhes acessíveis:** conferir dois cartões mensais, três de posição atual e um gráfico diário, sem gráficos/resumos extras. As cinco expansões iniciam fechadas com títulos/totais visíveis, abrem independentemente por teclado e mostram todos os registros, inclusive mais de cinco, com foco e abertura preservados ao trocar o mês. Conferir tabela diária equivalente, zero/vazios, links por ID, CPF/telefone, ordem, restrições de Prejuízo, contraste mínimo de 4,5:1 para texto comum e 3:1 para texto grande/controles essenciais, temas em 1366×768 e 390×844, sem overflow horizontal global; tabelas têm rolagem localizada e tipografia vigente. Verificar zoom nativo 200% quando possível e registrar limitação se não executado. Exportação continua sem download ou transmissão.

**Verificação manual informada em 25/11/2026:** o solicitante testou o dashboard em zoom nativo de 200%, nas mesmas configurações já registradas para RNF-007/CA-028: Google Chrome 157.0.8103.79 (64 bits), escala do Windows 125% e viewport útil de 506×528,65 CSS px. Relatou que os elementos não distorcem e permanecem exibidos corretamente. É evidência manual declarada, não medição independente do agente nem aceite da ótica; a automação headless continua sem controle de zoom nativo. Detalhes em `frontend/README.md`.

**Extensão da regressão aprovada em 25/11/2026:** para concluir a regressão E2E da aplicação associada à Change `dashboard-relatorios`, incluir a correção do foco em envio inválido na edição de dados do cliente, conforme requisito existente de formulário inválido e CA-007/RNF-002. A mensagem associada deve permanecer visível, os valores devem ser preservados e o foco deve facilitar a correção, sem alterar o escopo dos quatro campos editáveis ou quaisquer dados financeiros. A matriz E2E pode ser dividida para evitar timeout, mas deve conservar todos os viewports, temas e asserções; não reduzir a cobertura nem mascarar a falha ampliando timeout sem diagnóstico. Esta extensão não altera os requisitos financeiros ou visuais de Relatórios.

**Rastreabilidade:** FON-018 → OBJ-001/004/005 → RF-018/019/020 → CA-042/043 → TDD/DEC-032 → `openspec/changes/dashboard-relatorios/`; base financeira RF-016/RN-025/026/CA-038. Correção de colisões após conciliar branches: RF-017/CA-039/DEC-029 identificavam o dashboard no rascunho de 24/11, mas a `main` os usa para consultas por coleção/navegação. Essas referências antigas do dashboard são substituídas exclusivamente por RF-018–020/CA-042–043/DEC-032; preservar os IDs vigentes das outras changes e FON-018. Nenhum PR apenas pelo planejamento; PR único após implementação explicitamente autorizada e verificações completas.

## Publicação demonstrativa no GitHub Pages — planejamento de 23/11/2026

**Problema:** a SPA demonstrativa ainda não possui publicação web automatizada para
avaliação. **Objetivo:** disponibilizar a versão compilada em GitHub Pages, publicando
automaticamente após cada commit integrado à branch `main`.

**Escopo:** workflow GitHub Actions acionado por `push` em `main`, instalação
reprodutível pelo lockfile, build de produção do Angular em `frontend/` e publicação
do artefato pelo mecanismo oficial do GitHub Pages. Usar permissões mínimas, concorrência
para evitar deploys ultrapassados e configuração compatível com a URL de projeto do
repositório. A configuração do Pages deve selecionar GitHub Actions. Deploy de branches
ou pull requests, backend, domínio próprio, segredos, validações adicionais de produto
e mudanças na aplicação fora do necessário para servir a rota/asset são não objetivos.

**Critérios de aceite:** workflow válido e limitado a commits em `main`; build de
produção e artefato publicado com sucesso; caminhos de assets e acesso direto às rotas
funcionam no caminho de projeto do Pages; configuração do Pages usa Actions; evidências
de verificação e limitações registradas. A publicação só ocorre após merge na `main`;
este plano não representa deploy já realizado ou aprovação do produto.

> Documento de planejamento. Não comprova implementação nem aprovação. O MVP descrito é uma demonstração com dados sintéticos e estado em memória, inadequada para controlar cobranças reais.

## Feedback de Luighi — requisitos planejados em 24/11/2026

**Fonte FON-017:** `docs/feedback.luighi.md` e esclarecimentos do solicitante nesta conversa. Esta seção é a base de requisitos da Change `feedback-luighi`; permanece um artefato de planejamento e, por si só, não comprova implementação nem aceite operacional. No escopo da Change aplicada, as regras abaixo substituem as restrições anteriores de RF-002/006/007/008/010, RN-015/016/019/020/021 e os critérios de aceite afetados; os registros datados abaixo descrevem o comportamento entregue anteriormente. Preservar os IDs e o histórico. O ajuste posterior da navegação vertical das coleções está rastreado em FON-031/CA-039 e na Change `empilhar-links-sidebar`.

### Problema, objetivo e escopo

O proprietário precisa localizar contratos por destino administrativo, corrigir lançamentos e conferir pagamentos com acréscimos informados pelo sistema externo Crediloja, sem perder registros nem confundir dívida, recebimento e prejuízo. Objetivos: reduzir erro de baixa, permitir correção rastreável na sessão e facilitar cobrança pelos relatórios. Público: atendimento e gestão; sem persistência, cálculo automático de juros, integração com Crediloja ou dados reais.

### Requisitos da mudança

- **RF-013 — Situação administrativa e movimentação:** cada venda tem status administrativo **Ativo**, **Inativo** ou **Prejuízo**, independente da situação financeira derivada das parcelas. Venda nova começa Ativa. O status aparece no cabeçalho do detalhe; mudança é manual, por venda, sem exclusão permanente. As transições permitidas são Ativo→Inativo, Ativo→Prejuízo somente com saldo aberto, Inativo→Ativo e Prejuízo→Ativo. Não há transição direta entre Inativo e Prejuízo; para mudar entre essas classificações, a venda deve primeiro voltar a Ativo e depois cumprir a elegibilidade do destino. Solicitar novamente o status atual é um no-op idempotente, sem alteração de dados nem efeitos duplicados. Inativar preserva histórico e permite consulta por filtro específico, mas retira venda, saldo, parcelas e total vendido dos indicadores e relatórios operacionais; recebimentos já efetivados continuam no relatório de recebimentos por sua data. A seção Prejuízo concentra vendas com saldo aberto, fora da listagem normal e de Quitadas, inclusive quando existem recebimentos anteriores. Reativar ou reabrir define status Ativo e devolve a venda à coleção normal correspondente ao saldo. Prejuízo não é inferido de atraso; sua parcela pendente continua existindo, sem baixa fictícia. A lista normal mostra somente Ativas; Inativas são consultadas por coleção/rota própria e Prejuízo permanece em sua rota/seção própria, sem opção na lista normal. Quando Vendas estiver ativo, os links laterais Quitadas, Inativas e Prejuízo SHALL ser apresentados em linhas verticais separadas, nessa ordem, um abaixo do outro. O filtro de situação financeira continua distinto do status. Mudança de status não apaga nem altera parcelas/recebimentos.
- **RF-014 — Ordenação de Vendas:** permitir ordenar a coleção normal por cliente em ordem A–Z, data da venda da mais antiga para a mais recente e primeiro vencimento pendente do mais próximo para o mais distante, antes de paginar; empates estáveis por ID crescente, vendas sem vencimento pendente após as demais na ordenação por vencimento. Busca e filtros continuam combináveis e a troca de ordenação retorna à primeira página. Não altera a referência fixa nem os quatro indicadores globais.
- **RF-015 — Baixa com acréscimo e correção:** a primeira parcela pendente continua a única elegível para Pagar e a baixa continua integral, sem parcial ou salto. O operador informa valor recebido **igual ou superior ao valor-base da parcela**; a diferença positiva, calculada como acréscimo informado, aumenta o valor efetivo da parcela, o total da venda e o recebido, sem calcular juros automaticamente. Exibir “Checar juros do Crediloja!” para parcela atrasada antes de confirmar; não exigir acréscimo. Observação opcional curta de até 20 caracteres na baixa. Permitir corrigir pagamento de parcela já paga (valor ao menos o valor-base original, data dentro dos limites da venda e referência, forma e observação), preservando a mesma parcela/identidade do recebimento e recalculando diferença, total, saldo e relatórios sem duplicar lançamento. Cancelamento, erro e confirmação repetida não alteram o estado; histórico em lote e entrada não devem ser reescritos silenciosamente. Se edição de pagamento histórico em lote/entrada for desejada, requer decisão própria antes de implementá-la; o recorte desta Change é pagamento individual registrado pela interface.
- **RF-016 — Relatórios de cobrança e Prejuízo:** renomear as seções para **Recebimentos no mês**, **Vendas no mês** e **Parcelas em aberto** (manter semântica de venda/saldo dessa última seção, não trocar implicitamente sua granularidade). Nas seções de parcelas em aberto e vencidas, exibir CPF e telefone e manter acesso ao detalhe da venda pelo link já existente; botão adicional é opcional se agregar acesso explícito. Exibir primeiro vencimento pendente por venda e ordenar Parcelas em aberto por essa data crescente; ordenar vencidas por vencimento crescente. Criar grid de Prejuízo com parcelas pendentes dos contratos assim marcados; exibir também contratos com pagamentos anteriores, mas **somar no total de prejuízo apenas parcelas pendentes de contratos sem nenhum pagamento**. Exibir claramente quais linhas não participam do total para não sugerir que saldo desapareceu. Recebimentos históricos de vendas Inativas/Prejuízo permanecem no relatório mensal; os demais indicadores e totais operacionais não incluem Inativas nem Prejuízo, e o total separado de prejuízo não se mistura com o total em aberto ativo. A transformação visual de Relatórios em dashboard pertence a outra Change, posterior a esta.

**RN-025 — Reconciliação do acréscimo:** preservar valor-base contratual imutável da venda/parcela para validação, registrar valor efetivo e diferença em centavos inteiros, e exigir que o **total efetivo exibido e relatado da venda** seja base total + soma dos acréscimos das parcelas pagas; total recebido soma os pagamentos efetivos uma vez; saldo pendente permanece a soma das parcelas ainda não pagas por seu valor-base. Assim, “aumentar o total da venda” não altera retroativamente o valor-base do contrato. Corrigir valor reduz/aumenta somente a diferença da parcela corrigida, nunca altera parcelas futuras, entrada ou outros recebimentos. A situação Quitada continua derivada de ausência de parcelas pendentes. Guardar identidade e conferência do valor original e efetivo no detalhe, sem transformar juros externos em cálculo interno.

**RN-026 — Universos dos relatórios:** posição em aberto, atrasos, vendas no mês e resumos de venda consideram apenas Ativas; Prejuízo compõe seção e total separados, Inativas somente consulta própria. Recebimentos no mês conservam movimentos já efetuados de todos os status, identificando a origem para permitir conciliação. Ações de status e correção atualizam projeções de forma atômica; uma mudança de status não estorna dinheiro recebido.

### Critérios de aceite propostos

- **CA-036 — Status:** marcar venda Ativa com saldo aberto como Prejuízo remove-a da lista normal (inclusive Quitadas) e a mostra na seção própria; reabrir retorna a Ativo, sem mudar parcelas nem pagamentos. Inativar exclui a venda dos totais operacionais, preserva consulta e recebimentos históricos no relatório mensal; reativar uma Inativa restaura o mesmo registro às coleções operacionais cabíveis. Não permitir transição direta entre Inativo e Prejuízo; tentativas inelegíveis não alteram o registro. Solicitar novamente o status atual deve ser no-op idempotente, sem efeitos duplicados. Quitada não pode ser marcada Prejuízo; nenhum fluxo exclui definitivamente o registro. Verificar filtro padrão Ativo, combinação com situação, matriz de status, repetição idempotente e navegação pelo ID.
- **CA-037 — Valor e correção:** baixa de parcela-base R$ 100,00 por R$ 110,00 registra R$ 10,00 de acréscimo, total da venda +R$ 10,00 e recebido +R$ 110,00, sem aumentar o saldo de parcelas ainda pendentes. Corrigir esse pagamento para R$ 105,00 altera o acréscimo para R$ 5,00, conserva o ID e reconcilia todos os totais; data, forma e nota corrigidas aparecem no histórico. Rejeitar valor menor que R$ 100,00, data inválida, salto e duplicidade sem alterar estado. Parcela atrasada exibe “Checar juros do Crediloja!”; observação respeita 20 caracteres. Sem cálculo automático de juros.
- **CA-038 — Consulta e relatórios:** ordenar e paginar Vendas com filtros combinados; conferir os três títulos, CPF/telefone, links, primeiro vencimento e ordem das parcelas vencidas. Contrato Prejuízo sem recebimentos contribui apenas com suas pendências ao total separado; contrato Prejuízo com pagamento anterior aparece no grid mas não é somado. Vendas Inativas/Prejuízo não afetam total operacional, e pagamentos históricos continuam no relatório mensal. Testar vazios, empates, centavos, entrada, temas e viewports. Não exigir cartões ou gráficos nesta Change.
- **CA-039 — Navegação vertical das coleções:** quando Vendas estiver ativo, Quitadas, Inativas e Prejuízo devem aparecer como links laterais distintos, um por linha e nesta ordem vertical, sem ficarem lado a lado. Os três devem continuar acessíveis por teclado e manter indicação programática/visual da rota atual nos temas e viewports suportados; não alterar rotas ou coleções.
- **CA-040 — Espaçamento e ícones dos destinos:** separar verticalmente Quitadas, Inativas e Prejuízo com espaçamento consistente e visualmente natural, evitando links colados. Cada link deve ter ícone SVG decorativo, diferente e semanticamente associado: confirmação para Quitadas, pausa/arquivo para Inativas e alerta para Prejuízo. Ícones devem ser ocultos da árvore acessível; rótulos continuam como nomes dos links. Manter ordem, estado atual, teclado, temas e viewports, sem dependência nova.

**Rastreabilidade da Change:** FON-017 → OBJ-001/002/003/004 → RF-013/014/015/016 → RN-025/026 → CA-036/037/038 → TDD/DEC-028 e `openspec/changes/archive/2026-11-24-feedback-luighi/`. O apply foi executado na feature branch; implementação e evidências estão em `frontend/README.md`. O ajuste de navegação vertical segue FON-031/032 → RF-013/CA-039/040 → TDD/DEC-029/030 → `openspec/changes/empilhar-links-sidebar/`, mantendo IDs anteriores. Ambos integram o PR #30; isso não representa homologação nem aceite operacional.

## Consistência visual das consultas por coleção — requisitos em 24/11/2026

**Fonte FON-033:** solicitação explícita do usuário nesta conversa. Aplicar às
buscas de Quitadas, Inativas e Prejuízo a mesma linguagem visual dos controles da
listagem de Vendas abertas, preservando busca local e Limpar pesquisa. Inativas e
Prejuízo compartilham a tela administrativa. Não oferecer filtro por situação,
ordenação ou outros controles nessas coleções.

- **RF-017 — Consistência visual nas consultas por coleção:** busca e Limpar
  pesquisa em Quitadas, Inativas e Prejuízo devem acompanhar altura, borda, raio,
  superfície, padding, espaçamento e foco visual dos controles de Vendas abertas.
  IDs, rótulos, orientação, handlers, busca local e limpeza permanecem inalterados.
- **CA-041 — Controles consistentes nas coleções:** confirmar visualmente e por
  teste que os controles das três coleções secundárias usam o mesmo padrão de
  apresentação, que Inativas e Prejuízo recebem o tratamento pelo template
  compartilhado e que não há filtro por situação nessas telas. Vendas abertas
  mantém busca, filtro de situação, ordenação, limpeza e Nova venda; dados,
  rotas, paginação e resultados não mudam.

## Refinamento dos dados demonstrativos — 23/11/2026

Para tornar as 12 vendas iniciais mais verossímeis em apresentações, substituir
marcadores como “Cliente DEMO Aurora 1” por nomes completos sintéticos distintos
(por exemplo, “Pedro Farias” e “Lucas Santos”). Variar os valores totais entre
R$ 600,00 e R$ 2.400,00. Nomes não devem ser obtidos de pessoas reais nem implicar
identidade/titularidade; números de CPF e telefone continuam sintéticos, sem garantia
de inexistência de titulares. Preservar os 12 registros, IDs, datas, situações,
entrada quando aplicável e regras financeiras; recalcular parcelas, recebimentos
históricos e projeções de modo consistente com os novos totais. O escopo limita-se ao
seed inicial e suas expectativas de teste, sem alterar regras gerais de cadastro ou
as vendas criadas durante a sessão.

## Piloto visual de Vendas — planejamento em 22/11/2026

**Problema:** mesmo após `refinar-design` e `novo-design`, a listagem ainda não
transmite com fidelidade a estética de
`references/a_clean_modern_dashboard_ui_using_the_mercadão_do.png`. Alterações
incrementais anteriores não produziram uma diferença visual suficientemente clara.
**Objetivo:** tornar **somente a página de listagem de Vendas** uma demonstração
convincente dessa linguagem visual, para avaliação explícita do solicitante antes de
qualquer expansão a Quitadas ou outros módulos. A imagem é a referência visual
principal, inclusive para proporções, alinhamento, camadas, espaçamento, controles e
hierarquia; tema escuro recebe tradução coerente com os tokens atuais. Não se exige
igualdade pixel a pixel com conteúdo fictício ou com elementos excluídos.

**Escopo visual proposto:** redesenhar de forma perceptível o conteúdo da listagem:
hierarquia de cabeçalho/painel, controle local de pesquisa e filtro, CTA existente,
tabela de oito colunas, selos, estados vazio/sem resultados e faixa de paginação.
Preservar a sidebar, barra superior, Visão Geral, Quitadas e demais páginas nesta
primeira etapa; componentes compartilhados podem receber apresentação específica de
Vendas sem alterar visualmente outros consumidores. Não adicionar os quatro cards
de indicadores da imagem à listagem. Não copiar busca global, filtro de datas,
notificações, controles de janela, avatar com dados fictícios ou reticências que
ocultem Visualizar/Editar. Pesquisa permanece única e local; “Limpar pesquisa”
preserva a situação; “Nova venda” permanece na faixa dos critérios, conforme
RF-003/CA-028/DEC-023. A tabela mantém fonte de 18 px, oito colunas e densidade
contratada; não reduzir fonte ou esconder informações para imitar as linhas menores
do mockup.

**Critérios de aceite do piloto (complementam CA-027/028/029):** capturas *antes e
depois* lado a lado com a imagem principal, em 1366×768/390×844 e temas claro/escuro;
documentar os elementos de composição efetivamente transformados e diferenças
intencionais. A versão clara deve mostrar mudança estrutural visível em cabeçalho,
controles, tabela e rodapé — apenas trocar cores/raios não basta. Verificar 10 linhas
e paginação sem rolagem vertical em 1366×768 com fixture, rolagem horizontal contida
na tabela e nenhum overflow horizontal global em 390×844, estados vazio/sem
resultados, foco/teclado, contraste e contratos de busca/filtro/ações. Publicar
capturas comparáveis com dados sintéticos para revisão humana, sem declarar aprovação
visual automaticamente por testes. Sem aprovação explícita do piloto, nenhuma outra
página adota o novo padrão; isso não é aceite da ótica nem autorização de merge.

## 1. Identificação e resumo executivo

- **Situação:** rascunho para validação.
- **Data de elaboração:** 11/11/2026. **Versão:** 1.20 — atualização do estado de implementação de pagamento individual, em 22/11/2026; requisitos da 1.19 preservados.
- **Produto:** Mercadão dos Óculos - Vendas em Aberto — MVP visual de gestão de vendas a prazo de uma ótica.
- **Origem do briefing:** solicitação de criar um PRD baseado no `README.md`, sem autorização para implementação.
- **Responsáveis e aprovadores:** participação do solicitante e da equipe da ótica prevista por confirmação do solicitante; papéis, quantidade e autoridade de aceite ainda não definidos. Aprovação documental não é aceite da ótica.
- **Proposta:** demonstrar uma alternativa à planilha auxiliar de crediário, concentrando cadastro de venda, identificação do cliente, consulta de parcelas e simulação de recebimento em uma navegação simples.
- **Valor esperado:** validar se a equipe consegue cadastrar e conferir uma venda com menos dificuldade, distinguir clientes com nomes semelhantes e entender pagamentos e saldos. Redução efetiva de erros e ganhos de tempo ainda não foram medidos.
- **Limite:** Angular + TypeScript, dados sintéticos, operações locais e perda das alterações ao recarregar. Backend, banco, autenticação, persistência e integrações não fazem parte do MVP.

**Verificação de zoom — revisão 1.18, 22/11/2026:** para RNF-007/CA-028, o
solicitante confirmou que a interface atende ao requisito em zoom nativo de 200%,
nas configurações já registradas: Google Chrome 157.0.8103.79 (64 bits), Windows
com escala 125% e viewport útil de 506×528,65 CSS px. A evidência é relato manual,
sem reprodução independente pelo agente; compatibilidade geral e aceite da ótica
continuam pendentes. Detalhes e limites da cobertura estão em `frontend/README.md`.

## 2. Contexto, problema e evidências

**Simplificação de pagamentos — revisão 1.19, 22/11/2026:** o solicitante confirmou
no Harness a troca do recebimento em lote por uma parcela por confirmação. Somente
a primeira pendente oferece “Pagar”, mesmo antes do vencimento; as posteriores
mostram “Aguardando parcela anterior”, e as pagas não oferecem ação. O modal mostra
parcela, vencimento e valor não editável e pede somente data e forma. A data inicial
é a referência fixa da sessão, alterável entre venda e referência, inclusive. O
botão geral “Receber” é substituído pela ação na tabela. Preservar integralidade,
antecipação em ordem, histórico, saldos, cancelamento e proteção contra duplicidade.
Esta revisão originou a Change `simplificar-pagamento-parcelas`. A implementação
técnica está em andamento e tem cobertura unitária/E2E registrada em
`frontend/README.md`; zoom nativo de 200%, uma execução E2E na porta padrão ocupada
e aceite da ótica continuam pendentes. A implementação não equivale a homologação.

O contrato aplicado restringe novos comandos a uma parcela, com valor derivado;
o seed mantém a preparação histórica em lote. O detalhe oferece Pagar somente na
primeira pendente e o modal solicita data/forma. As declarações anteriores de
ausência da implementação descrevem o estado de planejamento e não o estado atual.

**Entrada como parcela — revisão 1.17, 21/11/2026:** o solicitante confirmou no
Harness a mudança `entrada-como-primeira-parcela`, exclusivamente documental nesta
etapa. O PR #20 está mesclado na main, conforme GitHub, e seu refinamento visual
é a base desta nova change. A entrada passa a ser a parcela 1, paga na data da
venda, incluída na quantidade informada, na prévia e nas contagens de pagas/total.
O saldo é dividido entre as N−1 restantes, inclusive quando a entrada tiver valor
diferente. Com entrada, exigir N ≥ 2 e entrada positiva menor que o total; não
permitir cadastro já quitado. Sem entrada, manter N parcelas futuras. Uniformizar
também as 12 vendas do seed, preservando valores financeiros e vencimentos pendentes.
No cadastro, trocar a checkbox por “Possui Entrada”, antes de data/total/quantidade,
com “Selecione uma opção”, “Sim” e “Não”, sem resposta padrão válida. A regra
anterior de entrada separada fica superada como requisito, mas continua sendo o
comportamento implementado até um apply futuro. Não há autorização de código nesta etapa.

**Cadastro e prévia lado a lado — revisão 1.16, 21/11/2026:** o solicitante
confirmou no Harness o formulário à esquerda e a prévia das parcelas à direita a
partir de 768 px de viewport CSS; abaixo disso, formulário seguido da prévia.
Reduzir o espaço excessivo dos campos, priorizando valor e quantidade de parcelas,
mantendo nome e descrição mais amplos e as proporções relativas dos demais campos.
Preservar conteúdo, validações e cálculo em tempo real. A documentação foi aprovada
e a implementação autorizada em 21/11/2026; geometria, acessibilidade, testes e
limitações desta entrega estão registrados em `frontend/README.md`, sem aceite da ótica.

**Padronização das tabelas — revisão 1.15, 21/11/2026:** conforme solicitação
explícita no Harness, as quatro tabelas de Relatórios adotam o mesmo padrão das
tabelas de Vendas/Quitadas e parcelas: fonte de 18 px, line-height de 20 px e
padding de 10×4 px nas células de dados e 10×8 px nos cabeçalhos (horizontal×vertical).
Manter todos os dados, ordem, conteúdo e rolagem horizontal contida nas regiões já
existentes; não impor a densidade vertical de Vendas à página completa de Relatórios.
Este ajuste é exclusivamente visual.

**Revisão de consulta — 1.14, 21/11/2026:** conforme confirmação explícita no
Harness, remover o aviso global persistente e a ação “Limpar critérios” de Vendas.
O contexto de demonstração e descarte permanece documentado em Configurações e
nas confirmações de operações. A pesquisa pode ser limpa sem alterar situação; para
restaurar toda a lista, limpar o termo e selecionar “Todas”. “Nova venda” passa a
ocupar a posição da ação removida na faixa de critérios. O atalho contextual para
Quitadas no cabeçalho da lista também foi removido; a rota permanece na navegação
lateral. Requisitos, TDD, OpenSpec e testes correspondentes devem refletir essa decisão.

**Planejamento visual — revisão 1.12, 21/11/2026:** conforme solicitação explícita
no Harness, as tabelas de vendas abertas/quitadas e parcelas usam fonte de 18 px e
padding uniforme nas células de dados. Manter legibilidade, contraste, conteúdo
completo e os critérios de densidade desktop de CA-028; a especificação técnica
deve controlar a altura de linha e restringir rolagem horizontal à região da tabela.
Após medição, o solicitante confirmou compactar a composição existente dos blocos
de cliente/venda para recuperar espaço vertical e manter até dez parcelas visíveis
sem rolagem da página, sem remover campos nem reduzir a fonte solicitada. Este
registro atualiza requisitos e planejamento. A verificação técnica posterior está
documentada em `frontend/README.md`; isso não representa aceite da ótica.

**Planejamento da FASE-007 — 20/11/2026:** confirmado pelo solicitante no Harness:
Relatórios usa somente o mês civil da referência fixa da sessão, sem seletor de
período ou gráfico. Visão Geral apresenta os quatro indicadores globais e três
resumos limitados a cinco itens cada: vendas recentes por data decrescente,
parcelas pendentes de hoje a +7 dias e parcelas atrasadas por vencimento crescente.
Cada resumo informa seu limite e oferece links para os detalhes. Saldos e atrasos
em Relatórios são a posição na referência, não uma reconstrução histórica mensal.
Configurações permanece explicativa. Esta revisão autoriza planejamento, não apply,
avaliação global ou aceite. Registros anteriores de indisponibilidade continuam
descrevendo o código observado nesta revisão, não o comportamento futuro planejado.

**Acompanhamento da implementação FASE-007 — 20/11/2026:** o recorte acima foi
implementado na `feature/fase-007` sem alteração de requisitos, regras financeiras
ou IDs. Visão Geral, Relatórios e preservação de Configurações estão entregues; o
E2E integrado conciliou cadastro, entrada, quitação, edição, filtros e recarga. A
regressão técnica registrou 356 testes unitários, 64 E2E, 8 E2E da fixture, build
com aviso de budget e formatação aprovada (`frontend/README.md`). As verificações
de contraste, foco, teclado, mensagens e textos extensos passaram nos
dois temas/viewports; a tarefa 3.2 foi concluída com evidência E2E e relato manual do
solicitante de zoom nativo 200% (sem medição independente). A Change fase-007 está
tecnicamente completa após 3.4, sem aceite global/da ótica; PEN-013/014/HIP-006
permanecem abertas. Resultados e limitações em `frontend/README.md`.

**Acompanhamento da FASE-006 — 18/11/2026:** apply explicitamente autorizado na
`feature/fase-006`, reutilizando PRD 1.8/TDD 1.12 e Change `fase-006`, sem novas
regras de produto. Implementados cadastro com prévia/entrada, edição exclusiva
dos quatro campos do cliente e recebimento sequencial em modal acessível, com
confirmação, resultados, cancelamento, erros/retry e proteção contra envio duplicado.
Consultas mantêm fonte única em memória, busca/paginação, densidade e temas;
Visão Geral/Relatórios seguem indisponíveis. Evidências reais em
`frontend/README.md`: 340 testes, 52 E2E da aplicação e 8 da fixture, build e
formatação aprovados. Zoom nativo de 200% nos novos fluxos em ambos os temas:
relato manual do solicitante no Harness, sem problemas observados; navegador/versão
e janela não informados, sem medição independente do agente. Avisos de Sass e
bundle inicial de 510,89 kB (aviso de 500 kB) mantidos com limites inalterados.
Os requisitos/IDs desta revisão não mudaram; declarações anteriores de UI futura
são históricas. Implementação na feature não presume aprovação, merge ou aceite
da ótica. PEN-013/014/HIP-006 e FASE-007/avaliação global continuam pendentes.

**Consolidação documental e arquivamento da FASE-006 — 18/11/2026:** após a
implementação e a regressão aprovadas, as cinco deltas da Change foram sincronizadas
nas specs principais: `consulta-vendas`, `estado-demonstrativo`, `navegacao-aplicacao`
e `recebimentos-parcelas` foram ampliadas/ajustadas e a nova capability
`formularios-vendas` registra cadastro e edição. A Change foi arquivada em
`openspec/changes/archive/2026-11-18-fase-006/`, com 15/15 tarefas e artefatos
completos. PRD 1.9 e TDD 1.13 apenas conciliam estado e rastreabilidade, sem alterar
requisitos, IDs, metas ou pendências. Nenhum teste de aplicação foi reexecutado nesta
consolidação; as evidências permanecem as de `frontend/README.md` (340 testes, 52 E2E,
8 E2E da fixture, build e formatação) e o relato manual de zoom nativo. A FASE-006 está
implementada na feature e aguarda revisão, PR único e merge; não há aceite da ótica
nem conclusão da FASE-007/FASE-008. PEN-013/014/HIP-006 permanecem abertas.

**Acompanhamento de implementação — 18/11/2026:** após pedido explícito de apply,
o recorte interno de RN-021/022/023 foi implementado na feature branch
`feature/edicao-identificacao-vendas`, sobre a `main` que integrou o PR documental
#13 (`e12d360`). Cadastro e edição interna compartilham validação de identificação;
seed e fixtures agora usam números sintéticos compatíveis. Edição altera somente
os quatro campos do cliente, inclusive em quitadas, preservando finanças e outras
vendas. Evidências desta implementação em `frontend/README.md`, seção
“Apply — identificação e edição interna — 18/11/2026”: 265 testes em 21 arquivos,
36 E2E da aplicação e 8 E2E da fixture, build e formatação aprovados. Não há
formulário ou ação comercial nova; a FASE-006 permanece incompleta e sua UI exige
SDD próprio. Sem sync/archive nesta execução, integração desta feature ou aceite
presumidos. PEN-013/014 e HIP-006 mantêm suas pendências. As declarações abaixo de
ausência de implementação documentam a revisão de planejamento, não o estado deste apply.

**Registro do planejamento — revisão 1.8, 17/11/2026:** PEN-008 e PEN-010 resolvidas como
decisões de produto pelo solicitante, não como implementação. Após o cadastro,
somente nome, CPF, telefone e descrição poderão ser editados, inclusive em quitadas,
sem propagação entre vendas; todos os dados financeiros e a data da venda ficam
imutáveis pela edição (RN-021). Cadastro e edição exigirão CPF de 11 dígitos com
verificadores e telefone brasileiro de 10/11 dígitos (RN-022/023). Na FASE-006, os
marcadores sintéticos do seed serão substituídos por números sintéticos compatíveis,
sem coletar dados reais ou garantir inexistência de titulares. A alternativa inicial
de edição financeira antes de receber foi retirada pelo solicitante, não aprovada.
PEN-013 tem ambiente definido na seção 12, com escala Windows de 125% após correção
explícita; versão do Chrome e avaliação permanecem por executar. PEN-014 e HIP-006
continuam abertas: papéis/autoridade, metas e confirmação das entrevistas não foram
definidos nem medidos. Autorizados somente PRD → TDD → artefatos OpenSpec da Change
`decisoes-edicao-identificacao-avaliacao` e atualização do PR #13; sem código,
alteração do seed, apply, avaliação ou merge.

**Entrega vigente da FASE-005 — revisão 1.7 conciliada:** consultas integradas à
`main` pelo [PR #9](https://github.com/Thig0S/TCC-Academia---Programation/pull/9)
e refinamentos integrados pelo [PR #10](https://github.com/Thig0S/TCC-Academia---Programation/pull/10),
commit `59af9a2`. O GitHub confirma o merge do PR #10 em 18/11/2026 às 01:19 UTC
(17/11 no horário local). A Change `fase-005` foi arquivada pelo PR #11; os ajustes
estão consolidados nas specs principais pelo commit `72ade92` da `main`.
O registro dos ajustes fica em `openspec/changes/archive/2026-11-17-ajutes-fase-005/`.
Esta consolidação foi integrada à `main` pelo [PR #12](https://github.com/Thig0S/TCC-Academia---Programation/pull/12),
commit `c845ce9`, em 18/11/2026 às 01:51:53 UTC (17/11 no horário local), conforme
confirmação no GitHub. A referência anterior `91208a7` identifica o commit da branch
original, não o hash resultante na `main`.

Listas somente leitura, busca/filtro, paginação de 10, ausência de cartões em
Vendas/Quitadas, detalhe compacto e links integrados estão entregues. As evidências
anteriores em `frontend/README.md`, seção de verificação integrada final dos ajustes,
registram 197 testes unitários/componentes, 36 E2E da aplicação, 8 E2E de fixtures,
build e formatação aprovados; o zoom nativo 200% é relato manual do solicitante.
Nenhuma dessas verificações de aplicação foi reexecutada nesta revisão documental.
Os quatro indicadores continuam reservados à Visão Geral na FASE-007. Cadastro,
edição e recebimento visíveis continuam na FASE-006; as novas regras RN-021/022/023
aguardam implementação e PEN-013/014 conservam pendências de avaliação. Não há aceite
da ótica nem conclusão do MVP completo. A revisão 1.7 não mudou requisitos; a 1.8
delimita edição/identificação. Afirmações de
não implementação nos registros datados anteriores descrevem aquele momento,
não substituem este estado vigente e não autorizam reaplicar Changes concluídas.

**Registro histórico — revisão 1.6, 16/11/2026:** ajuste solicitado sobre a FASE-005,
com planejamento transferido por confirmação no Harness para a nova Change
`ajutes-fase-005`. A Change `fase-005` preserva o conteúdo anterior e suas 20 tarefas;
os ajustes deste PRD não devem ser aplicados duas vezes ou tratados como já entregues.
A revisão começou na branch limpa `feature/ajustes-fase-005`. O CLI registra 20/20 tarefas anteriores
marcadas e o histórico local contém commits de implementação/verificação; isso não
comprova nova execução, aprovação ou merge remoto. Os novos ajustes abaixo são
planejamento, não implementação. Registros anteriores de ausência das consultas e
de cartões obrigatórios em Vendas são históricos e ficam substituídos nesta revisão.
Os quatro indicadores serão exclusivos da Visão Geral, cuja UI continua na FASE-007;
retirá-los de Vendas não autoriza antecipar esse módulo. RN-014 mantém atraso a partir
do dia civil seguinte ao vencimento, sem nova tolerância ou contagem de 24 horas.

**Estado anterior — 16/11/2026:** FASE-004 implementada e integrada à `main` pelo
PR #7 (commit `1f184e3`), conferido no GitHub e no histórico local. Fonte única,
12 vendas sintéticas, cadastro/recebimento internos e projeções financeiras existem.
`frontend/README.md`, seção de regressão final, registra 156 testes e 26 E2E aprovados;
não foram reexecutados nesta revisão. As páginas comerciais ainda são indisponíveis
por recorte, não por ausência de domínio. A Change 004 continua ativa, sem specs
consolidadas; seu sync/arquivamento não integra esta solicitação.

**Decisões da FASE-005 — Harness, 16/11/2026:** busca única aprovada para abertas
e quitadas, cada uma restrita à sua coleção: nome parcial sem distinguir acentos ou
maiúsculas, CPF/telefone por dígitos sem pontuação e data completa DD/MM/AAAA por
dia exato; correspondência em qualquer campo, sem combinação de campos separados,
intervalo. Refinamento confirmado nesta conversa: abertas oferecem filtro de situação
Todas, Em aberto, Próximos dias e Atrasada, combinado com a busca por E; Quitadas
não oferece filtro adicional. Limpar pesquisa remove somente o termo; limpar todos
os critérios restaura termo vazio e situação Todas. PEN-005 e o
recorte de filtros de PEN-012 ficam resolvidos para o MVP, sem aceite da ótica.
Autorizada a revisão deste PRD, do TDD e a criação dos artefatos `fase-005`, não código.
Listas, quatro cartões globais em Vendas e detalhe/parcelas constituem o recorte;
cadastro, edição e recebimento visíveis permanecem na FASE-006, sem botões inoperantes.
Os estados datados e declarações de não implementação abaixo são históricos quando
contrariados por este registro; requisitos futuros não representam funcionalidades entregues.

**Decisão de 16/11/2026 — conjunto sintético:** aprovada via Harness na retomada
da FASE-004. Preservar a referência local em toda a faixa civil 0001–9999 e iniciar
com 12 vendas válidas. Onde o calendário comportar, preservar o conjunto atual e
suas quatro situações. Nas extremidades, adaptar datas de venda e quantidade de
parcelas; dispensar uma situação somente quando impossível pelas regras de datas.
Não substituir a referência, inventar histórico anterior ao calendário ou permitir
vendas futuras/vencimentos irrepresentáveis. A exceção pertence apenas ao conjunto
inicial sintético: comandos continuam sujeitos a RN-011/017. A alternativa de
restringir a demonstração foi reconsiderada e não está aprovada. Apply autorizado;
esta decisão não comprova implementação, verificação ou aceite comercial.

Refinamento aprovado na mesma sessão: é permitido variar também o dia da venda e
o histórico de liquidações do seed para preservar todas as situações possíveis nas
bordas. Apenas limitar meses preservando sempre o dia não é suficiente; não foi
aprovada a dispensa de situações que ainda possam ser representadas validamente.

O README propõe substituir, futuramente, uma planilha usada para acompanhar vendas a prazo, parcelas e recebimentos. A entrevista de gestão delimita melhor essa oportunidade: a loja já utiliza sistemas da franquia, inclusive de crediário, e mantém uma planilha auxiliar de determinadas vendas. O produto não deve ser interpretado como substituto de todo o sistema financeiro ou do crediário da franquia.

O relato de atendimento indica que consultar por nome pode ser tranquilo, enquanto cadastrar e conferir informações exige mais cuidado. Nomes semelhantes exigem conferência de sobrenome e CPF. Portanto, não há evidência de que a busca atual seja difícil para todos; a oportunidade mais consistente é simplificar cadastro, conferência e atualização, preservando a facilidade de consulta. Parte das entrevistas foi reconstruída, aproximada ou reorganizada e precisa de validação antes de fundamentar afirmações definitivas sobre frequência ou prejuízo financeiro.

**Estado local verificado em 14/11/2026:** base técnica e FASE-003 presentes na `main` local; navegação, temas e Configurações explicativa implementados. Mudança arquivada em `openspec/changes/archive/2026-11-14-fase-003/`, com specs consolidadas de navegação, temas e demonstração. `frontend/README.md` registra build, 21 testes unitários/componentes, 26 execuções E2E e complemento de zoom nativo informado pelo solicitante; são evidências anteriores, não reexecuções desta revisão. Trechos antigos desse README ainda descrevem bloqueio/ausência de PR: são registros desatualizados, não o estado do núcleo comercial. Fluxos comerciais e FASE-004 a FASE-008 não estão implementados. A FASE-001 global permanece parcial por decisões diferidas. Presença local e arquivamento não comprovam nesta revisão aprovação ou merge de PR remoto.

### Fontes e decisões de referência

Os caminhos abaixo são relativos à raiz do repositório. “Confirmado por fonte” significa documentado, não aprovado pela loja nem implementado.

| ID | Fonte ou decisão | Caminho e seção | Evidência relevante | Limitações ou conflitos |
| --- | --- | --- | --- | --- |
| FON-001 | Briefing principal do produto | `README.md`, visão geral e seções 1–14 | Identidade, quatro módulos, vendas, parcelas, cadastro, relatórios e prioridades | É uma especificação desejada, não comprovação de entrega; contém regras explicitamente pendentes |
| FON-002 | Orientações do repositório | `AGENTS.md`, leitura inicial e revisão em 13/11/2026 | Fluxo PRD → TDD → SDD → PR, feature branch e evidências | A orientação histórica de tema claro não existe mais no arquivo atual; preservar as restrições de produto deste PRD e do TDD |
| FON-003 | Entrevista de atendimento | `docs/entrevista.daria.md`, seções 1–3 e síntese | Cadastro exige conferência; consulta por nome é considerada viável; risco de confusão entre nomes | Seções 2 e 3 têm respostas aproximadas; não há medição de erros ou tempo |
| FON-004 | Entrevista de gestão | `docs/entrevista.luighi.md`, seções 2, 4–7 e 9 | Planilha auxiliar, atualizações manuais, necessidade de cadastro e consulta simples | Há perguntas reconstruídas e respostas aproximadas/reorganizadas; sistemas existentes não devem ser substituídos implicitamente |
| FON-005 | Inspeção da estrutura local em 11/11/2026 | `frontend/`, `frontend/src/app/`, `openspec/specs/`, `openspec/changes/archive/`, `openspec/config.yaml` | Pastas sem código de aplicação ou especificações de produto; configuração OpenSpec em pt-BR | Inspeção de estrutura, não execução ou auditoria de saídas geradas |
| FON-006 | Decisão explícita nesta solicitação | Conversa atual, pedido de geração do PRD | Ler fontes locais, usar o modelo e salvar apenas documentação de requisitos | Não autoriza executar instruções do README ou implementar o produto |
| FON-007 | Confirmações no planejamento da FASE-003 | Conversa de 13/11/2026, exploração e proposta | Dois temas com escuro inicial e preferência em memória; Configurações explicativa; revisão pontual autorizada deste PRD e do TDD | Não aprova regras financeiras, hipóteses restantes, implementação ou aceite da ótica |
| FON-008 | Decisões no planejamento da FASE-004 | Conversa de 14/11/2026 e mudança `fase-004` | Calendário, centavos, entrada, situações, referência, resumos e pagamento integral em lote sequencial confirmados pelo solicitante | Regras do MVP demonstrativo; não há aceite da ótica, autorização de apply ou validação operacional |
| FON-009 | Decisões no planejamento da FASE-005 e revisão nesta conversa | Harness de 16/11/2026; inspeção de `frontend/src/app/` e `frontend/README.md`; registro anterior de PR #7 | Busca única nas duas coleções; filtro de situação somente nas abertas, combinado por E; listas, cartões globais e detalhe somente leitura | Planejamento autorizado; fase 005 não implementada, sem aceite comercial ou nova execução de testes |
| FON-010 | Refinamento visual solicitado e confirmado no Harness | Conversa de 16/11/2026; `frontend/public/imgs/exemplos/exemploListagemDeVendas.png`, `exemploDadosDaVenda.png`, `exemploDesignDark.png` e `exemploCadastrarVenda.png` na mesma pasta | Cartões somente na Visão Geral; barra horizontal; 10 vendas por página nas duas coleções; detalhe compacto com excedente interno; links integrados ao tema; atraso no dia seguinte | Referências visuais inspecionadas, sem copiar dados pessoais nem ações fora do recorte; ajustes não implementados nesta revisão |
| FON-011 | Decisões e aprovação documental no Harness | Conversa de revisão do PR #13; confirmação final após corrigir escala Windows para 125%; consulta local `Get-CimInstance Win32_OperatingSystem` | Somente dados do cliente editáveis; CPF com verificadores; telefone BR 10/11 dígitos; seed compatível futuramente; máquina e participação previstas | Hardware/tela informados pelo solicitante; Windows 11 Home build 26200 observado localmente. Sem modelo de GPU inferido, versão de Chrome, medição, papéis de aceite ou aprovação da ótica; metas mantidas para discussão |
| FON-012 | Refinamento visual explícito no Harness | Conversa de 21/11/2026, solicitação de fonte 18 px/padding comum e confirmação para compactar os blocos do detalhe após medição | Aplicar às tabelas de Vendas/Quitadas e parcelas, mantendo CA-028 sem remover campos ou reduzir a fonte | Verificação técnica registrada em `frontend/README.md`; não implica aceite da ótica |
| FON-013 | Refinamento visual explícito no Harness | Solicitação de 21/11/2026 para aplicar às tabelas de Relatórios o padrão tipográfico de Vendas | Fonte 18 px, line-height 20 px e padding 10×4 px em dados / 10×8 px em cabeçalhos nas quatro tabelas | Verificado por estilos computados/E2E nos dois temas e viewports; sem aceite da ótica |

A imagem referida pelo README existe em `exemplo/exemplo-planilha-vendas.jpeg`, mas não foi transcrita nem usada para inferir regras ou copiar dados pessoais. As entrevistas e o README oferecem informação suficiente para este rascunho.

**FON-014 — layout de Nova venda:** solicitação e respostas explícitas no Harness,
21/11/2026: formulário e prévia lado a lado no breakpoint médio padrão, empilhados
em telas menores; compactação prioritária de valor/quantidade, nome/descrição mais
amplos, na mesma Change/branch visual. Planejamento e implementação autorizados
pelo solicitante; evidências técnicas em `frontend/README.md`, sem aceite da ótica.

**FON-015 — entrada como parcela e seleção obrigatória:** pedido explícito e
respostas no Harness de 21/11/2026: R$ 2.000 em 10x com R$ 200 de entrada deve
gerar uma parcela paga de R$ 200 e nove pendentes de R$ 200; entrada diferente
divide o saldo entre N−1; mínimo 2 com entrada; uniformizar seed sem duplicar
recebimentos. Campo “Possui Entrada” acima de data/total/quantidade exige Sim ou
Não. Após o merge do PR #20, autorizada somente a documentação PRD → TDD → SDD.
Fonte de decisão para o MVP, não aceite da ótica nem evidência de implementação.

**Conciliação da revisão 1.1:** o solicitante confirmou dois temas, claro e escuro, com escuro inicial, alternância acessível e preferência somente em memória. PEN-006 foi resolvida documentalmente e possui evidências técnicas na FASE-003; isso não é aprovação da ótica. O `AGENTS.md` atual não contém a antiga restrição de tema claro. Mantêm-se quatro módulos, sem cadastros independentes de clientes ou parcelas. Substituição operacional do Excel continua fora do MVP.

**FON-016 — pagamento individual:** pedido e respostas no Harness em 22/11/2026:
uma parcela por confirmação; antecipação permitida; referência fixa da sessão;
texto nas bloqueadas. A Change `simplificar-pagamento-parcelas` está aplicada
tecnicamente na branch `feature/simplificar-pagamento-parcelas`; testes e limites
estão registrados em `frontend/README.md`. Zoom nativo 200% e aceite comercial
continuam pendentes; aplicação técnica não altera as regras confirmadas nem implica
homologação.

## 3. Visão, objetivos e resultados esperados

**Visão:** tornar o acompanhamento das vendas auxiliares compreensível para a equipe, com identificação inequívoca da venda e conferência de parcelas antes de qualquer recebimento simulado.

| ID | Objetivo | Resultado esperado | Fonte | Métrica relacionada |
| --- | --- | --- | --- | --- |
| OBJ-001 | Facilitar localização e conferência da venda | Encontrar a venda sintética correta e distinguir nomes semelhantes | FON-001, FON-003, FON-004 | MET-001 |
| OBJ-002 | Simplificar cadastro e edição com conferência | Preencher dados do cliente e venda juntos, revisar parcelas e identificar erros antes de confirmar | FON-001, FON-003, FON-004 | MET-002 |
| OBJ-003 | Tornar recebimentos e quitação compreensíveis | Identificar a parcela correta, simular pagamento e reconhecer atualização do saldo | FON-001, FON-004 | MET-003 |
| OBJ-004 | Apoiar leitura da situação financeira | Explicar valores em aberto, atrasos, recebimentos e próximos vencimentos | FON-001, FON-004 | MET-004 |
| OBJ-005 | Validar uma demonstração acessível e sem uso operacional indevido | Percorrer módulos e reconhecer que dados não são reais nem persistidos | FON-001, FON-002 | MET-005 |

**Não objetivos:** operar cobranças reais; comprovar redução de inadimplência; substituir sistemas da franquia; eliminar lançamentos duplicados entre sistemas por integração; entregar infraestrutura de produção; validar regras financeiras definitivas somente por aparência da interface.

## 4. Público, perfis e necessidades

| Perfil | Contexto e tarefas | Necessidades | Base e limite |
| --- | --- | --- | --- |
| Funcionário de atendimento | Cadastrar vendas, localizar cliente durante atendimento e conferir parcelas | Campos claros, identificação por mais de um dado, revisão antes de confirmar, mensagens sem termos técnicos | FON-003 e FON-004; não representa todos os funcionários |
| Proprietário ou pessoa de gestão | Conferir situação dos valores auxiliares e discutir o fluxo da loja | Resumos consistentes, identificação de atrasos e distinção entre aberto e quitado | FON-001 e FON-004; participação e papel aprovador a confirmar |
| Participante da avaliação do protótipo | Executar tarefas fictícias e comentar navegação | Aviso de demonstração, dados sintéticos e cancelamento sem efeito | FON-001 e FON-002 |

Conforme FON-035, o público operacional é uma única equipe específica da loja, em
um computador offline, sem autenticação, contas individuais ou permissões por
perfil, também na evolução local planejada. Os perfis acima representam tarefas,
não controle de acesso. O perfil “Administrador” na navegação é apenas estático.
Participantes e autoridade de aceite da avaliação continuam distintos do público
operacional confirmado. Não há pesquisa específica de deficiência ou tecnologia
assistiva; navegação por teclado, foco perceptível, rótulos e situações textuais são
requisitos, não características presumidas dos participantes.

## 5. Escopo e prioridades

### Incluído no MVP

- **Essencial:** estrutura com Visão Geral, Vendas, Relatórios e Configurações; divulgação do caráter demonstrativo e do descarte ao recarregar em Configurações e nas confirmações de operações; temas claro e escuro, escuro inicial e alternância acessível sem persistência; listagem de vendas em aberto com busca local; cadastro com dados do cliente; detalhes com parcelas; simulação controlada de pagamento; consulta de quitadas; consistência de saldos e estados; acessibilidade e validações. Não há aviso global persistente.
- **Importante:** edição de venda em situações permitidas, indicadores detalhados da Visão Geral e resumo financeiro de Relatórios. Completam a avaliação do processo, mas dependem de delimitar edição e regras de contabilização. Relatórios e Configurações continuam navegáveis mesmo antes do refinamento desses conteúdos.
- **Essencial no refinamento da consulta:** paginação de 10 vendas nas abertas e quitadas e layout compacto conforme CA-027/028, para manter os registros visíveis no desktop.
- **Desejável:** gráfico de recebimentos dos últimos meses e decoração discreta de avatar/ícones. Não devem atrasar a validação de cadastro e recebimento.
- **Futuro:** infraestrutura operacional e alternativas condicionadas às decisões abaixo. Não há compromisso de prazo.

Prioridade expressa importância, não situação de validação. A revisão 1.3 resolve as regras financeiras RN-011 a RN-017; a 1.5 resolve busca e filtros de Quitadas por RN-018/019, somente para o MVP. A revisão 1.8 resolve as decisões de PEN-008/010 por RN-021/022/023, sem implementá-las; HIP-001 nunca foi aprovada e não autoriza comportamento alternativo.

### Fora do escopo

Backend, SQLite, persistência em navegador ou arquivo, autenticação, autorização, integrações, APIs externas de dados, importação de planilha, migração de dados reais, cobrança automatizada, juros/multas/descontos, estorno, exclusão de vendas, conciliação com franquia, emissão fiscal e exportação real de relatórios. Não criar cadastros independentes de clientes ou parcelas, busca global ou unicidade por CPF. Não inferir limites de crédito, quantidade máxima de parcelas ou políticas comerciais.

### Evolução futura, sem compromisso de entrega

A direção futura registrada no TDD prevê Tauri como janela Windows, Angular na interface, ASP.NET Core nas regras definitivas e SQLite local acessado pelo backend. Comunicação, execução do processo .NET, empacotamento e contratos ainda serão planejados. Temas claro/escuro e alternância pertencem à FASE-003 do MVP visual, não à infraestrutura futura.

### Recorte histórico de planejamento da FASE-003 — revisão 1.1

Construir futuramente a estrutura visual e a navegação dos quatro módulos, com Quitadas dentro de Vendas, aviso em todos os destinos, dois temas e páginas identificadas. Visão Geral, Vendas, Quitadas e Relatórios explicarão que seus conteúdos comerciais ainda não estão disponíveis, sem números, listas, busca ou ações comerciais fictícias. Configurações explicará dados fictícios, estado apenas em memória, perda ao recarregar e ausência de capacidade operacional, sem controles fictícios. Esta confirmação aceita HIP-004 somente para esse conteúdo; filtros de Quitadas em PEN-012 permanecem abertos. A FASE-003 não conclui os requisitos de consultas, cadastro, recebimento ou indicadores. A criação de proposta e demais artefatos é planejamento, não autorização de implementação.

## 6. Jornadas e fluxos de uso

| ID | Ator, objetivo e gatilho | Pré-condições e etapas | Resultado e alternativas | Requisitos |
| --- | --- | --- | --- | --- |
| JOR-001 | Atendimento; OBJ-001; pessoa pede consulta da venda | Demonstração aberta; entrar em Vendas, pesquisar por dado disponível, conferir nome/CPF/telefone e abrir cliente da venda | Detalhes da venda correta; sem resultado, revisar e limpar busca; não selecionar automaticamente homônimos | RF-001, RF-002, RF-003, RF-005 |
| JOR-002 | Atendimento; OBJ-002; nova venda fictícia | Acessar Nova venda, preencher cliente e venda, conferir entrada e prévia, confirmar | Venda aparece em aberto; erro preserva campos; cancelar não altera dados; regra pendente impede confirmar apenas o caso afetado | RF-004, RF-011 |
| JOR-003 | Atendimento; OBJ-002; correção de venda fictícia | Abrir edição, revisar nome, CPF, telefone ou descrição e confirmar | Listas e detalhes refletem alteração única apenas na venda selecionada; cancelar mantém original; dados financeiros e data da venda não são editáveis (RN-021) | RF-006, RF-011 |
| JOR-004 | Atendimento; OBJ-003; pagamento fictício de parcela | Conferir venda, acionar Pagar na primeira pendente, conferir valor/vencimento, informar data/forma e confirmar uma vez | Uma parcela integral e atualização atômica; libera a seguinte; falha não muda valores; última paga inclui a venda na projeção de Quitadas | RF-005, RF-007, RF-008, RF-011 |
| JOR-005 | Gestão; OBJ-004; revisão dos valores | Navegar por Visão Geral e Relatórios, ler indicadores e relacionar com vendas/parcelas | Compreensão de saldos, atrasos e recebimentos; exportação não gera arquivo; sem dados, totais zerados | RF-009, RF-010 |
| JOR-006 | Participante; OBJ-005; início e encerramento da avaliação | Percorrer os quatro módulos e Configurações, consultar o contexto demonstrativo, utilizar teclado e recarregar | Reconhecer navegação, caráter fictício e descarte das alterações; apresentação sem login ou promessa de persistência | RF-001, RF-011, RF-012 |

## 7. Requisitos funcionais

### RF-001 — Estrutura e navegação

- **Comportamento:** apresentar identidade Mercadão dos Óculos - Vendas em Aberto, navegação lateral com ícones, rótulos e indicação ativa para os quatro módulos; disponibilizar Quitadas dentro de Vendas e perfil estático na parte inferior.
- **Necessidade:** orientação entre telas; OBJ-001 e OBJ-005; JOR-001 e JOR-006.
- **Ator, pré-condições e entradas:** participante; demonstração carregada; acionamento de link ou teclado.
- **Resultado:** conteúdo do módulo selecionado acessível sem login; dados sintéticos mantidos entre navegações da mesma sessão.
- **Exceções:** não criar módulos independentes de clientes e parcelas; seleção de venda inexistente deve informar ausência e oferecer retorno, sem tela quebrada.
- **Prioridade:** Essencial, sustenta todas as tarefas.
- **Origem/situação:** FON-001 §§2 e 13; FON-002; confirmado por fonte.
- **Aceite:** CA-001, CA-018.

### RF-002 — Listagem de vendas em aberto

- **Comportamento:** exibir somente vendas com saldo restante, botão Nova venda e colunas Cliente, Data da venda, Valor total, Parcelas pagas/total, Saldo devedor, Próximo vencimento, Situação e Ações. Oferecer acesso visível a visualizar e editar.
- **Necessidade:** conferência e localização; OBJ-001; JOR-001.
- **Ator, pré-condições e entradas:** atendimento; coleção sintética inicial com 10 a 15 vendas; abertura de Vendas.
- **Resultado:** tabela compacta sem cartões financeiros em Vendas, paginada em 10 registros por página conforme RN-020; dados tabulares usam fonte de 18 px e padding uniforme com Quitadas e parcelas no detalhe, sem comprometer a legibilidade ou a densidade de CA-028. Total em aberto, Valores em atraso, Recebimentos do mês e Vendas cadastradas ficam exclusivos da Visão Geral (RF-009).
- **Exceções:** distinguir coleção vazia de filtro sem resultados; nenhuma quitada na lista principal. Situações e cálculos seguem RN-014/015. Na FASE-005, o filtro de situação segue RN-019 e somente Visualizar é ação funcional; Nova venda e Editar aguardam a FASE-006, sem controles inoperantes.
- **Prioridade:** Essencial, tela prioritária do produto.
- **Origem/situação:** FON-001 §3 e FON-008/010; consulta entregue nos PRs #9/#10, com situações, paginação e ausência de cartões. Ações de Nova venda/Editar permanecem futuras, sem aceite da ótica.
- **Aceite:** CA-002, CA-003, CA-014, CA-027, CA-028.

### RF-003 — Busca local de vendas

- **Comportamento:** fornecer uma única área de pesquisa destacada em Vendas e em Quitadas, contemplando nome, CPF, telefone e data da venda, além de ação de limpar; orientação “Buscar por nome, CPF, telefone ou data da venda...”. Aplicar RN-018/019.
- **Necessidade:** identificar a venda certa sem duplicar busca; OBJ-001; JOR-001.
- **Ator, pré-condições e entradas:** atendimento; vendas sintéticas disponíveis; critério informado e limpeza.
- **Resultado:** apresentar correspondências locais preservando a separação entre abertas e quitadas e permitir conferir a identidade antes de abrir. Nas abertas, campo único, situação, Limpar pesquisa e Nova venda ficam lado a lado em uma única faixa no desktop de referência (CA-028), sem busca duplicada no cabeçalho ou ação “Limpar critérios”. Limpar a pesquisa preserva a situação; para restaurar a coleção inteira, limpar o termo e selecionar Todas.
- **Exceções:** informar ausência de resultados sem apagar vendas; busca vazia remove somente a restrição do termo, preservando a situação selecionada nas abertas. Data completa inválida não corresponde a registros, não muda de dia e não é reinterpretada como telefone. Sem busca global ou intervalo. Nas abertas, busca e situação são combinadas por E; Quitadas não possui filtro adicional.
- **Prioridade:** Essencial, requisito central de consulta.
- **Origem/situação:** FON-001 §§2, 3 e 13; FON-003 §1; FON-004 §§4 e 6; FON-009 confirma a semântica para FASE-005. Busca implementada no PR #9, com refinamento visual e paginação no PR #10; sem aceite da ótica.
- **Aceite:** CA-004, CA-005, CA-019.

### RF-004 — Cadastrar venda com dados do cliente

- **Comportamento:** reunir no mesmo formulário nome, CPF, telefone, valor da venda, existência de entrada, quantidade total de parcelas e data da venda como obrigatórios; descrição do cliente opcional; valor e forma da entrada quando houver. Exibir “Possui Entrada” antes de data da venda, valor total e quantidade de parcelas, com opções “Selecione uma opção”, “Sim” e “Não”, inicialmente sem resposta válida. A entrada é a parcela 1 paga na data da venda, incluída na quantidade total informada. Iniciar data com a referência local da sessão e permitir alteração para dia não futuro. Mostrar prévia completa com situação textual e identificação da entrada antes da confirmação.
- **Necessidade:** reduzir dificuldade de cadastro e conferência; OBJ-002; JOR-002.
- **Ator, pré-condições e entradas:** atendimento; Nova venda; campos descritos, sem exigir cliente prévio.
- **Resultado:** uma venda sintética com parcelas e dados próprios de cliente passa a ser consultável; descrição preenchida aparece nos detalhes. Com entrada, a prévia contém uma parcela 1 Paga e N−1 pendentes; sem entrada, contém N pendentes. A prévia não efetiva recebimento nem reserva ID.
- **Exceções:** campos inválidos preservados e identificados junto ao campo; descrição vazia não bloqueia. Calendário, centavos e entrada seguem RN-011/012/013/017; CPF/telefone seguem RN-022/023, sem unicidade. Não permitir venda futura nem entrada que quite todo o valor no cadastro.
- **Prioridade:** Essencial, principal dor relatada.
- **Origem/situação:** FON-001 §§5 e 9; FON-002/003/004/008/011/015. Cadastro já existe; a seleção obrigatória e entrada como parcela são requisitos confirmados para planejamento, ainda não implementados.
- **Aceite:** CA-006, CA-007, CA-008, CA-009, CA-016, CA-017, CA-032, CA-033, CA-034, CA-035.

**Layout de cadastro — PRD 1.16/FON-014:** em Nova venda, reunir os
grupos de identificação e dados financeiros na coluna esquerda, com a prévia
completa na coluna direita e alinhada ao topo, a partir de 768 px. Abaixo desse
limiar, empilhar formulário e prévia nessa ordem. Nome/descrição devem ter mais
largura que valor/quantidade; compactar espaçamento sem reduzir legibilidade ou
limitar dados aceitos. Manter campos, mensagens, ações e prévia dinâmica atuais;
não estender o redesenho à edição ou ao recebimento.

### RF-005 — Consultar detalhes e parcelas da venda

- **Comportamento:** ao acionar o cliente da venda, mostrar nome, CPF, telefone, descrição quando preenchida, data da venda, valor total, indicação de entrada, quantidade de parcelas, total pago, saldo e situação geral. Tabela de parcelas: número/total, valor, vencimento, situação, data e forma de pagamento e ações.
- **Necessidade:** conferência antes de recebimento; OBJ-001 e OBJ-003; JOR-001 e JOR-004.
- **Ator, pré-condições e entradas:** atendimento; venda existente; seleção da venda.
- **Resultado:** dados do cliente e da venda condensados lado a lado, seguidos das parcelas, conforme `exemploDadosDaVenda.png`; a tabela de parcelas compartilha fonte tabular de 18 px e padding com Vendas/Quitadas; situações textuais Aberto, Próximos dias, Atrasado e Paga. CA-028 exige até 10 parcelas visíveis sem rolagem da página no cenário padrão; excedentes usam rolagem interna acessível, sem truncar o histórico.
- **Exceções:** não abrir cadastro independente de cliente; datas/formas inexistentes indicadas como não informadas, nunca inventadas; situações seguem RN-014. Entrada aparece como parcela 1 Paga, identificada como entrada, aumentando pagas/total sem duplicar valores; o resumo pode indicar a entrada, mas não como cobrança adicional. Na coluna Ações, somente a primeira pendente por número oferece Pagar, inclusive futura; demais pendentes mostram “Aguardando parcela anterior”, pagas ficam sem ação. Não oferecer o botão geral Receber. Aplicar RF-007 e CA-024 sem alterar a densidade de CA-028.
- **Prioridade:** Essencial, evita recebimento sem conferência.
- **Origem/situação:** FON-001 §§4–6 e FON-008/010; detalhe somente leitura implementado no PR #9 e compactado no PR #10, com evidências anteriores no README; sem aceite da ótica.
- **Aceite:** CA-010, CA-011, CA-018, CA-020, CA-028, CA-029.

### RF-006 — Editar venda demonstrativa

- **Comportamento:** oferecer formulário com os valores existentes de nome, CPF, telefone e descrição, únicos campos editáveis após o cadastro, com confirmação explícita. Aplicar RN-021/022/023; preservar os dados ao cancelar e atualizar somente após validação.
- **Necessidade:** avaliar correção e confiança ao alterar registros; OBJ-002; JOR-003.
- **Ator, pré-condições e entradas:** atendimento; qualquer venda existente, inclusive com entrada, parcelas pagas ou totalmente quitada; somente alterações nos quatro campos autorizados.
- **Resultado:** detalhe e tabela refletem os dados corrigidos apenas na venda selecionada, sem propagação para outras vendas com o mesmo CPF; resumos e histórico financeiro permanecem idênticos.
- **Exceções:** data da venda, valor total, existência/valor/data/forma da entrada, quantidade/valores/vencimentos das parcelas e pagamentos não são editáveis, mesmo sem recebimentos. Registrar novos pagamentos por RF-007 não é edição desses dados. Cancelamento, validação rejeitada ou falha não deixam alterações parciais.
- **Prioridade:** Importante, complementa cadastro preservando o histórico financeiro.
- **Origem/situação:** FON-001 §§3 e 9; FON-002 e FON-011. PEN-008 resolvida documentalmente; HIP-002 superada pela RN-021. Não implementada nem validada pela ótica.
- **Aceite:** CA-012, CA-016, CA-017.

### RF-007 — Simular registro de pagamento

- **Comportamento:** acionar Pagar na primeira parcela pendente da venda e abrir modal dessa parcela, mostrando identificação, vencimento e valor não editável. Informar somente data e forma de pagamento e confirmar uma vez ou cancelar. Não pedir quantidade nem valor recebido e não oferecer seleção de lote.
- **Necessidade:** avaliar baixa com conferência; OBJ-003; JOR-004.
- **Ator, pré-condições e entradas:** atendimento; venda com pendências; primeira pendente identificada conforme RN-016, data e forma permitidas. Data inicia com a referência fixa da sessão; forma inicia sem seleção válida.
- **Resultado:** registrar um recebimento integral com uma alocação à parcela acionada e publicar uma única alteração em memória; atualizar parcelas, saldos e resumos sem dupla contagem. Liberar Pagar na próxima pendente somente após sucesso. Para pagar várias, repetir o fluxo individualmente.
- **Exceções:** rejeitar parcela paga, desconhecida, de outra venda ou fora de ordem; não deslocar confirmação obsoleta para outra parcela. Valor vem da parcela, sem parcial/excedente. Permitir antecipação na ordem correta. Data entre venda e referência fixa, inclusive, sem mudança ao atravessar meia-noite; formas: Dinheiro, Pix, Cartão de débito e Cartão de crédito, sem dados bancários/cartão ou processamento. Falha/cancelamento não alteram estado e duplicidade não duplica lançamento. Sem juros, descontos ou estorno. Preservar recebimentos históricos em lote, sem recriar seus valores, datas, formas ou alocações.
- **Prioridade:** Essencial, valida uma tarefa central.
- **Origem/situação:** FON-016 substitui a seleção em lote de FON-008 para novos pagamentos. Produto confirmado pelo solicitante e implementação técnica da Change em andamento; regressões verificadas conforme `frontend/README.md`, com zoom nativo 200% e aceite da ótica ainda pendentes.
- **Aceite:** CA-011, CA-013, CA-016, CA-017, CA-024, CA-028.

### RF-008 — Consultar vendas quitadas

- **Comportamento:** disponibilizar página dentro de Vendas para vendas totalmente pagas, com situação Quitada, acesso aos detalhes e parcelas pagas e a mesma busca única das abertas, restrita às quitadas (RN-019).
- **Necessidade:** separar acompanhamento de saldo e histórico demonstrativo; OBJ-003; JOR-004.
- **Ator, pré-condições e entradas:** atendimento; venda sintética já quitada ou última parcela paga em caso inequívoco; abrir Quitadas.
- **Resultado:** venda liquidada deixa a lista de abertas e aparece uma única vez em Quitadas, sem perder parcelas. A tabela segue RN-020, com 10 vendas por página e navegação numerada abaixo, sem cartões globais.
- **Exceções:** indicar coleção vazia; não criar quinto módulo, filtros não confirmados ou saldo residual oculto.
- **Prioridade:** Essencial, consequência obrigatória do recebimento integral.
- **Origem/situação:** FON-001 §§3 e 6; FON-009 resolve filtros de PEN-012: somente busca única, sem controles extras. Consulta entregue nos PRs #9/#10; recebimento visível permanece futuro.
- **Aceite:** CA-003, CA-011, CA-014.

### RF-009 — Exibir Visão Geral

- **Comportamento:** concentrar exclusivamente nesta aba os quatro indicadores Total em aberto, Valores em atraso, Recebimentos do mês e Vendas cadastradas, além de vendas recentes, próximos pagamentos/vencimentos e pagamentos em atraso que exigem atenção. Não duplicar esses cartões em Vendas, Quitadas ou Relatórios; RF-010 preserva suas análises por período, não essa faixa de indicadores globais.
- **Necessidade:** leitura financeira do conjunto; OBJ-004; JOR-005.
- **Ator, pré-condições e entradas:** gestão; fonte demonstrativa e data de referência identificada; acessar Visão Geral.
- **Resultado:** valores conciliáveis com vendas, parcelas e pagamentos da mesma sessão; próximos dias e referência seguem RN-014/015.
- **Exceções:** sem dados, totais zerados e mensagem apropriada; contabilizar entrada conforme decisão explícita RN-013; gráfico histórico é desejável, não obrigatório.
- **Prioridade:** Importante para detalhamento; existência e acesso da página são essenciais em RF-001.
- **Origem/situação:** FON-001 §7 e FON-008; referência, mês e entrada definidos para o MVP; apresentação dos indicadores não implementada.
- **Aceite:** CA-014, CA-020.

**Recorte FASE-007 confirmado:** até cinco vendas recentes (incluindo quitadas),
ordenadas por data da venda decrescente; até cinco parcelas pendentes na janela
referência até +7 dias inclusivos e até cinco atrasadas, ordenadas por vencimento
crescente. Cada bloco informa que é um resumo limitado, distingue ausência de
itens e permite abrir a venda correspondente. Sem paginação, gráfico ou filtros.
Empates preservam a ordem da fonte; parcelas da mesma venda preservam sua ordem.
Nas extremidades do calendário, a janela inclui somente datas representáveis.

### RF-010 — Exibir resumo financeiro em Relatórios

- **Comportamento:** apresentar recebimentos mensais, valores em aberto, parcelas vencidas e vendas por período com dados comuns à demonstração; exibir Exportar relatório como ação apenas ilustrativa.
- **Necessidade:** conferir utilidade do resumo financeiro; OBJ-004; JOR-005.
- **Ator, pré-condições e entradas:** gestão; fonte demonstrativa disponível; acessar Relatórios.
- **Resultado:** tabelas/listas e totais por seção com períodos identificados; as quatro tabelas usam fonte de 18 px, line-height de 20 px e o padding comum definido para as tabelas do MVP. Nenhuma geração de arquivo ou transmissão de dados.
- **Exceções:** ação ilustrativa deve informar indisponibilidade no protótipo, sem anunciar exportação concluída. Consultas de domínio usam intervalos civis inclusivos explícitos, recebimentos por sua data e vendas pela data da venda; controles de seleção e gráfico permanecem no planejamento da FASE-007.
- **Prioridade:** Importante para conteúdo; acesso à página é essencial em RF-001.
- **Origem/situação:** FON-001 §8 e FON-008; semântica dos períodos definida; interface futura não autorizada por esta revisão.
- **Aceite:** CA-014, CA-015.

**Recorte FASE-007 confirmado:** recebimentos e vendas do mês civil da referência,
com início/fim identificados, sem seletor ou gráfico. Recebimentos incluem entradas
e lotes uma única vez pela data efetiva; vendas incluem quitadas pela data da venda.
Apresentar também a posição atual dos valores em aberto por venda e das parcelas
vencidas, com referência explícita e sem sugerir posição histórica do mês. Usar
tabelas/listas e totais próprios das seções, nunca repetir a faixa de quatro cartões.
Sem truncamento silencioso nos relatórios; zero e ausência de registros são estados
válidos. Exportar relatório informa sua indisponibilidade sem arquivo ou falso sucesso.

### RF-011 — Explicitar demonstração e proteger operações locais

- **Comportamento:** exibir aviso de dados sintéticos e descarte ao recarregar; confirmar somente operações válidas, sem duplicidade, preservando valores em erro e sem alterações ao cancelar.
- **Necessidade:** confiança na avaliação e prevenção de uso real; OBJ-002, OBJ-003 e OBJ-005; JOR-002, JOR-003, JOR-004 e JOR-006.
- **Ator, pré-condições e entradas:** qualquer participante; demonstração carregada; confirmar, cancelar ou recarregar.
- **Resultado:** navegação mantém estado em memória; recarga restaura a fonte inicial; falhas não são apresentadas como sucesso nem deixam mutações parciais.
- **Exceções:** não persistir preferência ou registros; não simular rede/carregamento sem necessidade. Falhas são cenários de verificação, não uma exigência de introduzir falhas artificiais na interface.
- **Prioridade:** Essencial, delimita segurança e fidelidade do protótipo.
- **Origem/situação:** FON-001 §§10 e 13; FON-002; confirmado por fonte.
- **Aceite:** CA-007, CA-009, CA-013, CA-016, CA-017, CA-021.

### RF-012 — Manter Configurações navegável

- **Comportamento:** disponibilizar página Configurações e atalho na navegação, coerentes com o restante da demonstração.
- **Necessidade:** validar organização proposta; OBJ-005; JOR-006.
- **Ator, pré-condições e entradas:** participante; abrir Configurações.
- **Resultado:** página identificada, com explicação do caráter demonstrativo e sem controles que prometam mudanças inexistentes.
- **Exceções:** não inventar gestão de contas, integrações, regras comerciais ou persistência. HIP-004 foi aceita para a FASE-003: explicar os limites da demonstração, sem controles fictícios. A alternância global dos temas foi confirmada em PEN-006; outros conteúdos funcionais continuam fora do recorte.
- **Prioridade:** Essencial para navegação; refinamento depende de validação.
- **Origem/situação:** FON-001 §§2 e 13 e FON-007; presença confirmada por fonte, conteúdo explicativo de HIP-004 aceito para FASE-003; demais itens de PEN-012 continuam pendentes.
- **Aceite:** CA-001, CA-022.

## 8. Regras de negócio e dados conceituais

### Entidades e relações

| Conceito | Dados necessários e relação | Limites |
| --- | --- | --- |
| Venda | Identificador estável, dados do cliente daquela venda, data civil, valor total, indicação/valor de entrada, quantidade de parcelas e descrição opcional | Sem cliente mestre, unicidade de CPF ou contrato de backend |
| Dados do cliente na venda | Nome, CPF, telefone e descrição opcional | Dados sintéticos; alteração não se propaga automaticamente a outras vendas |
| Parcela | Identificador estável, venda de origem, número, valor em centavos e vencimento civil | Pertence à venda; calendário e centavos seguem RN-011/012 |
| Pagamento demonstrativo | Um recebimento de uma venda com valor, data, forma e alocações para uma ou mais parcelas | Cada parcela é liquidada por no máximo um recebimento; não é modelo de banco nem admite parcialidade |
| Resumo derivado | Total pago, saldo devedor, quantidades, próximo vencimento e totais por período | Mesma fonte para todas as telas; contrato RN-015 |
| Contexto da demonstração | Coleção sintética e referência civil capturada na abertura | Fixa durante a sessão; renovada ao recarregar; testes fornecem referência explícita; exibição nas telas comerciais futuras |

### Regras e situações

| ID | Regra, condição e consequência | Exceções e limites | Origem e situação |
| --- | --- | --- | --- |
| RN-001 | Dados do cliente são informados em cada venda; nome, CPF e telefone são obrigatórios, descrição é opcional | Não presumir cadastro prévio, unicidade ou compartilhamento entre vendas | FON-001 §5; confirmada por fonte |
| RN-002 | Quando houver entrada, valor a parcelar = valor total − entrada | Parcelamento e contabilização conforme RN-011/012/013/017 | FON-001 §9 e FON-008 |
| RN-003 | No cadastro, a data inicial da venda é a referência da sessão e pode ser alterada para data não futura; vencimentos repetem o dia original nos meses seguintes | Após cadastro, data não editável por RN-021. Mês sem esse dia usa seu último dia, sem deslocar os seguintes; RN-011 | FON-001 §9, FON-008/011 |
| RN-004 | Venda totalmente paga recebe situação Quitada, sai das abertas e preserva parcelas pagas | Demais situações seguem a prioridade aprovada em RN-014 | FON-001 §§3 e 6 e FON-008 |
| RN-005 | Parcela admite Aberto, Próximos dias, Atrasado e Paga | Hoje até +7 dias inclusive são Próximos dias; RN-014 | FON-001 §4 e FON-008 |
| RN-006 | Valores financeiros usam centavos inteiros e datas civis preservam o dia sem deslocamento de fuso | Representação não define arredondamento comercial ou juros | FON-002; restrição técnica confirmada |
| RN-007 | Pagamento aceito mantém coerência entre parcelas, total pago, saldo, listagens e resumos da sessão | Entrada como primeira parcela paga; cada recebimento contado uma vez, sem somar entrada novamente; RN-013/016 | FON-001 §§4, 8 e 10; FON-002/008/015 |
| RN-008 | Cancelamento e falha não modificam registros; repetição de confirmação da mesma operação não duplica alterações | Não implica idempotência de API futura | FON-002; restrição demonstrativa confirmada |
| RN-009 | Estado é apenas em memória, com dados sintéticos; recarga elimina mudanças da sessão | Sem exceção de persistência nesta etapa | FON-001 e FON-002; confirmada por fonte |
| RN-010 | Resumos representam os mesmos registros das listas e detalhes, com períodos e universo identificados | Cartões globais independentes da busca; RN-015 | FON-001 §§3, 7 e 8 e FON-008 |
| RN-011 | Primeira parcela pendente no mês seguinte; dia original preservado; se inexistente, último dia do mês | Sem entrada: parcela 1 no mês seguinte. Com entrada: parcela 1 vence e é paga na data da venda; parcela 2 no mês seguinte. 31/01/2027 → 28/02, 31/03, 30/04; sem somar 30 dias | FON-008/015; PEN-001 resolvida para MVP |
| RN-012 | Dividir saldo em centavos pelo número de parcelas futuras: N sem entrada, N−1 com entrada; quociente inteiro em todas e mais um centavo nas primeiras futuras até esgotar o resto | R$ 100/3 sem entrada → R$ 33,34 + R$ 33,33 + R$ 33,33. A entrada mantém seu valor informado e pode diferir das demais; diferença máxima de um centavo aplica-se apenas às futuras | FON-008/015; PEN-003 resolvida para MVP |
| RN-013 | Entrada é a parcela 1, vencida e recebida na data da venda, com forma obrigatória; integra N e a contagem de pagas, total pago e recebimentos uma única vez | R$ 2.000 em 10x com entrada R$ 200 → 1/10 paga, nove pendentes de R$ 200, pago R$ 200, saldo R$ 1.800. Entrada não é recebível novamente. Aplica-se a novas vendas e ao seed; formas de RN-016 | FON-015 substitui o contrato separado de FON-008; planejada, não implementada |
| RN-014 | Parcela liquidada é Paga; pendente é Atrasado a partir do primeiro dia civil após vencer; hoje até +7 dias é Próximos dias; depois é Aberto | Vence em 10/11: não atrasada em 10/11, atrasada em 11/11. Sem tolerância extra ou relógio de 24 horas. Venda: saldo zero = Quitada; senão Atrasada se houver atraso; senão Próximos dias se houver parcela nessa janela; senão Em aberto | FON-008/010; regra mantida e explicitada, PEN-004/007 resolvidas para MVP |
| RN-015 | Referência = dia local da abertura, fixa na sessão; total em aberto soma saldos; atraso soma apenas parcelas pendentes vencidas; recebido no mês soma recebimentos por data civil, incluindo a entrada uma única vez; cadastradas inclui quitadas | Mês do primeiro ao último dia inclusive; períodos explícitos inclusivos; vendas por data de venda; busca/filtros de lista não alteram cartões; vazio = zero | FON-008/015; PEN-009 resolvida para o núcleo, controles de relatório na FASE-007 |
| RN-016 | Receber integralmente somente a primeira parcela pendente por número, uma por confirmação atômica | Antecipação permitida, salto proibido; valor derivado da parcela sem digitação; data inicial igual à referência fixa e editável entre venda e referência; forma obrigatória: Dinheiro, Pix, Cartão de débito ou Cartão de crédito; sem parcial/excedente/estorno/juros/descontos. Pagas sem ação, posteriores com “Aguardando parcela anterior”; preservar histórico em lote | FON-016 substitui lote de FON-008 para novos pagamentos; implementação técnica em verificação, zoom nativo e aceite da ótica pendentes; evidências em `frontend/README.md` |
| RN-017 | Total positivo e seguro em centavos; entrada ausente = zero, presente maior que zero e menor que total; N inteiro seguro, mínimo 1 sem entrada e 2 com entrada; número de futuras (N ou N−1) não superior ao saldo em centavos | Cada parcela vale ao menos R$ 0,01; rejeitar overflow e datas irrepresentáveis usando a quantidade de futuras; sem teto comercial arbitrário; entrada integral/cadastro quitado excluídos | FON-008/015; identificação definida em RN-022/023 |
| RN-018 | Um único termo pesquisa por correspondência parcial em nome sem distinguir acentos/maiúsculas e por sequência de dígitos de CPF/telefone ignorando pontuação; basta corresponder a um campo | Espaços externos ignorados; vazio remove somente a restrição textual, preservando situação nas abertas. Data completa DD/MM/AAAA pesquisa exclusivamente o dia exato da venda; inválida não corresponde, sem fallback numérico. Não há tokenização combinada, data parcial ou intervalo | FON-009; PEN-005 resolvida e busca implementada no PR #9 |
| RN-019 | A mesma busca atua separadamente nas abertas e nas quitadas; nas abertas há filtro Todas, Em aberto, Próximos dias e Atrasada, combinado com a busca por E | Sem filtro extra em Quitadas. Limpar pesquisa preserva situação; não há ação conjunta “Limpar critérios”: para restaurar a lista, limpar o termo e selecionar Todas. Critérios locais sem obrigação de preservá-los após sair; cartões globais não mudam com busca/situação. FASE-005 não oferece mutações nem ações fictícias | FON-009 e confirmação no Harness em 21/11/2026; consulta implementada nos PRs #9/#10 |
| RN-020 | Abertas e Quitadas exibem 10 vendas por página, após aplicar busca e situação pertinente, preservando ordem e IDs | Paginação numerada abaixo da tabela, anterior/próxima, página atual e faixa/total de resultados; reticências não são páginas. Alterar/limpar critérios volta à página 1; se a coleção diminuir, ajustar à última página válida. Zero resultados não cria página fictícia nem ações habilitadas; uma página dispensa controles de troca. Sem persistência ou nova ordenação | FON-010; confirmada no Harness e implementada no PR #10; evidências anteriores no README |
| RN-021 | Após cadastro, editar somente nome, CPF, telefone e descrição de qualquer venda, inclusive quitada | Não alterar data da venda, total, entrada, parcelamento ou pagamentos; não propagar entre vendas; cancelamento/falha preservam original. Novos recebimentos continuam por RN-016, sem edição do histórico | FON-011; PEN-008 resolvida; núcleo testado na feature em 18/11/2026, UI futura |
| RN-022 | CPF obrigatório em cadastro e edição: aceitar com/sem pontuação, exigir 11 dígitos e verificadores válidos, rejeitar sequências repetidas | Sem unicidade, consulta externa ou uso de dados reais. Validade matemática não comprova titularidade ou inexistência de pessoa real | FON-011; PEN-010 resolvida; validação testada na feature em 18/11/2026, UI futura |
| RN-023 | Telefone obrigatório brasileiro com DDD: após remover espaços, parênteses e hífen, exigir 10 ou 11 dígitos | Sem +55, lista de DDDs ou regras de prefixo; não consultar serviços externos. Não inferir que o número existe ou pertence a pessoa inexistente | FON-011; PEN-010 resolvida; validação testada na feature em 18/11/2026, UI futura |

Exemplo financeiro vigente: venda fictícia de R$ 2.000,00 em 10 parcelas, com entrada de R$ 200,00, produz parcela 1 Paga de R$ 200,00 e parcelas 2 a 10 de R$ 200,00: pago inicial R$ 200,00, saldo R$ 1.800,00, 1/10 paga. Liquidar parcela 2 e depois parcela 3 em duas confirmações de R$ 200,00 resulta em pago R$ 600,00, saldo R$ 1.400,00 e 3/10 pagas. Com entrada de R$ 500,00, as nove futuras dividem R$ 1.500,00: seis de R$ 166,67 e três de R$ 166,66. Entrada não é contada novamente no resumo. Juros, renegociação e políticas de cobrança continuam excluídos.

**RN-024 — escolha explícita de entrada:** no cadastro, “Possui Entrada” é obrigatório,
antes dos campos de data/total/quantidade. Opções exatas: “Selecione uma opção”,
“Sim”, “Não”; a primeira não equivale a Não. Sem Sim/Não, não há prévia válida ou
publicação, e o envio revela erro associado “Informe se a venda possui entrada ou não.”
Com Sim, exigir valor e forma; com Não, ocultá-los e ignorar eventuais valores do
rascunho no comando e na prévia; preservar esse rascunho para restaurar ao voltar
a Sim, sujeito à validação. Alternar a escolha recalcula sem mutar a fonte.
Origem FON-015; essencial para RF-004, confirmada para planejamento.

## 9. Requisitos não funcionais e restrições

| ID | Categoria | Condição verificável | Método de verificação | Prioridade | Origem e situação |
| --- | --- | --- | --- | --- | --- |
| RNF-001 | Idioma e apresentação | Textos, validações e nomes acessíveis em pt-BR; documento HTML com `lang="pt-BR"`; BRL e datas DD/MM/AAAA na apresentação | Inspeção das telas, mensagens e exemplos de datas/valores | Essencial | FON-001 e FON-002; confirmado por fonte |
| RNF-002 | Teclado e foco | Todas as ações principais operáveis por teclado; foco visível; modal recebe e contém foco, fecha com Escape e devolve foco ao acionador | Percurso manual sem mouse em cadastro, detalhe e recebimento | Essencial | FON-002; contenção de foco detalha a exigência de gerenciamento, proposta a validar |
| RNF-003 | Semântica e percepção | Campos com rótulos associados; botões de ícone nomeados; situações com texto além de cor; estados ativos anunciáveis | Inspeção semântica e leitura assistida; verificar contraste nos estados normal, foco e erro | Essencial | FON-001 e FON-002; confirmado por fonte; alvo WCAG 2.2 AA de contraste é proposto, não certificação |
| RNF-004 | Privacidade e isolamento | Nenhum dado pessoal real ou transmissão a serviços de dados; ausência de armazenamento persistente dos registros | Revisar fonte sintética e uso de rede/armazenamento durante operações e recarga | Essencial | FON-001 e FON-002; confirmado por fonte |
| RNF-005 | Integridade | Cada operação válida altera todos os derivados de forma coerente; erros/cancelamentos mantêm o estado anterior | Cenários CA-011 a CA-017, comparando centavos e registros antes/depois | Essencial | FON-002; confirmado por fonte |
| RNF-006 | Usabilidade e desempenho | Busca e abertura de detalhes sem espera artificial; avaliação proposta de resposta em até 300 ms com 15 vendas na máquina de demonstração | Medição local após definir ambiente; observação de tarefas | Importante | FON-001; limite numérico é HIP-006, não medição existente |
| RNF-007 | Layout e compatibilidade | Desktop 1366 × 768 a 100%: barra de critérios em uma linha, até 10 vendas e paginação visíveis sem rolagem da página; detalhe padrão com até 10 parcelas visíveis. Excedente de parcelas rola internamente. Em 390 × 844 e zoom nativo 200%, permitir reorganização/rolagem acessível sem perda de conteúdo | Medir geometria e capturas nos dois temas; testar teclado, textos extensos e zoom, conforme CA-028; PEN-013 ainda limita aceite geral de compatibilidade | Essencial no recorte de consulta | FON-010; zoom nativo 200% confirmado por relato manual em 22/11/2026; compatibilidade geral não homologada |
| RNF-008 | Manutenibilidade e tecnologia | Angular + TypeScript; standalone, HTML separado, estado por signals, novos formulários com Signal Forms compatível; dados/cálculos fora da apresentação, tipos estritos | Revisão da estrutura/configuração e futuros testes de domínio | Essencial | FON-002; base e navegação existentes; domínio financeiro e formulários não implementados |
| RNF-009 | Coerência visual | Temas claro e escuro, escuro inicial; alternância acessível com indicação do tema ativo, preservada entre rotas somente em memória; recarga restaura escuro; tokens e contraste consistentes | Revisão visual e por teclado das áreas existentes nos dois temas; componentes futuros herdam o mesmo contrato | Essencial | FON-001 e confirmação do solicitante em 13/11/2026; PEN-006 resolvida documentalmente |
| RNF-010 | Limite arquitetural | Ausência de backend, banco, autenticação, APIs de dados externas e persistência; sem contratos futuros inventados | Revisão de escopo e futura inspeção de dependências/código | Essencial | FON-001 e FON-002; confirmado por fonte |

Não há alegação de conformidade legal, certificação de acessibilidade, carga suportada ou segurança de produção. O controle de acesso não se aplica ao MVP sem dados reais; não deve ser simulado como proteção efetiva.

## 10. Experiência, navegação e estados de interface

**Arquitetura de informação:** navegação lateral → Visão Geral / Vendas / Relatórios / Configurações. Em Vendas: abertas → detalhes da venda e suas parcelas → modal de pagamento; Nova venda e edição no mesmo contexto funcional; Quitadas como opção interna. A escolha de página ou painel lateral para detalhes deve preservar orientação e retorno, sem exigir uma seção Clientes.

**Hierarquia visual:** título e subtítulo, ação principal, resumos pertinentes, área única de busca e tabela quando seus fluxos estiverem disponíveis. A listagem será o foco, não gráficos decorativos. Os dois temas usam superfícies e textos contrastantes e foco perceptível; situações futuras combinam texto e cor. Por solicitação explícita na revisão 1.2, a barra lateral usa vermelho da identidade no tema claro, orientado por `frontend/public/imgs/exemplos/exemploListagemDeVendas.png`; no escuro, usa degradê vertical sutil de vermelho para vermelho mais escuro/vinho, orientado por `exemploDesignDark.png`. Textos e ícones claros, estados ativo/hover e foco devem permanecer contrastantes. Essa identidade também se aplica ao bloco de navegação em viewport pequeno, sem animação obrigatória. O destaque azul/índigo continua permitido fora da lateral; o restante da interface não é redesenhado nesta revisão. Na FASE-003, não antecipar tabelas, indicadores ou ações comerciais sem consumidor funcional.

**Direção vigente da revisão 1.6 (substitui as restrições visuais históricas acima):**
seguir as referências FON-010 em proporções, densidade, tipografia, superfícies,
bordas suaves, cantos arredondados, ícones e selos. Claro com fundo claro e tabelas
brancas; escuro com fundo quase preto, superfícies grafite e texto claro; vermelho
de identidade nas ações/links, verde para pagas e vermelho para atraso, sempre com texto.
Esse contrato visual aplica-se a todos os módulos e estados existentes, inclusive
Visão Geral, Vendas, Quitadas, detalhe, cadastro, edição, recebimento, Relatórios,
Configurações, modais, avisos e páginas ausentes; páginas sem referência própria
derivam a mesma linguagem visual. A escolha de framework ou pipeline de estilos é
decisão técnica do TDD e não altera este requisito de produto.
Não copiar cartões para Vendas, dados pessoais, controles de janela/notificação,
busca global ou ações não implementadas. Manter aviso e alternância acessível.
Âncoras de navegação, cliente, Visualizar e retorno/breadcrumb não usam aparência
azul/sublinhada padrão permanente: integrar ao componente, com destaque vermelho
ou texto contrastante conforme a superfície; hover/foco perceptíveis, sublinhado
permitido nesses estados, sem eliminar semântica de link, foco ou indicação ativa.
Descrições extensas podem exigir espaço adicional acessível: não ocultar nem cortar
dados para cumprir artificialmente o cenário padrão sem rolagem de CA-028.

| Estado | Conteúdo e comportamento esperado |
| --- | --- |
| Demonstração ativa | Aviso persistente: “Demonstração com dados fictícios. As alterações serão perdidas ao recarregar.”; perfil estático não sugere sessão autenticada |
| Coleção vazia | Explicar que não há vendas na coleção correspondente; abertas oferecem Nova venda; quitadas não oferecem quitação fictícia |
| Busca sem resultados | Informar que nenhum registro corresponde à pesquisa e permitir limpar critérios; não tratar como falha |
| Formulário inválido | Erros junto aos campos em português; manter valores; tentativa de envio revela erros e direciona foco de forma compreensível |
| Regra indefinida | Não disponibilizar comportamento dependente de regra ainda aberta; HIP-001 é histórica e foi superada, não autoriza um fluxo alternativo |
| Confirmação | Explicitar “simulado” e resultado local; não usar linguagem de cobrança/transferência real |
| Cancelamento | Fechar sem mutação, retornar foco ao acionador e preservar registro anterior |
| Falha local | Mensagem de falha, dados de entrada preservados, possibilidade de tentar novamente e nenhum sucesso ou alteração parcial |
| Operação em andamento | Impedir duplicidade somente durante a confirmação; não introduzir espera ou carregamento fictício |
| Exportação ilustrativa | Aviso de que exportação não está disponível nesta demonstração; nenhum arquivo gerado |

Foco e ordem de tabulação devem acompanhar a leitura. Modais precisam de título acessível e fechamento identificável, conter navegação de foco enquanto abertos e restaurar foco ao fechar. Elementos recolhíveis devem comunicar expansão; estados selecionados e ativos não dependem apenas de cor. Atalhos de ação não podem existir apenas ao passar o mouse.

## 11. Critérios de aceite e matriz de rastreabilidade

Os cenários abaixo são verificações planejadas, não testes executados. Cenários condicionados a decisões abertas só ficam conclusivos após registrar a decisão correspondente; hipóteses não equivalem a aceite da loja.

### CA-001 — Navegação principal
- **Requisitos:** RF-001, RF-012; RNF-002, RNF-009.
- **Dado** o protótipo aberto,
- **Quando** o participante percorrer por teclado Visão Geral, Vendas, Relatórios, Configurações e Quitadas,
- **Então** cada destino deve ser acessível, indicar sua localização e manter Quitadas dentro de Vendas, sem módulos independentes de clientes ou parcelas.

### CA-002 — Conteúdo da listagem
- **Requisitos:** RF-002; RNF-001.
- **Dado** o conjunto inicial sintético de 10 a 15 vendas com situações variadas,
- **Quando** abrir Vendas,
- **Então** devem aparecer as colunas previstas, valores em BRL, datas DD/MM/AAAA e somente vendas não quitadas, em páginas de 10, sem os quatro cartões globais. Nova venda continua condicionada à FASE-006.

### CA-003 — Coleções vazias
- **Requisitos:** RF-002, RF-008.
- **Dado** um conjunto de avaliação sem vendas abertas ou sem vendas quitadas, respectivamente,
- **Quando** abrir a coleção correspondente sem filtros,
- **Então** deve aparecer uma mensagem de coleção vazia, distinta de pesquisa sem resultados, sem linhas inventadas e com ação de cadastro pertinente apenas nas abertas.

### CA-004 — Busca por cada dado suportado
- **Requisito:** RF-003.
- **Dado** RN-018/019 e duas vendas sintéticas com nomes semelhantes,
- **Quando** pesquisar separadamente por nome, CPF, telefone e data conforme a semântica aprovada,
- **Então** os resultados devem corresponder aos critérios, sem duplicar o campo de busca, permitindo conferir CPF/telefone nos detalhes antes de qualquer recebimento.

### CA-005 — Sem resultados e limpeza
- **Requisito:** RF-003.
- **Dado** vendas existentes e uma busca sem correspondência,
- **Quando** consultar e depois limpar a pesquisa,
- **Então** deve aparecer inicialmente “nenhum resultado” e depois a coleção correspondente à situação ainda selecionada, sem perder registros nem incluir quitadas nas abertas; limpar o termo e selecionar “Todas” restaura toda a coleção atual.

### CA-006 — Cadastro inequívoco e descrição opcional
- **Requisitos:** RF-004; RN-001, RN-003.
- **Dado** um cadastro com campos obrigatórios válidos, “Possui Entrada” em “Não”, divisão exata e dia existente nos meses seguintes,
- **Quando** revisar a prévia e confirmar, uma vez com descrição vazia e em outro caso com descrição preenchida,
- **Então** cada caso deve gerar uma única venda com suas parcelas; descrição vazia não deve impedir cadastro e descrição preenchida deve aparecer no detalhe. A data inicial deve ser o dia local do cadastro e aceitar alteração.

### CA-032 — Cadastro com prévia lateral e campos proporcionais
- **Requisitos:** RF-004; RNF-001/002/003/007/009.
- **Dado** Nova venda nos dois temas, com e sem entrada e com prévia válida ou inválida,
- **Quando** preencher e corrigir os campos em viewport CSS a partir de 768 px,
- **Então** o formulário deve ficar à esquerda e a prévia à direita, com os topos alinhados; nome e descrição devem ter mais espaço horizontal que valor total e quantidade de parcelas.
- **E** abaixo de 768 px deve haver uma coluna, com formulário antes da prévia; nenhuma largura fixa deve gerar overflow horizontal da página, nem cortar campos, rótulos, erros ou ações. A tabela pode rolar dentro da região identificada existente.
- **E** a compactação deve preservar fonte legível, foco, navegação por teclado, conteúdos aceitos, validações, recálculo em tempo real, entrada condicional, confirmação única, cancelamento e recuperação de falha. Rolagem vertical da página é permitida; zoom nativo de 200% exige verificação própria, não substituída por viewport reduzido.
- **Situação:** planejado; implementação e verificação pendentes.

### CA-007 — Campos inválidos
- **Requisitos:** RF-004, RF-006, RF-007, RF-011; RN-022/023; RNF-001.
- **Dado** um formulário com campo obrigatório ausente ou valor inválido segundo a regra aprovada,
- **Quando** tentar confirmar inclusive pelo caminho de envio,
- **Então** erros em português devem ser revelados junto aos campos, valores preservados e nenhum registro criado ou pagamento efetivado; foco deve facilitar a correção.

### CA-008 — Fórmula e contabilização da entrada
- **Requisitos:** RF-004/005/007/009/010; RN-002/006/011/012/013/015/017.
- **Dado** valor de R$ 2.000,00, “Possui Entrada” em “Sim”, entrada de R$ 200,00 com forma válida e quantidade total de 10 parcelas,
- **Quando** calcular a prévia,
- **Então** mostrar dez linhas: parcela 1 identificada como entrada, de R$ 200,00 e situação Paga na data da venda, e parcelas 2 a 10 de R$ 200,00 nos nove meses seguintes. Após confirmar uma vez, pago R$ 200,00, saldo R$ 1.800,00 e 1/10 paga em listas/detalhe; o recebimento mensal inclui R$ 200,00 uma vez, sem ação de receber novamente a entrada.

### CA-009 — Calendário, centavos e limites financeiros
- **Requisitos:** RF-004, RF-011; RN-002, RN-003.
- **Dado** as decisões RN-011/012/017 confirmadas para o MVP,
- **Quando** parcelar R$ 100,00 em três vezes e gerar vencimentos a partir de 31/01/2027,
- **Então** a prévia deve mostrar R$ 33,34, R$ 33,33 e R$ 33,33 em 28/02, 31/03 e 30/04, sem perda de centavos nem deslocamento permanente do dia original. Valores inseguros, saldo não positivo, entrada integral, quantidade inválida, parcela inferior a um centavo e datas fora da representação são rejeitados sem mutação. Este critério substitui o bloqueio hipotético da revisão 1.0; não implica aceite operacional.

### CA-010 — Detalhe no contexto da venda
- **Requisito:** RF-005; RN-001, RN-005.
- **Dado** duas vendas fictícias com nomes semelhantes e uma delas com parcelas já pagas,
- **Quando** selecionar o cliente de uma venda,
- **Então** devem aparecer apenas seus dados e parcelas, inclusive as pagas, com situações textuais e datas/formas existentes, sem cadastro independente de cliente.

### CA-011 — Pagamento integral e quitação
- **Requisitos:** RF-005, RF-007, RF-008; RN-004, RN-007; RNF-005.
- **Dado** uma venda demonstrativa com uma ou mais parcelas finais pendentes,
- **Quando** pagar cada restante separadamente na ordem de RN-016, com valor automático e data/forma permitidas em cada confirmação,
- **Então** após a última todas devem ficar Paga com suas respectivas datas/formas, saldo zero, situação Quitada, venda removida da projeção de abertas e incluída uma única vez em Quitadas; entrada e recebimentos não podem ser duplicados nos resumos, e não deve restar ação Pagar.

### CA-012 — Edição consistente
- **Requisitos:** RF-006; RN-008, RN-021/022/023.
- **Dado** uma venda sem recebimentos, com entrada, com parcelas pagas ou quitada,
- **Quando** editar nome, CPF, telefone ou descrição e confirmar dados válidos,
- **Então** detalhe e listagem devem refletir a mesma alteração apenas na venda selecionada, sem propagação mesmo com CPF repetido. Data da venda, total, entrada, parcelas, pagamentos, saldos e resumos devem permanecer inalterados; não oferecer edição financeira. Cancelamento e falhas seguem CA-016/017.

### CA-013 — Duplicidade e parcela já paga
- **Requisitos:** RF-007, RF-011; RN-008.
- **Dado** um pagamento válido em confirmação,
- **Quando** repetir o acionamento de confirmar e depois tentar pagar novamente a parcela liquidada,
- **Então** deve existir apenas um lançamento aceito e nenhum segundo recebimento para a parcela paga nesse fluxo, com ação indisponível ou explicação correspondente.

### CA-014 — Resumos e saldos consistentes
- **Requisitos:** RF-002, RF-008, RF-009, RF-010; RN-007, RN-010; RNF-005.
- **Dado** RN-013/015/016 e referência da sessão explicitamente identificada,
- **Quando** comparar detalhes, abertas, quitadas, Visão Geral e Relatórios antes e depois de uma mutação válida,
- **Então** saldos e recebimentos devem reconciliar em centavos sem duplicação; conjunto vazio deve produzir totais zerados e períodos devem estar identificados.
- **E na FASE-007** os relatórios mensais usam o mês completo da referência, sem seletor; saldos e parcelas vencidas identificam sua posição nessa referência. Os três resumos da Visão Geral respeitam ordem, janela inclusiva e limite de cinco, informam o recorte e abrem detalhes. Filtros de Vendas não alteram os quatro indicadores globais exclusivos da Visão Geral.

### CA-015 — Exportação somente ilustrativa
- **Requisito:** RF-010; RNF-010.
- **Dado** Relatórios aberto,
- **Quando** encontrar ou acionar Exportar relatório,
- **Então** seu caráter ilustrativo deve estar explícito, sem gerar arquivo, chamar serviço externo ou anunciar exportação concluída.

### CA-031 — Tipografia consistente nas tabelas de Relatórios
- **Requisitos:** RF-010; RNF-003/007/009.
- **Dado** Relatórios com registros em suas quatro seções, em ambos os temas,
- **Quando** consultar recebimentos do mês, vendas do mês, posição em aberto e parcelas vencidas,
- **Então** cada tabela deve usar fonte de dados 18 px, line-height 20 px e padding consistente com Vendas/Quitadas e parcelas: células de dados 10 px horizontal/4 px vertical, cabeçalhos 10 px horizontal/8 px vertical.
- **E** conteúdo, ordem, totais, links, captions e estados vazios devem permanecer inalterados; a rolagem horizontal deve permanecer contida na região identificada de cada tabela, sem exigir que as quatro seções caibam sem rolagem vertical da página.

### CA-016 — Cancelamento sem alteração
- **Requisitos:** RF-004, RF-006, RF-007, RF-011; RN-008; RNF-002.
- **Dado** um cadastro, edição ou modal de pagamento com valores alterados mas não confirmados,
- **Quando** cancelar, inclusive por Escape no modal,
- **Então** registros, saldos e resumos devem permanecer como antes e o foco deve retornar ao acionador correspondente.

### CA-017 — Falha sem sucesso ou alteração parcial
- **Requisitos:** RF-004, RF-006, RF-007, RF-011; RN-008; RNF-005.
- **Dado** falha controlada no caminho de confirmação em ambiente de teste,
- **Quando** tentar cadastrar, editar ou registrar pagamento,
- **Então** deve aparecer falha compreensível, nenhum sucesso, dados anteriores intactos, entradas preservadas e possibilidade de nova tentativa sem estado de envio travado. Não é necessário expor um simulador de falhas ao usuário.

### CA-018 — Registro ausente e retorno
- **Requisitos:** RF-001, RF-005.
- **Dado** um acesso a identificador de venda inexistente na sessão,
- **Quando** abrir detalhes ou edição,
- **Então** deve aparecer indicação de registro não encontrado e caminho de volta para Vendas, sem inventar dados nem interromper a navegação.

### CA-019 — Combinação e interpretação da pesquisa
- **Requisito:** RF-003.
- **Dado** busca única segundo RN-018/019, com nomes semelhantes e identificação sintética,
- **Quando** pesquisar nome com caixa/acentos diferentes, CPF/telefone com ou sem pontuação e data completa válida,
- **Então** encontrar correspondências parciais por nome/dígitos ou exatas pelo dia da venda, somente na coleção atual. Data completa inválida não gera correspondência nem exceção; termo vazio remove somente a restrição do termo. Não combinar campos de busca separados ou interpretar períodos/datas parciais. Nas abertas, a situação selecionada deve também corresponder; Todas não restringe as abertas, inclusive atrasadas e próximas. Cartões permanecem globais mesmo quando busca/situação não retornarem linhas.

### CA-020 — Limites de vencimento
- **Requisitos:** RF-005, RF-009; RN-003, RN-005, RN-006.
- **Dado** RN-011/014 e data civil de referência identificada,
- **Quando** avaliar ontem, hoje, os limites da janela de sete dias, dia posterior à janela e meses com dia inexistente,
- **Então** vencimentos e situações devem seguir exatamente as decisões aprovadas, sem alteração por fuso, mantendo parcelas pagas como Paga independentemente da data.

### CA-021 — Isolamento da sessão
- **Requisito:** RF-011; RN-009; RNF-004, RNF-010.
- **Dado** Configurações ou uma confirmação de operação que informa o caráter demonstrativo e uma alteração sintética aceita,
- **Quando** navegar entre módulos e depois recarregar a página,
- **Então** a navegação deve preservar a alteração apenas na sessão em memória e a recarga deve restaurar os dados iniciais, sem salvar registros no navegador/arquivo, transmitir dados pessoais ou exigir login.

### CA-022 — Configurações sem promessa indevida
- **Requisito:** RF-012; RNF-009.
- **Dado** o conteúdo mínimo de HIP-004 aceito para a FASE-003,
- **Quando** acessar Configurações pela navegação ou atalho,
- **Então** deve aparecer a página identificada, explicando dados fictícios, memória, descarte ao recarregar e ausência de uso operacional, sem opções fictícias de conta, integração ou persistência; os dois temas devem ser aplicados de forma consistente.

### CA-023 — Temas globais e recarga
- **Requisitos:** RNF-009; RF-001, RF-011, RF-012.
- **Dado** a estrutura navegável aberta em uma nova sessão,
- **Quando** alternar o tema por teclado, percorrer os destinos e recarregar,
- **Então** deve iniciar em escuro, comunicar o tema ativo e manter a escolha entre rotas; após recarga, deve voltar ao escuro, sem consultar ou gravar preferência persistente.

### CA-024 — Pagamento individual sequencial e atômico
- **Requisitos:** RF-007, RF-011; RN-007/008/016; RNF-005.
- **Dado** janeiro, fevereiro e março pendentes em uma venda existente,
- **Quando** consultar as ações, somente janeiro oferece Pagar; fevereiro e março mostram “Aguardando parcela anterior”, sem botão desabilitado. Parcelas já pagas, inclusive entrada, não oferecem pagamento.
- **Quando** abrir Pagar, o modal mostra parcela/vencimento/valor, sem quantidade ou valor digitável; data inicia na referência fixa, forma sem seleção válida. Data inválida, anterior à venda, posterior à referência ou forma ausente impedem confirmar e preservam os campos para correção.
- **Quando** confirmar janeiro com data/forma válidas, mesmo antes do vencimento,
- **Então** criar um recebimento integral dessa parcela, publicar uma única versão, contar seu valor uma vez e liberar fevereiro; para pagar março, primeiro pagar fevereiro em nova confirmação. Comando fora de ordem ou tentando quitar várias deve ser rejeitado sem mutação.
- **E** repetição, confirmação obsoleta, falha na preparação/validação final ou cancelamento não alteram histórico, saldo ou a próxima parcela. Não exigir datas crescentes entre pagamentos além do intervalo aprovado. Reabrir inicia novo rascunho.
- **E** teclado e Escape funcionam nos dois temas; cancelar devolve foco ao acionador, sucesso à próxima ação Pagar e quitação ao título das parcelas. Preservar até dez parcelas no desktop, acesso ao excedente, viewport estreito e zoom nativo 200% de CA-028.
- **E** recebimentos históricos em lote conservam IDs, valores, datas, formas e alocações e continuam conciliando em detalhes e relatórios, sem conversão para novos lançamentos.

### CA-025 — Referência e resumos globais
- **Requisitos:** RF-002/009/010; RN-010/014/015.
- **Dado** referência capturada na abertura, entradas e pagamentos em meses diferentes e vendas abertas e quitadas,
- **Quando** consultar as projeções, aplicar busca na futura lista, atravessar meia-noite durante a sessão e recarregar em nova sessão,
- **Então** o mês civil inclui suas duas bordas, entradas usam a data da venda e pagamentos sua própria data; cartões não dependem da busca e a contagem inclui quitadas; a referência não muda na sessão e é renovada ao recarregar. Coleção vazia resulta em zero e próximo vencimento ausente, não data inventada. A FASE-004 verifica o contrato no domínio; interação e exibição dependem das fases seguintes.

### CA-026 — Consulta somente leitura da FASE-005
- **Requisitos:** RF-001/002/003/005/008/011; RN-018/019; RNF-002/003/009.
- **Dado** o núcleo da FASE-004 e as duas coleções,
- **Quando** consultar abertas/quitadas, pesquisar, limpar e abrir detalhes por link ou endereço direto,
- **Então** consultar a mesma fonte sem mutação, distinguir coleção vazia de pesquisa/filtro sem resultados e registro inexistente, não apresentar os quatro cartões globais em Vendas/Quitadas e exibir referência da sessão. Nas abertas, busca e filtro de situação combinam-se por E; limpar todos os critérios restaura a coleção paginada a partir da página 1. Quitadas possui somente busca. Detalhes mostram somente a venda selecionada, entrada separada e parcelas com situações/data/forma reais ou ausência explícita. Links preservam IDs completos; teclado, foco, dois temas e retorno permanecem funcionais. Não exibir ações inoperantes de cadastrar, editar ou receber: esses itens de CA-002/003 e RF-002/005 pertencem à FASE-006.

### CA-027 — Paginação das duas coleções
- **Requisitos:** RF-002/003/008; RN-018/019/020; RNF-002/003.
- **Dado** mais de 10 vendas na coleção atual, inclusive fixtures com 11 e 21 registros,
- **Quando** avançar por números/anterior/próxima e depois alterar ou limpar critérios,
- **Então** mostrar no máximo 10 registros por página, sem duplicar/omitir resultados, contagem da coleção filtrada, página atual identificada e limites desabilitados; critérios retornam à página 1, sem mutar a fonte. Redução da coleção ajusta página inválida; zero/uma página não oferece navegação fictícia. Quitadas continua sem filtro de situação.

### CA-028 — Consulta compacta e fidelidade visual
- **Requisitos:** RF-002/003/005/008; RNF-007/009; FON-010.
- **Dado** desktop 1366 × 768, zoom 100%, ambos os temas, 10 vendas ou venda com até 10 parcelas e textos curtos do cenário padrão,
- **Quando** abrir cada lista e o detalhe no topo da página,
- **Então** pesquisa, situação, Limpar pesquisa e Nova venda ficam lado a lado nas abertas; não há aviso global persistente nem ação “Limpar critérios”. O contexto demonstrativo e o descarte ao recarregar são informados em Configurações e nas confirmações de operações. Tabelas de vendas abertas/quitadas e parcelas usam fonte de 18 px e padding uniforme nas células, e tabela/paginação ficam visíveis sem rolagem vertical da página. No detalhe, blocos compactos de cliente/venda lado a lado preservam todos os campos e deixam as até 10 parcelas visíveis sem rolagem da página. Comparar capturas com as referências, descontando diferenças funcionais autorizadas. Com mais parcelas, somente o excedente rola internamente com cabeçalho e região identificáveis e teclado. Em viewport menor, zoom 200% ou textos extensos, reorganizar/rolar sem cortar conteúdo ou diminuir artificialmente fonte.

### CA-029 — Links e classificação de atraso
- **Requisitos:** RF-001/002/005; RN-014; RNF-002/003/009; FON-010.
- **Dado** os dois temas e parcela pendente com vencimento em 10/11,
- **Quando** consultar com referência em 10/11 e 11/11 e percorrer links por teclado,
- **Então** não indicar atraso no vencimento e indicar Atrasado no dia 11; paga permanece Paga e resumos/situação da venda usam a mesma regra civil. Navegação, cliente, Visualizar e retorno/breadcrumb seguem o design das referências, sem azul/sublinhado padrão permanente, com foco/hover e localização acessíveis e destinos preservados.

### CA-033 — Escolha obrigatória e posição de Possui Entrada
- **Requisitos:** RF-004/011; RN-024; RNF-001/002/003/005/009.
- **Dado** Nova venda nos dois temas, com os demais campos válidos,
- **Quando** abrir o formulário e enviar sem escolher Sim/Não,
- **Então** “Possui Entrada” deve preceder data da venda, valor total e quantidade visualmente e na tabulação, iniciar em “Selecione uma opção”, impedir cadastro/prévia válida e revelar o erro associado, mantendo dados e foco compreensível, sem consumir ID.
- **E** selecionar Não deve produzir N pendentes sem entrada; selecionar Sim deve exigir valor/forma e recalcular para 1 paga + N−1 pendentes. Voltar à opção inicial invalida novamente; Não não pode enviar os valores ocultos da entrada. Cancelar, falhar e repetir envio preservam CA-016/017 e confirmação única.

### CA-034 — Entrada desigual, centavos e limites
- **Requisitos:** RF-004; RN-011/012/013/017/024.
- **Dado** R$ 2.000,00 em 10x com entrada de R$ 500,00,
- **Quando** calcular a prévia,
- **Então** gerar a entrada Paga de R$ 500,00, seis futuras de R$ 166,67 e três de R$ 166,66, total exato. A entrada não recebe o resto do saldo.
- **E** com entrada e N=1, valor zero/negativo/integral, forma ausente, mais futuras que centavos do saldo ou calendário irrepresentável, rejeitar sem mutação. Sem entrada, N=1 permanece permitido. Em 31/01/2027, entrada vence nessa data e as futuras em 28/02, 31/03 e seguintes, preservando o dia-base.

### CA-035 — Seed e reconciliação da entrada como parcela
- **Requisitos:** RF-002/005/007/008/009/010/011; RN-007/009/013/015/016.
- **Dado** as 12 vendas sintéticas, inclusive com entrada e histórico de recebimentos,
- **Quando** iniciar/recarregar a sessão e comparar listas, detalhe, recebimento, Visão Geral e Relatórios,
- **Então** entradas devem ser parcelas 1 Pagas, com contagens ajustadas, sem mudar total, pago, saldo, vencimentos pendentes ou valores recebidos por período. Preservar IDs de venda e vínculos de recebimentos; renumerar parcelas posteriores sem duplicá-las. Manter a política de bordas 0001–9999 e as situações possíveis.
- **E** o próximo recebimento começa na primeira pendente, nunca na entrada; pagar todas as restantes gera N/N pagas e uma única venda em Quitadas. Edição continua restrita ao cliente e não recria o recebimento da entrada.

### Matriz de rastreabilidade vigente

| Objetivo | Jornada | Requisito/regra | Fonte ou hipótese | Critérios de aceite |
| --- | --- | --- | --- | --- |
| OBJ-001, OBJ-005 | JOR-001, JOR-006 | RF-001; RNF-002, RNF-009 | FON-001, FON-002 | CA-001, CA-018 |
| OBJ-001 | JOR-001 | RF-002; RN-004, RN-010 | FON-001 | CA-002, CA-003, CA-014 |
| OBJ-001 | JOR-001 | RF-003 | FON-001, FON-003, FON-004 | CA-004, CA-005, CA-019 |
| OBJ-002 | JOR-002 | RF-004; RN-001, RN-002, RN-003, RN-006 | FON-001, FON-002, FON-003, FON-004, HIP-001 | CA-006 a CA-009, CA-016, CA-017 |
| OBJ-001, OBJ-003 | JOR-001, JOR-004 | RF-005; RN-005 | FON-001 | CA-010, CA-011, CA-018, CA-020 |
| OBJ-002 | JOR-003 | RF-006; RN-008/021/022/023 | FON-001, FON-002, FON-011 | CA-007, CA-012, CA-016, CA-017, CA-030 |
| OBJ-003 | JOR-004 | RF-007; RN-007, RN-008, RN-016 | FON-001, FON-002, FON-004, FON-016 | CA-007, CA-011, CA-013, CA-016, CA-017, CA-024, CA-028 |
| OBJ-003 | JOR-004 | RF-008; RN-004 | FON-001 | CA-003, CA-011, CA-014 |
| OBJ-004 | JOR-005 | RF-009; RN-005, RN-010 | FON-001, HIP-005 | CA-014, CA-020 |
| OBJ-004 | JOR-005 | RF-010; RN-010 | FON-001 | CA-014, CA-015 |
| OBJ-002, OBJ-003, OBJ-005 | JOR-002, JOR-003, JOR-004, JOR-006 | RF-011; RN-008, RN-009 | FON-001, FON-002 | CA-007, CA-009, CA-013, CA-016, CA-017, CA-021 |
| OBJ-005 | JOR-006 | RF-012 | FON-001, HIP-004 | CA-001, CA-022 |
| OBJ-005 | JOR-006 | RNF-009; RF-001/011/012 | FON-007; PEN-006 resolvida documentalmente | CA-023 |
| OBJ-002/003/004 | JOR-002/004/005 | RF-004/007/009/010; RN-011 a RN-017 | FON-008 | CA-008/009/011/013/014/020/024/025 |
| OBJ-001/004/005 | JOR-001/005/006 | RF-001/002/003/005/008/011; RN-018/019 | FON-009 | CA-002/003/004/005/010/014/018/019/020/023/025/026, somente responsabilidades de consulta na FASE-005 |
| OBJ-001/004/005 | JOR-001/005/006 | RF-001/002/003/005/008/009; RN-014/020; RNF-007/009 | FON-010 | CA-002/020/026/027/028/029; ajustes planejados, indicadores exclusivos da Visão Geral na FASE-007 |
| OBJ-002 | JOR-002/003 | RF-004/006; RN-021/022/023 | FON-011 | CA-007/012/016/017/030; regras decididas, validações e seed compatível não implementados |
| OBJ-001/002/003/004 | JOR-001/002/004/005 | RF-002/004/005/007/008/009/010/011; RN-007/011/012/013/015/017/024 | FON-015 | CA-008/009/011/013/014/016/017/032/033/034/035; nova regra somente planejada |

RNF-001 a RNF-005, RNF-009 e RNF-010 também são transversais aos cenários pertinentes. RNF-006 a RNF-008 têm métodos próprios na seção 9: medições e inspeções futuras, não resultados deste PRD.

### CA-030 — Identificação válida em cadastro e edição
- **Requisitos:** RF-004/006; RN-001/022/023; RNF-004/005.
- **Dado** dados exclusivamente sintéticos em um cadastro ou edição,
- **Quando** confirmar CPF com e sem pontuação e telefone com e sem espaços/parênteses/hífen,
- **Então** aceitar CPF com 11 dígitos e verificadores válidos, sem sequência repetida, e telefone de 10 ou 11 dígitos incluindo DDD, sem +55. CPF repetido entre vendas não bloqueia. CPF com comprimento/verificadores inválidos ou sequência repetida, telefone fora do comprimento ou com código +55 e campos obrigatórios vazios são rejeitados sem mutação. Não consultar serviços externos ou inferir titularidade. Na FASE-006, substituir os marcadores do seed por números sintéticos compatíveis, mantendo 12 vendas, IDs, valores e regras de calendário; não alegar anonimato ou inexistência de titulares por passarem na validação.

## 12. Métricas de sucesso e plano de validação

Não há linha de base medida. As metas abaixo são sugestões para discussão, sem promessa de desempenho ou aprovação. Coleta manual em sessão de avaliação, sem telemetria ou integração.

| ID | Indicador | Método de coleta/avaliação | Referência atual | Meta e situação | Momento de avaliação |
| --- | --- | --- | --- | --- | --- |
| MET-001 | Localização da venda correta | Observar busca por dado informado e conferência entre nomes semelhantes; registrar conclusão, ajuda e tempo | Não medida; relatos divergem quanto à dificuldade de consulta | Proposta: ao menos 80% das tentativas sem ajuda e nenhuma confirmação de venda errada | Avaliação do fluxo de consulta |
| MET-002 | Cadastro correto e compreensão da prévia | Conferir campos, entrada, calendário e capacidade de corrigir erro antes de confirmar | Não medida; entrevista relata trabalho de conferência | Proposta: ao menos 80% das tentativas válidas concluídas sem ajuda, sem divergência financeira nos casos suportados | Após decisões críticas de parcelamento |
| MET-003 | Recebimento simulado correto | Observar escolha da parcela e conferência do saldo e da quitação | Não medida | Proposta: nenhuma baixa na venda/parcela errada e nenhuma duplicidade nas tarefas avaliadas | Avaliação do pagamento |
| MET-004 | Compreensão dos indicadores | Pedir explicação de saldo em aberto, atraso e recebido no mês, usando os registros sintéticos | Não medida | Proposta: ao menos 80% das respostas corretas segundo roteiro definido | Avaliação de Visão Geral e Relatórios |
| MET-005 | Navegação e reconhecimento dos limites | Percurso por teclado e pergunta sobre uso de dados reais e recarga | Não medida | Proposta: todos os participantes reconhecem a demonstração e a perda de alterações; nenhuma barreira impeditiva nas tarefas essenciais | Início e encerramento da sessão |

**Ambiente de avaliação definido pelo solicitante (PEN-013):** computador do solicitante,
Intel Core i7-1165G7, 16 GB RAM, placa gráfica informada como 128 MB e SSD de 954 GB.
Não foram inferidos modelo de GPU ou memória gráfica total. Windows 11 Home,
versão 10.0.26200/build 26200, observado por consulta local; Google Chrome, versão
a registrar na execução. Tela 1920×1080, escala Windows 125% (correção final do
solicitante), zoom Chrome 100%. Resolução física e escala não determinam o viewport
CSS útil: registrar suas dimensões reais na avaliação, sem equiparar este ambiente
aos testes Chromium em 1366×768/390×844 ou substituir CA-028. Trata-se de avaliação
do protótipo, não ambiente de produção; nenhuma medição ou homologação nova foi feita.

**Participantes previstos:** solicitante e equipe da ótica, conforme FON-011.
Papéis específicos, quantidade, disponibilidade, consentimento e autoridade de aceite
permanecem indefinidos em PEN-014. MET-001 a MET-005 e a meta de 300 ms/15 vendas
de HIP-006 foram mantidas para discussão pelo solicitante, não aprovadas ou medidas.
Não apresentar avaliações com amostra pequena como prova estatística; registrar
tentativas, participantes e contexto junto dos percentuais.

**Roteiro proposto:** explicar que nada é real; localizar uma venda entre nomes semelhantes; cadastrar venda simples sem entrada; corrigir campo inválido e cancelar uma edição; conferir prévia com entrada sem alegar recebimento; registrar pagamento integral de parcela elegível; conferir migração para Quitadas; interpretar resumos; navegar por teclado; recarregar e explicar o descarte. Casos de borda só entram no roteiro conclusivo após as decisões correspondentes.

**Evidências:** notas de observação, tempos manuais sem meta inicial, pedidos de ajuda, erros de seleção, compreensão dos valores e comentários sobre comparação com a planilha, sem copiar dados pessoais. Respostas reconstruídas das entrevistas devem ser confirmadas com os participantes antes de servirem como evidência definitiva.

**Condição proposta para aceitar ou revisar:** primeiro eliminar falhas de integridade, identificação e barreiras de acesso; depois discutir metas de conclusão e compreensão com as partes interessadas. Falha nesses pontos exige revisão, não compensação por aparência. Aprovação formal, critérios finais e responsáveis permanecem em PEN-014.

## 13. Dependências, riscos e mitigação

| ID | Risco ou dependência | Impacto | Probabilidade ou incerteza | Mitigação | Responsável, se confirmado |
| --- | --- | --- | --- | --- | --- |
| RIS-001 | Implementar incorretamente entrada, centavos ou calendário | Prévia ou saldo incorreto, validação enganosa | Decisões registradas, sem implementação ou frequência medida | Testar RN-011/012/013 e CA-008/009 antes de expor os fluxos | Não confirmado |
| RIS-002 | Busca e classificação sem limites aprovados | Venda não encontrada ou vencimento classificado de forma indevida | PEN-004, PEN-005 e PEN-007 abertas | Registrar exemplos de borda e decisão antes do aceite conclusivo | Não confirmado |
| RIS-003 | Inferir problemas universais de entrevistas reconstruídas | Priorizar solução que não simplifica o trabalho | Limitação explícita das fontes | Confirmar relatos; comparar tarefas e observar cadastro e consulta separadamente | Não confirmado |
| RIS-004 | Confundir MVP com sistema operacional ou substituto da franquia | Uso de dados reais, perda de registros ou escopo excessivo | Não medida | Aviso persistente, dados sintéticos e exclusões explícitas; verificar compreensão | Não confirmado |
| RIS-005 | Edição ultrapassar os quatro campos autorizados | Histórico reescrito e divergência de saldos | Política definida, implementação futura | Testar RN-021 e CA-012 em vendas com/sem entrada, pagamentos e quitação | Não confirmado |
| RIS-006 | Divergência histórica sobre temas | Retrabalho visual e aprovação ambígua | Conciliação e evidências técnicas da FASE-003 | Preservar PRD/TDD/SDD e regressão de CA-023 nas próximas mudanças | Direção confirmada e implementada no recorte, sem aceite da ótica |
| RIS-007 | Protótipo mais trabalhoso que a planilha | Baixa aceitação e mais tempo de atendimento | Preocupação expressa em FON-004, sem medição | Observar tarefas reais representadas por dados sintéticos, não apenas preferência estética | Não confirmado |
| RIS-008 | Ambiente e estrutura incompletos interpretados como implementação | Planejamento baseado em entrega inexistente | Há pastas e saídas sem código verificável | Separar inspeção atual de planejamento; definir ambiente antes de implementar | Não confirmado |
| RIS-009 | Resumos fixos divergem das mutações locais | Demonstração perde credibilidade | Não medida | Fonte comum e comparação em centavos após cadastro, edição e pagamento | Não confirmado |
| RIS-010 | Entrada representada como parcela e somada novamente como valor separado | Total pago/recebimento mensal incorreto e baixa duplicada | Risco identificado na revisão 1.17, sem ocorrência alegada | Uma única origem contábil, reconciliação de CA-008/014/035 e rejeição de novo pagamento da entrada | Sem responsável confirmado |

## 14. Hipóteses, pendências e decisões necessárias

### Hipóteses propostas, não regras confirmadas

| ID | Hipótese | Impacto no produto | Como validar ou decidir | Situação |
| --- | --- | --- | --- | --- |
| HIP-001 | Permitir roteiro parcial com bloqueios para calendário, centavos ou entrada indefinidos | Hipótese histórica de redução do roteiro | Substituída pelas decisões RN-011/012/013; nunca foi aprovada | Superada na revisão 1.3 |
| HIP-002 | Até definir edição, não permitir alterações financeiras que reescrevam parcelas pagas; limitar correções ao que preserve histórico | Hipótese histórica, não aprovada no formato original | Substituída por RN-021: somente quatro campos do cliente, sem edição financeira em qualquer venda | Superada na revisão 1.8 por decisão explícita; não implementada |
| HIP-003 | Primeiro roteiro somente com uma parcela integral, sem entrada | Hipótese histórica; não fundamenta o fluxo atual | Substituída por RN-013/016: entrada permitida e, desde FON-016, novos pagamentos individuais em ordem; histórico em lote preservado | Superada na revisão 1.3; nunca aprovada no formato original |
| HIP-004 | Configurações explica limites da demonstração, sem controles fictícios | Mantém página navegável sem inventar configurações | Conteúdo confirmado para FASE-003; evidências anteriores em frontend/README.md | Aceita e implementada nesse recorte; sem aceite da ótica |
| HIP-005 | Usar o dia local da abertura como referência para sessão e dados sintéticos | Referência fixa durante a sessão, renovada ao recarregar | Confirmada pelo solicitante; RN-015 e CA-025 | Aceita na revisão 1.3; domínio não implementado |
| HIP-006 | Resposta local em até 300 ms com 15 vendas e metas de tarefas da seção 12 são adequadas para a avaliação inicial | Define critérios provisórios de desempenho e usabilidade | Negociar metas/método com participantes antes de medir; seed atual continua com 12 vendas | Mantida para discussão por FON-011; não aprovada nem medida |

### Pendências e conflitos

| ID | Dúvida ou conflito | Impacto no produto | Como validar ou decidir | Situação |
| --- | --- | --- | --- | --- |
| PEN-001 | Vencimento em mês sem o dia original | Calendário de parcelas | RN-011; último dia apenas no mês afetado | Resolvida para o MVP em 14/11/2026; não implementada |
| PEN-002 | Entrada em total pago, saldo e recebimentos | Cadastro e projeções | RN-013 revisada por FON-015: parcela 1 Paga, incluída em N, data da venda e forma obrigatória; sem dupla contagem | Redefinida para o MVP na revisão 1.17; implementação futura |
| PEN-003 | Distribuição de centavos | Soma exata do parcelamento | RN-012; resto nas primeiras parcelas | Resolvida para o MVP em 14/11/2026; não implementada |
| PEN-004 | Janela de sete dias e vencimento hoje | Classificação de parcelas | RN-014; hoje e +7 inclusivos, atraso somente antes de hoje | Resolvida para o MVP em 14/11/2026; não implementada |
| PEN-005 | Combinação, data e normalização da busca | Consulta nas duas coleções | RN-018/019 e CA-004/019/026, confirmados no Harness | Resolvida e implementada na FASE-005, PR #9; refinamentos no PR #10, sem aceite da ótica |
| PEN-006 | Divergência histórica claro versus dois temas | Direção visual e alternância | Claro/escuro, escuro inicial e memória; specs e evidências da FASE-003 | Resolvida com evidências técnicas anteriores, não aceite da ótica |
| PEN-007 | Situações gerais de vendas | Projeções | RN-014; Quitada, Atrasada, Próximos dias, Em aberto por prioridade | Resolvida para o MVP em 14/11/2026; não implementada |
| PEN-008 | Quais campos podem ser editados antes/depois de pagamentos e como tratar repercussões? | Delimita RF-006, sem edição financeira no MVP | RN-021 e CA-012; somente nome/CPF/telefone/descrição inclusive em quitadas; sem propagação | Resolvida por FON-011; núcleo e UI entregues na feature em 18/11/2026, aguardando revisão/merge; sem aceite da ótica |
| PEN-009 | Referência, períodos, universo dos resumos e efeito de filtros | Indicadores | RN-015 e CA-025; dia da abertura fixo, mês civil, cartões globais e cadastradas incluindo quitadas | Resolvida para o núcleo em 14/11/2026; controles de relatório na FASE-007 |
| PEN-010 | Validações de CPF/telefone e limites financeiros | Cadastro e envio inválido | RN-017/022/023 e CA-030; seed sintético compatível | Resolvida por FON-011; validações, seed e UI de cadastro/edição entregues na feature em 18/11/2026, aguardando revisão/merge; sem unicidade de CPF |
| PEN-011 | Pagamento integral, ordem, antecipação, datas e formas | Modelo de recebimento e saldo | RN-016 e CA-024: uma parcela por confirmação, primeira pendente antecipável, data entre venda e referência fixa, forma obrigatória; lote anterior superado para novos pagamentos | Decisão de produto resolvida por FON-016; implementação técnica em verificação, com zoom nativo e aceite da ótica pendentes |
| PEN-012 | Conteúdos em Configurações e filtros em Quitadas | Telas secundárias | HIP-004 entregue na FASE-003; RN-019 confirma apenas busca única em Quitadas, sem filtros extras | Resolvida no recorte do MVP; Configurações entregue na FASE-003 e consulta de Quitadas nos PRs #9/#10; outros controles fora do escopo |
| PEN-013 | Qual ambiente de avaliação, navegador e dimensões mínimas? | Compatibilidade e desempenho precisam de evidência | Máquina do solicitante, Windows/Chrome, 1920×1080, escala 125%, zoom 100%, seção 12; coletar versão Chrome e viewport CSS e executar roteiro | Parcialmente resolvida: ambiente definido, caracterização da execução e medições pendentes; sem mínimo universal homologado |
| PEN-014 | Quem participa, aprova e quais metas finais? Quais trechos reconstruídos serão confirmados? | Impede alegar validação ou aprovação formal | Solicitante e equipe previstos; definir papéis/autoridade, metas, quantidade/consentimento e confirmar reconstruções antes do aceite | Aberta; participação prevista confirmada, demais definições e avaliação pendentes |

**Decisões confirmadas e seus limites:** nome, quatro módulos, dados do cliente na venda, parcelas no detalhe e Quitadas interna vêm de FON-001; memória e arquitetura futura vêm de FON-002. FON-008 confirma RN-011 a RN-017 e HIP-005 para o MVP. A solicitação atual autoriza planejamento documental e OpenSpec, não apply, hipóteses remanescentes, aprovação da loja ou conclusão do desenvolvimento.

PEN-008/010 estão resolvidas como decisões; o núcleo e a UI da FASE-006 foram
implementados e verificados na feature em 18/11/2026, aguardando revisão e merge,
sem aceite da ótica. PEN-013 conserva a caracterização da execução/medições e
PEN-014 conserva autoridade, metas e validação abertas. PEN-005/012 seguem
resolvidas para a consulta entregue. Esta revisão 1.9 autoriza somente a consolidação
documental, a sincronização de specs e o arquivamento da FASE-006; não autoriza
merge, aceite nem início da FASE-007/008. Textos antigos de pendência de
edição/identificação ou de UI futura foram superados por FON-011 e pelo apply;
situações históricas do núcleo devem ser lidas com o estado vigente da seção 2.

## 15. Entregas e próximos passos

1. **PRD disponível para discussão:** este documento preenchido, com fontes, critérios e limites. Conclusão documental não equivale a aceite do produto.
2. **Decisões de produto registradas:** resolver conflitos e regras críticas com exemplos, incluindo calendário, entrada, centavos, busca, situações e edição; validar ou rejeitar hipóteses. Depende da equipe e do solicitante, sem responsáveis ou datas presumidos.
3. **PRD revisado e validado:** registrar decisões, preservar IDs, atualizar critérios condicionais e obter definição de aprovadores e metas. Alterações de README, entrevistas e OpenSpec exigem tarefa própria, não fazem parte desta entrega.
4. **Planejamento posterior de implementação:** somente mediante solicitação explícita, delimitar a mudança de frontend, ambiente, versões e sequência de entrega; não incluir infraestrutura futura por conveniência.
5. **Implementação e avaliação futuras:** mediante autorização, construir o MVP, executar verificações de código e interface e realizar sessões com dados sintéticos. Registrar resultados reais separadamente das metas propostas.

Na revisão inicial, este PRD foi uma entrega independente, sem alterações em código ou outros artefatos. A revisão 1.1 integra o planejamento da mudança `fase-003`, com atualização do TDD e criação de artefatos OpenSpec separadamente. Não instala dependências, não implementa o produto e não reexecuta testes de aplicação ou build. A validação documental da mudança será registrada em seus artefatos, sem extrapolar as evidências anteriores da base.

## 16. Glossário e histórico de revisões

| Termo | Definição neste documento |
| --- | --- |
| MVP visual / protótipo | Demonstração navegável para avaliar interface e fluxos, sem capacidade operacional de produção |
| Venda em aberto | Venda com valor ainda a liquidar; não significa necessariamente atraso |
| Quitada | Venda totalmente paga, consultada em página interna de Vendas |
| Parcela Paga | Parcela liquidada que permanece visível no detalhe da venda |
| Próximos dias | Parcela pendente com vencimento entre a referência e +7 dias, inclusive |
| Entrada | Primeira parcela paga na data da venda, incluída na quantidade total; reduz saldo futuro e compõe pago/recebimentos uma vez |
| Saldo devedor | Total da venda menos recebimentos aceitos (incluindo entrada uma vez), igual à soma das parcelas pendentes |
| Fonte demonstrativa | Dados sintéticos e operações locais compartilhados pelas telas, fora dos componentes de apresentação |
| Confirmado por fonte | Conteúdo documentado em referência local; não indica aprovação, teste ou implementação |
| Hipótese | Proposta necessária à discussão, ainda sem confirmação |
| Pendência | Questão que precisa de decisão antes de concluir o comportamento afetado |

| Versão | Data | Alteração | Motivo |
| --- | --- | --- | --- |
| 1.27 | 24/11/2026 | Harmonizar visualmente os controles de busca de Quitadas, Inativas e Prejuízo com Vendas abertas, sem filtros por situação | Solicitação explícita do usuário; FON-033/RF-017/CA-041 |
| 1.24 | 24/11/2026 | Confirmar consulta administrativa por coleções e rotas separadas: Ativas em Vendas, Inativas e Prejuízo em destinos próprios, sem seletor desses status na lista normal | Resposta explícita do solicitante no Harness durante a tarefa 4.2; esclarecimento registrado antes da integração final |
| 1.25 | 24/11/2026 | Dispor Quitadas, Inativas e Prejuízo em links laterais separados, um abaixo do outro, quando Vendas estiver ativo | Solicitação explícita posterior do usuário; FON-031/CA-039; sem alterar rotas, coleções ou status |
| 1.26 | 24/11/2026 | Refinar espaçamento dos links laterais e associar ícones decorativos distintos a Quitadas, Inativas e Prejuízo | Solicitação explícita posterior do usuário; FON-032/CA-040; sem alterar rotas, coleções ou status |
| 1.23 | 24/11/2026 | Definir ordenação de cliente A–Z, venda da mais antiga à mais recente e vencimento pendente do mais próximo ao mais distante, com ID crescente nos empates | Resposta explícita do solicitante no Harness; decisão integrada ao RF-014 antes da implementação da tarefa 4.1 |
| 1.22 | 24/11/2026 | Definir solicitação repetida do status atual como no-op idempotente | Esclarecimento explícito do solicitante no Harness; atualizar PRD antes de TDD e SDD, sem autorização de apply |
| 1.21 | 24/11/2026 | Especificar transições de status, incluindo reativação de Inativas e proibição de transição direta entre Inativo e Prejuízo; manter o rótulo “Recebimentos no mês” | Esclarecimentos explícitos do solicitante no Harness; atualização documental antes da revisão do TDD e do SDD, sem autorização de apply |
| 1.20 | 22/11/2026 | Atualizar o estado de execução técnica da Change de pagamento individual, mantendo requisitos e aceite da ótica separados | Evidências automatizadas registradas em `frontend/README.md`; zoom nativo 200% ainda pendente |
| 1.19 | 22/11/2026 | Pagamento individual na primeira pendente, valor automático, data fixa/editável e texto nas bloqueadas; revisão de JOR-004, RF-005/007, RN-016, CA-011/024 e PEN-011 | FON-016; autorização exclusivamente documental PRD → TDD → SDD, com revisão antes do apply e sem novos testes de aplicação |
| 1.17 | 21/11/2026 | Entrada como parcela 1 Paga, N incluindo entrada, saldo em N−1, mínimo 2 com entrada; RN-024 e CA-033/034/035 para seleção obrigatória e uniformização do seed; preservar IDs existentes | FON-015, nova change documental após merge do PR #20; sem implementação ou aceite da ótica |
| 1.10 | 20/11/2026 | Delimitar RF-009/010 e CA-014 para mês fixo e resumos de cinco, sem gráfico ou seletor; preservar IDs e pendências globais | Respostas explícitas no Harness ao propor fase-007; planejamento somente |
| 1.0 | 11/11/2026 | Criação do PRD com IDs iniciais, fontes locais, escopo, jornadas, requisitos, aceite, hipóteses e pendências | Atender à solicitação de transformar o README em documento de produto sem implementar código |
| 1.1 | 13/11/2026 | Conciliação de PEN-006, aceite delimitado de HIP-004/PEN-012, CA-023 e recorte da FASE-003; atualização do estado da base | Confirmações do solicitante na exploração e no planejamento; sem implementação ou aceite da ótica |
| 1.2 | 13/11/2026 | Identidade vermelha da lateral no claro e degradê vermelho/vinho no escuro, mantendo contraste e os demais limites | Pedido visual explícito durante o apply da fase-003; zoom nativo 200% permanece pendente e sem PR |
| 1.3 | 14/11/2026 | Conciliação do estado local da FASE-003; RN-011 a RN-017; revisão dos CA existentes e inclusão de CA-024/025; pagamento integral em lote sequencial; situação das pendências preservando IDs | Respostas explícitas no planejamento da fase-004; sem código, testes de aplicação ou aceite da ótica |
| 1.4 | 16/11/2026 | Adaptar somente o conjunto sintético nas extremidades de 0001–9999, preservando referência, 12 vendas e regras financeiras; exceção à variedade apenas quando impossível | Política e implementação autorizadas via Harness na fase-004; sem aceite de produto |
| 1.5 | 16/11/2026 | Registrar entrega/merge da FASE-004, resolver PEN-005/012 por RN-018/019 e CA-026; delimitar consultas da FASE-005 sem antecipar mutações | Respostas e autorização documental no Harness; não implementa consultas nem executa testes |
| 1.6 | 16/11/2026 | Indicadores exclusivos da Visão Geral; paginação obrigatória RN-020, faixa horizontal, detalhe compacto, fidelidade light/dark e links; CA-027/028/029; explicitar atraso no dia seguinte sem mudar a regra | Pedido documental e confirmações no Harness; sem implementação ou nova execução de testes |
| 1.7 | 17/11/2026 | Conciliar estado da FASE-005 e ajustes com PRs #9/#10/#11, specs sincronizadas e evidências anteriores; atualizar PEN-005/012 sem alterar requisitos ou IDs | Solicitação de fechamento documental; sem código, novas regras, reexecução de testes da aplicação ou aceite da ótica |
| 1.8 | 17/11/2026 | Resolver PEN-008/010 por RN-021/022/023 e CA-012/030; HIP-002 superada; definir ambiente com escala 125% e participação prevista; manter metas e aceite pendentes | Decisões e aprovação explícitas no Harness; somente PRD/TDD/README e planejamento OpenSpec no PR #13, sem implementação ou aceite da ótica |
| 1.9 | 18/11/2026 | Conciliar a FASE-006 implementada, sincronizar as cinco deltas nas specs principais, criar a capability `formularios-vendas` e arquivar a Change; atualizar PEN-008/010 e os limites de autorização | Solicitação explícita de atualização documental e arquivamento no Harness; sem alteração de requisitos/IDs, nova execução de testes, merge ou aceite da ótica |

**Refinamento da revisão 1.5 — 16/11/2026:** planejamento anterior da branch
`feature/fase-005` reutilizado por autorização explícita. Confirmados busca única,
filtro de situação somente nas abertas e recorte somente leitura com resumos globais.
O arquivamento da FASE-004 foi observado na branch `chore/arquivar-fase-004`, commit
`94559ed`, mas não consta na base desta feature/main inspecionada. Os registros de
PR #7 acima são evidências do planejamento anterior, não nova consulta ao GitHub.
Esta revisão não incorpora a branch de arquivamento, não altera código e não comprova
nova execução de testes ou aprovação do produto.
