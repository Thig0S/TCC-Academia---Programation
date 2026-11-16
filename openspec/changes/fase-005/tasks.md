# Tasks

Planejamento autorizado em 16/11/2026, não implementação. Todas as tarefas abaixo
estão pendentes; nenhum resultado de teste da FASE-004 conta como execução da 005.
Base: PRD 1.5, TDD 1.9/DEC-017, `proposal.md`, `design.md` e as três deltas.
Revisar os artefatos e aguardar novo pedido de apply antes de iniciar código.

## 1. Pesquisa pura sobre coleções readonly

- [x] 1.1 No apply autorizado, revalidar `feature/fase-005`, diretório e base, PRD/TDD/SDD revisados e versões fixadas; conferir por `git status`, histórico e manifesto que nenhum trabalho alheio será incluído, sem alterar dependências ou o núcleo financeiro.
- [x] 1.2 Criar `venda.busca.ts` e seus testes puros segundo RN-018/019: trim externo, nome parcial sem acento/caixa, identificação textual sintética e substring numérica ignorando pontuação usual; filtro opcional Todas/Em aberto/Próximos dias/Atrasada combinado por E. Verificar casos positivos/negativos, cada situação com/sem termo, Todas versus Em aberto, termo vazio preservando situação, pontuação sem dígitos, termo misto, restrição à coleção fornecida, ordem e ausência de mutação por testes unitários.
- [x] 1.3 Implementar precedência exclusiva de data completa DD/MM/AAAA, convertendo/validando com o utilitário civil existente; verificar data exata da venda versus vencimento/recebimento, data parcial, 31/02, 1900/2000, ano zero e extremos 0001/9999, sem fallback numérico ou exceção escapando. Registrar contrato e resultados reais em `frontend/README.md`; executar formatação, build e suíte unitária/componentes existentes e criar commit coerente de busca com testes, docs e tarefas somente após aprovação das verificações.

## 2. Detalhe de venda e navegação por ID completo

- [x] 2.1 Criar página standalone de detalhe somente leitura, template separado e selo textual compartilhado consumido pelas parcelas; ler `consultarVenda(id)` e referência da fonte raiz. Verificar com TestBed identificação correta entre nomes semelhantes, BRL/data civil, saldo/pago/situação, parcela paga/pendente e ausência de mutação, conforme CA-010/020/026.
- [x] 2.2 Mostrar entrada separada com valor/data/forma ou Sem entrada, descrição somente quando presente e todas as parcelas com número/total, valor, vencimento, situação e data/forma ou ausência explícita; testar com e sem entrada/descrição e venda quitada, reconciliando centavos e quantidade paga sem contar entrada como parcela.
- [x] 2.3 Registrar `/vendas/:id` depois das rotas estáticas e antes do wildcard, observar `paramMap` reativamente e usar serialização do Router para ID opaco; verificar por RouterTestingHarness round-trip de `seed/venda/1` e ID de sessão, A→B→inexistente na mesma instância, prioridade de Quitadas e ausência distinta de rota desconhecida. Não concatenar URL, mudar IDs ou codificar duas vezes.
- [x] 2.4 Preservar contexto ativo, título e foco pós-navegação de App e adicionar retornos explícitos a Vendas/Quitadas sem depender de histórico; testar venda ausente e acesso direto, nomes acessíveis dos links e inexistência de ações cadastrar/editar/pagar. Acrescentar E2E de detalhe direto/recarga/retorno nos dois viewports, conferindo dados pela UI sem hooks globais ou chamadas ao serviço pelo browser.
- [x] 2.5 Registrar decisões, comandos, resultados e limites reais de detalhe/rotas em `frontend/README.md`; executar formatação, build, unitários/componentes e E2E aplicáveis. Revisar escopo e criar commit individual do detalhe/rotas com seus testes/docs/tarefas; não declarar aprovação de navegação sem round-trip comprovado nem antecipar UI de recebimento.

## 3. Listas, busca visível e cartões globais

