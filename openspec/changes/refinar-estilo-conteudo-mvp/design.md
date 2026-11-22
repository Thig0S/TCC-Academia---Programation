# Design

## Context

Ver motivação e limites em `proposal.md`. O desenho é necessário por atravessar páginas e componentes compartilhados, com risco de regressão na lateral e na densidade desktop.

Estado observado na exploração e reconfirmado no planejamento:

- `frontend/package.json` já fixa Angular 22.2.6 e Tailwind/PostCSS 4.3.5. `src/styles.css` possui tokens por `data-tema`, `@theme inline`, Preflight e variante escura; não há motivo para repetir a migração técnica.
- A paleta atual (`#212529`/`#343a40` no escuro), painéis `rounded-md` e selos sólidos diferem dos HTMLs (`#111217`/`#1d1e24`, cantos maiores e selos suaves). Tabelas e Relatórios têm apresentação básica; os fluxos já existem.
- `app.html` separa `.barra-lateral` e `.area-principal`; `app.css` usa tokens próprios da lateral, mas cores, tipografia e seletores globais também podem afetá-la indiretamente.
- Cadastro/edição têm templates próprios, identificação compartilhada e prévia; detalhe tem CSS local com composição compacta, overrides e rolagem para excedentes. Preservar comportamento; não transplantar o shell modal dos exemplos.
- `e2e/demonstracao-inicial.spec.ts`, `e2e/formularios-vendas.spec.ts` e `e2e/paginacao-fixture.spec.ts` já cobrem temas, foco, contrastes, captura, fluxos e geometria. Adaptar seletor visual só quando necessário, sem afrouxar asserções funcionais.

PRD 1.16 e TDD 1.20 sustentam esta mudança conforme a rastreabilidade em `proposal.md`. Suas descrições históricas de migração não substituem a evidência do código atual. A situação de tarefas completa de `troca-para-tailwind` não é aceite visual dos HTMLs novos. Nenhuma suíte de aplicação foi executada para redigir este plano. O cadastro lateral (DEC-025/CA-032) foi implementado depois da autorização separada; verificações e limites reais estão em `frontend/README.md`. A pendência de zoom nativo 200% foi encerrada pelo relato e autorização do solicitante, com as limitações de evidência descritas em D5 e na tarefa 7.3.

## Goals / Non-Goals

**Goals:**

- Refinar a apresentação sobre a arquitetura existente, com tokens semânticos e composição consistente, não apenas troca de cores.
- Separar acabamento visual de fluxo/conteúdo e medir regressões em vez de presumir fidelidade por uso de utilitários.
- Isolar a lateral das mudanças globais e preservar o tema de sessão, o aviso, as regiões acessíveis e o foco.

**Non-Goals:**

- Alterar serviços, modelos, cálculos, seed, comandos, rascunhos, regras, validadores, rotas ou mecanismo de tema/modal.
- Atualizar dependências, reconfigurar build, importar scripts dos exemplos, adicionar catálogo de ícones, fonte remota ou componentes genéricos sem necessidade.
- Copiar dimensões literalmente, refazer a lateral ou criar novos controles e conteúdo para preencher a composição.

## Decisions

### D1 — Referência visual nova, contratos existentes como limite

Usar os HTMLs claro/escuro como referência principal de acabamento, com PNGs complementares para composição compacta. Em conflito, prevalecem funcionalidades, campos, legibilidade e densidade existentes: os HTMLs demonstram outro produto em vários pontos. Registrar adaptações por seção na matriz visual, não transformar desvios funcionais em tarefas.

**Alternativas:** copiar HTML/JavaScript integralmente violaria contratos; usar apenas os PNGs ignoraria a direção recém-solicitada; exigir igualdade pixel a pixel é incompatível com conteúdo, lateral e dimensões distintos.

### D2 — Tokens semânticos no conteúdo, sem redesenho da lateral

Reutilizar `src/styles.css` e seu mapeamento `@theme inline` para superfícies, texto, bordas, ação primária, foco e situações. Conservar valores e consumidores de `--app-sidebar-*`; não aplicar nova família/tamanho/peso global que altere a lateral. Qualquer refinamento tipográfico deve ficar na área principal e respeitar a herança local. Manter fonte de sistema disponível; aproximar pesos, hierarquia e espaçamento sem carregar Inter do Google Fonts.

Pontos de partida extraídos dos HTMLs, sujeitos à medição de contraste:

