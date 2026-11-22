# DESIGN.md — Mercadão dos Óculos | Gestão de Vendas

> **Especificação de interface para Codex e outros agentes de programação**  
> **Base:** decisões e código compartilhados nesta conversa, protótipos HTML light/dark e mockups visuais produzidos durante a exploração do design.  
> **Escopo:** frontend de uma aplicação de gestão de vendas parceladas/crediário externo da ótica.  
> **Regra central:** reproduzir o design acordado **sem alterar contratos, fluxos ou arquitetura já existentes no repositório**.

## 0. Como interpretar esta especificação

Cada indicação possui uma classificação:

- **[DEFINIDO]** — decisão explícita do usuário, padrão repetido nos layouts, ou código Angular fornecido pelo usuário.
- **[REFERÊNCIA]** — detalhe observado nos protótipos/mockups, útil para fidelidade visual, mas **não** necessariamente validado como requisito final.
- **[NÃO ESPECIFICADO]** — decisão ainda não tomada ou informação que depende de inspecionar o repositório. **Não inventar.**

**Ordem de precedência para o Codex:** (1) pedidos mais recentes do usuário nesta conversa; (2) componentes, contratos, design tokens e regras de negócio existentes no repositório; (3) templates Angular fornecidos pelo usuário; (4) mockups e HTMLs demonstrativos; (5) sugestões visuais deste documento identificadas como `[REFERÊNCIA]`. Em caso de conflito entre uma decisão explícita e um protótipo antigo, prevalece a decisão explícita mais recente. Se o conflito envolver contrato funcional ou regra de negócio, parar e sinalizar antes de mudar.

### Histórico das decisões relevantes

| Tema | Estado | Decisão / observação |
| --- | --- | --- |
| Objetivo | **[DEFINIDO]** | Interface de gestão de vendas parceladas de uma ótica, fácil de usar por funcionários, com aparência moderna, clean e profissional. |
| Marca | **[DEFINIDO]** | Identidade visual inspirada no **Mercadão dos Óculos**; vermelho da marca como destaque, sem exagerar na saturação da interface. |
| Temas | **[DEFINIDO]** | Foram solicitadas versões **clara** e **escura**, com layout e identidade consistentes. |
| Navegação | **[DEFINIDO]** | Sidebar de módulos, sem entradas independentes **Clientes** e **Parcelas**. Não criar essas duas abas. |
| Texto indesejado | **[DEFINIDO]** | Remover o texto **“Crediário”** na área da tabela à direita, conforme ajuste solicitado ao mockup. Não recolocar esse rótulo decorativo. |
| Busca | **[DEFINIDO]** | Busca visualmente destacada na parte superior da experiência de vendas; buscar dados da venda/cliente usando o comportamento já implementado. |
| Listagem | **[DEFINIDO — MAIS RECENTE]** | **Não exibir os cards financeiros/indicadores na página de listagem.** A tela deve priorizar título, busca, filtro, tabela e paginação com dados reais da fonte já utilizada. |
| Cards retirados | **[DEFINIDO — MAIS RECENTE]** | Não mostrar na listagem: “Total em aberto”, “Parcelas vencidas e não pagas”/“Valores em atraso” nem “Vendas cadastradas” como card de métrica. A expressão “Vendas cadastradas” pode continuar como **título da tabela**, não como card. |
| MVP | **[DEFINIDO]** | Protótipos iniciais eram demonstrativos, com dados fictícios e sem backend; a aplicação Angular posterior **já possui serviços e lógica**, que devem ser preservados. |
| Backend | **[NÃO ESPECIFICADO]** | Não adicionar backend, endpoints, persistência, autenticação ou infraestrutura a partir deste documento. |

---

## 1. Tecnologias e arquitetura a preservar

### Confirmado na conversa

- **[DEFINIDO]** Frontend: **Angular + TypeScript + Tailwind CSS**.
- **[DEFINIDO]** Empacotamento desktop planejado: **Tauri**.
- **[DEFINIDO]** Angular com componentes reutilizáveis, `ChangeDetectionStrategy.OnPush`, `signal`, `computed`, `linkedSignal`, template control flow `@if`/`@for`, e `RouterLink`.
- **[DEFINIDO]** Formulários da página de nova venda usam `[formField]`, validações e componentes próprios de erro; **não migrar o formulário** para outra abordagem por motivo estético.
- **[DEFINIDO]** O projeto utiliza classes semânticas do Tailwind como `bg-surface`, `bg-surface-muted`, `text-text`, `text-text-muted`, `border-border`, `border-control-border`, `bg-brand`, `bg-action`, `hover:bg-action-hover`, `text-error`, `outline-focus`, além de variáveis CSS como `--app-canvas`, `--app-text`, `--app-surface`, `--app-sidebar-bg`, `--app-sidebar-gradient`, `--app-sidebar-text`, `--app-sidebar-border` e `--app-sidebar-focus`.
- **[DEFINIDO]** A página de listagem existente usa `ServicoDemonstracao`, `TabelaVendas`, `PaginacaoVendas`, `Cabecalho`, `buscarVendas`, funções de paginação e `formatarDataCivil`.

