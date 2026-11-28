# Spec Delta

## MODIFIED Requirements

### Requirement: Identidade na abertura

A aplicação SHALL apresentar “Mercadão dos Óculos - Vendas em Aberto” como identidade
global visível e título principal específico da página atual. SHALL abrir sem login
humano e comunicar os limites do modo efetivo nos pontos explicativos existentes,
sem anunciar funcionalidades comerciais entregues como indisponíveis.

#### Scenario: Abrir a base técnica
- **WHEN** a pessoa acessar a URL inicial da aplicação no modo configurado
- **THEN** a identidade global SHALL identificar o produto e o título principal SHALL identificar Visão Geral
- **AND** SHALL informar dados sintéticos e ausência de uso operacional nos pontos explicativos do modo
- **AND** a página SHALL abrir sem exigir login humano; carga local pode apresentar erro identificável da conexão

### Requirement: Aviso explícito de demonstração

A aplicação SHALL informar dados fictícios e ausência de uso operacional em
Configurações e mensagens dos fluxos, sem novo banner global persistente. Na
demonstração SHALL informar perda das alterações ao recarregar; no modo local SHALL
informar persistência sintética no SQLite, sem afirmar descarte dos negócios.

#### Scenario: Reconhecer os limites ao abrir e recarregar
- **WHEN** a pessoa abrir ou recarregar a aplicação e consultar Configurações ou iniciar uma confirmação
- **THEN** SHALL encontrar a explicação fiel ao modo: memória descartável no demo, persistência sintética no local
- **AND** a abertura SHALL não anunciar pagamentos ou cadastros realizados sem confirmação

### Requirement: Abertura sem dados externos ou persistência

O modo demonstrativo padrão SHALL abrir sem APIs de dados, coleta de dados pessoais
ou persistência de registros/preferências. O modo local explícito SHALL consultar a
API em loopback e recuperar negócios persistidos no backend. Em ambos, recursos SHALL
ser locais e SHALL não haver cookies, storage, banco do navegador ou CDNs para negócios
ou preferências; credencial SHALL não chegar ao browser.

#### Scenario: Abrir em contexto de navegador limpo
- **WHEN** a página inicial demonstrativa carregar em contexto de navegador limpo
- **THEN** o conteúdo SHALL estar disponível sem chamadas a APIs de dados ou CDNs
- **AND** a abertura SHALL não criar cookies, armazenamento local, armazenamento de sessão ou banco do navegador

#### Scenario: Reabrir sem recuperar estado de negócio
- **WHEN** a pessoa recarregar uma rota conhecida no modo demonstrativo
- **THEN** SHALL apresentar novamente o conteúdo inicial da demonstração
- **AND** SHALL não recuperar vendas, pagamentos ou preferências persistidas

#### Scenario: Navegar e alternar temas sem serviços externos
- **WHEN** a pessoa percorrer módulos, Quitadas e página não encontrada e alternar temas no demonstrativo
- **THEN** os recursos SHALL continuar locais, sem consultas de dados ou CDNs
- **AND** SHALL não criar cookies, storage ou banco do navegador

#### Scenario: Abrir modo local sem confundir persistências
- **WHEN** abrir modo local com API disponível ou indisponível
- **THEN** SHALL respectivamente recuperar negócios pela API local ou apresentar falha, sem criar seed no browser
- **AND** SHALL não recuperar preferências persistidas nem armazenar negócios ou credencial no browser
