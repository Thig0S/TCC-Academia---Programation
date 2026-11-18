# Design

## Context

Motivação e escopo: `proposal.md`. Requisitos confirmados no PRD 1.6,
RN-014/018/019/020 e CA-026 a CA-029; desenho central no TDD 1.10/DEC-018.
Esta Change é o destino exclusivo dos novos ajustes, transferidos da revisão
documental da `fase-005` por confirmação no Harness. Não repetir suas 20 tarefas.

Inspeção somente leitura nesta proposta:

- `listar-vendas.ts/.html` mantém termo/situação locais, resultados por `computed`,
  cartões ligados a `resumo()` e busca/filtro empilhados. `listar-vendas-quitadas/`
  oferece somente busca. As duas páginas passam todos os resultados à tabela.
- `componentes/tabela-vendas/` já recebe projeções e usa RouterLink por segmentos;
  preservar IDs com barras e nomes acessíveis, sem alterar rotas.
- `detalhes-venda.html` empilha identificação/finanças num `dl`, um cartão separado
  para entrada e tabela de todas as parcelas. A região já tem nome e `tabindex`.
- `app.html/.scss` inclui cabeçalho, aviso, margens e lateral de 260 px no desktop.
  Esses elementos consomem altura/largura: compactar espaçamentos afetados pode
  exigir ajuste pontual da estrutura compartilhada, sem esconder aviso ou logo.
- `styles.scss`, `estilos/_temas.scss` e `barra-navegacao.scss` concentram estilos:
  links do conteúdo usam ênfase Bootstrap e `.pagina-atual` usa sublinhado.
- `listas-vendas.spec.ts` exige todos os registros e cartões; o teste de integração
  está em `nucleo/demonstracao/demonstracao-integracao.spec.ts`; E2E de consulta,
  contraste, teclado e overflow está em `e2e/demonstracao-inicial.spec.ts`.
- `parcelas/parcela.calculos.ts` usa diferença de ordinais civis: negativa é atraso,
  zero a sete é Próximos dias e recebimento tem precedência como Paga. Não há regra
  financeira nova a implementar.
- Manifesto: Angular/Router 22.2.6, Bootstrap 5.3.9, TypeScript 6.0.3, Vitest 5.1.0,
  Playwright 1.65.0. Dois projetos Chromium em 1366×768 e 390×844; servidor próprio
  em 4200 sem reutilizar processo. Sem upgrade, dependência ou novo servidor.

As specs principais já contêm `consulta-vendas`, `estado-demonstrativo` e
`temas-visuais`. As duas primeiras obrigam cartões em Vendas; a terceira obriga
sublinhado ativo e preservação das demais superfícies. As três deltas substituem
explicitamente esses pontos, sem editar specs principais agora. O restante da
navegação, fonte, privacidade, temas de sessão e regras permanece válido.

## Goals / Non-Goals

**Goals:**
- Manter uma única fonte financeira, derivando pesquisa e página sem mutações.
- Limitar a apresentação sem perder resultados, identidade, histórico ou foco.
- Tornar o critério de primeira tela verificável por geometria e revisão visual.
- Reutilizar arquitetura/estilos/testes existentes, com deltas coerentes e pequenas.

**Non-Goals:**
- Não implementar Visão Geral, cadastro, edição, recebimento ou relatórios.
- Não alterar seed, quantidade de vendas iniciais, IDs, comandos ou regra de atraso.
- Não criar backend, persistência, cache, hooks globais de teste, tabela genérica,
  novo pacote Forms, busca global, filtro de intervalo ou dependência visual.
- Não exigir ausência de rolagem em todas as resoluções/textos/zoom, nem alegar
  cópia pixel a pixel, certificação de acessibilidade ou aceite comercial.

## Decisions

### 1. Paginação derivada após critérios

Fluxo: fonte raiz → `buscarVendas` existente → resultados completos → página de 10
→ `TabelaVendas`. Contagem, faixa e número de páginas vêm dos resultados completos;
não filtrar apenas os 10 registros visíveis. Não mudar a ordenação da fonte.

As páginas continuam donas dos critérios e da seleção local. Propor
`linkedSignal` para página selecionada, com fonte dependente de critérios e total
de resultados: mudança de termo/situação redefine 1; alteração somente da coleção
preserva seleção válida ou limita à última página. Limpezas redefinem explicitamente
1 mesmo com termo já vazio. `computed` deriva total/faixa/fatia; estado vazio usa
seleção interna sentinela 1 sem renderizar página fictícia. Não escrever signals
dentro de `computed` nem adicionar effect de sincronização financeira.

