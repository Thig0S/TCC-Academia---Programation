# Tasks

Base: PRD/FON-043/044/RF-027–030/CA-054–060 → TDD/DEC-040 → `proposal.md` →
`specs/casos-de-uso-vendas/spec.md` → `design.md`/D1–D8 → APP-01–06.

**Estado: somente planejamento autorizado. Nenhuma tarefa executada; apply não autorizado.**
Após revisão e novo pedido explícito de apply, usar `feature/fase-004-aplicacao`.
Não confundir `status` de artefatos existentes com tarefas/implementação concluídas.

Cada funcionalidade deve ter testes unitários/integração pertinentes, documentação
no `backend/README.md`, atualização desta lista e commit próprio em português após
verificação. Não juntar casos de uso independentes num único commit por marco.
Planejamento tem commit separado; sem PR antecipado. Builds/testes sequenciais na
mesma saída; sem dados reais, serviços alheios encerrados ou alterações de outras
Changes. Se necessário, é permitido instalar somente o SDK 10.0.404 em
`%LOCALAPPDATA%\\Temp\\opencode\\dotnet-10.0.404` pela distribuição oficial, sem
alterar o pin nem a instalação global. Resolver bloqueio técnico antes de código dependente.

## 1. APP-01 — Dependências, contratos e composição interna

- [x] 1.1 Confirmar SDK/runtime/MSTest existentes; conferir metadados, licença, compatibilidade declarada, avisos de suporte e segurança de MediatR 12.5.0 Apache-2.0, FluentResults 4.0.0 MIT e referências Microsoft de DEC-040/D2. Adicionar somente dependências autorizadas aos projetos indicados, gerar lockfiles e comprovar restore inicial, restore bloqueado, build Release e auditoria transitiva sem risco relevante não tratado. Conferir grafo da API sem EF/SQLite e preservar referência somente a Aplicacao. Registrar versões/fontes/licenças/comandos/limitações no README em commit de dependências próprio; se houver incompatibilidade ou advisory relevante, parar e revisar TDD/SDD antes dos handlers, sem atualizar versão silenciosamente.
- [x] 1.2 Criar ErroAplicacao/categorias e conversores de domínio/armazenamento conforme DEC-040/Falhas e fronteiras; definir somente DTOs/enums/mapeadores compartilhados já necessários a cadastro/detalhe e IGeradorIdentificadores. MSTest em UnitTests/Aplicacao verifica todos os códigos conhecidos, categorias/campos/mensagens, código desconhecido como falha técnica, tratamento de Result falho sem acessar Value nem publicar candidato e ausência de HTTP/EF/raiz de domínio nas respostas. Testar centavos/DateOnly/nulabilidade/enums e coleções realmente protegidas, sem cálculo financeiro no mapper. Documentar contratos no README e executar testes direcionados/build antes do commit.
- [x] 1.3 Implementar destino imutável e composição pública AdicionarAplicacao/AdicionarPersistenciaSqlite, mantendo adaptador/contexto/modelos internos, Aplicacao sem referência a Infraestrutura e sem ampliar InternalsVisibleTo. Adicionar gerador GUID formato N e preparação técnica explícita conforme D3. Testes DI/SQLite comprovam resolução real de ISender/serviços, lifetimes sem snapshot/DbContext global, dois providers independentes, configuração vazia/relativa recusada sem I/O, composição/consulta de arquivo ausente sem criação e preparação repetida preservando revisão/dados. Provar que preparação é a única chamada de inicialização e documentar exemplo interno, limites e descarte no README; executar testes/build/formatação e commit próprio.

## 2. APP-02 — Primeiro fluxo persistido: cadastro e detalhe