- [ ] 3.1 Evoluir Vendas e Quitadas consumindo `abertas()`/`quitadas()` e tabela específica compartilhada, com colunas da spec e links por nome/Visualizar para o ID completo; testar coleções separadas, dados/quantidades/situações, nulos de quitadas, identidade de homônimos e links funcionais para detalhe, sem providers por página nem números fixos.
- [ ] 3.2 Vincular input nativo de busca por página e select de situação somente nas abertas a signals/computed e à função pura, com rótulos, orientação de data e contagem anunciável; Limpar pesquisa remove só termo e Limpar critérios restaura termo vazio/Todas, ambos focando busca. Testar por eventos reais e `whenStable` os quatro dados, todas as situações e interseções com nome/dígitos/data, resultado vazio, limpezas isolada/completa, restrição à coleção e nenhum deslocamento de foco ao digitar/selecionar; Quitadas sem filtro extra, sem pacote Forms, debounce ou intervalos.
- [ ] 3.3 Exibir referência nas duas listas e os quatro cartões somente em Vendas, lendo `resumo()` global; testar busca/situação e combinação com um/zero resultados sem alterar cartões, cadastradas incluindo quitadas, vazio zero, formatação BRL/data e referência fixa, reconciliando com a fonte em centavos. Distinguir coleção fonte vazia e busca/filtro sem resultado usando doubles exclusivamente de teste, sem controles de esvaziar seed em produção.
- [ ] 3.4 Migrar `conteudo.spec.ts` e o E2E inicial somente nas asserções de indisponibilidade de Vendas/Quitadas; acrescentar E2E de consulta com nome, CPF/telefone sintéticos e data obtida na UI, filtro de situação E busca, limpezas isolada/completa e abertura da venda correta pelos dois acessos. Verificar que Quitadas não tem filtro adicional, Visão Geral/Relatórios continuam indisponíveis e Configurações, aviso e ausência de ações fictícias/rede externa/storage continuam cobertos.
- [ ] 3.5 Registrar no README do frontend o recorte e resultados reais das listas/cartões/busca; executar formatação, build, unitários/componentes e E2E nos dois viewports, revisar o diff e criar commit individual da funcionalidade com testes/docs/tarefas, sem incluir mutações, dependências, seed ou regras financeiras alteradas.

## 4. Acessibilidade e leitura das consultas

- [ ] 4.1 Consolidar SCSS pontual e tokens existentes em tabelas, selos, cartões e campo de busca, sem redesenhar lateral/logo ou adicionar plugins; testar cabeçalhos/caption, nomes acessíveis, resultados anunciáveis e leitura de situações além de cor. Medir contraste efetivo de todos os estados em ambos os temas (4,5:1 texto comum; 3:1 texto grande/foco/controles essenciais) por E2E/inspeção registrada, sem inferir contraste a partir de classe Bootstrap.
- [ ] 4.2 Verificar listas/detalhe/ausência em 1366×768 e 390×844, percurso por teclado, foco ao navegar/limpar, região de rolagem da tabela identificada e operável por teclado, Ações alcançáveis e ausência de rolagem horizontal do restante da página; realizar também zoom nativo 200% e movimento reduzido. Acrescentar regressões automatizadas aplicáveis e registrar evidência manual ou bloqueio, sem substituir zoom nativo por CSS zoom.
- [ ] 4.3 Documentar medições, ambiente, roteiro e limitações em `frontend/README.md`, executar formatação, build, unitários/componentes e E2E afetados e criar commit individual apenas das correções/testes/docs/tarefas desta revisão visual. Se não houver correções independentes, incorporar essas evidências ao commit funcional pertinente, sem criar arquivos ou mudanças artificiais.

## 5. Verificação integrada e conclusão da Change

- [ ] 5.1 Acrescentar teste de integração com referência explícita e comando interno aceito somente no TestBed: comprovar mesma fonte entre listas/detalhe, atualização reativa de quantidade/cartões/parcelas e passagem de aberta a quitada, sem detecção forçada; comparar snapshots antes/depois de pesquisar/limpar/navegar para provar ausência de mutação. Documentar a diferença entre teste interno e E2E sem pagamentos visíveis.
- [ ] 5.2 Reexecutar regressão integrada em `frontend/` com `npm.cmd ci`, `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false` e `npm.cmd run test:e2e`; registrar códigos de saída, contagens reais, ambiente, tamanho/budgets e warnings no README. Usar servidor próprio do runner e preservar processos alheios; não aprovar scripts, contornar peers, mudar budgets ou alegar resultados antigos como novos.
- [ ] 5.3 Revisar a matriz PRD → TDD → três deltas → testes: cenários de consulta/busca/filtro/limpezas, dois temas/viewports, URLs diretas/recarga, referência e ausência de APIs externas/storage/console inesperado cobertos; conferir ausência de cadastro/edição/pagamento/exportação visíveis e de alterações indevidas na Change 004. Verificar que a delta de estado substitui a restrição de UI após consolidação da 004, sem restaurá-la ao sincronizar. Registrar limites de CA, dependências de integração e avaliação da ótica; commitar testes/documentação integrados sem acumular funcionalidades independentes.
- [ ] 5.4 Executar `openspec validate fase-005 --strict` e `git diff --check` na raiz; revisar tarefas, artefatos, README e diff integral contra main para comprovar escopo completo, evidências reais e commits individuais. Somente após todos os critérios aplicáveis concluídos preparar o PR único com `.github/pull_request_template.md`, referenciando PRD/TDD/SDD; não abrir PR se houver tarefas, verificações ou bloqueios pendentes.

