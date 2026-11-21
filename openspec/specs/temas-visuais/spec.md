# temas-visuais Specification

## Purpose

Oferecer leitura consistente da demonstração nos temas claro e escuro, com escolha acessível durante a sessão e sem salvar preferências no navegador.

## Requirements

### Requirement: Identidade cromática da barra lateral

A barra lateral SHALL usar vermelho da identidade no tema claro e degradê vertical estático vermelho/vinho no escuro, seguindo os exemplos indicados. Textos, ícones, perfil, links, ativo/hover e foco SHALL respeitar os mínimos de contraste sobre todo o fundo. A logo SHALL permanecer preservada; superfícies das consultas SHALL admitir o refinamento previsto em consulta-vendas. Esse tratamento SHALL acompanhar o bloco responsivo sem exigir animação.

#### Scenario: Ler a navegação vermelha nos dois temas
- **WHEN** a pessoa alternar o tema e percorrer os destinos nos dois viewports técnicos
- **THEN** a lateral SHALL apresentar vermelho no claro e degradê vermelho/vinho no escuro
- **AND** as referências SHALL ser `exemploListagemDeVendas.png` para claro e `exemploDesignDark.png` para escuro, sem copiar dados ou campos
- **AND** textos e ícones claros, estado ativo e foco SHALL manter contraste nos extremos e regiões intermediárias do fundo
- **AND** a localização SHALL continuar indicada por semântica e estado visual distinguível além de cor, sem exigir sublinhado permanente; hover/foco SHALL permanecer perceptíveis, admitindo sublinhado nesses estados

### Requirement: Tema escuro inicial e escolha de sessão

A aplicação SHALL iniciar no tema escuro, independentemente da preferência de cores do sistema. A escolha entre claro e escuro SHALL permanecer apenas em memória durante a navegação; recarregar ou abrir uma nova sessão SHALL restaurar o tema escuro, sem consultar nem gravar preferência persistente.

#### Scenario: Abrir com preferência de sistema clara ou escura
- **WHEN** a pessoa abrir a aplicação com preferência de sistema clara ou escura
- **THEN** o tema ativo SHALL ser escuro em ambos os casos
- **AND** a aplicação SHALL não recuperar preferência de armazenamento do navegador

#### Scenario: Manter a escolha entre rotas e descartá-la ao recarregar
- **WHEN** a pessoa escolher claro, navegar entre módulos e Quitadas e depois recarregar
- **THEN** o tema claro SHALL permanecer durante a navegação interna, inclusive em página não encontrada
- **AND** após recarga o tema SHALL voltar ao escuro
- **AND** a escolha SHALL não criar cookies, localStorage, sessionStorage ou registros em banco do navegador

### Requirement: Controle de tema acessível

A aplicação SHALL disponibilizar controle visível por teclado para alternar entre claro e escuro, com nome acessível, indicação textual e programática do tema ativo e foco perceptível nos dois temas. A alternância SHALL preservar o destino atual e o foco do controle, sem exigir recarga.

#### Scenario: Alternar pelos dois temas usando teclado
- **WHEN** a pessoa focalizar o controle e alternar de escuro para claro e novamente para escuro
- **THEN** a aparência e a indicação do tema ativo SHALL acompanhar cada mudança
- **AND** o foco SHALL continuar no controle, com o mesmo destino e aviso demonstrativo

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
- **AND** a interface SHALL preservar os contratos funcionais existentes e não copiar dados pessoais, controles de janela/notificação ou ações indisponíveis mostrados nas imagens
- **AND** as referências SHALL ser `exemploListagemDeVendas.png` para listagem clara, `exemploDadosDaVenda.png` para detalhe, `exemploCadastrarVenda.png` para composição do cadastro e `exemploDesignDark.png` para a linguagem escura, todas em `frontend/public/imgs/exemplos/`
- **AND** edição, recebimento, Visão Geral, Relatórios, Configurações e estados de erro/ausência SHALL derivar o mesmo padrão visual, sem exigir cópia literal de uma tela que não possui referência própria
- **AND** a comparação SHALL considerar hierarquia, alinhamento, superfícies, cores, tipografia, espaçamento, bordas e cantos; diferenças para preservar acessibilidade, aviso, identidade original e comportamentos aprovados SHALL ser explicitadas em vez de exigir igualdade pixel a pixel

#### Scenario: Usar preferência de movimento reduzido
- **WHEN** a preferência de movimento reduzido estiver ativa e a pessoa navegar ou alternar o tema
- **THEN** a compreensão e o acionamento SHALL não depender de animações
