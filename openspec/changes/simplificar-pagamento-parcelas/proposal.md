# Proposal

## Why

O recebimento atual exige selecionar quantidade e redigitar o valor de parcelas já conhecidas. O pagamento individual na própria linha reduz entradas redundantes e torna explícita a próxima parcela elegível, conforme PRD 1.19/FON-016, OBJ-003 e JOR-004.

## What Changes

- Substituir o botão geral Receber por Pagar somente na primeira parcela pendente por número, mesmo futura; posteriores mostram “Aguardando parcela anterior” e pagas não oferecem ação.
- Modal mostra cliente, parcela, vencimento e valor não editável e pede apenas data e forma; data inicia na referência fixa da sessão, alterável entre venda e referência, e forma inicia sem seleção válida.
- **BREAKING**: novos pagamentos deixam de aceitar lote e valor externo no comando interno; cada confirmação quita uma parcela com valor derivado no núcleo. Não há API externa.
- Preservar histórico em lote, entrada já paga, resumos reconciliados, atomicidade, proteção contra repetição/obsolescência, cancelamento, retry e acessibilidade.
- Atualizar testes e evidências do fluxo alterado nos dois temas/viewports, mantendo densidade e acesso ao histórico completo.

## Capabilities

### New Capabilities

Nenhuma; reutilizar as capacidades existentes.

### Modified Capabilities

- `recebimentos-parcelas`: pagamento individual da primeira pendente, valor automático, modal simplificado, datas, foco e quitação.
- `consulta-vendas`: ações na tabela, retirada do Receber geral e exemplos de contagem após confirmações individuais.
- `dominio-vendas`: reconciliação após pagamentos individuais e compatibilidade de recebimentos históricos em lote.
- `estado-demonstrativo`: análises atualizadas após pagamento individual, sem alterar referência, seed ou histórico.

## Impact

PRD: `docs/prd/vendas-em-aberto.md` (RF-005/007, RN-016, CA-011/013/014/016/017/024/028). TDD: `docs/tdd/tdd.md`, DEC-027 e FASE-014 a FASE-016. Desenho técnico proposto para revisão; autorização atual exclusivamente documental, sem apply.

Afeta `frontend/src/app/funcionalidades/parcelas/` (contratos, validações e modal), `vendas/detalhes-venda/`, `vendas/formulario-venda/rascunhos.ts`, fonte/preparador demonstrativos, testes unitários/componentes e E2E que hoje recebem lotes. A geração do seed deve conservar seus resultados, inclusive recebimentos com múltiplas alocações. Sem novas dependências, rotas, backend, persistência, processamento financeiro, juros, descontos, estorno, edição do histórico ou antecipação fora de ordem. PR único somente após todo o escopo e verificações, sem merge automático.
