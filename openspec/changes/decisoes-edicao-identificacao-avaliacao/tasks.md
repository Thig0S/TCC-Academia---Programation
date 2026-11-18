# Tasks

Planejamento aprovado originalmente para registro documental no PR #13. Apply
autorizado explicitamente no Harness em 18/11/2026. Escopo: preparação interna
de edição/identificação/seed da FASE-006, não toda a UI ou avaliação do produto.
As questões de avaliação em `design.md` não alteram esse recorte e continuam abertas.

## 1. Identificação e conjunto compatível

- [x] 1.1 Após novo pedido explícito de apply, conferir branch/diff e artefatos revisados; criar validadores puros compartilhados de CPF/telefone e integrá-los ao cadastro. Verificar com unitários CPF com/sem pontuação, verificadores, sequências repetidas, ausência/comprimento, telefone 10/11 com/sem formatação, rejeição de letras e +55, CPF repetido permitido e nenhuma consulta externa. Registrar comandos/resultados no README, sem inventar regras de DDD/prefixo ou alterar a busca parcial.
- [x] 1.2 Adequar seed e fixtures dependentes às novas validações, substituindo marcadores por números sintéticos compatíveis sem copiar dados reais ou garantir inexistência de titulares. Verificar 12 vendas, IDs/finanças preservados, determinismo, isolamento, datas extremas 0001–9999 e situações possíveis; ajustar asserções de busca e E2E afetadas, mantendo cobertura e cenários negativos explícitos. Documentar origem sintética e limitações no README, executar testes afetados/build/formatação e criar commit funcional coerente com 1.1, incluindo testes/docs/tarefas.

## 2. Edição interna exclusiva de cliente

- [x] 2.1 Criar contrato e preparação pura de edição restritos a ID e nome/CPF/telefone/descrição. Verificar com unitários vendas sem recebimentos/com entrada/parcialmente pagas/quitadas, CPF repetido, descrição opcional, identificação inválida e inexistência. Comparar profundamente todos os campos financeiros/temporais antes/depois e impedir alterações por parâmetros não autorizados; não regenerar parcelas ou usar CPF como chave. Documentar contrato e resultados incrementais.
- [x] 2.2 Integrar o comando de cliente à fonte raiz com revalidação, cópia defensiva e publicação atômica. Verificar com testes de serviço/integração leitura reativa de lista/detalhe/busca, isolamento entre vendas com mesmo CPF, resumo financeiro invariável, ausência/validação/falha sem publicação, nova tentativa e rascunho sem referência mutável. Manter UI somente leitura, sem controles fictícios. Registrar evidências no README, executar testes afetados/build/formatação e criar commit funcional com testes/docs/tarefas.

## 3. Regressão integrada e rastreabilidade

- [x] 3.1 Executar scripts existentes em `frontend/`: `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false`, `npm.cmd run test:e2e` e `npm.cmd run test:e2e:paginacao-fixture`. Usar servidores do runner, sem hooks de produção ou processos alheios. Verificar regressão de busca parcial/data, separação abertas/quitadas, IDs, paginação, detalhe, temas e restrições de UI; registrar ambiente/comandos/contagens/avisos reais no README sem atribuir evidências antigas às novas regras.
- [x] 3.2 Reconciliar PRD/TDD/deltas com os testes e resultados efetivos; executar na raiz `openspec validate decisoes-edicao-identificacao-avaliacao --strict` e `git diff --check`. Conferir que PEN-013/014 e HIP-006 não foram marcadas como avaliadas/aprovadas e que nenhuma UI de negócio, edição financeira ou avaliação foi antecipada. Atualizar tarefas somente com evidências e manter commits no escopo autorizado.

## Planning Evidence

- Reutilizada a branch do PR #13, limpa antes das edições. Aprovação explícita no
  Harness cobriu PRD, TDD, README e esta Change, após correção da escala para 125%.
- PRD 1.8 revisado antes de TDD 1.12/DEC-019; root local confirmado pelo CLI e
  scaffold criado por `openspec new change`, sem criação manual de metadados.
- Lidos requisitos e cenários integrais de `dominio-vendas`, `estado-demonstrativo`
  e `consulta-vendas`, fonte de validação/serviço/seed e testes relacionados. Deltas
  preservam cenários existentes e explicitam a troca futura dos marcadores.
- Design necessário por impacto transversal em comandos, seed e regressão. Nenhuma
  nova API de biblioteca ou versão foi proposta; nenhuma implementação foi executada.
- Validação documental: `openspec validate decisoes-edicao-identificacao-avaliacao --strict`
  passou; `openspec validate --all --strict` aprovou sete specs e esta Change.
  `status` confirmou 4/4 artefatos e `list --json`, 0/6 tarefas executadas.
  `git diff --check` passou com avisos LF/CRLF e `npm.cmd run format:check` em
  `frontend/` passou. Resultados e não executados em `frontend/README.md`.
  As seis tarefas acima continuam futuras, não comprovadas por planejamento completo.

## Implementation Evidence

- Apply solicitado explicitamente em 18/11/2026, após integração documental do
  PR #13 confirmada no GitHub. Feature criada da `main` limpa/alinhada a `origion/main`.
- `c4c5d77`: identificação compartilhada e seed/fixtures compatíveis; 241 testes,
  build, formatação, 36 E2E e 8 da fixture aprovados.
- `3d79868`: contrato/preparação/serviço de edição interna com testes puros, serviço
  e DOM reativo; 265 testes em 21 arquivos, build e formatação aprovados.
- `5a20428`: regressão final documentada e correção autorizada da sincronização
  do E2E. Trace confirmou preenchimento no campo de abertas antes da navegação;
  campo específico de Quitadas preserva asserções. 36 E2E da aplicação e 8 da
  fixture passaram na repetição, sem exceção aceita ou alteração de UI.
- Resultados incrementais, falhas encontradas/corrigidas, ambiente, avisos e
  verificações não executadas em `frontend/README.md`. PEN-013/014 e HIP-006 abertas.
- As deltas descrevem o recorte implementado e permanecem sem sync. A expressão
  “FASE-006” nelas inclui esta preparação, não conclusão de toda a UI da fase.
- PRD/TDD e os registros históricos desta Change conciliados com o apply, preservando
  IDs/regras e separando entrega interna de avaliação/UI futura. Validação estrita
  desta Change e `git diff --check` passaram (somente avisos LF/CRLF no diff).
  PR único de implementação a publicar após conclusão integral; merge não autorizado.

## Workflow follow-up — registro do planejamento original

- Atualizar o mesmo PR #13 com todo o escopo documental aprovado; não abrir PR
  separado nem confundir o PR documental com implementação das tarefas futuras.
- Novo pedido de apply é necessário para implementar; a forma de branch/PR dessa
  etapa depende do estado do PR #13 então. Merge requer autorização explícita.
- Não sincronizar ou arquivar esta Change de planejamento. Após implementação
  autorizada, regressão e revisão, avaliar sync/archive sem reaplicar Changes antigas.
- A UI da FASE-006 precisa de planejamento próprio com as regras já decididas.
  Avaliação exige coletar versão Chrome/viewport CSS e resolver os pontos abertos
  de PEN-014; não está entre as tarefas de implementação interna desta Change.
