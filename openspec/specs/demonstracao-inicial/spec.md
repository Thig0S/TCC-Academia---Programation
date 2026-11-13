# demonstracao-inicial Specification

## Purpose

Identificar a demonstração técnica do Mercadão dos Óculos - Vendas em Aberto e comunicar
seus limites de uso desde a abertura, antes da entrega dos fluxos comerciais do MVP.

## Requirements

### Requirement: Identidade na abertura

A aplicação SHALL apresentar “Mercadão dos Óculos - Vendas em Aberto” como título principal
visível na página inicial e indicar que esta entrega é uma base técnica sem fluxos comerciais.

#### Scenario: Abrir a base técnica
- **WHEN** a pessoa acessar a URL inicial da aplicação
- **THEN** o título principal SHALL identificar o produto
- **AND** uma explicação visível SHALL informar que os fluxos comerciais ainda não estão disponíveis
- **AND** a página SHALL abrir sem exigir login

### Requirement: Aviso explícito de demonstração

A aplicação SHALL manter visível na página inicial o aviso “Demonstração com dados fictícios.
As alterações são perdidas ao recarregar.”, sem sugerir capacidade de controlar cobranças reais.

#### Scenario: Reconhecer os limites ao abrir e recarregar
- **WHEN** a pessoa abrir ou recarregar a página inicial
- **THEN** o aviso completo SHALL permanecer visível
- **AND** a página SHALL não anunciar pagamentos, cadastros ou armazenamento realizados

### Requirement: Idioma e leitura da página inicial

A aplicação SHALL declarar o idioma `pt-BR` no documento e apresentar o conteúdo inicial
em português brasileiro, com título semântico e texto legível nos viewports técnicos
de 1366 × 768 e 390 × 844, sem exigir rolagem horizontal para ler título e aviso.

#### Scenario: Ler em cada viewport técnico
- **WHEN** a página inicial for aberta em cada um dos dois viewports técnicos
- **THEN** o documento SHALL declarar `lang="pt-BR"`
- **AND** o título e o aviso SHALL estar legíveis e sem corte horizontal

### Requirement: Abertura sem dados externos ou persistência

A aplicação SHALL abrir a página inicial sem consultar serviços externos de dados,
sem coletar dados pessoais e sem gravar registros ou preferências em armazenamento persistente.
Os recursos necessários à página SHALL ser servidos localmente com a aplicação.

#### Scenario: Abrir em contexto de navegador limpo
- **WHEN** a página inicial carregar em um contexto de navegador limpo
- **THEN** o conteúdo SHALL estar disponível sem chamadas a APIs de dados ou CDNs
- **AND** a abertura SHALL não criar cookies de aplicação, armazenamento local,
  armazenamento de sessão ou registros em banco do navegador

#### Scenario: Reabrir sem recuperar estado de negócio
- **WHEN** a pessoa recarregar a página técnica
- **THEN** a aplicação SHALL apresentar novamente seu conteúdo inicial
- **AND** a aplicação SHALL não recuperar vendas, pagamentos ou preferências persistidas