### Orientações obrigatórias para o agente

1. Inspecionar **primeiro** o `package.json`, a configuração Tailwind, os estilos globais, o shell da aplicação, as rotas e os componentes existentes.
2. Reutilizar **tokens semânticos existentes**. Não criar um segundo design system paralelo, nem substituir tokens por hexadecimais repetidos nos templates.
3. Preservar componentes, inputs/outputs, assinaturas, Signals, validações, acessibilidade e contratos de domínio. Alterar **apresentação** sem reescrever a lógica de negócio.
4. Reutilizar `app-cabecalho`, `app-identificacao-cliente`, `app-erro-campo`, `app-tabela-vendas` e `app-paginacao-vendas` quando seus contratos reais permitirem. **Inspecionar seus seletores e inputs antes de usá-los.**
5. Não presumir que os inputs de `app-tabela-vendas` sejam `[vendas]` e `[referencia]`: esses nomes apareceram em um exemplo de resposta, mas **não foram confirmados pelo código do componente**.
6. Não presumir a rota de criação (`/vendas/nova`) ou a rota de detalhes (`/vendas/:id`) sem verificar o roteador; são caminhos usados em exemplos de layout.
7. Não adicionar Bootstrap, bibliotecas de UI, fontes, ícones, animações, estado global ou dependências novas apenas para alcançar o visual. Preferir o que já existe no repositório.
8. Não copiar para produção o JavaScript imperativo, handlers `onclick`, CDN do Tailwind ou dados de demonstração embutidos nos protótipos HTML.
9. Preservar suporte a português do Brasil, formatação monetária em BRL, datas civis e números de parcelas conforme as funções existentes.

**[NÃO ESPECIFICADO]** Versões exatas do Angular, Tailwind, Tauri, pacote de ícones, estrutura completa de rotas e mecanismo atual de alternância de tema. Inspecionar o projeto antes de implementar.

---

## 2. Identidade visual

### 2.1 Linguagem visual

**[DEFINIDO]** Estilo de dashboard SaaS de varejo: **clean, moderno, discreto, organizado e legível**. A interface deve parecer uma ferramenta profissional de operação diária, não um site de marketing. Usar superfícies bem delimitadas, tipografia clara, hierarquia visual, espaçamento generoso e vermelho como cor de ação/seleção.

**[DEFINIDO]** Preservar a identidade do Mercadão dos Óculos. A marca aparece na sidebar/topo do protótipo. Utilizar o **asset de logotipo existente no repositório** se houver; não substituir uma logo oficial por uma recriação aproximada. Nos HTMLs demonstrativos há uma composição tipográfica “MERCADÃO / DOS ÓCULOS!” com ícone de óculos: é **referência visual**, não confirmação de que seja o arquivo oficial da franquia.

**[DEFINIDO]** Evitar poluição visual, gradientes decorativos em excesso, efeitos 3D, sombras fortes, ícones sem função e componentes de aparência genérica. Preferir transições curtas e sutis.

### 2.2 Paleta — valores dos protótipos, não sobrescrever tokens sem inspeção

Os seguintes valores foram **extraídos dos arquivos HTML de referência**. São um alvo visual verificável; os tokens reais do repositório têm prioridade.

| Papel | Light `[REFERÊNCIA]` | Dark `[REFERÊNCIA]` | Aplicação |
| --- | --- | --- | --- |
| Canvas / fundo da aplicação | `#F5F6F9` | `#111217` | Fundo externo à área de conteúdo |
| Superfície principal | `#FFFFFF` | `#1D1E24` | Cards, tabela, painéis |
| Superfície suave | `#F8F9FB` | `#25262D` | Inputs, cabeçalhos de tabela, áreas secundárias |
| Borda principal | `#E5E7EC` | `#33343D` | Divisórias e contorno de cards |
| Texto principal | `#272A33` | `#F4F4F5` | Títulos e valores |
| Texto secundário | `#747783` | `#A1A1AA` | Descrições, legendas e metadados |
| Vermelho da interface / brand | `#D72848` | `#D72848` | CTA, links ativos, foco e detalhes |
| Fundo de destaque vermelho | `#FFF0F3` | `#3C1924` | Seleção, ícones e ênfase leve |
| Sidebar base | `#FFFFFF` | `#310E19` | Fundo de navegação |
| Sidebar alternativa / profunda | `#F7F8FA` | `#1D0B12` | Gradiente/continuação |

