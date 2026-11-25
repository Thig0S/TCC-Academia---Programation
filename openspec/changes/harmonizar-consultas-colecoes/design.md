# Design

## Context

Ver `proposal.md`, PRD/FON-033/RF-017/CA-041 e TDD/DEC-031. Vendas abertas já apresenta controles com altura `h-12`, borda `border-control-border`, raio `rounded-xl`, superfície `bg-surface`, padding horizontal `px-4`, sombra, estados hover/foco e espaçamento `gap-3`. Quitadas e a tela administrativa compartilhada por Inativas/Prejuízo usam busca e Limpar pesquisa sem filtro por situação.

## Goals / Non-Goals

**Goals:**

- Tornar busca, limpeza e faixa de consulta visualmente coerentes entre as quatro coleções.
- Manter controles responsivos, foco visível e descrições acessíveis existentes.
- Garantir que Quitadas, Inativas e Prejuízo continuem sem filtro por situação.

**Non-Goals:**

- Adicionar filtros, ordenação, botões ou ações.
- Alterar lógica de consulta, rotas, paginação, componentes compartilhados ou regras de negócio.
- Redesenhar títulos, navegação, tabelas ou outros elementos das páginas.

## Decisions

- Reutilizar diretamente as classes Tailwind do template de Vendas abertas nos campos, botões e seção de pesquisa, sem criar CSS ou abstração compartilhada.
- Usar uma grade de duas colunas em telas médias ou maiores, com busca ampla e ação Limpar pesquisa; empilhar os controles em telas estreitas.
- Manter a indicação de busca e a descrição `aria-describedby` já existentes, assim como os IDs e handlers.
- Cobrir visualmente as rotas Quitadas, Inativas e Prejuízo nos testes de componente; verificar também que o filtro de situação permanece apenas em Vendas abertas.

## Risks / Trade-offs

- **[Risco]** A faixa mais alta pode alterar levemente o espaço ocupado pela lista. → Usar os mesmos 3rem dos controles atuais de Vendas abertas e manter a grade compacta.
- **[Risco]** O template administrativo é compartilhado por Inativas e Prejuízo. → Testar ambas as rotas para comprovar que o ajuste é comum e não altera seu conteúdo funcional.

## Migration Plan

Sem migração. Ajuste somente de classes de apresentação e testes, reversível por diff.