Utilitário puro específico `venda.paginacao.ts` pode concentrar limites/faixa/fatia
testáveis; componente `componentes/paginacao-vendas/` compartilha só apresentação
entre as duas listas, com entradas/eventos tipados. Não duplicar estado da seleção
nesse componente. Não criar plataforma configurável ou serviço de paginação.
Uma página dispensa controles de troca, mantendo contagem; zero resultados preserva
a mensagem pertinente. Exibir números/anterior/próxima; em muitas páginas, janela
compacta com primeira/última/atual e reticências não acionáveis. Paginação é navegação
de resultados, não um widget ARIA de abas. Indicar página atual, região nomeada e
anúncio de faixa/total, preservando foco no controle acionado; se um controle sumir
por redução, encaminhar foco logicamente à página atual ou ao campo da limpeza.

Alternativas rejeitadas: biblioteca de tabela, lista infinita, filtrar a fatia e
estado por serviço global. São custo/escopo extras ou omitem resultados. O custo
aceito é testar limites/reset/redução, incluindo coleções maiores só nos testes.

Documentação consultada pelo Context7: `/websites/angular_dev`, guia
`https://angular.dev/guide/signals/linked-signal`, em 16/11/2026. Confirma `source`,
`computation` e valor anterior para seleção gravável dependente; genéricos explícitos
ao usar `previous`. Suporte documental geral, não execução no patch 22.2.6; verificar
compilação e reatividade locais no apply, sem upgrade incidental ou API experimental.

### 2. Densidade e superfícies de consulta

Remover seção de cartões e referências de apresentação não utilizadas em
`listar-vendas`, sem remover `resumo()` do serviço. Atualizar assertivas que exigem
cartões para ausência de cartões e preservação dos derivados internos. Visão Geral
continua indisponível até FASE-007, não criar cartões temporários em outro destino.

Usar Bootstrap somente estilos e SCSS complementar específico: faixa desktop de
busca/situação/limpezas com alinhamento de rótulos, sem área duplicada no cabeçalho;
Quitadas com busca/limpeza. Compactar cabeçalhos, referência, intervalos verticais e
células, preservando nomes acessíveis e o aviso. Evitar regras globais de altura
fixa ou `overflow: hidden` para fingir ausência de scroll. Refletir fundo claro e
superfícies brancas no light; quase preto/grafite e textos claros no dark.

Em 1366×768/100%, cenário com 10 linhas e textos curtos, critérios, tabela e rodapé
inteiros devem caber sem rolagem vertical da página. Pode haver rolagem horizontal
acessível apenas da tabela quando necessária; não confundir esse requisito com
suporte geral de compatibilidade, ainda em PRD/PEN-013. Sem reduzir artificialmente
fonte, omitir colunas ou remover aviso para caber.

### 3. Detalhe condensado com excedente interno

Manter a consulta reativa e rotas existentes. Reorganizar template em cabeçalho e
retornos compactos, bloco de cliente e bloco financeiro lado a lado, entrada como
informação separada semanticamente mas sem cartão alto obrigatório. Preservar
descrição, entrada/valor/data/forma, próximo vencimento e todos os campos atuais.
Não inferir valor uniforme de parcela: os centavos podem variar entre parcelas.

Com até 10 parcelas e descrição curta, exibir dados e tabela inteira no desktop
de referência. Com mais de 10, limitar altura da região da tabela de parcelas,
permitindo scroll interno vertical e cabeçalho identificável, preferencialmente
fixo dentro dela, sem esconder foco/linhas. Não paginar parcelas. Em texto extenso,
390×844 ou zoom nativo 200%, permitir blocos empilhados e rolagem adicional sem
truncamento; manter região nomeada e operável por teclado.

### 4. Âncoras, identidade e acessibilidade

Escopo dos links: menu/perfil, cliente, Visualizar e retorno/breadcrumb. Usar texto
contrastante conforme superfície e destaque vermelho da identidade, sem azul ou
sublinhado padrão permanente. Preservar semântica de âncora, URLs, foco, hover,
`aria-current` e estado ativo distinguível além da cor (superfície/forma/peso),
permitindo sublinhado no hover/foco. Ações que alteram página local e limpezas
continuam botões; não gerar href fictício. O skip link continua acessível.

A delta de temas permite retirar sublinhado ativo obrigatório, mas não afrouxa
4,5:1 para texto comum ou 3:1 para texto grande/foco/controles essenciais. Medir
também hover, ativo e extremos/região intermediária do degradê. Logo e identidade
vermelha da lateral preservadas. Não copiar dados pessoais, notificações, controles
desktop, menu sem consumidor, Nova venda/Editar/Registrar pagamento ou filtro por
intervalo das referências. Manter escuro inicial, escolha em memória e recarga.