- **[REFERÊNCIA]** Sidebar escura: gradiente `168deg, #49101F 0%, #300E19 47%, #1D0C13 100%`.
- **[REFERÊNCIA]** Sidebar clara: gradiente sutil `170deg, #FFFFFF 0%, #FBFBFD 100%`.
- **[REFERÊNCIA]** Hover do botão primário: dark `#ED3B5C`, light `#BC2040`.
- **[REFERÊNCIA]** Estado ativo da sidebar: fundo vermelho translúcido/rosado e **barra vertical interna de 3px** em vermelho.
- **[REFERÊNCIA]** Situações financeiras: **verde** para quitada/paga, **vermelho** para atrasada/vencida e **âmbar** para em dia/pendente, com fundo suave e texto legível. A semântica das situações deve seguir o modelo de domínio real.
- **[NÃO ESPECIFICADO]** Paleta oficial exata da franquia, tokens finais de todas as variantes, regras de contraste detalhadas e modo padrão (light/dark). Não declarar os hexadecimais acima como manual de marca oficial.

### 2.3 Tipografia e iconografia

- **[REFERÊNCIA]** Os protótipos usam **Inter**, com fallback `ui-sans-serif, system-ui, sans-serif`. Usar a fonte já adotada no projeto; instalar Inter somente se necessário e aprovado.
- **[REFERÊNCIA]** Escala visual observada: títulos de página ~`27px` nos HTMLs de protótipo; títulos de cards ~`14–18px`; texto de formulário/tabela ~`12–14px`; metadados ~`10–12px`. A versão Angular refatorada privilegia `text-base`, `text-sm` e `text-xs`.
- **[DEFINIDO]** Títulos mais fortes, rótulos de campos legíveis, valores financeiros com peso médio/semibold e `tabular-nums` quando aplicável.
- **[REFERÊNCIA]** Ícones lineares de traço fino (Lucide nos HTMLs estáticos); ícones de lupa, mais, filtro, calendário, recibo, olho/reticências, chevrons, check e alerta.
- **[NÃO ESPECIFICADO]** Biblioteca oficial de ícones do projeto. Reaproveitar a existente; SVG inline simples é aceitável quando já segue o padrão do repositório.

---

## 3. Shell global e navegação

### 3.1 Estrutura visual

**[DEFINIDO]** Layout de aplicativo desktop com **sidebar à esquerda**, **barra superior com pesquisa** e **conteúdo principal** à direita. A navegação deve ser consistente entre módulos.

**[REFERÊNCIA]** Medidas dos HTMLs demonstrativos:

- Sidebar expandida: `248px`.
- Sidebar compactada em telas intermediárias: `76px`.
- Barra superior: `91px` de altura.
- Área de conteúdo: largura máxima `1560px`, centralizada, padding lateral aproximado `20–36px` e superior `32px`.
- Campo de busca no topo: largura máxima aproximada `450px`, altura `43px`, ícone de lupa à esquerda.
- Sidebar: logotipo no topo, grupo de navegação, estado ativo vermelho, bloco de perfil no rodapé.

**[REFERÊNCIA]** Itens apresentados na sidebar do protótipo: **Visão geral**, **Vendas**, **Relatórios**, **Configurações** e **Central de ajuda**. Esses itens são referências do MVP; **não criar rotas inexistentes** para forçar a reprodução do mockup.

**[DEFINIDO]** **Não adicionar “Clientes” nem “Parcelas” como itens independentes** na sidebar. Os dados do cliente aparecem associados à venda; as parcelas aparecem no contexto da venda.

**[NÃO ESPECIFICADO]** Se a sidebar compacta deve ter tooltip, se a navegação mobile é drawer, qual comportamento exato do menu de perfil, notificações e pesquisa global fora do módulo Vendas. Implementar somente o que já existe ou validar.

### 3.2 Pesquisa global versus pesquisa da listagem

- **[DEFINIDO]** A busca deve ser uma função proeminente na experiência de vendas, preferencialmente no topo da página, conforme pedido inicial e protótipos.
- **[DEFINIDO]** O exemplo Angular mais recente colocou a pesquisa **no topo do card de listagem**, junto aos filtros. Isso também atende ao objetivo de ficar acima da tabela.
- **[REGRA DE IMPLEMENTAÇÃO]** Se o shell já tem busca global funcional, integrar com o módulo Vendas sem duplicar campos; caso não tenha, manter a busca no topo da listagem. **Não criar duas pesquisas concorrentes** sem orientação explícita.

---

## 4. Página: listagem de vendas — PRIORIDADE MÁXIMA

### 4.1 Hierarquia da página

**[DEFINIDO — MAIS RECENTE]**

1. Cabeçalho `Vendas`, texto de apoio curto e CTA **Nova venda** à direita.
2. Card principal de listagem, com título `Vendas cadastradas` (título textual, **não card KPI**).
3. Campo de pesquisa, filtro de situação e controle de limpar pesquisa/filtros.
4. Tabela de vendas usando os dados do serviço existente.
5. Estado vazio quando não houver resultados.
6. Rodapé da tabela com contagem/faixa de resultados e paginação.

**Não mostrar nesta página** os cards `Total em aberto`, `Valores em atraso`/`Parcelas vencidas e não pagas` e `Vendas cadastradas` em formato de KPI: foram explicitamente retirados. O card `Recebido no mês` também foi omitido na **última proposta de layout sem cards**, mas sua retirada não foi nomeada individualmente pelo usuário; por fidelidade à versão mais recente, não adicioná-lo por iniciativa própria. Os protótipos HTML mais antigos mostram cards, porém **não são a versão atual da listagem**. Se houver uma tela `Visão geral`, o uso de KPIs nela é uma **referência não confirmada**, não autorização para adicioná-los à listagem.

