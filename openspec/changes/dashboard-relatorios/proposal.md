# Proposal

## Why

A apresentação tabular de Relatórios dificulta perceber rapidamente movimentação, posição em aberto e cobranças prioritárias. Um painel visual contextual melhora a leitura sem eliminar a conferência detalhada dos registros.

## What Changes

- **BREAKING:** transformar a apresentação inicial da aba Relatórios em dashboard, preservando as tabelas completas abaixo do painel ou em seções expansíveis acessíveis.
- Destacar cinco indicadores contextuais: recebimentos e vendas no mês da sessão, saldo de Ativas em aberto, vencidas Ativas e prejuízo elegível; não duplicar a faixa de quatro indicadores globais da Visão Geral.
- Exibir três gráficos com alternativas textuais: recebimentos por dia efetivo do mês, saldo Ativo versus prejuízo elegível e parcelas vencidas Ativas por data de vencimento na posição atual.
- Oferecer resumos de cobrança por cliente com CPF, telefone, primeiro vencimento, valor/situação e link por ID à venda, sem truncar as seções detalhadas.
- Não alterar regras financeiras, status, filtros de Vendas, cálculo de juros, período fixo, exportação ou persistência.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `relatorios-financeiros`: apresentação em dashboard, gráficos e resumos acessíveis sobre os mesmos dados das tabelas integrais da Change anterior.

## Impact

PRD/FON-018/RF-017/CA-039, TDD/DEC-029. Impacta projeções/apresentação de `frontend/src/app/funcionalidades/relatorios/` e testes dessa funcionalidade, sem alterar contratos financeiros ou Visão Geral. **Dependência bloqueante:** `feedback-luighi` deve estar implementada, verificada e integrada na `main` antes de atualizar esta branch para a `main` integrada e iniciar o apply; esta proposta foi criada isoladamente a partir da `main` atualizada, não contém arquivos nem implementação da Change anterior. Um PR separado só após concluir esta Change e suas verificações. Sem código nesta etapa.
