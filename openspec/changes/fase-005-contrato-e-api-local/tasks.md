# Tasks

Base: PRD/FON-045/046/RF-031–036/CA-061–068 → TDD/DEC-041/API-01–05 →
proposal → specs api-local-vendas/casos-de-uso-vendas → design/D1–D6.

**Estado: implementação autorizada em andamento; tasks 1.1 a 2.2 implementadas e verificadas.**
Manter as tarefas restantes pendentes até execução e evidências. Usar a mesma branch
`feature/fase-005-contrato-e-api-local`, sem alterações diretas na main.

Cada funcionalidade deve incluir testes, documentação pertinente no `backend/README.md`,
atualização destas tarefas e commit próprio em português após verificações aplicáveis.
Não acumular endpoints independentes num commit final. Builds/testes sequenciais na
mesma saída; somente dados sintéticos/temporários próprios, sem encerrar processos
alheios. Testes que alterem variável de ambiente devem ser serializados e restaurá-la
em finally. Não iniciar dependente de decisão bloqueante ou mudar contrato para avançar.

## 1. API-01 — Contratos, composição e proteção técnica

- [x] 1.1 Implementar entradas/saídas HTTP comuns e binding seguro de DEC-041/8 e design/D2 em Api/Contratos, sem expor domínio/Result nem mudar tipos da Aplicacao. Testes unitários verificam campos obrigatórios versus default/null, camelCase, datas ISO exatas/extremos, centavos inteiros seguros, revisão string canônica acima de 2^53 até long.MaxValue e rejeição de tipo numérico/sinal/espaço/overflow, enums textuais conhecidos e IDs reservados sem trim ou dupla decodificação. Cobrir desconhecidas ignoradas sem edição extra, chaves conhecidas/query obrigatória duplicadas recusadas; não usar conversor global de long. Executar build/testes direcionados, documentar contrato e registrar commit próprio; DTOs/mappers específicos serão completados com cada endpoint.
- [x] 1.2 Implementar adaptador único de resultados/Problem Details e tratamento seguro de binding conforme DEC-035/041 e design/D4, incluindo BadHttpRequestException em .NET 10 sem transformar 400/415 em 500. Testes unitários e host de teste verificam 400/404/409/422/503, 401 técnico, 500 genérico/indeterminado, códigos/campos seguros, múltiplas validações coerentes e falhas mistas/desconhecidas, 405/413 quando aplicáveis, sem Result.Value em falha ou Reasons serializadas. Conferir status no corpo/header em Development/Production e ausência de eco de entrada/exceção; documentar tabela e limites no README e concluir commit próprio após testes/build.
- [x] 1.3 Compor Api → Infraestrutura, atualizar lockfile somente pelo grafo necessário e implementar bootstrap de design/D1: validar endpoints/porta/destino/segredo antes de I/O, chamar preparação explícita antes de Run e falhar seguro sem listener. Implementar fixture HTTP com banco/segredo sintéticos e adaptar HealthEndpointTests, FalhasTecnicasTests e RotasNaoImplementadasTests sem retirar cobertura. Unitários/integração e processo próprio comprovam caminho absoluto/pai existente, segredo Base64 de 32 bytes exclusivo do ambiente sem fallback CLI/appsettings, configuração inválida sem arquivo, pai ausente não criado, primeira inicialização vazia, repetição preservando revisão/dados e banco alheio/futuro recusado sem sobrescrita. Conferir novo grafo da API com EF/SQLite intencional, restore bloqueado/build/testes e documentação de execução sem valores sensíveis; concluir commit próprio.
- [x] 1.4 Implementar esquema Bearer opaco/autorizar grupo comercial e no-store conforme design/D3/D4, sem JWT/cookies/login/CORS. Testes HTTP com handler/contador de teste comprovam 401/challenge/corpo seguro para segredo ausente/incorreto/duplicado, autenticação antes de binding de JSON inválido, aceitação do segredo válido e recusa do anterior após troca; conferir comparação de bytes em tempo constante e ausência de credenciais em resposta/log. Manter health público 200 textual e rotas ausentes 404 sem redirects; incluir no-store em sucesso/falha/401 comercial. Documentar geração/configuração externa e limite de proteção local, executar testes/build e commit próprio.