### 4.2 Colunas da tabela

As colunas abaixo foram usadas tanto no protótipo quanto na proposta Angular de listagem; são a referência visual mais concreta disponível.

| Ordem | Coluna | Apresentação prevista | Estado |
| --- | --- | --- | --- |
| 1 | **Cliente** | Nome em destaque; informação secundária como número da venda ou identificação **se disponível no modelo**; avatar com iniciais é opcional, conforme mockup. | **[DEFINIDO visual]** |
| 2 | **Data da venda** | Data formatada para `pt-BR`. | **[DEFINIDO visual]** |
| 3 | **Valor total** | Valor em BRL, alinhamento consistente, `tabular-nums`. | **[DEFINIDO visual]** |
| 4 | **Parcelas** | Progresso `pagas/total`; barra de progresso curta é **[REFERÊNCIA]** do HTML inicial. | **[DEFINIDO coluna]** |
| 5 | **Saldo devedor** | Valor restante, com peso visual semibold. | **[DEFINIDO visual]** |
| 6 | **Próximo vencimento** | Data formatada, ou indicação coerente com a lógica existente. | **[DEFINIDO visual]** |
| 7 | **Situação** | Badge discreto com cor semântica. | **[DEFINIDO visual]** |
| 8 | **Ações** | Controle compacto para visualizar/abrir detalhes; ícone olho ou reticências aparece em referências distintas. | **[DEFINIDO função; REFERÊNCIA ícone]** |

**[REGRA]** Não inventar CPF, telefone, número de venda, campos derivados ou regras de cálculo. Exibir metadados somente se o componente/modelo real os disponibilizar. O HTML antigo mostra `Venda #ID` abaixo do nome; uma proposta posterior mostrou CPF — essa escolha **não está definitivamente fixada**.

**[DEFINIDO]** Não inserir uma coluna extra chamada **“Crediário”** ou o rótulo decorativo removido do mockup.

### 4.3 Comportamento e integração existentes

O usuário compartilhou o TypeScript de `ListarVendas`, com o seguinte fluxo **[DEFINIDO]**:

```ts
private readonly servico = inject(ServicoDemonstracao);
protected readonly vendas = this.servico.abertas;
protected readonly referencia = this.servico.referencia;
protected readonly termo = signal('');
protected readonly situacao = signal<FiltroSituacaoVenda>('Todas');
protected readonly resultados = computed(() =>
  buscarVendas(this.vendas(), this.termo(), this.situacao()),
);
protected readonly totalPaginas = computed(() =>
  obterTotalPaginas(this.resultados().length),
);
// linkedSignal mantém a página válida e volta à página 1 quando critérios mudam.
protected readonly vendasPagina = computed(() =>
  obterPagina(this.resultados(), this.paginaSelecionada()),
);
protected readonly faixaResultados = computed(() =>
  obterFaixaPaginacao(this.resultados().length, this.paginaSelecionada()),
);
```

- **[DEFINIDO]** A busca utiliza `termo`, `atualizarTermo(evento)` e `buscarVendas`.
- **[DEFINIDO]** O filtro usa `situacao`, `atualizarSituacao(evento)` e `FiltroSituacaoVenda`.
- **[DEFINIDO]** `linkedSignal` restaura página 1 ao alterar critérios e limita a página quando a quantidade de resultados muda.
- **[DEFINIDO]** `vendasPagina()` fornece o recorte paginado; `faixaResultados()` fornece a faixa; `selecionarPagina(pagina)` altera a página.
- **[DEFINIDO]** `limparPesquisa(campo)` zera o termo e a página, e devolve o foco ao campo; **não zera o filtro de situação** no código compartilhado.
- **[REGRA]** Se o botão disser **“Limpar filtros”**, sua ação precisa limpar também `situacao` ou o rótulo deve ser alterado para **“Limpar pesquisa”**. Não anunciar uma função que o código não executa.
- **[REGRA]** Inspecionar o tipo real `FiltroSituacaoVenda` antes de declarar opções do `select`. Os valores `Todas`, `Em dia`, `Atrasada`, `Quitada` aparecem nos protótipos, mas o enum/tipo exato deve ser confirmado.
- **[REGRA]** Preferir o componente `PaginacaoVendas` existente em vez de construir outra paginação duplicada; preservar a faixa correta (`obterFaixaPaginacao`), incluindo quando a lista está vazia.

### 4.4 Aparência da listagem