| Papel | Claro | Escuro |
| --- | --- | --- |
| Canvas | `#f5f6f9` | `#111217` |
| Painel | `#ffffff` | `#1d1e24` |
| Superfície elevada/campos | `#f8f9fb` | `#25262d` |
| Bordas decorativas | `#e5e7ec` | `#33343d` |
| Ação principal | `#d72848` | `#d72848` |

Não equiparar bordas decorativas a indicadores essenciais: campos/foco precisam dos contrastes exigidos. Definir pares fundo/texto semânticos por situação, inclusive neutra, para os selos suaves; não usar a mesma cor para fundo e texto nem depender só de transparência. Cores secundárias dos exemplos não são automaticamente aprovadas. Revisar também `--consulta-link` para evitar links desconectados da nova paleta, preservando contraste e semântica.

Usar painéis com raio próximo de 12 px e sombra discreta, controles próximos de 8 px e escala de espaçamento consistente como referências, não medidas obrigatórias contra a densidade. Manter texto de tabelas legível na escala atual; não copiar fontes auxiliares de 10/11 px indiscriminadamente. Não adicionar animações de deslocamento de botão como requisito.

**Alternativas:** cores arbitrárias espalhadas por página dificultam manutenção; redefinir fonte em `body` ou cores da lateral provoca mudança fora do escopo. `@theme inline` com variáveis existentes foi confirmado na documentação oficial Tailwind via Context7 (`colors`/`theme`), sem comprovar por si só o resultado local do patch instalado.

### D3 — Composição por superfície, com componentes existentes

Manter utilitários literais nos templates e CSS local apenas para composição específica, conforme DEC-021. Refinar cabeçalho, selos, modal, paginação e identificação compartilhados, sem criar um design system genérico. Alteração em template inline do selo é apresentação, não autorização para modificar classificação.

| Superfície | Aplicação planejada | Invariantes principais |
| --- | --- | --- |
| Área principal/cabeçalho | Alinhamento, superfície, espaçamento e hierarquia; sem copiar busca/perfil/notificações superiores dos HTMLs ou aviso global persistente | Alternância, título focável, navegação e lateral intactos; divulgação demonstrativa em Configurações/confirmações |
| Visão Geral | Valores destacados, rótulos secundários, painéis e divisórias; SVG local decorativo somente se útil | Quatro indicadores, três resumos de até cinco, referência/período e links |
| Vendas/Quitadas | Conjunto visual único para critérios, tabela e paginação; dados a 18 px, line-height 20 px e padding de célula compartilhado com parcelas; Nova venda como âncora estilizada de ação principal; hover e selos suaves | Dez linhas, colunas, ações textuais identificáveis, Limpar pesquisa/situação e busca local |
| Cadastro | Em `md` (768 px), formulário à esquerda e prévia à direita alinhados ao topo; abaixo disso, empilhar; nome/descrição mais amplos que valor/quantidade quando a largura permitir | Mesmos campos/rótulos, validações, entrada, prévia completa e ações; evidências e limite de zoom em `frontend/README.md` |
| Edição | Preservar painéis e campos atuais, sem receber indiretamente a compactação do cadastro | Somente os quatro campos do cliente; comportamento e aparência padrão preservados |
| Detalhe | Cliente/venda lado a lado, valores destacados e parcelas a 18 px com mesmo line-height/padding das tabelas de vendas | Página, entrada separada, dados completos, até dez parcelas visíveis e excedente interno |
| Recebimento | Aparência do `dialog`, campos e resumos coerente com formulários | Modal nativo, valor exato, sequência, confirmação/cancelamento/foco |
| Relatórios | Quatro seções de consultas em painéis; todas as tabelas com dados a 18 px, line-height 20 px e padding de dados/cabeçalhos idênticos ao padrão de Vendas/Quitadas e parcelas | Mês fixo, posição na referência, todos os registros, regiões roláveis e exportação indisponível |
| Configurações/ausências | Divisões, títulos/descrições e mensagens coerentes | Conteúdo explicativo atual, sem controles novos; retornos e estados distintos |

Não substituir links existentes por eventos de clique em linha ou menus de reticências que escondam ações. Não acrescentar dados/indicadores para imitar os exemplos. Decoração não pode alterar nomes acessíveis, árvore de campos ou cálculos.

**Alternativas:** refinar só seis páginas deixaria edição/recebimento inconsistentes; modificar apenas tokens preservaria a estrutura básica que motivou a mudança.

### D4 — Densidade e acessibilidade condicionam medidas

