# Design

## Context

Ver motivação e capacidades em `proposal.md`. PRD 1.1 e TDD 1.4 precedem esta mudança:
PEN-006 conciliada e HIP-004 aceita para Configurações explicativa, sem aceite comercial.

Inspeção em 13/11/2026: `App` standalone/OnPush contém somente página técnica; `app.config.ts`
registra listeners globais, sem Router. `styles.scss` importa Bootstrap por Sass uma vez.
`package.json` fixa Angular 22.2.6 e Bootstrap 5.3.9, sem Router nem Forms. A base tem
Vitest/TestBed/jsdom e Playwright Chromium em 1366 × 768 e 390 × 844, com servidor próprio
em loopback. Os testes de abertura exigem `h1` igual ao produto, ausência de links/botões
e padding de 48 px: são contratos da página anterior, não invariantes do painel.

A especificação principal `demonstracao-inicial` existe. A delta altera três requisitos
preservando os nomes de todos os seus cenários; o requisito de aviso permanece intacto.
O arquivo histórico da base não será reescrito. Há imagens não versionadas em
`frontend/public/imgs/`; o solicitante indicou `logo-franquia.jpg` para a identidade e
`exemplos/` como referência de layout. Esta revisão apenas registra essa direção:
não modifica, move nem inclui as imagens em commits.

## Goals / Non-Goals

**Goals:**
- Usar uma única estrutura visual e uma instância raiz do serviço de tema entre rotas.
- Manter rotas, orientação por foco e estilos verificáveis sem introduzir estado comercial.
- Evoluir testes da base sem remover proteções de rede/storage e erros de execução.

**Non-Goals:**
- Não criar infraestrutura genérica de componentes, tabela, modal ou modelos para uso futuro.
- Não considerar placeholders como consultas vazias nem suporte amplo como comprovado.
- Não alterar configurações, dependências ou código na entrega de planejamento.

## Decisions

### Estrutura persistente com páginas standalone sob demanda

Aplicar DEC-003: `app.ts/html/scss` mantém identidade, navegação, aviso literal,
cabeçalho e `RouterOutlet`. Criar `app.routes.ts` e registrar `provideRouter` em
`app.config.ts`, preservando listeners existentes. Páginas standalone com HTML separado,
carregadas por `loadComponent`, organizadas em `funcionalidades/` conforme o TDD.
Criar somente barra de navegação e cabeçalho de página compartilhados que já tenham
consumidores; o cabeçalho da estrutura pode permanecer no template raiz.

| Rota | Conteúdo futuro desta fase |
| --- | --- |
| `/` | Redirecionamento com correspondência completa para `/visao-geral` |
| `/visao-geral` | Título Visão Geral e conteúdo comercial indisponível |
| `/vendas` | Título Vendas, indisponibilidade e acesso interno a Quitadas |
| `/vendas/quitadas` | Título Vendas quitadas, indisponibilidade e retorno a Vendas |
| `/relatorios` | Título Relatórios e indisponibilidade |
| `/configuracoes` | Limites confirmados em PRD/CA-022 |
| `**` | Página não encontrada com retorno para Visão Geral |

Declarar caminhos específicos antes do wildcard; não declarar cadastrar, editar ou `:id`
sem consumidores. Usar links de navegação reais, sem `href="#"`, e metadados de título
de rota para título de documento contextual junto ao nome do produto.

Alternativas rejeitadas: alternar páginas manualmente por signal (perde URL e histórico);
criar todo o mapa de vendas agora (antecipa funcionalidades); navegação por recarga completa
(perde o tema da sessão). Acesso direto e recarga serão verificados no servidor atual;
uma implantação futura precisará de fallback SPA, sem configurar hospedagem nesta fase.

### Navegação sem ambiguidade de estado ativo

Vendas permanece visualmente ativa em Quitadas, mas somente o link correspondente à página
exata recebe `aria-current="page"`; evitar duas páginas anunciadas como atuais. Os quatro
módulos têm ícones SVG locais próprios e decorativos com `aria-hidden`, mais rótulo textual.
Administrador é acompanhado de indicação de perfil estático, sem avatar remoto ou menu de conta.
O atalho adicional de Configurações tem nome acessível claro.

No desktop, usar coluna lateral e conteúdo principal; abaixo do breakpoint `md` do Bootstrap,
reorganizar a navegação como bloco no fluxo acima do conteúdo. Não usar drawer, offcanvas ou
menu oculto: com quatro módulos isso evita estado extra e controle de foco desnecessário.
Não importar plugins JS Bootstrap/Popper. Fonte de sistema, espaçamento e destaque discretos;
nenhum ativo novo de procedência desconhecida.

### Logo e referências de layout sem importar requisitos das imagens