## 2. API-02 — Visão Geral interna consolidada

- [x] 2.1 Implementar ConsultarVisaoGeral Query/Handler/DTOs protegidos em Aplicacao, usando uma carga com referência/destino/token e projeções vigentes, sem consulta por venda ou cálculo financeiro duplicado. UnitTests com fake contador e oráculos literais comprovam indicadores, resumos só Ativas, recentes incluindo quitadas, recebidos de todos os status, seleção/ordenação antes de limite cinco, empates por índices, hoje/+7/+8/ontem/pagas, vazio/blocos independentes e calendário 0001/9999; zero preparação/Save/IDs e saída realmente imutável. Documentar contrato e executar testes/build; fechar commit da funcionalidade junto de 2.2.
- [x] 2.2 Integrar painel via composição/ISender e SQLite real temporário, reabrindo em provider novo. Verificar mesmos IDs/revisão/referência em indicadores e itens, mais de cinco elegíveis, estado misto, entrada/lote/Individual únicos, efeitos de inativar/Prejuízo/reativar e resposta anterior preservada após alteração. Conferir CA-065 e delta de casos de uso sem alterar UI; registrar evidências por nível no README e concluir commit próprio do painel com 2.1/2.2.

## 3. API-03 — Consultas HTTP e mappers por funcionalidade

- [ ] 3.1 Expor GET /api/v1/vendas/detalhe com vendaId/referencia em query e mapper de todos os campos de resumo/cliente/parcelas/recebimentos/alocações. Testes HTTP/SQLite autenticados verificam dados literais após reabertura, ordens/nulabilidade/Unicode/IDs reservados, revisão textual, ID ausente 404 versus vazio inválido 400, ausência de referência e nenhuma escrita; registrar contrato/resultado no README e concluir commit próprio após testes/build.
- [ ] 3.2 Expor GET /api/v1/vendas com colecao/referencia e todas as quatro coleções textuais. Testes HTTP/SQLite com status mistos verificam lista completa em ordem, campos financeiros/cliente, revisão/referência, vazio 200, enum numérico/desconhecido/ausente recusado e zero mutação. Documentar que não há busca/paginação/ordenação configurável, executar testes/build e commit próprio.
- [ ] 3.3 Expor GET /api/v1/resumo com mapper dos quatro indicadores/revisão/referência. Testes HTTP/SQLite conferem Ativas quitadas na contagem, Inativas/Prejuízo fora da dívida operacional mas com seus recebimentos no mês, entrada única, zero/vazio e centavos extremos seguros sem gravação. Atualizar README com contrato/evidências, executar testes/build e commit próprio.
- [ ] 3.4 Expor GET /api/v1/periodo com inicio/fim/referencia. Testes HTTP/SQLite comprovam bordas inclusivas, vendas somente Ativas do intervalo em ordem, recebidos de todos os status pela data efetiva inclusive venda fora do intervalo, vazio 200 e intervalo invertido/data inválida 400 sem escrita. Documentar campos e exemplos sintéticos sem dados pessoais, executar testes/build e commit próprio.
- [ ] 3.5 Expor GET /api/v1/relatorios/mensal com ano/mes/referencia e mapper integral de todas as seções/linhas/totais/série. Testes HTTP/SQLite verificam cliente/vínculos, soma diária, entrada/lote/Individual corrigido entre meses, status mistos, prejuízo com IncluirNoTotal, ordenações, mês sem movimento mantendo posição e calendário extremo/bissexto; parâmetros inválidos/ausentes 400 sem gravação. Conferir campos individualmente contra DTOs baseline, documentar contrato/evidências, executar testes/build e commit próprio.
- [ ] 3.6 Expor GET /api/v1/visao-geral com referencia e envelope de DEC-041/8. Testes HTTP/SQLite e fake contador verificam quatro indicadores e três listas com dados identificáveis, referências/revisões aninhadas iguais, seleção estável/limites/bordas/vazio e uma carga sem escrita ou fan-out; comparar literalmente com as regras da spec visao-geral sem alterar frontend. Documentar contrato/evidências no README, executar testes/build e commit próprio.