**Cadastro lateral — DEC-025:** no template de Nova venda, agrupar identificação e
dados financeiros na coluna esquerda e prévia na direita em uma grade mobile-first
de uma coluna na base e duas a partir de `md` (48rem/768 px). Usar colunas
encolhíveis e `min-w-0`, mantendo a ordem lógica do formulário e uma única submissão.
Dimensionar campos dentro da coluna: nome/descrição mais amplos, valor total e
quantidade compactos, entrada proporcional quando presente; reduzir espaço excessivo
sem reduzir fonte nem alterar limites dos dados. Ajustes exatos de proporção/padding
serão aferidos no apply, não tratados como medição já realizada. Preservar a edição:
priorizar estilos locais ou variante opt-in de identificação, nunca mudança global
silenciosa. Não adicionar sticky obrigatório, duplicar ações ou exigir ausência de
rolagem vertical. Prévia mantém estado inválido, recálculo, região rolável/caption e
todas as parcelas. Verificar dois temas, 1366×768/390×844, 767/768 px e tamanho
intermediário com lateral, incluindo erros/entrada e overflow; se houver conflito
material de legibilidade, perguntar antes de mudar o breakpoint. Zoom nativo 200%
segue 7.3, sem considerar testes de viewport como equivalentes.

Calibrar espaçamento de listas/detalhe a partir do espaço real após cabeçalho, aviso e critérios. Usar fonte de 18 px, line-height de 20 px e padding uniforme nas células das tabelas de vendas, parcelas e Relatórios: dados com 10 px horizontal/4 px vertical; cabeçalho com 10 px horizontal/8 px vertical. Preservar os cenários CA-027/028: dez vendas ou até dez parcelas no desktop padrão, com paginação quando necessária, sem rolagem vertical da página. Relatórios mantêm rolagem vertical normal entre suas quatro seções, sem exigência de caberem na primeira tela. Se a tabela de parcelas ultrapassar o limite desktop, compactar/reorganizar os blocos existentes de cliente/venda, preservando todos os campos e sem reduzir sua fonte, antes de alterar o critério de rolagem. Reorganização e rolagem são permitidas em 390×844, textos extensos e zoom nativo 200%; horizontal apenas na região identificada da tabela. Não usar `overflow: hidden`, elipse de dados obrigatórios ou fonte artificialmente menor para cumprir geometria.

Conferir CSS de detalhe e seus overrides ao ajustar medidas, sem remover regras apenas por parecerem antigas. Manter regiões roláveis identificadas, cabeçalhos, foco, erros associados e mensagens anunciáveis. Se a direção visual não couber sem perda de legibilidade, parar o caso afetado e solicitar revisão; não reduzir paginação ou mudar os critérios por conta própria.

**Alternativas:** adotar oito registros ou abrir detalhe em modal facilitaria copiar o HTML, mas alteraria requisitos; impor zero rolagem em todos os cenários cortaria conteúdo.

### D5a — Foco programático de navegação sem contorno decorativo

Ao trocar de rota, a aplicação continua movendo o foco ao título para anunciar o novo contexto e manter a navegação acessível. Títulos e a área principal não são controles acionáveis; não devem herdar contorno apenas por receber esse foco programático. Manter os indicadores `:focus-visible` nos controles interativos e nos destinos que realmente precisam de indicação de foco por teclado. Verificar a troca por clique nas abas em todos os destinos principais, nos dois temas, e confirmar separadamente que um controle continua com foco visível por teclado.

**Alternativas:** remover todos os indicadores de foco prejudicaria a navegação por teclado; manter `h1:focus`/`main:focus` destaca como controle uma região informativa.

### D5 — Evidência visual e regressão acompanham cada entrega

Antes das edições de apresentação, capturar a linha de base de conteúdo e lateral nos dois temas/viewports, registrar comandos reais e verificar disponibilidade dos dois HTMLs locais sem modificá-los. Comparar referência, antes/depois e estilo computado por hierarquia, alinhamento, superfície, cor, tipografia, espaçamento, borda/canto, sombra e estados. Screenshots são evidência de inspeção, não aprovação automática.

Registrar a matriz em `frontend/README.md`, com tema, viewport, cenário sintético, referência, caminho da captura, resultado e diferenças justificadas. Cobrir todas as superfícies da tabela D3, os estados vazio/erro/ausente e normal/hover/foco/ativo/desabilitado pertinentes. Verificar o contexto temático do modal e ausência de mudança indireta na lateral. Não incluir dados das demonstrações nas fixtures.

