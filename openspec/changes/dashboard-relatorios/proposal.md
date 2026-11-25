# Proposal

## Why

A apresentação tabular de Relatórios dificulta perceber rapidamente movimentação financeira e pendências de cobrança. O dashboard deve equilibrar essas leituras, permitir consultar outro mês e preservar a conferência integral dos registros, sem sugerir reconstrução histórica da dívida.

## What Changes

- **BREAKING:** substituir a apresentação inicial das cinco tabelas por dashboard com detalhes expansíveis independentes, inicialmente recolhidos, mantendo títulos/totais visíveis e acesso a todas as linhas.
- Permitir escolher mês/ano para vendas e recebimentos, inicialmente no mês da referência; não alterar a referência fixa nem as posições atuais de saldo, atraso e Prejuízo.
- Agrupar dois cartões em “Movimentação do mês” e três em “Posição atual”, com rótulos de período/universo e explicação de que vencidas integram o saldo aberto e Prejuízo tem total restrito.
- Apresentar um gráfico de barras de recebimentos por dia efetivo do mês selecionado, com valores diários equivalentes em tabela acessível e estados zero/vazio.
- Preservar identidade atual, temas, tipografia das tabelas, CPF/telefone, primeiro vencimento, ordenação, links por ID e indicação de Prejuízo fora do total.
- Revisão confirmada em 25/11: retirar os dois outros gráficos e resumos adicionais por cliente do plano anterior. Cobrança será consultada nas tabelas expansíveis.
- Fora do escopo: regras financeiras novas, comparação de períodos, posição histórica de dívida/status, outros filtros, shell/Visão Geral, novas bibliotecas, exportação real, backend ou persistência.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `relatorios-financeiros`: seleção mensal, cinco cartões contextuais, gráfico diário acessível e cinco detalhes expansíveis sobre as projeções existentes.

## Impact

PRD/FON-018/RF-018–020/CA-042–043, TDD/DEC-032; preservar RF-016/RN-025/026. Afeta cálculos, componente/template e testes em `frontend/src/app/funcionalidades/relatorios/`, E2E de Relatórios e seletores dependentes da apresentação antiga, além da documentação de evidências. Nenhuma nova dependência ou API de dados.

Reutiliza a change existente e a branch `feature/dashboard-relatorios`, agora conciliada com a `main` que contém `feedback-luighi`. O plano antigo usava RF-017/CA-039/DEC-029 em colisão com outras changes integradas; o mapeamento histórico está registrado no PRD. Planejamento somente, com todas as tarefas de implementação pendentes. Revisar os artefatos antes de solicitar apply; PR único somente após entregar e verificar todo o escopo, sem merge automático.