No apply autorizado, usar `frontend/public/imgs/logo-franquia.jpg`, servida localmente,
na área de identidade da estrutura. Preservar proporção e composição da logo, sem
distorcer, recolorir ou converter a marca em uma imagem gerada. Ajustar seu tamanho para
não deslocar navegação e conteúdo; manter legibilidade nos dois temas e viewports.
Fornecer nome acessível da marca, evitando leitura duplicada caso a imagem esteja junto
do mesmo texto identificador. Verificar carregamento local e ausência de imagem quebrada.

Referências em `frontend/public/imgs/exemplos/`: `exemploDesignDark.png` e
`exemploListagemDeVendas.png` orientam a composição lateral/cabeçalho/conteúdo, alinhamento,
espaçamento e hierarquia. `exemploCadastrarVenda.png` e `exemploDadosDaVenda.png` também
servem somente como referências de organização visual; não autorizam formulários ou
detalhes comerciais nesta fase. Adaptar a composição ao layout responsivo e aos dois
temas já especificados, sem exigir reprodução pixel a pixel ou trocar automaticamente
os tokens definidos pela documentação pelas cores dos exemplos.

PRD, TDD e deltas continuam determinando módulos, campos, dados, validações e regras.
Não copiar nomes, valores, totais, situações, filtros, busca global, controles de janela,
notificações ou ações mostrados nas capturas sem previsão documental no recorte autorizado.
Não usar capturas como fundo ou tela pronta, nem carregar os arquivos de referência na
interface. Na FASE-003, preservar as páginas honestamente indisponíveis. A revisão visual
compara estrutura e hierarquia, não fidelidade a formulários ou dados das imagens.

Alternativa rejeitada: reproduzir integralmente as capturas, pois isso criaria funcionalidades
e regras não autorizadas, além de confundir referência visual com contrato de produto.

### Tema em serviço raiz e contexto visual único

Criar `nucleo/configuracao/servico-tema.ts` com signal privado inicial escuro, leitura pública
e comando de alternância; não fornecer outra instância em páginas lazy. Mapear valores internos
para `dark`/`light` e vincular `data-bs-theme` ao host da aplicação, com altura mínima de viewport
e fundo/texto explícitos pelas variáveis Bootstrap, evitando bordas externas brancas.

O controle é um botão nativo, com nome estável “Tema escuro”, `aria-pressed` coerente e texto
visível “Tema ativo: Escuro/Claro”; Enter e Espaço alternam sem mover o foco. Não ler
`prefers-color-scheme`, storage ou cookies. O signal da instância raiz basta; nenhum effect
para copiar estado. Preferência de movimento reduzido afeta somente eventuais transições.

Manter uma importação Sass global de Bootstrap. Acrescentar tokens e temas em
`src/estilos/_tokens.scss` e `_temas.scss` apenas para necessidades reais, sem outro sistema
visual. Priorizar `--bs-*`, superfícies, bordas, foco e destaque; SCSS por componente somente
para layout específico. A integração atual tem warning de `@import` depreciado: manter
registrado, não suprimir nem mudar para CDN/CSS pronto por conveniência.

Alternativas rejeitadas: tema por página (fragmenta a escolha); preferência persistente ou
automática (contraria o produto); seletor visual de biblioteca extra (desnecessário).

### Foco e hierarquia semântica por página

Identidade global não será um segundo `h1`. Cada destino apresenta exatamente um `h1` por meio
do cabeçalho de página, com `tabindex="-1"` quando necessário para foco programático. Após
navegação interna para página diferente, a estrutura aguarda a ativação e renderização do
destino antes de focar esse título; não usar timers arbitrários ou detecção forçada para
ocultar problemas zoneless. Descartar pedidos de foco obsoletos em navegação rápida e liberar
subscrições/efeitos junto ao proprietário. Não roubar foco por alternância de tema nem por
clique no link da página já ativa. Na abertura direta, evitar foco programático desnecessário.

Um link “Ir para o conteúdo” visível ao foco leva à área principal. Ordem DOM segue ordem
visual em ambos os layouts. Foco, localização e tema combinam texto/semântica, não só cor.
Mínimos de contraste da delta são critérios técnicos propostos a partir do alvo WCAG já
descrito no PRD, sem certificação ou alegação de aprovação da ótica.

Alternativa rejeitada: confiar somente no título de documento ou manter foco em link antigo
após trocar a página, o que dificulta a orientação por teclado.

### Dependência estritamente alinhada e testes proporcionais

No apply, acrescentar somente `@angular/router@22.2.6` e gerar lockfile pela ferramenta,
sem edição manual ou flags de força. Consulta read-only ao registro npm nesta revisão
confirmou versão, peers Angular 22.2.6, RxJS `^6.5.3 || ^7.4.0` e Node
`^22.22.3 || ^24.15.0 || >=26.0.0`, compatíveis com a base documentada. Isso não comprova
instalação: revalidar se a base mudar. Não instalar Forms, biblioteca de ícones ou UI.

