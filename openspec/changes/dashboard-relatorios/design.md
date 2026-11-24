# Design

## Context

Ver `proposal.md` e PRD/RF-017/CA-039, TDD/DEC-029. No ponto de partida da branch, Relatórios apresenta quatro tabelas e cálculos puros sobre vendas da sessão; a referência temporal é fixa e não há gráficos. `feedback-luighi` planeja uma quinta seção de Prejuízo, novos universos de status e identificações de cobrança em outra branch; **esse código ainda não está nesta branch**. A delta de `relatorios-financeiros` descreve o contrato final esperado após a integração do feedback, não o estado atual do código nem uma alteração das regras daquela Change.

## Goals / Non-Goals

**Goals:** exibir leitura visual contextual sem perder reconciliação, identificação ou acesso integral ao detalhe; distinguir período mensal de posição na referência; aplicar acessibilidade aos três gráficos e às tabelas preservadas.

**Non-Goals:** implementar status/Prejuízo ou corrigir pagamentos, adicionar período configurável, calcular juros, substituir Visão Geral, remover linhas das tabelas ou criar dependência externa de gráficos.

## Decisions

### D1 — Pré-condição explícita e integração sem duplicação

Não copiar modelos, deltas nem commits de `feedback-luighi` para esta branch enquanto a Change anterior não estiver integrada. Antes do apply, conferir a integração real e atualizar `feature/dashboard-relatorios` com a `main` que já inclui o feedback, revisar o PRD/TDD e este delta contra a spec principal efetiva e revalidar. Se a integração alterar nomes ou universos, ajustar primeiro documentação/SDD; não inventar fallback que silencie Prejuízo. Alternativa de branch empilhada rejeitada pelo solicitante: as duas implementações terão branches e PRs distintos, em sequência.

### D2 — Derivação visual sem nova contabilidade

Consumir uma única projeção de Relatórios após o feedback. Produzir cartões e séries agregando recebimentos por data efetiva dentro dos limites do mês; comparar total de saldos Ativos em aberto com prejuízo elegível sem misturar os dois; agrupar vencidas Ativas por data de vencimento sem filtro mensal. Resumos por cliente derivam das posições existentes com CPF, telefone, primeiro vencimento, valor e ID. Testar igualdade dos totais e estabilidade de ordenação; não fabricar registros de dias sem recebimento como movimentos. Alternativa de calcular métricas no template é rejeitada porque gera divergência entre gráficos e tabelas.

### D3 — Visão inicial visual e dados integrais acessíveis

Colocar cinco cartões contextuais no topo de Relatórios, identificando claramente “no mês” versus “na referência”, seguidos por três gráficos de barras locais em CSS/SVG sem biblioteca de runtime nova, com título, rótulos/unidades, valores e tabela/texto equivalente para leitura assistiva. Exibir resumos de cobrança com links por ID; preservar as cinco tabelas completas em seções abaixo, ou em expansão com controle nomeado/estado/foco e sem truncamento. Manter rolagem horizontal apenas nas regiões tabulares. Alternativa de substituir tabelas integralmente por cartões é rejeitada: impediria conferir cada parcela e recebimento.

## Risks / Trade-offs

- [Dependência ainda não integrada] → não iniciar apply antes de confirmar feedback mesclado, atualizar a branch e conciliar specs/docs, sem aplicar deltas contra código/base antiga.
- [Comparar posição atual com movimento mensal pode sugerir equivalência] → rotular o período e universo de cada cartão/gráfico e conferir reconciliação com tabelas.
- [Gráficos não legíveis sem cor/visão ou em telas estreitas] → mostrar valores/categorias equivalentes em texto, testar teclado, contraste, dois temas, 1366×768/390×844 e zoom nativo quando verificável.
- [Dashboard com muitas linhas pode esconder histórico] → detalhes integrais sempre acessíveis na mesma aba, sem limite silencioso nem rolagem global horizontal.

## Migration Plan

1. Aguardar integração verificada de `feedback-luighi` na `main`; atualizar esta branch mantendo seus commits e resolver apenas os conflitos reais.
2. Revisar PRD/TDD/delta se o contrato integrado divergir, antes do apply; validar OpenSpec estrito.
3. Implementar cálculos de apresentação e testes, depois layout e seus testes/documentação por funcionalidade, seguidos de regressão integrada.
4. Publicar apenas o PR da Change dashboard após todo seu escopo e verificações; merge depende de autorização explícita. Sem persistência, não há migração de dados; falhas de renderização não alteram registros da sessão.
