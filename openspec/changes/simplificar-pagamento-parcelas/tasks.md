# Tasks

Planejamento baseado no PRD 1.19 e TDD 1.23/DEC-027. Produto confirmado;
desenho técnico proposto para revisão. A criação desta lista não é autorização de
implementação. Nenhuma tarefa foi executada nesta revisão documental.

## 1. Núcleo individual e compatibilidade histórica — FASE-014

- [ ] 1.1 Separar a preparação sintética de lotes históricos da criação de novos pagamentos, preservando a leitura de múltiplas alocações; verificar com testes que seed mantém 12 vendas, IDs, valores, datas/formas, ordem e vínculos de recebimentos, saldos e vencimentos nas mesmas referências comuns e extremas, sem dividir os lotes existentes (design D2; specs dominio-vendas e estado-demonstrativo; CA-014/024).
- [ ] 1.2 Adaptar contrato, validações, preparador e fonte para receber vendaId/parcelaId/data/forma, sem lista ou valor externo, derivar centavos canônicos e criar uma alocação; verificar testes de primeira pendente futura/atrasada, parcelas com centavos diferentes, paga/entrada, desconhecida/de outra venda, venda ausente e rejeição de comando legado/múltiplo ou malformado sem mutação (design D1; recebimentos-parcelas; CA-013/024).
- [ ] 1.3 Verificar atomicidade e revalidação no núcleo/fonte com testes de repetição e ID obsoleto sem deslocamento, falha de alocação e validação final por doubles tipados do preparador, nova tentativa e publicação única; comparar agregado/histórico/IDs/resumos antes e depois, inclusive pagamento individual após lote histórico e datas nas bordas/formas inválidas (design D1/D2/D5; CA-013/014/017/024).
- [ ] 1.4 Adaptar conversor de recebimento e rascunho para somente data/forma e ID capturado, com testes de data inicial/fixa, intervalo venda–referência inclusivo, data inexistente, forma vazia/desconhecida e inelegibilidade sem erros de quantidade/valor; registrar contrato/resultados reais em frontend/README.md. Verificar testes de rascunhos/núcleo e compilação dos consumidores; não finalizar commit com UI ou fixtures incompatíveis, integrar com grupo 2 quando necessário (design D3; CA-024/025).

## 2. Ação por parcela e modal acessível — FASE-015

- [ ] 2.1 Integrar coluna Ações no detalhe, Pagar apenas na primeira pendente por número, texto “Aguardando parcela anterior” nas posteriores, pagas sem ação e remoção do Receber geral; capturar ID/acionador e limpar modal ao mudar a rota. Verificar testes de componente com entrada, sem entrada, futura/atrasada, quitada e nomes acessíveis da venda/parcela, sem quantidade ou seleção de lote (design D3/D4; consulta-vendas; CA-024/028).
- [ ] 2.2 Simplificar modal para cliente/número/vencimento/valor não editável e data/forma, título Pagar parcela, confirmar/cancelar e aviso de demonstração/descarte; preservar submit, erro associado aos campos, mensagem de inelegibilidade, retry e proteção de envio. Verificar testes de componente de sucesso, data/forma inválidas, falha/exceção, repetição e alvo obsoleto sem mudar o alvo ou estado (design D3/D5; recebimentos-parcelas; CA-013/016/017/024).
- [ ] 2.3 Implementar e testar foco inicial na data, primeiro inválido ou mensagem focalizável, cancelamento/Escape para acionador, sucesso para próximo Pagar e quitação para título das parcelas com fallback pós-render; verificar no navegador Tab/Shift+Tab, inércia, ausência de abertura automática seguinte, cancelamento sem efeito e reabertura com novo rascunho nos dois temas (design D4/D5; CA-016/024).
- [ ] 2.4 Atualizar E2E dependentes do Receber/lote para confirmações individuais, preservando as demais asserções, e documentar o novo fluxo/evidências reais em frontend/README.md; verificar antecipação em sequência até quitação, parcelas desiguais, entrada sem nova ação, datas/formas distintas por pagamento, conciliação em abertas/quitadas/painel/relatórios, histórico em lote intacto e recarga descartando alterações (design D5; quatro deltas; CA-011/014/024/025).

## 3. Verificação integrada e fechamento — FASE-016

- [ ] 3.1 Executar regressão integrada do frontend: npm test -- --watch=false, npm run test:e2e, npm run test:e2e:paginacao-fixture, npm run build, npx ng run vendas-em-aberto:build-paginacao-fixture e npm run format:check; registrar comandos, resultados, avisos e limites reais em frontend/README.md, sem atualizar dependências, budgets ou enfraquecer asserções para passar (design D5/Migration Plan; RNF-005/008).
- [ ] 3.2 Verificar no navegador, em ambos os temas e viewports 1366×768/390×844, estilos 18 px/20 px/paddings, até dez parcelas sem rolagem da página no cenário desktop, excedente interno, textos extensos, coluna Ações, modal, contraste 4,5:1/3:1 e rolagem horizontal contida; registrar medidas/capturas e limites reais, sem ocultar dados/ações ou reduzir fonte (consulta-vendas e recebimentos-parcelas; CA-024/028).
- [ ] 3.3 Obter e registrar verificação manual de zoom nativo 200% do detalhe e novo modal, nos dois temas, com ambiente/configurações, teclado, foco, campos, mensagens, ações e histórico alcançáveis; distinguir relato do solicitante de reprodução independente e não reutilizar evidência antiga ou CSS zoom. Se não executada, manter esta tarefa pendente e informar o bloqueio (CA-024/028; RNF-007).
- [ ] 3.4 Conciliar PRD/TDD e tarefas com a implementação e evidências efetivamente realizadas, revisar todos os cenários das quatro deltas e executar openspec validate simplificar-pagamento-parcelas --strict; verificar diff restrito, referências válidas, nenhuma tarefa parcial marcada concluída e nenhuma alegação de aceite da ótica, testes não executados ou merge (design Migration Plan; rastreabilidade PRD → TDD → SDD).

## Workflow follow-up

- Fazer commits por funcionalidade coerente com seus testes/documentação/tarefas e mensagens em português no padrão do histórico; planejamento independente em commit próprio, sem incluir trabalho alheio.
- Publicar a branch e abrir um único PR para main somente após concluir todo o escopo e verificações aplicáveis, usando `.github/pull_request_template.md` e referências PRD/TDD/SDD; não abrir PR antecipado por planejamento ou funcionalidade parcial.
- Sincronizar/arquivar a Change no fluxo apropriado após implementação e revisão; não marcar archive como requisito de conclusão de uma tarefa pré-archive.
- Integrar somente com autorização explícita para merge e verificações/revisões exigidas; conferir PR e presença na main antes de declarar integração concluída.