- **[REFERÊNCIA]** Card de tabela: `rounded-xl`/`rounded-2xl`, borda de 1px, superfície clara/escura e sombra leve.
- **[REFERÊNCIA]** Cabeçalho do card com padding `20–24px`, separador inferior e texto auxiliar pequeno.
- **[REFERÊNCIA]** Campo de pesquisa: altura ~`48px` na proposta Angular; ícone à esquerda, botão de limpar à direita quando houver termo.
- **[REFERÊNCIA]** Filtro: `select` com ícone, alinhado horizontalmente à busca em desktop, empilhado em telas estreitas.
- **[REFERÊNCIA]** Cabeçalho da tabela com superfície levemente distinta; títulos pequenos e semibold; linhas com padding vertical ~`12–16px` e hover sutil.
- **[REFERÊNCIA]** Tabela larga com `overflow-x-auto` no contêiner; não comprimir as colunas até ficarem ilegíveis.
- **[REFERÊNCIA]** Badge de situação com ponto colorido opcional, fundo translúcido e borda/raio suave.
- **[REFERÊNCIA]** Ações no fim da linha, compactas e com foco visível.
- **[DEFINIDO]** Estado vazio: informar que nenhuma venda corresponde aos critérios, com ação para limpar pesquisa se houver filtro ativo.

---

## 5. Página: nova venda

### 5.1 Estrutura mais recente

**[DEFINIDO]** Existe uma **página Angular dedicada** para `Nova venda`, com `app-cabecalho`, link de voltar, formulário e prévia das parcelas. A versão HTML anterior do protótipo usava modal; **a página dedicada Angular é a referência de implementação mais recente**. Não substituí-la por modal por conveniência.

**[DEFINIDO]** Layout em duas colunas em telas amplas:

- **Esquerda:** componente `app-identificacao-cliente`, seguido do card `Dados da venda`.
- **Direita:** card `Prévia das parcelas`, com resumo financeiro e tabela.
- **Abaixo:** mensagem de validação/resultado e ações `Cancelar` / `Confirmar cadastro demonstrativo`.
- **Topo:** voltar para Vendas, título, descrição, identificação de que o cadastro é demonstrativo e referência da sessão.

**[REFERÊNCIA]** Proporção da grade da refatoração Angular: `xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]`, `gap-5`, card com `rounded-2xl`, `border`, `shadow-sm`, padding `p-5 sm:p-6`; prévia pode ser `xl:sticky xl:top-6` se não interferir com o shell.

### 5.2 Campos presentes no template fornecido

| Grupo | Campo / controle | Estado |
| --- | --- | --- |
| Identificação | `app-identificacao-cliente` com `[campos]` e `[gradeAdaptativa]` | **[DEFINIDO]**; campos internos não foram enviados |
| Venda | `temEntrada` — select Sim/Não | **[DEFINIDO]** |
| Venda | `dataVenda` — input date | **[DEFINIDO]** |
| Venda | `valorTotal` — entrada monetária | **[DEFINIDO]** |
| Venda | `quantidadeParcelas` — numérico | **[DEFINIDO]** |
| Condicional | `valorEntrada` quando `rascunho().temEntrada === 'sim'` | **[DEFINIDO]** |
| Condicional | `formaEntrada` a partir da coleção `formas`, quando há entrada | **[DEFINIDO]** |
| Validação | `app-erro-campo` por campo | **[DEFINIDO]** |
| Ações | `confirmar($event)` e `cancelar()` | **[DEFINIDO]** |

**[REGRA]** Não adicionar novos campos (vendedor, produto, comissão, observação, forma de pagamento das parcelas etc.) sem requisito. Não inventar regras para datas, valores, número máximo de parcelas ou máscara; reutilizar as validações existentes.

### 5.3 Prévia das parcelas

**[DEFINIDO]** Usa `previa()` e só aparece quando a venda pode ser pré-visualizada. Exibir:

- **Valor da entrada:** `formatarDinheiro(venda.entrada?.valorCentavos ?? 0)`.
- **Saldo a parcelar:** `formatarDinheiro(subtrairCentavos(venda.valorTotalCentavos, venda.entrada?.valorCentavos ?? 0))`.
- **Tabela:** `Parcela`, `Valor`, `Vencimento`, `Situação`.
- **Identificação de entrada:** marcação `· Entrada` na parcela apropriada conforme o comportamento atual do modelo/template; não alterar regra de cálculo.
- **Sem prévia:** estado vazio com instrução para preencher/corrigir os dados; não afirmar que uma venda foi criada.

**[REFERÊNCIA]** Cards de resumo com fundo suave, valores grandes e `tabular-nums`; tabela com cabeçalho sticky, contêiner com `max-h-[22rem]` no original e `max-h-[24rem]` na refatoração, rolagem interna acessível e largura mínima para legibilidade.

**[DEFINIDO]** Mensagens existentes via `mensagem()` e desabilitação do botão enquanto `campos().submitting()` ou `concluido()`; preservar esses estados.

---

## 6. Página: detalhes de uma venda

**[DEFINIDO]** Foi solicitada uma tela de **dados de uma venda específica**, mostrando cliente, informações financeiras e parcelas, com possibilidade de acompanhar pagamentos.

**[REFERÊNCIA]** O mockup e o HTML demonstrativo apresentam:

