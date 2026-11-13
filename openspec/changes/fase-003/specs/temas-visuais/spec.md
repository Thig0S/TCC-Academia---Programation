# Spec Delta

## Purpose

Oferecer leitura consistente da demonstração nos temas claro e escuro, com escolha acessível durante a sessão e sem salvar preferências no navegador.

## ADDED Requirements

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

Cada tema SHALL abranger navegação, cabeçalho, aviso, páginas e controles existentes. Textos, bordas de controles, foco e indicação ativa SHALL continuar perceptíveis, sem depender apenas de cor para comunicar localização ou tema. Elementos existentes SHALL respeitar movimento reduzido e contraste mínimo de 4,5:1 para texto comum, 3:1 para texto grande e indicadores de foco e controles essenciais.

#### Scenario: Conferir todas as superfícies nos dois temas
- **WHEN** a pessoa alternar temas e percorrer todos os destinos, incluindo página não encontrada
- **THEN** a interface SHALL não misturar superfícies de temas diferentes nem tornar textos e controles ilegíveis
- **AND** rótulos e estados ativos SHALL permanecer compreensíveis além da cor
- **AND** foco e contraste SHALL satisfazer os mínimos definidos sem alegação de certificação integral de acessibilidade

#### Scenario: Usar preferência de movimento reduzido
- **WHEN** a preferência de movimento reduzido estiver ativa e a pessoa navegar ou alternar o tema
- **THEN** a compreensão e o acionamento SHALL não depender de animações
