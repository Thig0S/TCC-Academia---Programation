# Spec Delta

## MODIFIED Requirements

### Requirement: Consistência visual e legibilidade

Cada tema SHALL abranger navegação, cabeçalho, aviso, Visão Geral, Vendas, detalhes, formulários, recebimento, Relatórios, Configurações, modais e controles existentes. Toda a aplicação SHALL usar uma linguagem visual coerente com as referências fornecidas, com superfícies, tipografia, espaçamento, bordas, cantos, identidade cromática e estados visuais consistentes. Textos, bordas, foco e indicação ativa SHALL continuar perceptíveis, sem depender apenas de cor. Elementos SHALL respeitar movimento reduzido e contraste mínimo de 4,5:1 para texto comum, 3:1 para texto grande e indicadores essenciais de foco/controle.

#### Scenario: Conferir todas as superfícies nos dois temas

- **WHEN** a pessoa alternar temas e percorrer todos os destinos, incluindo página não encontrada
- **THEN** a interface SHALL apresentar superfícies claras no tema claro e grafite/escuras no tema escuro, com identidade vermelha e linguagem visual consistente com as referências em todos os módulos
- **AND** textos, rótulos e estados ativos SHALL permanecer compreensíveis além da cor, sem misturar superfícies de temas diferentes
- **AND** foco e contraste SHALL satisfazer os mínimos definidos sem alegação de certificação integral de acessibilidade
- **AND** telas sem referência específica SHALL seguir os mesmos tokens e padrões visuais sem introduzir funcionalidades não aprovadas
- **AND** consultas e links afetados SHALL continuar seguindo o contrato de âncoras integradas de consulta-vendas, sem azul/sublinhado padrão permanente, com legibilidade em normal, hover, foco e ativo

#### Scenario: Comparar composição com as referências sem perder informação

- **WHEN** comparar os módulos às referências visuais fornecidas nos dois temas em desktop, tela estreita e zoom nativo de 200%
- **THEN** composição, superfícies, tipografia, espaçamento, bordas, cantos e identidade cromática SHALL buscar máxima aproximação às referências, adaptando a composição para manter conteúdo e controles acessíveis
- **AND** a interface SHALL preservar os contratos funcionais existentes e não copiar dados pessoais, controles de janela/notificação ou ações indisponíveis mostrados nas referências
- **AND** as referências principais de acabamento do conteúdo SHALL ser `mercadao_oculos_dashboard_light.html` e `mercadao_oculos_dashboard_dark.html`, em `frontend/public/imgs/exemplos/`, respectivamente para claro e escuro; seus scripts, dados e comportamentos SHALL não determinar funcionalidades do MVP
- **AND** `exemploListagemDeVendas.png`, `exemploDadosDaVenda.png` e `exemploCadastrarVenda.png` SHALL permanecer complementares para composição de listagem, detalhe e cadastro; `exemploDesignDark.png` SHALL continuar complementar para linguagem escura e referência da lateral preservada
- **AND** edição, recebimento, Visão Geral, Relatórios, Configurações e estados de erro/ausência SHALL derivar o mesmo padrão visual, sem exigir cópia literal de uma tela que não possui referência própria
- **AND** a comparação SHALL considerar hierarquia, alinhamento, superfícies, cores, tipografia, espaçamento, bordas e cantos; diferenças para preservar acessibilidade, aviso, identidade original e comportamentos aprovados SHALL ser explicitadas em vez de exigir igualdade pixel a pixel

#### Scenario: Usar preferência de movimento reduzido

- **WHEN** a preferência de movimento reduzido estiver ativa e a pessoa navegar ou alternar o tema
- **THEN** a compreensão e o acionamento SHALL não depender de animações

#### Scenario: Navegar sem contorno em títulos não interativos

- **WHEN** a pessoa trocar de página por uma aba ou link e o foco programático for movido ao título do conteúdo
- **THEN** o título e a área principal SHALL permanecer sem contorno decorativo nos dois temas
- **AND** links, botões, campos e demais controles SHALL manter indicador perceptível ao receber foco de teclado

## ADDED Requirements

### Requirement: Preservação visual da lateral no refinamento do conteúdo

O refinamento do conteúdo SHALL manter a aparência, logo, dimensões, perfil, navegação, estados ativo/hover/foco e comportamento responsivo da barra lateral existente nos dois temas. Mudanças compartilhadas de tipografia ou estilos SHALL não redesenhá-la por efeito indireto.

#### Scenario: Comparar lateral antes e depois

- **WHEN** comparar a lateral antes e depois do refinamento em 1366×768 e 390×844, nos dois temas
- **THEN** cores, degradê, dimensões, logo, textos, tipografia, perfil, espaçamento e navegação SHALL permanecer equivalentes à linha de base existente
- **AND** a lateral branca do HTML claro e os comportamentos de esconder/recolher dos exemplos SHALL não substituir a lateral do MVP
- **AND** contraste, foco, indicação ativa, atalho para conteúdo e acesso aos destinos SHALL permanecer preservados

### Requirement: Acabamento visual das seções sem alteração funcional

As seções existentes SHALL usar painéis com bordas suaves, cantos arredondados, sombras discretas e hierarquia entre títulos, informação auxiliar e valores, conforme os HTMLs. Campos, ações, tabelas e situações SHALL compartilhar acabamento coerente nos dois temas, sem criar, remover ou modificar campos, conteúdo funcional, regras ou fluxos.

#### Scenario: Conferir Visão Geral

- **WHEN** abrir Visão Geral em cada tema
- **THEN** os quatro indicadores SHALL ter valores destacados e rótulos secundários, e os três resumos SHALL apresentar painéis e separadores coerentes com os HTMLs
- **AND** referência, mês, limites de cinco itens, ordenação, dados e links existentes SHALL permanecer preservados, sem novos gráficos, filtros ou ações de cadastro nessa seção

#### Scenario: Conferir cadastro e edição

- **WHEN** abrir cadastro ou edição e percorrer campos, prévia e mensagens
- **THEN** grupos de dados, campos e ações SHALL receber acabamento consistente, com ação principal vermelha e secundárias discretas
- **AND** cadastro e edição SHALL continuar páginas com os campos, rótulos, obrigatoriedades, validações e cancelamento existentes; edição SHALL continuar restrita aos quatro campos do cliente
- **AND** entrada e prévia completa SHALL permanecer no cadastro; primeiro vencimento editável, limite de 120 parcelas e prévia aproximada dos HTMLs SHALL não ser incorporados

#### Scenario: Conferir Relatórios e Configurações

- **WHEN** acessar Relatórios e Configurações nos dois temas
- **THEN** períodos, títulos, totais e consultas existentes em Relatórios SHALL receber painéis e hierarquia visual sem truncamento dos registros
- **AND** os quatro indicadores globais SHALL não ser repetidos em Relatórios, e a exportação SHALL continuar explicitamente indisponível, sem CSV
- **AND** Configurações SHALL apresentar as quatro explicações atuais com organização visual refinada, sem novos controles, preferências ou conteúdo copiado dos exemplos

#### Scenario: Conferir recebimento e estados auxiliares

- **WHEN** abrir recebimento, Quitadas, prévia, erros, vazios ou páginas/registro ausentes
- **THEN** a apresentação SHALL seguir as mesmas superfícies, campos, selos, botões e mensagens dos demais conteúdos
- **AND** recebimento SHALL continuar modal acessível com seleção sequencial, conferência exata, confirmação explícita, cancelamento, Escape e retorno de foco existentes
- **AND** avisos, mensagens anunciáveis, ações, campos e retornos SHALL não ser ocultados para aproximar a aparência das referências
