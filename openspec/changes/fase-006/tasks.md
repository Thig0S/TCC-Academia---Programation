# Tasks

Planejamento somente. Nenhuma tarefa abaixo foi executada ou autorizada por este
pedido de proposta. Revisar os quatro tipos de artefato antes de novo pedido de
apply. PRD 1.8 e TDD 1.12 reutilizados; referências específicas em proposal/design.
As questões de avaliação em design.md não mudam a UI planejada e permanecem abertas.

## 1. Dependência e fronteira dos formulários

- [x] 1.1 Após pedido explícito de apply, conferir branch/diff e revisão dos artefatos, adicionar somente `@angular/forms@22.2.6` ao manifesto/lockfile e verificar peers, exports e estabilidade das APIs Signal Forms previstas em D2. Comprovar instalação reprodutível, build e formatação; incompatibilidade material bloqueia a execução, sem atualizar outros patches ou substituir tecnologia. Registrar versões/resultados e limitações em `frontend/README.md` e criar commit de dependência coerente.
- [x] 1.2 Criar adaptadores puros de rascunhos/erros para cadastro, edição e recebimento, reaproveitando identificação, dinheiro, datas e formas existentes. Verificar com unitários reais vazio, CPF/telefone válidos/inválidos, CPF repetido, vírgula decimal, precisão/overflow, quantidade inteira, datas/entrada cruzadas e nenhuma publicação. Documentar contratos e resultados no README; incluir testes/docs no commit da funcionalidade correspondente.

## 2. Cadastro com prévia e confirmação

- [x] 2.1 Criar página standalone lazy de Nova venda, rascunho Signal Forms, campos/erros acessíveis, entrada condicional e prévia por preparação pura. Verificar com testes de componente data inicial pela referência fixa, descrição opcional, entrada ausente/presente, prévia R$ 100/3 em 31/01, atualização/invalidação, limites e ausência de mutação/consumo de ID antes de confirmar (CA-006/007/008/009/030). Registrar desenho efetivo e evidências no README.
- [x] 2.2 Integrar `/vendas/nova` antes da rota dinâmica e ação Nova venda funcional, inclusive coleção vazia. Implementar submit/Enter único, resultado de negócio, guarda contra duplicidade, sucesso para detalhe, cancelamento/abandono e foco de retorno de D1/D4. Verificar componentes/Router com erros retornados, exceção controlada, preservação do rascunho e nova tentativa sem publicação indevida (CA-016/017); manter aviso/temas e Visão Geral/Relatórios indisponíveis. Documentar comportamento e resultados no README.
- [x] 2.3 Criar E2E de cadastro pela UI com/sem entrada/descrição, erros por campo e foco, prévia, cancelamento e clique/Enter repetido; conferir exatamente uma venda aceita em lista/detalhe por navegação interna e descarte no reload (CA-006 a CA-009/021). Executar testes afetados, build e formatação, registrar comandos/contagens reais e consolidar cadastro com seus testes/docs/tarefas em commit funcional próprio, sem esperar recebimento.

## 3. Edição restrita de cliente

- [x] 3.1 Criar página lazy `/vendas/:id/editar` com cópia dos quatro campos, identificação compartilhada já consumida no cadastro e confirmação por `editarCliente`. Integrar Editar em abertas, quitadas e detalhe, com nome acessível contextualizado. Verificar componentes/Router para ID com barras, troca de ID, acesso direto/registro ausente, nenhum controle financeiro e nenhuma publicação ao digitar (CA-012/018/030). Registrar fluxos e resultados no README.
- [x] 3.2 Verificar envio inválido, cancelamento e foco de retorno, falha controlada/exceção e retry com rascunho preservado; testar vendas sem recebimentos, com entrada, parcialmente pagas e quitadas, comparando profundamente ID/datas/finanças/resumos e outra venda com mesmo CPF antes/depois. Confirmar reatividade de detalhe/lista/busca e ausência de propagação (CA-007/012/016/017). Incluir documentação e evidências no README.
- [x] 3.3 Criar E2E de edição de aberta e quitada, acesso pelas ações, correção de identificação, descrição opcional, cancelamento e retorno, ausência de edição financeira e consulta pelos novos dados sem perda da sessão. Executar testes afetados, build e formatação, registrar resultados e criar commit funcional da edição com seus testes/docs/tarefas.

## 4. Recebimento sequencial em modal acessível