## Planning Evidence

### Revisão atual — reutilização autorizada em 16/11/2026

- Planejamento anterior localizado em `0a0b058`, branch `feature/fase-005`, após
  inspeção do histórico. Usuário autorizou reutilização/revisão em vez de duplicação.
  Diretório limpo antes da troca; main/origion/main alinhadas (0/0) em `1f184e3`
  após fetch. Branch de arquivamento da 004 preservada, sem incorporação.
- Confirmados via Harness: campo único, busca nas duas coleções, filtro de situação
  somente nas abertas combinado por E, resumos globais e recorte somente leitura.
  Revisões pontuais de PRD/TDD autorizadas e executadas antes das deltas. Cada
  revisão de artefato e a delta adicional foram confirmadas separadamente.
- Acrescentada delta `estado-demonstrativo` para evoluir a restrição de interface
  da 004, cujo requisito foi lido integralmente. Consolidação da 004 deve preceder
  sincronização da 005; não há autorização para executar integração/arquivamento aqui.
- Context7 consultado para Router/createUrlTree, paramMap/toSignal e computed;
  nenhuma API ou funcionalidade foi executada nesta revisão documental.
- `openspec validate fase-005 --strict`: saída 0, Change válida. O CLI informa
  que archive recusaria a delta de estado nesta base porque a spec principal ainda
  não existe; MODIFIED depende da consolidação prévia da 004. Não executado archive
  nem declarada validação de sincronização. `git diff --check`: saída 0, com avisos
  LF/CRLF nos documentos existentes. `openspec status --change fase-005`: quatro
  artefatos completos. Conferência documental: três capacidades e 0/20 tarefas
  implementadas. Nenhuma caixa marcada por planejamento pronto.
- Não executados nesta revisão: instalação, formatação do frontend, build, testes
  unitários/componentes/E2E, validação visual, desempenho, aceite de produto ou PR.
  Fonte, configurações, dependências e Change 004 permanecem intactas.

### Evidências do planejamento anterior (preservadas)

- Decisões do Harness: busca única e mesma semântica em Quitadas; autorização expressa
  para revisar PRD/TDD e criar os artefatos, encerrando antes de código.
- Branch inicial main limpa; `git fetch origion` e comparação main/origion/main 0/0;
  criada `feature/fase-005` antes das alterações. Base `1f184e3`, PR #7 já mesclado.
- Raiz local confirmada por `openspec context --json` e `openspec list --json`.
  Schema padrão spec-driven. Change criada pelo CLI, sem scaffolding manual.
- Fonte, seed, projeções, rotas, navegação e testes de indisponibilidade inspecionados;
  documentação Angular consultada via Context7 (TDD/FON-021). Nenhum código executado
  para comprovar APIs. Caminhos de saída conferidos dentro da Change, sem links de
  redirecionamento nos ancestrais existentes.
- `openspec validate fase-005 --strict`: saída 0, Change válida. `git diff --check`:
  saída 0, somente avisos de LF/CRLF nos documentos existentes. Revisão confirmou
  PRD → TDD → SDD, duas capacidades previstas, todos os artefatos e 0/20 tarefas
  implementadas. Nenhuma tarefa marcada pela presença de planejamento.
- Não executados: instalação, formatação do frontend, build, testes unitários,
  componentes/E2E, validação visual/manual, desempenho ou aceite da ótica. Nenhum
  código, manifesto, lockfile, spec principal ou artefato da fase-004 foi alterado.

## Workflow follow-up

- Apresentar todos os artefatos para revisão e aguardar novo pedido explícito
  `/opsx-apply fase-005`. Este planejamento não inicia implementação nem autoriza PR antecipado.
- Manter planejamento e funcionalidades na mesma feature branch, com commits em
  português por entrega coerente, incluindo testes/docs/tarefas e sem staging alheio.
- Usar um único PR ao concluir toda a Change; merge exige autorização explícita,
  revisão e verificações aplicáveis. Conferir integração na main antes de alegar entrega.
- Sync/arquivamento da fase-004 não faz parte deste escopo. Eventual conclusão de
  ambas deve consolidar primeiro a 004 e depois aplicar a delta de estado da 005,
  sem restaurar indisponibilidade nas consultas. Integrar o arquivamento existente
  somente em fluxo autorizado, sem absorver a branch alheia silenciosamente.
  Arquivar a 005 somente no fluxo solicitado após conclusão;
  confirmar specs consolidadas e arquivo sem confundir planejamento com implementação.
