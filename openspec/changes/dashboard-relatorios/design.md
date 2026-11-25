# Design

## Context

Ver `proposal.md`, PRD/FON-018/RF-018–020/CA-042–043 e TDD/DEC-032. Após conciliar esta branch com a `main`, Relatórios já tem cinco tabelas e `calcularRelatorio(vendas, referencia)` retorna movimentos mensais, posições e seus cinco totais. `Relatorios` usa `computed`, `OnPush` e `ServicoDemonstracao`; a referência fixa vem dessa fonte única. O cálculo usa `limitesDoMes` e `consultarPeriodo`, recebimentos de todos os status, vendas/saldos/vencidas de Ativas e Prejuízo separado. Os testes `relatorios.spec.ts` ainda exigem ausência de seletor e tabelas abertas; `e2e/relatorios-cobranca.spec.ts` inspeciona campos, totais, links e rolagem. Devem evoluir sem perder essas verificações. Não há biblioteca gráfica em `frontend/package.json`.

## Goals / Non-Goals

**Goals:** separar o eixo mensal do eixo de posição atual; derivar cartões, gráfico e detalhes da mesma projeção; usar primitivas locais e HTML semântico, sem nova contabilidade ou dependência. O design é necessário para resolver a separação temporal, seleção inválida, acessibilidade gráfica e expansão sem perda de foco.

**Non-Goals:** reimplementar feedback/status/pagamentos, reconstruir dívida ou status históricos, prever recebimentos, comparar meses, criar outros gráficos/resumos, persistir preferências, alterar navegação, Visão Geral ou tabelas de outros módulos.

## Decisions

### D1 — Base integrada e contrato mensal compatível

A dependência de feedback foi satisfeita pela base integrada; não há nova implementação dessa Change. Estender `calcularRelatorio` com terceiro parâmetro mensal opcional (uma data civil no primeiro dia do mês), mantendo padrão e comportamento dos consumidores de dois argumentos. Calcular limites por `limitesDoMes` sobre o mês solicitado, não substituir a referência que originou situações e saldos de `ProjecaoVenda`. `consultarPeriodo` continua validando/conciliando os totais. Alternativa rejeitada: reprojetar vendas com a data do mês escolhido, pois isso falsificaria a posição atual e não permitiria recuperar histórico de status/correções.

### D2 — Seleção local validada e calendário civil

Manter mês aplicado em sinal local de `Relatorios`, inicializado pela referência, e rascunhos de mês/ano separados. Usar select dos 12 meses em pt-BR, campo numérico para ano 1–9999 e botão Aplicar. Validar antes de atualizar o sinal; vazio, decimal, formato inválido ou valor fora do calendário informa erro associado e anunciável, sem substituir a seleção aplicada. Exibir o intervalo aplicado para distinguir rascunho de resultado. Não alocar select com 9.999 anos nem depender do suporte/localização de `input type=month`. Construir data civil canônica com helpers existentes, sem `Date`/UTC. Computed depende da fonte e do mês aplicado; não usar effect para publicar cálculos. Recriação da página restaura mês da referência; não adicionar URL/storage/store. Permitir meses sem dados, inclusive futuros, mostrando apenas fatos registrados e nunca previsão.

### D3 — Cinco métricas e uma única série reconciliada

Usar os cinco totais já calculados, sem agregações nos templates. Acrescentar série diária pura derivada de `recebimentos`, com um ponto para cada dia do mês em ordem e soma em centavos por data efetiva. Dias sem recebimento são zeros de apresentação, não objetos de pagamento. Reutilizar `diasNoMes`, comparação/data civil e `somarCentavos`; soma dos pontos deve igualar `totalRecebidoCentavos`. Entrada, lote e individual aparecem uma vez por recebimento; correção move o registro sem duplicação. Preservar venda pelo total efetivo e regras de status atuais mesmo ao consultar mês anterior. Não adicionar os dois gráficos nem resumos por cliente do rascunho anterior, conforme decisão explícita. Alternativa de calcular séries no SVG/template rejeitada por risco de divergência e teste difícil.

### D4 — Composição e identidade visual existentes