## 4. API-04 — Comandos HTTP persistidos

- [ ] 4.1 Expor POST /api/v1/vendas mapeando somente campos de cadastro permitidos, retorno 201/detalhe e Location relativo de detalhe com query codificada e referência recebida. Testes HTTP/SQLite verificam cadastro 10.000/3 = 3.334/3.333/3.333, entrada 10.000 em total 20.000/2 sem dupla contagem, IDs gerados, revisão confirmada e consulta da Location após reinício; cliente/entrada/calendário/revisão inválidos não publicam candidato ou gravam. Documentar contrato/requisição sintética sem segredo fixo, executar testes/build e commit próprio.
- [ ] 4.2 Expor PUT /api/v1/vendas/cliente com vendaId e quatro campos cadastrais. Testes HTTP/SQLite verificam alteração isolada inclusive em quitada/Inativa/Prejuízo, CPF repetido sem propagação, financeiros extras ignorados, histórico preservado, no-op normalizado 200 sem avanço e revisão antiga 409 inclusive no no-op. Conferir erros por campo e reabertura; documentar evidências, executar testes/build e commit próprio.
- [ ] 4.3 Expor PUT /api/v1/vendas/status com novoStatus textual explícito. Testes HTTP/SQLite verificam matriz de transições vigente, saldo exigido para Prejuízo, mesmo status/no-op, enum inválido/numérico, revisão antiga e preservação do histórico; consultar painel/resumo após transição para conferir universos sem alterar recebidos. Registrar contrato/evidências, executar testes/build e commit próprio.
- [ ] 4.4 Expor POST /api/v1/recebimentos com IDs explícitos/valor/data/forma/observação, retorno 200 detalhe. Testes HTTP/SQLite cobrem primeira pendente inclusive futura, acréscimo, nota Unicode até 20 valores escalares, revisão confirmada/reabertura; recusar salto, repetição, valor inferior, data/forma/observação inválidas e venda não Ativa sem gravar ou deslocar alvo. Não fabricar Location de recurso não existente; documentar limites/protocolo sem retry, executar testes/build e commit próprio.
- [ ] 4.5 Expor PUT /api/v1/recebimentos com ID do recebimento e dados completos de correção. Testes HTTP/SQLite verificam preservação de ID/alocação/ordem, acréscimo corrigido e data movida entre meses, saldo-base das demais parcelas e reabertura; entrada/lote, venda não Ativa, ID ausente versus de outra venda e dados inválidos falham com status/código corretos. Correção idêntica confirma revisão +1 sem duplicação conforme contrato vigente; documentar, executar testes/build e commit próprio.

## 5. API-05 — Verificação transversal e fechamento do escopo