- [ ] 2.1 Implementar CadastrarVenda Command/Handler/resposta conforme DEC-040 e D4/D5: validar entrada antes de listas de IDs, carregar com referência/token/destino, conferir revisão antes de gerar IDs, usar fábricas do domínio, acrescentar raiz, validar candidato inteiro, pré-mapear saída e salvar uma vez. UnitTests com gerador determinístico/fake comprovam 10.000/3 = 3.334/3.333/3.333, entrada 10.000 em base 20.000/2, IDs distintos, mesma referência/token, ordem, preservação das outras vendas e revisão confirmada. Cobrir identificação/dinheiro/entrada/quantidade/calendário inválidos, IDs colidentes e overflow global inclusive com vendas não Ativas, sem Save ou resposta candidata. Registrar evidências direcionadas no README; fechar commit da funcionalidade junto de 2.2.
- [ ] 2.2 Integrar cadastro por DI/ISender com SQLite real preparado em temporário e reabrir em provider novo. Comparar literalmente cliente, IDs/ordem, datas, base/pago/saldo, revisão e entrada única; incluir duas vendas com mesmo CPF e nulabilidade/Unicode. Comprovar recusa antes de preparar banco e nenhuma escrita parcial após falhas. Executar testes unitários/integração direcionados, documentar resultados/limites no README e concluir commit próprio do cadastro com 2.1/2.2 e suas tarefas.
- [ ] 2.3 Implementar ConsultarVenda Query/Handler/resposta completa, usando um snapshot e junção raiz/projeção por ID, sem cálculo duplicado. UnitTests e integração com reabertura verificam ID vazio/ausente, quatro campos do cliente, data, status, valores, parcelas/recebimentos/alocações/origens/ordem e revisão/referência; usar histórico sintético com entrada/lote/Individual e datas fora de ordem. Provar zero chamadas de preparar/Save/gerador, imutabilidade e resposta anterior preservada após operação posterior. Registrar evidências/contrato no README e commit próprio.

## 3. APP-03 — Cliente e situação administrativa

- [ ] 3.1 Implementar EditarClienteVenda com handler explícito e candidato completo. MSTest unitário e integração via ISender/reabertura verificam edição somente dos quatro campos em Ativa aberta/quitada, Inativa e Prejuízo, CPF repetido sem propagação e preservação integral de contrato/histórico/outras vendas. Testar cliente inválido, venda ausente e no-op por quatro campos normalizados idênticos sem Save/avanço de revisão; revisão obsoleta falha antes do no-op. Executar testes direcionados, documentar evidências/no-op no README e commit próprio.
- [ ] 3.2 Implementar AlterarStatusVenda com handler explícito. UnitTests e integração verificam matriz completa, Ativo→Prejuízo somente com saldo, retorno a Ativo, enum inválido, mesmo status sem Save, revisão obsoleta inclusive no no-op e preservação do histórico. Conferir efeitos nas projeções existentes sem adicionar Query nova neste item; no-op devolve revisão observada sem prometer reserva. Registrar comandos/resultados no README e commit próprio.

## 4. APP-04 — Baixa e correção individuais

- [ ] 4.1 Implementar RegistrarPagamento com VendaId/ParcelaId explícitos e gerador de novo recebimento. UnitTests e integração por ISender comprovam primeira pendente inclusive futura, acréscimo 1.000 em base 10.000 recebida por 11.000, saldo-base preservado, conjunto inteiro/uma gravação e reabertura fiel. Cobrir salto, parcela paga/desconhecida/de outra venda, venda ausente/não Ativa, valor abaixo da base, forma/data/nota inválidas e limite de 20 valores escalares Unicode; repetição com revisão antiga conflita e com revisão atual recusa sem deslocar alvo. Documentar protocolo/evidências e commit próprio.
- [ ] 4.2 Implementar CorrigirPagamento usando recebimento existente e todas as vendas conhecidas como contexto de localização, sem gerar IDs. UnitTests e integração comprovam 11.000→10.500 em base 10.000, acréscimo 500, data fevereiro→março, identidade/alocação/ordem e saldo das demais parcelas preservados; antecipar projeção antes de Save. Cobrir venda quitada Ativa, venda não Ativa, recebimento inexistente versus de outra venda, entrada/lote, dados inválidos e correção idêntica com uma gravação/revisão +1 sem duplicação. Conferir projeções do domínio e reabertura; documentar resultados e commit próprio.

## 5. APP-05 — Coleções, resumo e relatórios sem escrita