1. Identificação da venda (ex.: número da venda) e contexto do cliente.
2. Painel de cliente (nome e identificadores disponíveis) e painel de venda (data, valor total, quantidade de parcelas).
3. Destaque do **saldo devedor** e badge de situação.
4. Tabela de parcelas: **Parcela, Valor, Vencimento, Situação, Ação**.
5. Ação contextual de **registrar pagamento** para parcela não paga; quando paga, indicar pagamento/data, se disponíveis.

**[REFERÊNCIA]** O HTML de demonstração abre detalhes em um modal amplo; o usuário também pediu uma **tela** e há mockup separado de detalhes. **[NÃO ESPECIFICADO]** Se o repositório deve usar rota própria, drawer ou modal. **Inspecionar a implementação atual** e manter o padrão existente; não criar um fluxo paralelo.

**[NÃO ESPECIFICADO]** Ações de edição/exclusão, parcelamento renegociado, descontos, multa/juros, estorno, comprovantes e outras regras de pagamento. Não implementar sem requisitos.

---

## 7. Registro de pagamento

**[REFERÊNCIA]** O protótipo demonstrativo incluía uma interação de registrar pagamento vinculada a uma parcela, com valor da parcela, data do pagamento, forma de pagamento e ações `Voltar` / `Confirmar pagamento`. As opções `Pix`, `Dinheiro`, `Cartão`, `Transferência` aparecem no **protótipo**, não como enum confirmado do domínio.

**[REGRA]** Reutilizar a tela, serviço e tipos existentes. Não inventar persistência ou estados de pagamento. Se não houver implementação, tratar como área a validar e não como requisito pronto.

---

## 8. Outros módulos apresentados no MVP

| Módulo | Evidência | Limite do escopo |
| --- | --- | --- |
| **Visão geral** | **[REFERÊNCIA]** Aparece na sidebar e em HTML com cards de métricas, vendas recentes e vencidas. | Não está definido que deva existir na versão atual; se existir, os cards podem ser avaliados **lá**, nunca reaplicados automaticamente na listagem. |
| **Relatórios** | **[REFERÊNCIA]** Protótipo mostra contadores de parcelas e botão CSV. | Relatórios finais, filtros e exportação **[NÃO ESPECIFICADOS]**. |
| **Configurações** | **[REFERÊNCIA]** Protótipo mostra dados de unidade, tema, modo e armazenamento. | Tela e preferências finais **[NÃO ESPECIFICADAS]**. |
| **Central de ajuda** | **[REFERÊNCIA]** Link na sidebar e página textual demonstrativa. | Conteúdo, fluxos e existência no produto final **[NÃO ESPECIFICADOS]**. |
| **Clientes / Parcelas** | **[DEFINIDO]** Removidos como abas independentes. | Não criar rotas de navegação para esses módulos só porque existem dados relacionados. |

---

## 9. Sistema de componentes e padrões de estilo

### 9.1 Superfícies e composição

| Elemento | Diretriz | Estado |
| --- | --- | --- |
| Cards | Fundo `surface`, borda de 1px, raio `xl`/`2xl`, sombra sutil. | **[REFERÊNCIA consistente]** |
| Separadores | `border-border`, usados em cabeçalhos, tabelas e rodapés de cards. | **[REFERÊNCIA consistente]** |
| Formulários | Labels acima dos controles, padding uniforme, fundo `surface-muted`, foco vermelho/tokens de foco. | **[DEFINIDO nos templates]** |
| Botão primário | Vermelho `action`/`brand`, texto branco, raio `lg`/`xl`, hover discreto, estado disabled claro. | **[DEFINIDO nos templates]** |
| Botão secundário | Superfície neutra com borda e hover suave. | **[DEFINIDO nos templates]** |
| Badges | Pequenos, legíveis, cores semânticas e fundo suave; não usar cor como única informação. | **[REFERÊNCIA consistente]** |
| Tabelas | Cabeçalho contrastante suavemente, linhas separadas, hover sutil, scroll horizontal em telas estreitas. | **[DEFINIDO visual]** |
| Busca | Lupa à esquerda, texto de ajuda/placeholder, limpeza contextual quando necessário. | **[DEFINIDO visual]** |
| Paginação | Faixa/total à esquerda, navegação à direita; estados ativo, hover e disabled. | **[DEFINIDO funcional; REFERÊNCIA visual]** |
| Estados vazios | Mensagem objetiva, sem excesso de ilustrações; ação útil se houver. | **[DEFINIDO visual]** |
| Ícones | Traço linear, tamanho típico `16–20px`, alinhados à linha de texto. | **[REFERÊNCIA]** |

### 9.2 Escala e espaçamento extraídos das refatorações

**[REFERÊNCIA]** Usar o espaçamento Tailwind já adotado. Padrões recorrentes:

