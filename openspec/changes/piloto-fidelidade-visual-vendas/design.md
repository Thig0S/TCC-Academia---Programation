# Design

## Context

Ver `proposal.md`, delta `specs/consulta-vendas/spec.md`, PRD (piloto visual) e TDD
(desenho do piloto). Hoje `ListarVendas` usa `Cabecalho`, `TabelaVendas` e
`PaginacaoVendas`, com busca/situação locais e CTA na mesma faixa. O mockup escolhido
tem topo de aplicativo com busca global, quatro KPIs, filtro por período e ação por
reticências; esses elementos não estão aprovados. `TabelaVendas`/`PaginacaoVendas`
são compartilhados com Quitadas; `styles.css` já dispõe de tokens light/dark e
`app.html` implementa shell/sidebar globais. O PRD exige fonte de tabela 18 px,
dez linhas e paginação no viewport desktop sem scroll da página. A spec principal
contém menções históricas conflitantes a “Limpar critérios”; prevalecem PRD/TDD e
comportamento real atual, sem conciliá-las funcionalmente neste piloto.

## Goals / Non-Goals

**Goals:** criar diferença perceptível na composição de Vendas (não só pintura),
com comparação direta da imagem principal e integridade de dados/teclado em dois
temas/viewports. Permitir avaliação humana do piloto antes de ampliar o padrão.

**Non-Goals:** alterar shell, barra superior, sidebar, Quitadas ou outros módulos;
recriar dados/valores/ações do mockup; reduzir fonte tabular; trocar mecanismos
de filtros, Signals, serviços ou paginação; afirmar aprovação estética automática.

## Decisions

1. **Mapa de equivalência visual, não cópia de funcionalidades.** A composição-alvo
   no conteúdo de Vendas será: título de página forte com contexto de referência,
   bloco de busca/situação/limpeza/CTA visualmente organizado, painel de resultados
   com tabela clara/escura e rodapé de faixa/paginação. O título textual “Vendas
   cadastradas” continua identificando o painel. Os quatro cartões de métrica são
   omitidos; a busca global do mockup é representada pela busca local já existente,
   sem segundo input. O CTA permanece na faixa (não no topo separado). Filtro por
   período e menu de reticências não entram. Alternativa rejeitada: copiar HTML
   visualmente igual e quebrar RF-003/CA-028 ou ocultar ações reais.
2. **Escopo visual isolado sem contaminar compartilhados.** Estilizar estrutura
   de `listar-vendas.html` e, quando necessário, adicionar classe contextual ao
   host/contêiner para especializar descendentes de tabela/paginação/selo apenas
   nesta página. Preservar assinaturas, oito colunas, textos/IDs acessíveis, links
   e estrutura dos filhos; capturar Quitadas antes/depois para demonstrar que não
   houve alteração visual indevida. Alternativa rejeitada: alterar tokens globais
   da sidebar ou estilos compartilhados que atinjam outras rotas nesta fase.
3. **Direção estética com restrições geométricas explícitas.** Reorganizar áreas e
   alinhamentos, contrastes entre canvas/superfície/cabeçalho de tabela, sombra,
   borda e controle, intensidade do vermelho e distribuição de respiro para evocar
   a referência. Adotar apenas valores semânticos locais derivados dos tokens
   existentes quando necessários; manter 18 px/20 px, padding 10×4 px nos dados e
   10×8 px no cabeçalho. Densidade e fonte não serão sacrificadas para emular a
   tabela menor do PNG. Alternativa rejeitada: microajustes de raio/cor sem mudança
   estrutural ou esconder resultados com altura fixa.
4. **Comparação com revisão humana.** Capturar baseline antes de editar e depois
   nos mesmos dados sintéticos, viewport, tema e estado (resultados, vazio e busca
   sem resultados). Criar quadro de diferenças por área do PNG: o que foi seguido,
   o que foi adaptado por contrato e o que ficou fora. Medir altura da décima linha,
   posição da paginação e larguras do documento/scroll interno. Testes automatizados
   validam regressão; a aprovação da semelhança depende de avaliação explícita do
   solicitante. Alternativa rejeitada: considerar build/E2E verde como aceite visual.

## Risks / Trade-offs

- [Imagem mostra fonte menor, 10 linhas e controle de topo diferentes dos contratos]
  → preservar medidas e posição funcional atuais; registrar desvios sem chamar a
  captura de réplica pixel a pixel.
- [Componente compartilhado alterar Quitadas] → usar escopo contextual e comparar
  capturas/estilos de Quitadas antes/depois nos dois temas.
- [Mais respiro romper CA-028] → medir baseline, redistribuir espaços dentro do
  limite desktop e manter rolagem vertical apenas nos cenários estreitos/extensos.
- [Mockup claro escolhido não tem equivalente idêntico escuro] → traduzir para
  tokens dark atuais; comparar com a referência escura complementar apenas como
  orientação, não como fonte concorrente de escopo.
- [Sidebar atual difere da imagem] → não alterar shell no piloto; registrar esse
  limite visual e solicitar nova decisão somente após avaliação do conteúdo.

## Migration Plan

Sem migração. Implementação futura apenas de apresentação e testes no frontend;
rollback, se necessário, restrito aos commits deste piloto, sem apagar trabalho
de outras Changes. Nenhum deploy ou integração em `main` antes de revisão e
autorização explícita de merge.
