# Tasks

Base reutilizada: PRD/RF-023/CA-046–048 → TDD/DEC-037 → `proposal.md` →
`specs/dominio-vendas/spec.md` → `design.md`/D1–D3. Não há decisões bloqueantes
conhecidas neste recorte. A implementação foi autorizada pelo pedido explícito
`opsx-apply corrigir-reconstrucao-entrada`; o estado de cada tarefa abaixo reflete
somente verificações efetivamente executadas.

Continuar na branch `feature/corrigir-reconstrucao-entrada`. A correção é uma única
funcionalidade: código, testes, catálogo, README e tarefas correspondentes devem
compor seu commit coerente após as verificações aplicáveis, com mensagem em português
no padrão `fix: ...`. Planejamento independente pode ter commit próprio. Executar
builds/testes sequencialmente na mesma saída; não alterar pacotes ou baseline.

## 1. Correção da reconstrução e regressões locais

- [x] 1.1 Em `backend/tests/VendasEmAberto.UnitTests/Dominio/Vendas/VendaReconstrucaoTests.cs`, criar a fixture de D2 e casos HIS-005/006 com alocações de 1, 9.999 e 10.001 para entrada de 10.000 centavos. Executar antes da correção e registrar a reprodução: as expectativas de falha devem encontrar sucesso indevido. Asserir categoria Validacao, código historico-invalido, campo recebimentos.alocacoes, ausência de venda na falha e preservação dos arrays de entrada; atualizar o catálogo com entradas/expectativas explícitas e o README com essa reprodução, sem usar resultado anterior como execução atual. Pré-correção reproduzida com SDK 10.0.404: os 3 testes negativos retornaram `Sucesso` e falharam ao esperar `Falha` (MTP exit 2); metadados da falha e preservação das entradas são verificados depois da correção na tarefa 1.2.
- [x] 1.2 Em `backend/src/VendasEmAberto.Dominio/Vendas/Venda.Reconstrucao.cs`, exigir no ramo Entrada igualdade entre alocação e recebimento, já igual à base, antes de materializar a alocação. Preservar helper comum, assinatura, erro existente e demais ramos. Verificar HIS-005/006 aprovados, mensagem pública pt-BR e ausência de normalização silenciosa; atualizar catálogo/README com o resultado real. Verificação direcionada: 3/3 novos casos aprovados; teste da classe `VendaReconstrucaoTests`: 11/11 aprovados, sem falhas/ignorados; o assert confere categoria, código, campo e mensagem pt-BR.
- [x] 1.3 Acrescentar HIS-007 na mesma suíte: após tentativa inválida, reconstruir entrada exata de 10.000 em venda-base de 20.000/2, projetar na referência 15/03/2027, aceitar em conjunto válido e consultar janeiro inclusivo. Asserir base/efetivo 20.000, recebido 10.000, saldo 10.000, 1/2 paga, entrada contada uma vez, IDs/origens preservados e conjunto anterior intacto. Executar novos testes e regressões existentes de reconstrução, projeção, conjunto, entrada/lote, Individual com acréscimo e cadastro sem entrada; registrar rastreabilidade HIS-005–007 e resultados no catálogo/README antes do commit único da correção. Verificação: `VendaReconstrucaoTests` aprovou 11/11; toda UnitTests aprovou 135/135 em Release, incluindo regressões de projeção, conjunto, cadastro e pagamento.

## 2. Verificação integrada e fechamento do escopo

- [x] 2.1 A partir de `backend/`, confirmar o SDK selecionado por `global.json` com `dotnet --info` e executar sequencialmente `dotnet restore VendasEmAberto.slnx --locked-mode`, `dotnet build VendasEmAberto.slnx -c Release --no-restore`, `dotnet test --solution VendasEmAberto.slnx -c Release --no-build` e `dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore`. Usar o SDK compatível documentado se o PATH não atender à baseline, sem mudar versões para contornar o ambiente. Confirmar suítes de domínio/técnicas não vazias e aprovadas; registrar comandos, versões, contagens, códigos de saída e limitações no README, sem fixar a contagem histórica como resultado esperado. Executado com SDK isolado 10.0.404/runtime 10.0.15: restore aprovado, build Release 0 avisos/erros, 143 testes aprovados (135 unitários + 8 integração), format integral aprovado após normalização limitada aos dois arquivos C# da Change; comandos e execução inicial/final de format documentados no README.
- [x] 2.2 Preservar CA-048: iniciar a DLL Release em processo real sem launch profile, conferir listener somente em loopback, `/health` 200/text/plain/Healthy e `/vendas` 404; encerrar somente o processo iniciado e verificar porta liberada. Com API desligada, executar em `frontend/` `npm.cmd test -- --watch=false` e `npm.cmd run build`. Registrar evidências novas no README e E2E/visual/zoom não executados por ausência de alteração de UI; não alegar homologação operacional. Smoke em porta 62421: listener somente em `127.0.0.1`, `/health` HTTP 200, `text/plain`, `Healthy`; `/vendas` HTTP 404; processo encerrado e porta liberada. Frontend: 33 arquivos/430 testes aprovados; build Angular passou, ambos exit code 0 com API desligada. E2E/visual/zoom não executados por não haver alteração de UI.
- [x] 2.3 Conferir rastreabilidade PRD/TDD reutilizados → delta → HIS-005–007 → MSTest/evidências e executar `openspec validate corrigir-reconstrucao-entrada --strict` e `git diff --check`. Revisar diff para confirmar mudança de produção restrita ao ramo Entrada, sem pacote, frontend, dado real ou sync/archive alheio; concluir as tarefas somente com evidência. Registrar o fechamento e as verificações não executadas no README e nesta Change, sem reabrir a fase 002. `openspec validate corrigir-reconstrucao-entrada --strict` aprovou; `git diff --check` aprovou sem erros (apenas avisos informativos de conversão LF→CRLF do Git). Revisão confirmou produção restrita à comparação no ramo Entrada, testes/catálogo/README e artefatos da própria Change; sem alteração de pacotes, frontend, dados reais, sync ou archive. README registra a rastreabilidade, resultados, limitações e E2E/visual/zoom não executados.

## Workflow follow-up

- Após novo pedido de apply, conclusão integral das tarefas e verificações, publicar
  a mesma feature branch e abrir um único PR para `main` com
  `.github/pull_request_template.md`, referências PRD/RF-023/CA-046–048,
  TDD/DEC-037 e esta Change, justificando a reutilização documental.
- Não abrir PR apenas pelo planejamento. Merge depende de revisão/aprovação exigida
  e autorização explícita; não fazer push direto na `main`.
- Sync/archive somente em etapa solicitada; não sincronizar ou arquivar outras
  Changes como parte desta correção.
