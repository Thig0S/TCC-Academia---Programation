# Proposal

## Why

O núcleo financeiro e os fluxos de vendas já existem, mas Visão Geral e Relatórios
ainda informam indisponibilidade. A FASE-007 permite conferir os mesmos dados da
sessão em resumos úteis, conforme PRD 1.10 RF-009/010 e TDD 1.14 DEC-020.

## What Changes

- Concentrar os quatro indicadores globais exclusivamente na Visão Geral.
- Oferecer três resumos de até cinco itens: vendas recentes, parcelas próximas
  (hoje a +7 dias) e atrasadas, com ordem, recorte e acesso aos detalhes identificados.
- Apresentar recebimentos e vendas do mês civil da referência em Relatórios,
  separando a posição atual de saldos e parcelas vencidas da análise mensal.
- Exibir exportação explicitamente indisponível, sem arquivo ou falso sucesso.
- Substituir o contrato temporário de indisponibilidade e migrar seus testes,
  preservando Configurações, consultas, mutações, temas e limites demonstrativos.
- Fora do escopo: seletor de período, gráfico, novos filtros, posição histórica,
  persistência, backend, alteração de seed/regras financeiras e avaliação da FASE-008.

## Capabilities

### New Capabilities

- `visao-geral`: indicadores globais reconciliados e resumos limitados navegáveis.
- `relatorios-financeiros`: análises do mês fixo, posição atual e exportação honesta.

### Modified Capabilities

- `navegacao-aplicacao`: substituir indisponibilidade por páginas financeiras reais,
  preservando rotas, foco e Configurações.
- `estado-demonstrativo`: permitir que projeções alimentem os dois módulos sem
  novo estado, persistência ou exportação real.

## Impact

Implementação futura em `frontend/src/app/funcionalidades/visao-geral/` e
`relatorios/`, testes locais e E2E. Reutilizar fonte raiz, domínio, Router,
Bootstrap/SCSS e dependências atuais; sem nova API externa. Migrar
`conteudo.spec.ts` e asserts de indisponibilidade de `e2e/demonstracao-inicial.spec.ts`.
PRD e TDD revisados antes dos deltas; specs principais permanecem intactas até sync
autorizado. Esta Change é somente planejamento e não autoriza apply nem PR antecipado.
