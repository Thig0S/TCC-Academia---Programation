# Tasks

Base: PRD/FON-017/RF-013–016/RN-025–026/CA-036–038, TDD/DEC-028, `proposal.md`, seis deltas e `design.md`. **Planejamento apenas**: nenhuma caixa marcada representa implementação autorizada. Ordem das funcionalidades e respectivos testes/documentação antes da regressão integrada.

## 1. Status administrativo e universos

- [ ] 1.1 Adicionar status Ativo inicial à venda canônica e permitir somente Ativo→Inativo, Ativo→Prejuízo com saldo aberto, Inativo→Ativo e Prejuízo→Ativo; rejeitar transição direta entre Inativo e Prejuízo e tratar status repetido como no-op idempotente. Testar venda quitada inelegível a Prejuízo, caminhos inválidos, repetição, ausência, falha e preservação de parcelas/recebimentos (D1; CA-036).
- [ ] 1.2 Separar projeções de Ativas abertas/quitadas, Inativas e Prejuízo e manter recebimentos históricos de qualquer status nos períodos; testar indicadores/saldos/atrasos/contagens antes e depois de cada transição, incluindo reativação de Inativa e Prejuízo, sem duplicar recebimentos, e documentar a reconciliação observada (D1/D4; CA-036/038).
- [ ] 1.3 Adicionar status e ações permitidas de marcar/inativar/reativar/reabrir no detalhe e acesso às seções/filtro de Inativas e Prejuízo; testar navegação por ID, coleções exclusivas, ausência de transições diretas não permitidas, confirmações, foco, vazio e retorno à coleção Ativa correspondente ao saldo nos dois temas (D1/D5; CA-036).

## 2. Pagamento manual e acréscimo

- [ ] 2.1 Preservar valor-base e registrar montante efetivo, acréscimo e nota em novos recebimentos individuais; diferenciar origem individual de entrada/lote histórico e testar seed, centavos/overflow, alocação, total efetivo − recebido = saldo-base e ausência de crédito residual (D2/D3; CA-037).
- [ ] 2.2 Estender comando e modal para valor manual >= base e observação opcional <= 20 caracteres, mantendo data/forma, ordem e atomicidade; testar valores iguais/acima/abaixo do base, nota, falhas, repetição, antecipação, foco e mensagem “Checar juros do Crediloja!” somente em parcela atrasada (D2/D5; CA-037).
- [ ] 2.3 Registrar comportamento, limitações e evidências reais da baixa alterada em `frontend/README.md`; verificar concordância com PRD/TDD/SDD e testes do grupo, sem declarar juros calculados ou aceite operacional.

## 3. Correção de pagamento individual

- [ ] 3.1 Implementar correção por ID do mesmo recebimento individual para valor >= base, data válida, forma aceita e nota <= 20, sem alterar entrada/lote; testar substituição sem ID novo, mudança de mês, saldo/base, duplicidade, obsolescência, falha e retry (D3; CA-037).
- [ ] 3.2 Expor edição apenas na parcela paga elegível com valores atuais e confirmação/cancelamento; testar foco/Escape, erros associados, limite de nota, venda/recebimento não elegível, acessibilidade e conciliação com Relatórios nos dois temas (D3/D5; CA-037).
- [ ] 3.3 Atualizar documentação de correção e histórico em `frontend/README.md` com resultados efetivos dos testes do grupo, sem descrever lote ou entrada como editáveis.

## 4. Ordenação e consulta

- [ ] 4.1 Ordenar Vendas por cliente, data da venda e primeiro vencimento pendente após busca/filtros e antes de paginar; testar empates por ID, vencimento ausente, mudança de critério para página 1, coleção reduzida e dez itens por página (D4; CA-038).
- [ ] 4.2 Integrar controles de ordenação e filtro administrativo sem duplicar Prejuízo na listagem normal; testar teclado, estados vazios, responsividade e registro de resultados em `frontend/README.md` (D1/D5; CA-036/038).

## 5. Relatórios de cobrança e Prejuízo

- [ ] 5.1 Separar recebimentos mensais de todos os status e vendas/saldos/atrasos de Ativas; projetar primeiro vencimento, ordenar vencidas e grid de Prejuízo com soma só de contratos sem pagamento; testar entrada, pagamento parcial anterior de contrato, inativação/reativação e demais mudanças de status/data, valores efetivos e totais sem dupla contagem (D4; CA-037/038).
- [ ] 5.2 Atualizar títulos, CPF/telefone, data do primeiro vencimento, ordem das linhas, link por ID e grid de Prejuízo com indicação de itens não somados; testar vazios, identificação, acessibilidade, rolagem localizada, dois temas e viewports, documentando observações em `frontend/README.md` (D4/D5; CA-038). Não antecipar cartões, gráficos ou resumos da Change posterior `dashboard-relatorios`.

## 6. Verificação integrada e fechamento da Change

- [ ] 6.1 Executar regressão unitária/componentes, E2E da aplicação e fixture de paginação, builds, formatação e `openspec validate feedback-luighi --strict`; registrar comandos, resultados e limitações reais, inclusive casos de referência de calendário/centavos e sessão recriada (CA-036–038).
- [ ] 6.2 Conferir fluxos combinados de status, pagamento com acréscimo, edição, filtros, relatórios e indicadores em 1366×768/390×844, dois temas e zoom nativo 200% quando efetivamente verificável; registrar evidências/falhas sem reaproveitar como nova evidência relato de outra Change.
- [ ] 6.3 Conciliar PRD/TDD/SDD, tarefas e `frontend/README.md` apenas com implementações/verificações reais; conferir diff restrito e critérios CA-036–038, sem alegar homologação, aprovação da ótica ou merge.

## Workflow follow-up

- Fazer commits coerentes por funcionalidade com testes/documentação próprios; não incluir alterações alheias.
- Abrir um único PR para main com `.github/pull_request_template.md` somente após todos os itens autorizados e verificações aplicáveis; nenhum PR antecipado por apenas planejamento.
- Sincronizar/arquivar a Change no fluxo apropriado após implementação e revisão; merge somente com autorização explícita e verificações exigidas pelo repositório.