- [ ] 5.1 Implementar ConsultarColecaoVendas com enum de quatro coleções e resumos próprios. UnitTests e integração via ISender com status mistos verificam Abertas/Quitadas somente Ativas, Inativas e Prejuízo separados, todos os itens/ordem de origem, cliente, vazio e enum inválido. Fake comprova uma carga/mesma referência e revisão, zero Init/Save/geração de IDs; coleções são protegidas. Documentar contrato/evidências e commit próprio, sem busca/paginação/ordenação parametrizável.
- [ ] 5.2 Implementar ConsultarResumo usando Projetar e DTO próprio. UnitTests e integração verificam totais abertos/atrasados, recebidos no mês de todos os status, quantidade de Ativas incluindo quitadas, entrada/lote únicos, conjunto vazio/zero e valores extremos seguros. Comprovar snapshot único/revisão e nenhuma escrita, registrar evidências no README e commit próprio.
- [ ] 5.3 Implementar ConsultarPeriodo com início/fim inclusivos e Referencia explícita. Testes unitários/SQLite verificam Ativas abertas/quitadas em ordem, exclusão de vendas Inativas/Prejuízo e fora do intervalo, recebimentos de todos os status inclusive venda externa, duas bordas, vazio e intervalo invertido; usar oráculos literais independentes de contagens históricas. Comprovar mesma revisão/referência e nenhuma escrita; documentar evidências e commit próprio.
- [ ] 5.4 Implementar ConsultarRelatorioMensal(Ano,Mes,Referencia), validar ano/mês antes de DateOnly e mapear integralmente GerarRelatorioMensal. UnitTests e integração comprovam cinco seções/totais, clientes/vínculos, série diária completa/soma exata, entrada/lote/Individual, correção entre meses, todos os status, ordenações estáveis existentes e Prejuízo com/sem recebimentos e IncluirNoTotal. Cobrir mês vazio com posição não vazia, fevereiro bissexto, dezembro/janeiro e calendário 0001/9999, parâmetros inválidos, referência preservada, revisão do snapshot e zero escrita. Documentar resultados/limites e commit próprio.

## 6. APP-06 — Protocolo integrado, regressão e evidências finais

- [ ] 6.1 Completar matriz transversal de concorrência dos handlers (D5/D8/CA-058), sem adiar as verificações de revisão/no-op de cada funcionalidade: revisão negativa, obsoleta por alteração em outra venda, corrida depois da carga, conjunto completo e no máximo uma chamada Save. Usar barreira determinística em dois consumidores/providers e SQLite real para comprovar no máximo um commit e reabertura correspondente ao vencedor, sem retry; usar double de armazenamento delegante no teste se necessário para sincronizar a carga, sem gancho público de produção. Documentar método/evidências e commit próprio de testes.
- [ ] 6.2 Completar testes transversais de falhas/cancelamento: tokens prévios e antes de commit, token tardio após sucesso, código de confirmação indeterminada, demais falhas físicas e exceção inesperada/código desconhecido. Doubles provam encaminhamento dos argumentos, zero retry, ausência de leitura obrigatória após commit e falhas sem resposta candidata; manter regressão dos testes reais existentes de rollback/commit como prova do gravador, sem confundir double com falha nativa. Conferir mensagens/Reasons sem SQL/CPF/telefone/caminho e distinção banco ausente versus venda inexistente. Documentar evidências por nível e commit próprio.
- [ ] 6.3 Executar sequencialmente em backend, com SDK compatível efetivamente identificado: restore bloqueado, build Release sem restore, `dotnet test --solution VendasEmAberto.slnx -c Release --no-build`, descoberta não vazia e `dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore`; repetir auditoria de pacotes/transitivas e conferir grafo da API sem EF/SQLite. Registrar executável/versões/comandos/contagens/códigos de saída reais no README, sem fixar 205 como expectativa ou alegar teste VS Code não observado.
- [ ] 6.4 Executar smoke real da DLL Release em processo próprio sem banco: listener loopback, `/health` 200 text/plain Healthy, `/vendas` 404, nenhum arquivo criado/aberto pela composição técnica; encerrar somente esse processo e conferir porta liberada. Com API própria desligada, executar testes/build em frontend; se precisar restaurar dependências, usar apenas npm ci pelo lockfile, sem atualizar manifestos/lockfile ou encerrar servidores alheios. Registrar falhas/bloqueios/resultados reais no README; E2E/visual/zoom não aplicáveis sem UI alterada.
- [ ] 6.5 Auditar todos os requisitos/cenários da delta contra testes e CA-054–060, incluindo DTO completo/imutabilidade, ordens, revisões, no-ops e confirmação indeterminada. Registrar matriz final no README, atualizar PRD/TDD/Change com estado realmente aplicado e evidências preservando histórico. Executar `openspec validate fase-004-aplicacao --strict` e `git diff --check`, revisar diff integral contra main atualizada e confirmar ausência de dados reais/bancos, endpoints, integração Angular, migrations e manutenção de outras Changes. Consolidar evidências transversais em commit documental próprio, sem declarar homologação operacional.