- Distância entre blocos principais: `space-y-6` / `gap-5` (~`20–24px`).
- Cards e seções: `p-5 sm:p-6` (~`20–24px`).
- Campos: `gap-3` a `gap-5`; labels com `mb-1`/`mb-2`.
- Controles: altura aproximada `44–48px`, `px-3`/`px-4`.
- Botões: `px-4`/`px-6`, `py-2.5`/`py-3`.
- Raio: `rounded-lg` (~`8px`) para controles, `rounded-xl` (~`12px`) para itens e `rounded-2xl` (~`16px`) para painéis.
- Bordas: normalmente `1px`.
- Sombras: light de referência `0 6px 24px rgba(28,31,48,.045)`; dark `0 12px 36px rgba(0,0,0,.14)` nos HTMLs originais. Usar `shadow-sm`/token do repositório onde possível.

**[NÃO ESPECIFICADO]** Uma escala formal de design tokens para todos os tamanhos. Não criar dezenas de valores arbitrários ou microajustes por componente.

### 9.3 Responsividade

**[DEFINIDO]** A interface deve funcionar em janelas de desktop redimensionáveis e larguras menores, mantendo legibilidade e acesso aos controles.

**[REFERÊNCIA]** Breakpoints presentes no HTML demonstrativo: sidebar de `248px` para `76px` abaixo de `1100px`, ocultada abaixo de `680px`; esses valores são referências de protótipo, não exigência definitiva. No Angular, usar os breakpoints configurados e a estrutura do shell.

**[REFERÊNCIA]**

- Listagem: filtros em linha em desktop, empilhados em telas menores; tabela com rolagem horizontal, não colunas comprimidas.
- Nova venda: grade de duas colunas em `xl`, uma coluna abaixo; campos internos adaptáveis por `@container`.
- Botões de rodapé: lado a lado em telas amplas, empilhados em telas estreitas.
- Textos longos e valores: evitar overflow e truncamento que esconda informação essencial.
- Modais existentes: largura máxima e rolagem vertical quando necessário; não impor modal se a tela já usa rota.

**[NÃO ESPECIFICADO]** Experiência mobile completa, comportamento de drawer e medidas mínimas da janela Tauri. Não introduzir novos requisitos mobile.

### 9.4 Acessibilidade e estados

- Manter `label for`, `aria-describedby`, `role="alert"`, `scope` nas tabelas, `caption` acessível e `aria-label` em controles apenas com ícone, conforme os templates enviados.
- Usar `focus-visible` com tokens de foco existentes; não remover outline sem substituição.
- Garantir contraste suficiente em light e dark, principalmente nos badges e textos secundários.
- Preservar estados de loading/submitting, disabled, vazio e erro.
- Respeitar navegação por teclado em pesquisa, filtros, tabelas com scroll e ações.
- **[REFERÊNCIA]** Transições curtas de hover/foco; evitar animações contínuas e mudanças de layout inesperadas.

---

## 10. Referências visuais e arquivos de origem

Os nomes abaixo identificam **arquivos de referência reais desta conversa**. No pacote de referências que acompanha este `DESIGN.md`, eles ficam em `references/`. Se este Markdown for copiado isoladamente ao repositório, os links de imagem só funcionarão depois de copiar essa pasta.

### Mockups visuais

1. `references/a_clean_modern_ui_dashboard_mockup_for_mercadão.png` — exploração inicial do dashboard.
2. `references/a_clean_modern_dashboard_ui_using_the_mercadão_do.png` — aplicação da identidade Mercadão dos Óculos.
3. `references/a_clean_modern_ui_mockup_portuguese_in_the_same.png` — iteração clean da interface.
4. `references/a_detailed_ui_screenshot_of_a_sales_detail_page_fo.png` — referência de detalhes de uma venda.
5. `references/a_clean_modern_desktop_app_dashboard_ui_light_the.png` — mockup claro.
6. `references/a_dark_mode_version_of_the_same_sales_dashboard_ui.png` — mockup dark.

### Implementações demonstrativas

- `references/mercadao_oculos_dashboard_dark.html` — HTML/Tailwind/JS demonstrativo, com shell, sidebar, listagem, detalhes, cadastro, pagamentos e telas auxiliares.
- `references/mercadao_oculos_dashboard_light.html` — variação clara do protótipo HTML.
- `references/nova_venda_refatorada.component.html` — template Angular refatorado para cadastro de venda, preservando os bindings conhecidos.

**Atenção:** mockups e HTMLs demonstrativos **não são fontes de verdade para lógica de negócio, nomes de propriedades, dados ou rotas**. Alguns mostram cards que foram **explicitamente removidos da listagem** em decisão posterior. Usar imagens para composição, densidade e linguagem visual; usar o repositório para comportamento e integração.

---

## 11. Pontos ainda não especificados — não inventar

