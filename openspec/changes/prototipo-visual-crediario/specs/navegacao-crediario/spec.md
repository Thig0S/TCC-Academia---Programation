# Spec Delta

## Purpose

Oferecer uma estrutura visual consistente para validar o atendimento de crediários e a navegação entre os módulos da aplicação.

## ADDED Requirements

### Requirement: Navegação entre módulos
O protótipo SHALL abrir em Vendas e oferecer navegação para Visão Geral, Vendas, Clientes, Parcelas, Relatórios e Configurações, com indicação da página ativa e busca no cabeçalho.

#### Scenario: Trocar de módulo
- **WHEN** a pessoa seleciona Clientes na sidebar
- **THEN** a página de clientes é exibida com navegação e cabeçalho consistentes e item Clientes ativo.

### Requirement: Apresentação acessível em português
A interface SHALL usar pt-BR, inclusive o idioma declarado no documento, BRL e datas DD/MM/AAAA, tema claro, foco visível, rótulos nos campos, nomes acessíveis nos botões de ícone e situações identificáveis por texto, não apenas cor. A navegação e os formulários SHALL ser utilizáveis por teclado.

#### Scenario: Usar em largura reduzida
- **WHEN** a aplicação é exibida em uma tela de 390px de largura
- **THEN** a navegação e as ações permanecem acessíveis sem sobreposição, admitindo rolagem horizontal somente no contêiner das tabelas.

#### Scenario: Abrir e fechar um modal por teclado
- **WHEN** a pessoa abre um modal e o fecha com Escape
- **THEN** o foco permanece dentro do modal enquanto aberto e retorna à ação de origem ao fechar.

#### Scenario: Identificar uma ação sem texto visível
- **WHEN** a pessoa navega até um botão apresentado apenas como ícone usando tecnologia assistiva
- **THEN** a finalidade do botão é anunciada em português por seu nome acessível.

### Requirement: Indicadores coerentes
O protótipo SHALL exibir total em aberto, valor em atraso, recebido no mês e quantidade de vendas em Vendas; Visão Geral SHALL incluir clientes ativos, vendas recentes e parcelas próximas ou vencidas, calculados a partir dos mesmos dados demonstrativos.

#### Scenario: Consultar totais após pagamento
- **WHEN** um pagamento é simulado e a pessoa navega para Visão Geral
- **THEN** os indicadores refletem o pagamento sem divergência com Vendas e Parcelas.

### Requirement: Limites demonstrativos explícitos
O protótipo SHALL indicar que usa dados fictícios e que alterações são perdidas ao recarregar. Relatórios e Configurações SHALL apresentar conteúdo demonstrativo; exportação SHALL estar identificada como indisponível e não gerar arquivos.

#### Scenario: Recarregar a aplicação
- **WHEN** a página é recarregada após uma alteração local
- **THEN** os dados fictícios iniciais são restaurados e o aviso de demonstração continua visível.