```text
Relatorios
[Mes: novembro] [Ano: 2026] [Aplicar]
Movimentacao do mes -- intervalo aplicado
[Recebimentos no mes] [Vendas no mes + quantidade]
[Recebimentos por dia -- grafico de barras]
[Tabela diaria equivalente acessivel]
Posicao atual -- referencia fixa
[Parcelas em aberto] [Parcelas vencidas] [Prejuizo]
Detalhamento
> Recebimentos no mes -- total
> Vendas no mes -- quantidade e total
> Parcelas em aberto -- total
> Parcelas vencidas -- total
> Prejuizo -- total elegivel
[Exportar relatorio -- indisponibilidade explicita]
```

Dois cartões no grupo mensal e três na posição atual em desktop, empilhados em telas estreitas. Reutilizar tokens de `styles.css`, superfícies/bordas e tipografia atual; sem CSS global novo, paleta paralela ou alteração no shell. Rótulos curtos, valores BRL legíveis, títulos e referência junto ao grupo correspondente. Explicitar que vencidas são parte de em aberto e que Prejuízo soma somente contratos sem recebimentos. Não prometer a densidade de dez linhas de Vendas para esta página longa. Manter tabelas com 18 px/20 px e paddings vigentes.

### D5 — Gráfico acessível sem biblioteca

Renderizar barras SVG locais não interativas, escala começando em zero, eixo de dias e unidade BRL. Em tela estreita, reduzir apenas a frequência dos rótulos do eixo, não eliminar pontos ou valores do equivalente diário. Usar título/descrição e tabela HTML diária com legenda do mês, data e valor exato, acessível também a usuários visuais e fora das cinco expansões de detalhes; a tabela pode ter rolagem localizada. Não depender de tooltip, hover ou foco em cada barra. Zero total mostra ausência de recebimentos, todos os dias com zero na tabela e escala segura, sem divisão por zero ou altura mínima que sugira receita inexistente. Bibliotecas gráficas seriam custo desnecessário para até 31 pontos; CSS somente foi preterido pela facilidade de eixos/escala no SVG. Não há animação necessária.

### D6 — Expansões independentes preservando dados

Usar cinco `details` com `summary` nomeado, título e total (quantidade também em Vendas), inicialmente fechados e sem agrupamento exclusivo. Reutilizar tabelas, regiões de rolagem, legendas, links e mensagens existentes no conteúdo expandido. Manter nós/identidades de cada seção estáveis ao aplicar mês, preservando abertura e foco no controle acionado. Não inserir controles interativos dentro do summary. A semântica nativa fornece estado e teclado; testes devem verificar Enter/Espaço, foco visível e abertura simultânea. Não criar rotas extras, resumos truncados ou botões de cobrança. Preservar exportação ilustrativa e sua mensagem anunciável, sem download. Alternativas de accordion exclusivo e tabelas sempre abertas foram rejeitadas na conversa.

## Risks / Trade-offs

- [Mês escolhido parecer reconstrução de dívida/status] → separar os grupos, preservar referência e indicar que posições/status são atuais; mês anterior não é snapshot contábil.
- [Dupla contagem ou divergência de gráfico] → derivar de recebimentos únicos e testar soma exata em centavos contra total e tabela.
- [Expansões ocultarem acesso aos dados] → título/total visíveis, cinco controles nativos independentes e testes com mais de cinco linhas, links e teclado.
- [Barra pequena ou eixo pouco legível] → tabela diária exata, contraste de 4,5:1 no texto comum/3:1 em elementos essenciais, dois temas/viewports e ausência de dependência exclusiva de cor.
- [Seleção invalidar o resultado ou perder abertura] → rascunho separado de seleção aplicada, mensagem acessível e seções estáveis.
- [Testes antigos exigirem apresentação superada] → abrir expansões e ajustar só expectativas de ausência de seletor/layout; preservar asserções de valores, campos e IDs.
- [Zoom nativo indisponível em automação] → registrar a limitação e solicitar verificação manual no apply; não simular CSS nem reutilizar evidência antiga como atual.

## Migration Plan

1. Revisar este planejamento e validar OpenSpec; parar até solicitação explícita de apply.
2. No apply, capturar baseline atual; implementar cálculos, seleção/cartões, gráfico e expansões em entregas coerentes com testes/documentação e commits próprios.
3. Executar regressão integrada e comparação antes/depois nos temas/viewports, inclusive estados vazios e dados extremos; registrar comandos/resultados reais em `frontend/README.md`.
4. Abrir um único PR da Change apenas após todo o escopo e verificações, usando o template padrão. Merge só com autorização explícita. Sem migração de dados; se houver regressão, corrigir a superfície ou reverter apenas o commit próprio afetado sem descartar trabalho alheio.
