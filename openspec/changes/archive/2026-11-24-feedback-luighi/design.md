# Design

## Context

Ver `proposal.md` e PRD/FON-017, TDD/DEC-028. O frontend usa Angular/Signals e `ServicoDemonstracao` com estado imutável em memória. `Venda.valorTotalCentavos` e `Parcela.valorCentavos` são valores-base; `PagamentoDemonstrativo` guarda valor, data, forma e alocações. `projetarVendas`, `resumirVendas` e `calcularRelatorio` derivam coleções e totais. A UI atual recebe uma parcela por vez com valor derivado e relatório já liga nome do cliente ao detalhe. Algumas specs principais ainda descrevem o fluxo histórico em lote: os deltas desta Change não são evidência de implementação nem de sync.

## Goals / Non-Goals

**Goals:** preservar valor-base e histórico, introduzir status administrativo sem afetar a situação financeira, manter recebimentos históricos reconciliáveis, permitir acréscimo manual e edição atômica de pagamento individual e separar perdas sem contagem indevida.

**Non-Goals:** persistência, juros calculados, integração Crediloja, pagamento parcial, crédito residual, estorno, exclusão definitiva, edição de entrada/lote histórico ou migração de dados reais.

## Decisions

### D1 — Status canônico separado do financeiro

Adicionar à venda status administrativo explícito (Ativo por padrão); situação Quitada/Atrasada/Próximos dias/Em aberto continua função pura das parcelas. A matriz permitida é Ativo→Inativo, Ativo→Prejuízo somente com saldo aberto, Inativo→Ativo e Prejuízo→Ativo; transição direta Inativo↔Prejuízo é rejeitada. Solicitar o status atual novamente é um no-op idempotente, sem nova mutação ou efeitos duplicados. Comandos de status validam ID, transições e saldo e publicam uma versão completa do estado somente quando houver mudança aceita. `abertas`/`quitadas` mostram só Ativas; Inativas e Prejuízo são consultadas em rotas/coleções dedicadas, sem seletor administrativo na lista normal. Detalhe continua endereçável por ID e expõe somente ações elegíveis. Preferir status em `Venda` a derivá-lo do atraso, porque marcar prejuízo é decisão humana; não reutilizar `SituacaoVenda` para dois conceitos. Não apagar registros ou efetuar baixa ao mudar status.

### D2 — Valores-base imutáveis e valores efetivos derivados

Manter total contratual e valor das parcelas originais como base. No recebimento individual registrar valor efetivo e nota; acréscimo = valor efetivo − base, validado em centavos seguros. O total efetivo exibido da venda é total-base + acréscimos acumulados; pago efetivo é soma de recebimentos; saldo = soma das parcelas-base pendentes = total efetivo − pago efetivo. Na alocação do pagamento individual, vincular integralmente o montante efetivo à parcela, preservando identidade; conferir base e diferença em projeções sem alterar vencimentos ou redistribuir parcelas. Entrada/lotes históricos permanecem com alocações e valores originais. Alternativa de sobrescrever o total contratual/parcela-base rejeitada: impediria validar uma correção posterior e confundiria juros externos com principal.

### D3 — Correção com identidade estável

Expor comando específico para correção somente de recebimento individual identificado pelo ID, não pela posição no histórico. Revalidar que existe uma única alocação à parcela paga, que não é entrada/lote, valor >= base, data civil entre venda e referência, forma aceita e nota <= 20 caracteres. Substituir valor/data/forma/nota no mesmo registro, preservando IDs e parcela paga; comparar o agregado inteiro antes de publicar uma única mudança. Não criar novo recebimento ao editar. Diferenciar explicitamente origem individual de entrada e lote legado: se os dados atuais não permitirem diferenciação sem ambiguidade, introduzir marcador de origem apenas em novos pagamentos e deixar os antigos não editáveis, preservando seed. Corrigir data move o recebimento entre meses consultados, sem reescrever passado em outra venda.

### D4 — Universos antes das projeções

Projetar vendas da sessão uma vez, filtrar Ativas para saldos, atraso, vendas mensais e resumos da Visão Geral; calcular recebimentos mensais a partir de **todas** as vendas, mesmo Inativas/Prejuízo. Projeção separada de Prejuízo mostra parcelas pendentes de cada contrato e soma apenas quando não existir nenhum recebimento, inclusive entrada. Calcular primeiro vencimento pendente por venda; ordenar cliente A–Z, data de venda crescente e vencimento pendente crescente, com ID crescente como desempate e vencimentos ausentes ao final. A listagem aplica filtro administrativo/financeiro e busca, ordenação, depois paginação; mudar a ordenação volta à página 1. Nunca usar valor recebido com juros como critério de saldo contratual. Alternativa de filtrar a fonte inteira por status antes do relatório rejeitada: apagaria pagamentos históricos realizados.

### D5 — UI e verificação

Manter componentes e rotas existentes, adicionar acesso visível à seção Prejuízo sem criar sistema de cobrança externo. Cabeçalho do detalhe informa status, modal de pagamento solicita valor/data/forma/observação e exibe aviso se vencimento anterior à referência. Fluxo de correção distinto para parcela paga elegível; confirmar, cancelar, foco/teclado, falha/retry e nomes acessíveis seguindo o padrão atual.

Em Relatórios, atualizar títulos, rótulos acessíveis, CPF/telefone, ordem e grid separado de Prejuízo; preservar os links por ID já presentes, tabelas completas, estados vazios e rolagem horizontal contida. Exercitar em teste entrada, lote, centavos, mudança de status, datas em meses diferentes e temas/viewports/zoom. A composição de dashboard, cartões, gráficos e resumos próprios é decisão da Change dependente `dashboard-relatorios`, não uma tarefa desta Change.

## Risks / Trade-offs

- [Specs principais e código ainda descrevem valor derivado/fluxo histórico] → aplicar deltas da Change apenas após revisão e autorização, sem afirmar que o código já atende ao plano.
- [Acréscimo pode violar inteiros seguros ou reconciliação] → validação de soma/overflow no agregado antes de publicar; testar R$ 100→R$ 110→R$ 105 e múltiplas parcelas.
- [Seed em lote pode parecer pagamento individual] → marcador explícito apenas para novos pagamentos, sem migrar ou editar recebimentos legados.
- [Retirar contrato de indicadores pode parecer estorno de dinheiro] → separar universo de vendas de recebimentos realizados e indicar claramente a regra dos totais.
- [Mais controles podem comprometer densidade e acessibilidade] → rolagem localizada, teclado/foco/contraste e geometria nos dois temas e viewports; não ocultar dados nem reduzir fonte para passar testes.

## Migration Plan

Planejamento → revisão PRD/TDD/SDD → pedido separado de apply → domínio/status e testes → pagamentos/correção e testes → listas/relatórios e testes → regressão e evidências reais → PR único. A sessão é descartável ao recarregar: seed inicia Ativo, sem migração persistente. Em caso de falha durante comando, manter versão anterior do estado; não propor rollback destrutivo de dados alheios. Atualizar documentação e tarefas somente com resultados efetivamente observados.