### 5. Verificação e evidências por funcionalidade

| Área | Casos planejados | Evidência futura |
| --- | --- | --- |
| Listas/paginação | 0/1/10/11/21 registros, ambas as coleções, reset por todos os critérios/limpezas, página reduzida e posterior crescimento, sem duplicação/omissão/mutação | Unitários/componentes com fixtures sintéticas, ordem e IDs |
| Integração | Comando interno aceito no TestBed atualiza lista/detalhe/quantidades e reduz página inválida; fonte e resumo reconciliados sem cartões | `demonstracao-integracao.spec.ts`, `whenStable`, sem detecção forçada |
| Primeira tela | 10 vendas com rodapé, detalhe 1/10 parcelas com entrada/descrição curta, ambos os temas em 1366×768/100% | Bounding boxes dentro do viewport, scrollHeight/clientHeight do documento e capturas |
| Excedente/adaptação | 11 parcelas, nomes/descrições extensos, 390×844 e zoom nativo 200%, teclado/região interna/ações | Componente para fixtures, browser real para overflow/foco, roteiro manual de zoom |
| Visual/links | Comparação às imagens, normal/hover/foco/ativo, contraste, semântica, retorno, IDs opacos e contexto | Capturas e medições, regressões E2E |
| Atraso preservado | Referência no vencimento/dia seguinte, paga, limites +7/+8 e transições de mês/ano | `parcela.calculos.spec.ts` e projeções de venda/resumo existentes |

O seed tem 12 vendas totais e até quatro parcelas usuais; não garante 10 linhas
em cada coleção, duas páginas ou 11 parcelas. Testar essas bordas com fixtures
exclusivas de teste. E2E da aplicação real usa somente seed/UI e não prova cenários
que ele não contém. Para geometria com fixtures, usar host montado exclusivamente
pelo runner de testes em browser ou fixture isolada de teste com os componentes
reais e mesma estrutura/tema; não acrescentar rota, flag ou endpoint de produção.
Se esse host não estiver disponível no runner existente, registrar bloqueio para
a evidência de geometria completa e usar validação manual identificada, sem atribuir
esse caso ao E2E real nem modificar seed/aceite silenciosamente.

Referências: `exemploListagemDeVendas.png`, `exemploDadosDaVenda.png` e
`exemploDesignDark.png` em `frontend/public/imgs/exemplos/`; manter as diferenças
funcionais autorizadas. Comparação é revisão visual documentada, não baseline de
pixels com dados reais. Resultados/ambiente/comandos reais vão para
`frontend/README.md` durante apply, preservando o histórico existente.

## Risks / Trade-offs

- Dez linhas/parcelas não caberem com campos obrigatórios → medir antes de concluir;
  se não houver solução legível, bloquear e revisar CA-028 com o solicitante.
- Fixture ser confundida com comportamento do seed → distinguir componente/host,
  E2E da aplicação real e validação manual em cada evidência.
- Estilo compartilhado prejudicar outras páginas → escopo específico onde possível
  e regressão de todos os destinos, skip link, temas e foco.
- Texto longo ou região interna ocultar dados/foco → adaptação sem corte, teclado,
  zoom nativo e verificação do excedente; sem desabilitar scroll do documento.
- Reaplicar a fase-005 antiga restaurar cartões → consolidar somente a nova delta
  depois da base existente; não reaplicar/sincronizar a Change anterior nesta entrega.
- Confundir proposta pronta com entrega → todas as tarefas novas desmarcadas; não
  executar código, testes de aplicação, PR ou merge neste planejamento.

## Migration Plan

1. PRD 1.6 → TDD 1.10 → esta Change. Reutilizar branch pertinente; transferir apenas
   as revisões do agente da `fase-005`, por autorização, sem descartar outro trabalho.
2. Após novo pedido de apply: entregar listas sem cartões/faixa compacta, paginação,
   detalhe compacto e estilos/links em commits individuais coerentes com seus
   testes/documentação. Não repetir funcionalidades concluídas da FASE-005.
3. Regressão integrada nos scripts existentes, usando servidor do runner e sem
   encerrar processos alheios. Atualizar tarefas/evidências com resultados reais.
4. PR único apenas ao concluir todo o escopo desta Change, usando template e
   referências PRD/TDD/SDD. Merge somente mediante autorização explícita.
5. Não há migração de dados/API/dependências. Sync/archive são posteriores e fora
   desta solicitação; preservar ordem das specs. Eventual reversão de código deve
   ocorrer por mudança/PR autorizado, nunca reset ou descarte destrutivo.
