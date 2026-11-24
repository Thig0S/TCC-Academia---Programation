# Proposal

## Why

O feedback do proprietário pede separar vendas ativas, lançamentos inválidos e cobranças consideradas prejuízo, além de corrigir pagamentos e facilitar a consulta para cobrança. O MVP atual deriva o valor recebido da parcela e não permite essas mudanças, criando divergência entre a rotina demonstrada e a necessidade relatada.

## What Changes

- **BREAKING:** adicionar status administrativo Ativo/Inativo/Prejuízo independente da situação financeira; permitir somente Ativo→Inativo, Ativo→Prejuízo com saldo aberto, Inativo→Ativo e Prejuízo→Ativo. Rejeitar transição direta Inativo↔Prejuízo; repetir o status atual SHALL ser um no-op idempotente. Isolar Prejuízo em seção própria e manter Inativas consultáveis, sem exclusão definitiva.
- **BREAKING:** permitir valor recebido manual igual ou superior à parcela-base, registrar acréscimo externo no total efetivo da venda sem juros calculados pelo MVP, nota curta e correção de valor/data/forma/nota de pagamentos individuais; avisar “Checar juros do Crediloja!” em parcela atrasada.
- Permitir ordenar Vendas por cliente, data da venda e primeiro vencimento pendente antes da paginação.
- Renomear seções de Relatórios, mostrar CPF/telefone e primeiro vencimento, ordenar vencidas e separar um grid de contratos em Prejuízo com total restrito aos sem pagamentos anteriores; preservar a apresentação detalhada atual nesta Change. A transformação visual em dashboard pertence à Change posterior `dashboard-relatorios`.
- Preservar recebimentos históricos no relatório do mês independentemente do status; excluir Inativas/Prejuízo de saldos e demais indicadores operacionais; preservar simulação em memória, entrada e lotes históricos.

## Capabilities

### New Capabilities

Nenhuma; reutilizar as capacidades existentes.

### Modified Capabilities

- `dominio-vendas`: status administrativo, total efetivo com acréscimo, saldo-base e universos financeiros.
- `estado-demonstrativo`: comandos atômicos de status e correção, projeções coerentes entre rotas.
- `consulta-vendas`: seções e filtros, status no detalhe e ordenação antes da paginação.
- `recebimentos-parcelas`: valor manual, aviso, observação e edição segura de pagamento individual.
- `relatorios-financeiros`: títulos, dados de contato, ordenação e grid de Prejuízo com soma seletiva, sem cartões ou gráficos novos.
- `visao-geral`: indicadores e resumos operacionais apenas de Ativas, preservando recebimentos mensais históricos.

## Impact

Base: `docs/feedback.luighi.md`, PRD/FON-017/RF-013–016/RN-025–026/CA-036–038 e TDD/DEC-028. Impacta os modelos e cálculos de vendas/parcelas, `ServicoDemonstracao`, listas/detalhe, formulário de pagamento, Visão Geral, Relatórios e testes de domínio, componentes e E2E. Sem backend, persistência, exclusão de venda, dashboard, cálculo ou integração com Crediloja; não editar entrada ou pagamentos históricos em lote. Apenas planejamento nesta etapa: revisão antes de um pedido separado de apply; PR único após implementação e verificações completas. Esta Change deve ser integrada antes de iniciar o apply da Change dependente `dashboard-relatorios`.