Evoluir `app.spec.ts` e `e2e/demonstracao-inicial.spec.ts`: identidade global e `h1` por
destino substituem o `h1` antigo; permitir links e botão de tema, continuando a proibir
formulários/ações comerciais. Remover a asserção de padding fixo como prova de Bootstrap,
substituindo-a por estilos efetivos e legibilidade dos dois temas. Não enfraquecer
monitoramento de `pageerror`/console, idioma, aviso ou inspeção de rede/storage.

Unitários: tema inicial, alternância, instância raiz. Componentes/Router: destinos, estados
ativos e metadados; aguardar estabilização zoneless. E2E: links por teclado, foco no título,
atalho de conteúdo, URL direta/recarga, histórico voltar/avançar, wildcard/retorno, ambos os
temas, ausência de persistência após interações e leitura nos dois viewports. Revisão manual:
contraste, foco, zoom 200% e movimento reduzido, registrando método e limitações.

### Rastreabilidade e fronteira de aceite

| Contrato | PRD | TDD | Verificação futura |
| --- | --- | --- | --- |
| `navegacao-aplicacao` | RF-001/012, CA-001/022, RNF-002/007 | DEC-003/008 | Router, E2E e percurso manual |
| `temas-visuais` | RNF-009, CA-023, PEN-006 resolvida | DEC-006/013 | Serviço, componente, E2E e contraste |
| `demonstracao-inicial` | RF-011, RNF-001/004/010 | DEC-001/008/014 | Regressão de abertura, rede/storage e erros |

CA-001 e CA-022 poderão ser verificados neste recorte; CA-023 cobre os temas. CA-018 de
registro inexistente e CA-021 completo continuam dependentes do domínio e das mutações.
PRD/PEN-013/014 permanecem abertos: Chromium/Windows em dois viewports é verificação técnica,
não homologação de navegadores, dispositivos reais ou aprovação do produto.

## Risks / Trade-offs

- [Estado de artefatos confundido com implementação] → Caixas de tarefas desmarcadas; apply exige novo pedido; resultados anteriores explicitamente identificados.
- [Nova estrutura quebra testes sem revisão do contrato] → Delta explícita e substituição de asserções obsoletas, sem excluir proteções ainda válidas.
- [Contraste insuficiente nos padrões Bootstrap] → Conferir valores efetivos nos dois temas, incluindo foco e navegação ativa; corrigir tokens, sem presumir conformidade.
- [Tema não cobre toda a viewport] → Host ocupa viewport e define fundo/texto; validar bordas externas e rolagem nos dois layouts.
- [Foco dispara antes de página lazy existir] → Coordenar navegação/renderização e testar destino ativo, navegação rápida e alternância sem roubo de foco.
- [Páginas indisponíveis parecem consultas vazias] → Texto explícito de não implementação, sem totais zero, linhas ou botões comerciais.
- [Referências visuais tratadas como requisitos] → Documentação governa módulos, formulários e dados; capturas orientam somente layout; logo local prevista no apply, sem modificar as imagens nesta revisão.
- [Trabalho alheio incluído por staging amplo] → Staging por caminhos; não adicionar em lote `frontend/public/imgs/`; no apply incluir somente o ativo efetivamente necessário e preservar os demais arquivos.

## Migration Plan

Esta entrega altera apenas PRD, TDD e artefatos desta mudança. Após revisão e novo pedido de
apply: revalidar branch/base, acrescentar Router, construir estrutura/rotas e evoluir a
regressão correspondente; depois temas e seus testes; finalizar conteúdo explicativo,
acessibilidade e verificação integrada. Fazer commits coerentes por funcionalidade com seus
testes e tarefas, separados do planejamento. Apresentar o escopo integral em um único PR
somente ao concluir a Change, conforme `AGENTS.md` e o template, sem novo PR por alteração.

Não há dados a migrar. Se uma etapa falhar, parar e corrigir somente o escopo próprio,
sem apagar imagens ou descartar trabalho alheio. Reversão futura deve usar revisão/commit
dedicado em feature branch, nunca reset destrutivo ou push direto na main. Não sincronizar
deltas com specs principais nem arquivar esta mudança durante o planejamento.

Referências técnicas consultadas nesta revisão: Context7 Angular `/angular/angular`
(rotas standalone, `loadComponent`, `provideRouter` e correspondência ativa) e Bootstrap
`/twbs/bootstrap/v5.3.8` (`data-bs-theme` e variáveis Sass/CSS), além dos metadados npm de
`@angular/router@22.2.6`. As consultas fundamentam o desenho, não provam execução na base.