Decisão complementar autorizada no Harness durante o apply (21/11/2026): excluir somente `public/imgs/exemplos/mercadao_oculos_dashboard_light.html` e `public/imgs/exemplos/mercadao_oculos_dashboard_dark.html` da checagem Prettier por caminhos explícitos em `frontend/.prettierignore`. A primeira checagem final falhou apenas nesses arquivos locais fornecidos; reformatá-los violaria sua preservação. Não ignorar toda a pasta, não modificar/incluir os HTMLs e manter a checagem integral do código, testes e documentação. Essa exceção de ferramenta não altera dependências, budgets ou arquitetura.

Por entrega coerente: testes de componentes afetados, E2E pertinentes nos dois temas/viewports, build e registro real; commit próprio com testes/documentação. Ao final: regressão integral da aplicação e fixture, dois builds e formatação, sem elevar budgets. Não remover expectativas financeiras, privacidade, rede, densidade ou foco para acomodar o estilo. Testes que localizam valores pelo `<p>` genérico dos indicadores merecem atenção ao adicionar decoração.

Zoom nativo 200% previa registro manual de navegador/versão, escala Windows e viewport útil; redução do viewport, CSS zoom ou escala de captura não substituem essa verificação. Em 21/11/2026, o solicitante relatou ausência de distorção e barras laterais desnecessárias e empilhamento esperado, autorizando encerrar 7.3 com esses dados. Essa exceção dispensa a complementação para abertura do PR, sem afirmar os metadados ou a cobertura por tela/tema/teclado não fornecidos. O relato e suas limitações estão em `frontend/README.md` e substituem as indicações históricas de pendência deste plano. Não confundir revisão visual técnica com aceite da ótica ou FASE-008.

**Alternativas:** só build/unitários não detecta composição; só snapshots não prova comportamento; uma comparação sem cenários fixos e diferenças registradas repete a lacuna da migração anterior.

## Risks / Trade-offs

- [Tokens compartilhados alterarem a lateral] → manter tokens próprios, escopar tipografia ao conteúdo e comparar baseline/estilos computados nos dois temas e tamanhos.
- [Visual espaçoso dos HTMLs violar densidade] → priorizar contratos existentes e medir geometria em cada entrega de consultas.
- [Fundos/selos suaves perderem contraste] → medir pares reais, foco e controles; adaptar a cor da referência em vez de reduzir requisitos.
- [Refatoração de marcação mudar rótulos, foco ou testes] → preservar bindings/semântica e executar testes junto da superfície alterada.
- [HTMLs não rastreados indisponíveis em outra máquina] → verificar antes de apply, usar arquivos locais fornecidos sem inclusão silenciosa; bloquear comparação se faltarem.
- [CDNs dos exemplos impedirem renderização ou introduzirem tráfego] → não importar dependências no MVP; inspeção do exemplo é separada da aplicação, cujo teste continua proibindo rede externa. Registrar eventual limitação de renderização da referência.
- [Fonte de sistema não ser idêntica à Inter] → diferença deliberada para evitar nova fonte/dependência; preservar hierarquia e registrar a adaptação.
- [Documentos históricos parecerem evidência atual] → apontar resultados da execução futura no README; não reutilizar contagens antigas como nova regressão.

## Migration Plan

1. Revisar proposta e deltas. O apply geral foi autorizado; a extensão de cadastro recebeu autorização separada e foi implementada na `feature/refinar-estilo-conteudo-mvp`, sem PR antecipado.
2. No apply, registrar referências e linha de base; refinar fundação/compartilhados sem tocar na lateral.
3. Entregar Visão Geral, consultas, formulários/recebimento e Relatórios/Configurações/estados em unidades coerentes, com verificações e commits individuais.
4. Consolidar matriz visual, zoom e regressão integral. Em `frontend/`: `npm test -- --watch=false`, `npm run test:e2e`, `npm run test:e2e:paginacao-fixture`, `npm run build`, `npx ng run vendas-em-aberto:build-paginacao-fixture` e `npm run format:check`. Na raiz: validação estrita da Change. A fixture não possui configuração `production`.
5. Somente após todo o escopo implementado e verificações aplicáveis concluídas, preparar o PR único conforme template; merge depende de autorização explícita. Sync/archive não são parte desta proposta.

Não há migração de dados nem alteração de dependências. Se for necessário rollback, reverter apenas commits próprios de apresentação na feature por operação não destrutiva, preservando trabalho alheio; não restaurar Bootstrap nem descartar arquivos do usuário.