1. Arquivo oficial da logo, manual de marca e fidelidade exata dos tons corporativos.
2. Qual tema deve ser o padrão e como a preferência é salva/alternada.
3. Contrato completo do componente `TabelaVendas`, incluindo tipos, propriedades e ações de linha.
4. Contrato completo do componente `PaginacaoVendas`.
5. Campos internos e layout exato de `IdentificacaoCliente`.
6. Valores exatos de `FiltroSituacaoVenda` e regras de status; regras de vencimento, parcelas, entrada e pagamento.
7. Estrutura de rotas e se detalhes/pagamentos são páginas, modais ou drawers no repositório atual.
8. Implementação definitiva de Visão geral, Relatórios, Configurações e Ajuda.
9. Fonte instalada, biblioteca de ícones e versões das dependências.
10. Padrão de layout para telas muito pequenas, sidebar mobile e tamanho mínimo de janela desktop.
11. Requisitos de backend, persistência, sincronização, exportação e autenticação.
12. Critérios exatos de ordenação, colunas adicionais, máscaras e formatação que não estejam presentes no código atual.

Quando um desses pontos for indispensável para uma tarefa, **inspecionar o código primeiro**. Se continuar indeterminado, registrar a dúvida e não decidir silenciosamente.

---

## 12. Plano de execução obrigatório para Codex

1. **Auditar antes de editar:** localizar shell, estilos globais, tokens, rotas, `ListarVendas`, `TabelaVendas`, `PaginacaoVendas`, `IdentificacaoCliente`, `Cabecalho`, página de nova venda e páginas de detalhe/pagamento, se existirem.
2. **Inventariar o que já funciona:** bindings, tipos, Signals, formulários, filtros, paginação, navegação, estados e testes. Não substituir esses mecanismos por dados estáticos.
3. **Consolidar o tema:** mapear cores e espaçamentos dos protótipos para tokens existentes; manter light/dark consistentes sem criar paleta paralela.
4. **Implementar o shell com mínima intervenção:** preservar sidebar e busca existentes; evitar duplicações; manter navegação sem `Clientes` e `Parcelas` independentes.
5. **Refatorar a listagem primeiro:** **sem cards de indicadores**; título, CTA, pesquisa, filtro, tabela e paginação, com dados de `vendasPagina()` e componentes reais.
6. **Refatorar componentes filhos:** estilizar a tabela e paginação dentro de seus próprios componentes; não simular a tabela com dados hardcoded no componente pai.
7. **Refatorar nova venda:** preservar `[formField]`, componentes de identificação/erro, campos condicionais, prévia e ações; apenas aprimorar composição e aparência.
8. **Harmonizar detalhes e pagamentos:** somente nos fluxos já existentes; aplicar o mesmo sistema visual.
9. **Validar:** executar scripts de build/lint/testes existentes e conferir visualmente light/dark, janela larga/estreita, foco por teclado, estados vazio/erro/loading e tabelas com muitos dados.
10. **Entregar relatório:** listar arquivos alterados, diferenças visuais, verificações executadas, pendências e qualquer divergência entre este documento e o repositório.

### Restrições de implementação

**NÃO FAZER:**

- Recriar o projeto do zero.
- Trocar Angular/Tailwind/Tauri por outra stack.
- Adicionar backend C# ou endpoints sem solicitação.
- Substituir `ServicoDemonstracao` por arrays fictícios em produção.
- Mudar regras de cálculo ou de status para combinar com mockups.
- Inserir cards KPI na **listagem**.
- Adicionar abas independentes **Clientes** e **Parcelas**.
- Reintroduzir o texto decorativo **“Crediário”** removido da tabela.
- Assumir nomes de inputs, enums ou rotas não verificados.
- Criar modais ou novas páginas duplicando fluxos existentes.
- Introduzir dependências de UI ou estilos globais destrutivos sem necessidade.

### Critérios de aceite visual e técnico

- [ ] Interface coerente com a identidade Mercadão dos Óculos e os mockups claro/escuro.
- [ ] Sidebar e busca integradas à estrutura real do aplicativo.
- [ ] Listagem sem cards financeiros, com foco nos dados das vendas.
- [ ] Colunas de tabela apresentadas quando suportadas pelos dados reais, sem campos inventados.
- [ ] Pesquisa, filtro e paginação continuam operando por Signals/funções existentes.
- [ ] Componentes de nova venda e prévia mantêm validações e comportamento originais.
- [ ] Nenhuma aba `Clientes`/`Parcelas` independente foi criada.
- [ ] Não foi recolocado o rótulo decorativo `Crediário` na área indicada.
- [ ] Tema claro e escuro legíveis, sem overflow crítico, com foco visível.
- [ ] Build e testes existentes executados; limitações documentadas.

---

## 13. Instrução curta para iniciar uma tarefa no Codex

> Leia `DESIGN.md` integralmente e examine as referências visuais em `references/`. Antes de alterar qualquer arquivo, inspecione o código atual e identifique os componentes, rotas, tokens e contratos existentes. Implemente o design da página solicitada fielmente, preservando Angular, Tailwind, Tauri, Signals, formulários e serviços existentes. Dê prioridade às decisões marcadas `[DEFINIDO]` e à remoção dos cards KPI da listagem; use itens `[REFERÊNCIA]` apenas como guia visual e não implemente requisitos `[NÃO ESPECIFICADO]`. Ao final, relate os arquivos alterados, testes executados e dúvidas que exigem decisão do usuário.