## Acceptance Traceability

| Requisito da delta | Critérios PRD | Tarefas principais |
| --- | --- | --- |
| Destino configurado e preparação explícita | CA-059/060 | 1.3, 6.4 |
| Referência civil e identidade controladas | CA-054/056/057 | 1.2–1.3, 2.1–2.3, 4.1–4.2, 5.1–5.4 |
| Cadastro persistido sem publicação parcial | CA-054 | 2.1–2.2 |
| Alterações cadastrais e administrativas delimitadas | CA-055 | 3.1–3.2 |
| Recebimento e correção individuais persistidos | CA-056 | 4.1–4.2 |
| Revisão esperada e gravação única | CA-058 | 2.1–4.2, 6.1 |
| No-op sem avanço de revisão | CA-055/058 | 3.1–3.2, 4.2, 6.1 |
| Consultas completas sem mutação | CA-057 | 2.3, 5.1–5.2 |
| Períodos e relatório mensal reconciliáveis | CA-057 | 5.3–5.4 |
| Respostas próprias e protegidas | CA-054–057 | 1.2, 2.3, 5.1–5.4 |
| Falhas esperadas tipadas e seguras | CA-058 | 1.2, 2.1–5.4, 6.2 |
| Cancelamento e confirmação incerta preservados | CA-058 | 2.1–4.2, 6.2 |
| Isolamento do host e da demonstração | CA-059/060 | 1.1, 1.3, 6.3–6.5 |

## Planning Verification

Em 26/11/2026, `openspec validate fase-004-aplicacao --strict` passou após a criação
dos quatro tipos de artefatos. `git diff --check` passou; Git informou somente avisos
de normalização LF/CRLF nos documentos existentes. O diff rastreado contém apenas
inserções em PRD/TDD; os cinco arquivos novos pertencem somente a esta Change
(metadata, proposal, spec, design e tasks). Conferidos caminhos sem links de diretório.

Essa é verificação documental, não restore/build/testes/auditoria de dependências.
Não há implementação, pacote instalado, tarefa aplicada, archive ou PR desta fase.
As verificações executáveis permanecem integralmente pendentes nas tarefas acima.

## Workflow follow-up

- Agora: revisar os artefatos e aguardar novo pedido explícito de apply. Não instalar
  pacotes, executar tarefas ou abrir PR como efeito da aprovação do planejamento.
- Após apply integral e verificações aplicáveis, arquivar automaticamente **esta**
  Change conforme AGENTS.md e fluxo OpenSpec; conferir spec consolidada, arquivo de
  metadata e diretório arquivado. Não arquivar outras Changes como efeito colateral.
- Publicar a mesma feature branch e abrir um único PR para main com o template padrão,
  referências PRD/TDD/SDD arquivado, escopo completo, verificações e limitações reais.
  Nenhum PR por artefato, caso de uso ou commit isolado.
- Revisão/aprovação exigidas e autorização explícita de merge continuam necessárias;
  não fazer push direto na main. Após integração autorizada, conferir PR/main antes
  de informar conclusão do fluxo.
