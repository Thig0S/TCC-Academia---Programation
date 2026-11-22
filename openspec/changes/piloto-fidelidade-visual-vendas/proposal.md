# Proposal

## Why

Três rodadas de redesign preservaram os fluxos, mas a listagem de Vendas ainda se
parece demais com a versão anterior e não traduz a composição da imagem escolhida
pelo solicitante. É necessário provar, em uma página-piloto verificável, que a
direção estética pode ser adotada sem sacrificar os contratos do MVP.

## What Changes

- Redesenhar perceptivelmente **apenas a listagem de Vendas abertas** com referência
  prioritária em `references/a_clean_modern_dashboard_ui_using_the_mercadão_do.png`:
  hierarquia, espaçamento, superfície, controles, tabela, situações, estados e rodapé.
- Produzir comparação visual antes/depois light/dark em 1366×768 e 390×844,
  contrastes e medições de densidade; submeter capturas sintéticas à revisão humana.
- Preservar busca/filtro locais, CTA na faixa de critérios, oito colunas, 18 px,
  ações textuais Visualizar/Editar, foco, paginação e todos os dados/regras atuais.
- Não adicionar os quatro KPIs ilustrados, busca global, filtro de data, notificações,
  ações fictícias, novos campos ou componentes decorativos que simulem funcionalidade.
- Não estender o padrão a Quitadas, Visão Geral, shell/sidebar nem demais páginas
  antes da aprovação explícita do piloto.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `consulta-vendas`: acrescentar requisito verificável de composição visual da
  listagem de Vendas com a referência principal, mantendo critérios funcionais e
  separação entre a avaliação humana do visual e a regressão automatizada.

## Impact

Planejamento usa PRD (seção “Piloto visual de Vendas”) e TDD (desenho do piloto),
ambos atualizados nesta branch. Na implementação futura, o foco será
`frontend/src/app/funcionalidades/vendas/listar-vendas/`, apresentação contextual
de tabela/paginação/selo se necessária, testes E2E e registro em
`frontend/README.md`. Sem mudança de serviços, API, domínio, dependências ou
contratos de componentes. O conflito documental antigo “Limpar critérios” na spec
principal continua preexistente; PRD/TDD/código atuais mantêm “Limpar pesquisa”.
