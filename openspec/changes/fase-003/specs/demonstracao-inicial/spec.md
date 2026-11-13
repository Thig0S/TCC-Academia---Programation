# Spec Delta

## MODIFIED Requirements

### Requirement: Identidade na abertura

A aplicação SHALL apresentar “Mercadão dos Óculos - Vendas em Aberto” como identidade global visível e um título principal específico da página atual. A abertura SHALL informar que os conteúdos comerciais ainda não estão disponíveis, sem exigir login.

#### Scenario: Abrir a base técnica
- **WHEN** a pessoa acessar a URL inicial da aplicação
- **THEN** a identidade global SHALL identificar o produto e o título principal SHALL identificar Visão Geral
- **AND** uma explicação visível SHALL informar que os fluxos comerciais ainda não estão disponíveis
- **AND** a página SHALL abrir sem exigir login

### Requirement: Idioma e leitura da página inicial

A aplicação SHALL declarar o idioma `pt-BR` no documento e apresentar o conteúdo inicial em português brasileiro, com identidade visível e título principal semântico da página atual. Identidade, título e aviso SHALL permanecer legíveis nos viewports técnicos de 1366 × 768 e 390 × 844, sem exigir rolagem horizontal para sua leitura.

#### Scenario: Ler em cada viewport técnico
- **WHEN** a página inicial for aberta em cada um dos dois viewports técnicos
- **THEN** o documento SHALL declarar `lang="pt-BR"`
- **AND** a identidade, o título da página e o aviso SHALL estar legíveis e sem corte horizontal

### Requirement: Abertura sem dados externos ou persistência

A aplicação SHALL abrir a estrutura navegável sem consultar serviços externos de dados, sem coletar dados pessoais e sem gravar registros ou preferências em armazenamento persistente. Os recursos necessários às páginas SHALL ser servidos localmente com a aplicação.

#### Scenario: Abrir em contexto de navegador limpo
- **WHEN** a página inicial carregar em um contexto de navegador limpo
- **THEN** o conteúdo SHALL estar disponível sem chamadas a APIs de dados ou CDNs
- **AND** a abertura SHALL não criar cookies de aplicação, armazenamento local,
  armazenamento de sessão ou registros em banco do navegador

#### Scenario: Reabrir sem recuperar estado de negócio
- **WHEN** a pessoa recarregar uma rota conhecida da estrutura navegável
- **THEN** a aplicação SHALL apresentar novamente o conteúdo inicial daquela rota
- **AND** a aplicação SHALL não recuperar vendas, pagamentos ou preferências persistidas

#### Scenario: Navegar e alternar temas sem serviços externos
- **WHEN** a pessoa percorrer os módulos, Quitadas e página não encontrada e alternar temas
- **THEN** os recursos SHALL continuar locais, sem consultas de dados ou CDNs
- **AND** as interações SHALL não criar cookies, armazenamento local, armazenamento de sessão ou registros em banco do navegador