- [x] 4.1 Implementar encapsulamento de dialog nativo efetivamente consumido pelo recebimento: título associado, showModal, cancel/close sem confirmação implícita, descarte no desmonte, foco inicial e restauração/fallback, temas e região rolável. Verificar ciclo de vida em componentes e modalidade, Tab/Shift+Tab, Escape, cancelamento e reabertura em browser real, sem atribuir top layer ao jsdom (CA-016; D5). Documentar contrato e resultados no README.
- [x] 4.2 Integrar Receber ao detalhe com pendências, rascunho com quantidade de prefixo, IDs capturados, parcelas/soma visíveis e valor/data/forma. Confirmar via comando existente uma vez, revalidar no estado atual, distinguir resultado e fechar somente após sucesso. Verificar componentes/serviço para sequência/antecipação, soma exata, data/forma, seleção vazia/obsoleta, repetição, falha/exceção e retry, sem mutação parcial nem deslocamento automático da seleção (CA-007/013/017/024). Registrar evidências no README, sem recriar regras financeiras.
- [x] 4.3 Criar E2E de uma parcela e lote antecipado, divergência de valor/data/forma, botão Cancelar/Escape sem efeito, reabertura, envio repetido e quitação final. Conferir pago/saldo/histórico visíveis, retirada de abertas/inclusão única em Quitadas por navegação interna e ausência de Receber após quitação; comparar resumos internos em integração, sem criar cartões (CA-011/013/014/016/024). Verificar foco após quitação e cancelamento nos dois temas/viewports, executar testes afetados/build/formatação e criar commit funcional com testes/docs/tarefas.

## 5. Compatibilidade das consultas e acessibilidade dos fluxos

- [x] 5.1 Ajustar somente as asserções históricas de ausência de Nova venda/Editar/Receber nos testes de conteúdo, listas, detalhe, integração e E2E. Manter ausência de exportação, indicadores nas listas e ações comerciais de Visão Geral/Relatórios. Executar regressão de busca parcial/data, filtros, IDs opacos e paginação, incluindo limite/reset e redução da coleção após quitação em teste apropriado, sem mudar seed de 12 vendas ou expor hooks de produção (CA-018/019/021/027). Registrar resultados incrementais no README e incluir testes/docs no commit afetado.
- [ ] 5.2 Verificar manualmente e com geometria/capturas os dois temas em 1366×768 e 390×844: consultas ainda compactas com dez linhas/dez parcelas no cenário padrão, novas ações alcançáveis, prévia/modal/textos extensos roláveis, erros e foco/contraste. Executar zoom nativo 200% real, sem substituí-lo por CSS zoom; registrar ambiente, método, resultados e qualquer bloqueio no README (CA-028; RNF-002/003/007/009). Corrigir somente regressões do escopo e commitar com seus testes/docs; evidência pendente impede declarar conclusão desse critério.

## 6. Regressão integrada e rastreabilidade da entrega

- [ ] 6.1 Executar em `frontend/` os scripts `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false`, `npm.cmd run test:e2e` e `npm.cmd run test:e2e:paginacao-fixture`, com servidores do runner e sem encerrar processos alheios. Registrar comandos, ambiente, contagens, avisos/falhas reais e ausência de console inesperado no README. Confirmar que nenhum fluxo usa storage, serviços de dados, exportação ou dados reais; regressão final complementa os testes incrementais, não os substitui.
- [ ] 6.2 Conciliar acompanhamento de implementação no PRD/TDD/README e tarefas com os resultados reais; não alterar requisitos/IDs, nem marcar avaliação PEN-013/014/HIP-006 como concluída. Executar `openspec validate fase-006 --strict`, `openspec validate --all --strict` e `git diff --check`, revisar deltas contra specs vigentes e confirmar todo o escopo desta Change entregue antes de preparar PR. Registrar evidências e verificações não executadas e criar commit documental próprio quando independente das funcionalidades.

## Planning Evidence

- Em 18/11/2026, root local resolvido por `openspec context --json` e `list --json`.
  Branch anterior limpa; PR #14 confirmado integrado em `9fdd455`. Criada
  `feature/fase-006` da `origion/main` atualizada e scaffold via CLI.
- Lidos PRD, TDD, specs integrais de consulta/estado/navegação/domínio/recebimento,
  comandos/validadores, modelos, rotas, listas/detalhe, manifesto e testes próximos.
  Reutilização dos requisitos e decisões existentes precedeu elaboração do SDD.
- Context7 consultado sobre Signal Forms, validação e submit; consulta npm confirmou
  peers de `@angular/forms@22.2.6`. Não houve instalação ou alteração do lockfile.
- As tarefas são futuras. Não executados build, testes da aplicação, inspeção visual,
  zoom ou avaliação do produto nesta etapa. Validação documental não é implementação.

## Workflow follow-up

- Revisar artefatos nesta branch/conversa; aguardar pedido explícito de apply.
- No apply, manter commits individuais por funcionalidade com testes/docs/tarefas
  correspondentes, prefixo de tipo e descrição em português; não acumular entregas
  independentes em commit final nem incluir alterações alheias.
- Somente após toda a Change implementada/verificada, publicar um único PR da mesma
  branch para main com `.github/pull_request_template.md`, referências PRD/TDD/SDD,
  verificações executadas/não executadas e limitações. Planejamento não abre PR.
- Sync/archive devem ser tratados em etapa própria após implementação e revisão,
  sem arquivar esta proposta pronta como se fosse entregue. Merge exige autorização
  explícita; conferir estado do PR e presença na main antes de alegar integração.
- A FASE-007 e a avaliação global da FASE-008 permanecem mudanças posteriores.