- [ ] 5.1 Completar testes HTTP de concorrência/cancelamento/confirmação incerta sem substituir os testes de cada operação. Dois clientes na mesma revisão com SQLite real confirmam no máximo um commit e reabrem o conjunto do vencedor; token observado antes de commit conserva protocolo e token tardio não reclassifica sucesso. Double controlado prova 500 confirmacao-indeterminada com resultadoOperacao indeterminado, sem revisão nova/sucesso/alegação de rollback, zero retry/recarga após commit; identificar limites de desconexão e distinguir doubles de falhas nativas. Documentar evidências reais, executar testes direcionados e commit próprio de testes transversais.
- [ ] 5.2 Auditar cobertura HTTP de todos os campos/rotas e segurança em Development/Production: 401 antes de binding, no-store, 400/404/409/422/415/503/500, erros mistos/desconhecidos, enums/datas/revisões/nulabilidade, CORS ausente, sem cookies/login/Swagger/rotas de teste. Capturar logs e respostas de falha com marcadores sintéticos de segredo/CPF/telefone/caminho/SQL/exceção e provar ausência, incluindo logging automático do framework; respostas de sucesso devem conservar os dados cadastrais previstos no contrato. Corrigir apenas falhas no escopo, registrar matriz e limitações no README, executar suíte dirigida e commit próprio se houver complemento transversal.
- [ ] 5.3 Executar sequencialmente restore bloqueado, build Release sem restore, suíte MSTest completa via dotnet test --solution VendasEmAberto.slnx -c Release --no-build, descoberta não vazia, format --verify-no-changes --no-restore e auditoria NuGet transitiva, com SDK compatível efetivamente identificado. Conferir grafo Api com Infraestrutura/EF/SQLite intencionais e domínio sem acoplamento HTTP. Executar frontend test/build com API desligada; se restauração necessária usar lockfile sem atualizar dependências nem encerrar servidores alheios. Registrar comandos/executáveis/saídas/contagens/códigos reais e não executados no README e tarefas, sem homologação operacional; commit documental de evidências.
- [ ] 5.4 Executar smoke da DLL Release em processo próprio com porta temporária livre, banco temporário e segredo novo no ambiente: preparação antes de servir, loopback, health textual público, 401 sem segredo, cadastro/Location/consulta, baixa, encerramento/reinício preservando registros e recusa de segredo anterior após troca; conferir processo encerrado/porta liberada e nenhuma saída sensível. Completar matriz CA-061–068 versus todos os cenários das deltas, atualizar PRD/TDD/tasks com resultados reais, executar openspec validate fase-005-contrato-e-api-local --strict e git diff --check e revisar diff contra main atualizada. Confirmar ausência de dados reais/bancos versionados, mudanças de schema/frontend/Tauri e manutenção de outras Changes; registrar verificações e limitações em commit documental, sem marcar tarefa parcial concluída.

## Acceptance Traceability

| Aceite PRD | Specs/contrato | Design | Tarefas |
| --- | --- | --- | --- |
| CA-061 | Inicialização explícita; isolamento do host revisado | D1/D6 | 1.3, 5.3–5.4 |
| CA-062 | Credencial; health/CORS | D3/D4 | 1.4, 5.2, 5.4 |
| CA-063 | Comandos; confirmação e revisão | D2/D4 | 4.1–4.5, 5.1 |
| CA-064 | Consultas completas; tipos | D2/D6 | 3.1–3.5, 5.2 |
| CA-065 | Painel consolidado; resumos estáveis | D5/D6 | 2.1–2.2, 3.6 |
| CA-066 | Concorrência e confirmação incerta | D4/D6 | 4.1–4.5, 5.1, 5.4 |
| CA-067 | Tipos exatos; binding sem efeitos | D2 | 1.1, 3.1–3.6, 5.2 |
| CA-068 | Falhas privadas; binding; cache | D3/D4/D6 | 1.2, 1.4, 5.1–5.2 |

## Planning Verification

Em 26/11/2026, `openspec validate fase-005-contrato-e-api-local --strict` passou e
o status identificou proposal, specs (duas deltas), design e tasks existentes.
`git diff --check` passou, com avisos somente de normalização LF/CRLF nos documentos.
Revisados PRD/TDD, dependências dos artefatos e rastreabilidade CA-061–068.
Esse resultado comprova somente planejamento: nenhuma das 21 tarefas foi executada,
e nenhum build, teste de aplicação, instalação ou smoke desta fase foi realizado.

## Workflow follow-up

- Artefatos prontos não significam implementação autorizada ou concluída. Aguardar novo pedido de apply, mantendo tarefas pendentes até evidências reais.
- Após implementar/verificar todo o escopo, sincronizar specs e arquivar automaticamente **esta** Change pelo fluxo OpenSpec, conferir metadata/deltas/specs e diretório arquivado. Não arquivar outras Changes.
- Publicar a mesma feature e abrir um único PR para main usando `.github/pull_request_template.md`, com PRD/TDD/SDD arquivado, escopo integral, verificações e limitações. Não abrir PR só porque o planejamento terminou.
- Revisão/aprovação exigidas e autorização explícita de merge continuam necessárias; após integração autorizada, conferir PR/main antes de informar conclusão do fluxo.
