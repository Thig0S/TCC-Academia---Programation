# Spec Delta

## Purpose

Permitir que participantes se orientem entre os módulos da demonstração e reconheçam os conteúdos ainda indisponíveis, com navegação acessível e retorno seguro.

## ADDED Requirements

### Requirement: Navegação principal e contexto de Vendas

A aplicação SHALL oferecer navegação com ícones decorativos e rótulos Visão Geral, Vendas, Relatórios e Configurações, indicando visualmente o módulo ativo. Quitadas SHALL ser uma opção interna de Vendas, sem quinto módulo, Clientes ou Parcelas independentes. O perfil Administrador SHALL ser identificado como estático, sem sugerir autenticação.

#### Scenario: Percorrer os módulos
- **WHEN** a pessoa acionar cada item da navegação principal
- **THEN** SHALL acessar o destino correspondente com seu título visível
- **AND** o destino atual SHALL ter indicação visual e programática de localização
- **AND** identidade e aviso demonstrativo SHALL permanecer visíveis

#### Scenario: Consultar o destino Quitadas
- **WHEN** a pessoa acessar Quitadas pela opção interna de Vendas
- **THEN** o título SHALL identificar Vendas quitadas e o módulo Vendas SHALL permanecer visualmente ativo
- **AND** Quitadas SHALL ser indicada como página atual, com retorno disponível para Vendas
- **AND** o perfil estático e o atalho de Configurações SHALL não oferecer login ou gestão de conta

### Requirement: Rotas acessíveis diretamente e retorno de caminho desconhecido

A aplicação SHALL disponibilizar `/visao-geral`, `/vendas`, `/vendas/quitadas`, `/relatorios` e `/configuracoes`. A entrada `/` SHALL abrir Visão Geral. Um caminho desconhecido SHALL mostrar página não encontrada com retorno explícito para Visão Geral, sem inventar registro ou apresentar erro não tratado.

#### Scenario: Abrir e recarregar destinos diretamente
- **WHEN** a pessoa abrir diretamente ou recarregar cada rota conhecida
- **THEN** SHALL encontrar a mesma página identificada e a navegação coerente com o destino
- **AND** a entrada `/` SHALL resultar em `/visao-geral`

#### Scenario: Recuperar-se de caminho desconhecido
- **WHEN** a pessoa acessar uma rota não prevista
- **THEN** SHALL receber indicação de página não encontrada e link para Visão Geral
- **AND** acionar o retorno SHALL restaurar a navegação normal, preservando aviso e tema da sessão

### Requirement: Conteúdo comercial honestamente indisponível

Na FASE-003, Visão Geral, Vendas, Quitadas e Relatórios SHALL apresentar título e explicação de que seu conteúdo comercial ainda não está disponível. Essas páginas SHALL não exibir totais, registros, busca, filtros, formulários ou ações comerciais que sugiram funcionamento implementado.

#### Scenario: Abrir cada página comercial inicial
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas ou Relatórios
- **THEN** SHALL distinguir uma funcionalidade ainda indisponível de uma consulta realizada sem resultados
- **AND** SHALL não encontrar números financeiros, vendas inventadas ou ações de cadastrar, editar, pagar ou exportar

### Requirement: Configurações explicativa

Configurações SHALL explicar o uso de dados fictícios, estado apenas em memória, perda de alterações ao recarregar e ausência de capacidade para controlar cobranças reais. SHALL não apresentar controles fictícios de contas, integrações, regras comerciais ou persistência.

#### Scenario: Reconhecer os limites em Configurações
- **WHEN** a pessoa acessar Configurações pela navegação ou por seu atalho
- **THEN** SHALL encontrar o título e as quatro explicações de limite
- **AND** SHALL não encontrar controles que prometam operações indisponíveis

### Requirement: Orientação por teclado e adaptação da estrutura

A estrutura SHALL permitir acessar todos os destinos, o controle de tema e o conteúdo principal por teclado, com foco perceptível e sem aprisionamento. Após navegação interna bem-sucedida para outra página, o foco SHALL orientar para seu título principal. Navegação, aviso e conteúdo SHALL permanecer legíveis sem corte horizontal nos viewports técnicos de 1366 × 768 e 390 × 844.

#### Scenario: Navegar sem mouse
- **WHEN** a pessoa percorrer e acionar os links usando teclado
- **THEN** SHALL perceber o foco e alcançar cada destino e o controle de tema
- **AND** após mudar de página internamente o título principal de destino SHALL receber foco
- **AND** um atalho para o conteúdo SHALL permitir ultrapassar a navegação repetitiva

#### Scenario: Ler a estrutura em viewport pequeno
- **WHEN** a pessoa abrir cada destino em 390 × 844 e depois em 1366 × 768
- **THEN** navegação, título, aviso e controles SHALL permanecer alcançáveis e legíveis sem rolagem horizontal da página
- **AND** a adaptação SHALL não ocultar destinos nem depender de ações exclusivas de mouse
