# navegacao-aplicacao Specification

## Purpose

Permitir que participantes se orientem entre os módulos da demonstração e reconheçam os conteúdos ainda indisponíveis, com navegação acessível e retorno seguro.

## Requirements

### Requirement: Navegação principal e contexto de Vendas

A aplicação SHALL oferecer navegação com ícones decorativos e rótulos Visão Geral, Vendas, Relatórios e Configurações, indicando visualmente o módulo ativo. Quitadas e detalhes de venda SHALL pertencer a Vendas, sem quinto módulo, Clientes ou Parcelas independentes. O perfil Administrador SHALL ser identificado como estático, sem sugerir autenticação.

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

#### Scenario: Orientar contexto e retorno no detalhe
- **WHEN** a pessoa abrir detalhes de uma venda aberta, quitada ou inexistente
- **THEN** Vendas SHALL permanecer como módulo visualmente ativo, sem marcar a lista como a página atual do detalhe
- **AND** SHALL haver título principal específico e links explícitos para Vendas e Quitadas, inclusive no acesso direto sem histórico anterior
- **AND** após navegação interna bem-sucedida o título principal SHALL receber foco conforme o contrato da estrutura

### Requirement: Rotas acessíveis diretamente e retorno de caminho desconhecido

A aplicação SHALL disponibilizar `/visao-geral`, `/vendas`, `/vendas/quitadas`, `/vendas/nova`, `/vendas/:id`, `/vendas/:id/editar`, `/relatorios` e `/configuracoes`. A entrada `/` SHALL abrir Visão Geral. Detalhe e edição SHALL preservar o identificador completo. Caminho desconhecido SHALL mostrar página não encontrada com retorno explícito para Visão Geral, sem inventar registro ou erro não tratado.

#### Scenario: Abrir e recarregar destinos diretamente
- **WHEN** a pessoa abrir diretamente ou recarregar cada rota conhecida
- **THEN** SHALL encontrar a página identificada e a navegação coerente com o destino, sujeita à existência do registro na sessão atual
- **AND** a entrada `/` SHALL resultar em `/visao-geral`
- **AND** detalhe e edição SHALL consultar o identificador completo, inclusive barras codificadas, sem alterar IDs do domínio
- **AND** recarregar edição de venda criada na sessão anterior SHALL informar registro ausente, pois não há persistência

#### Scenario: Recuperar-se de caminho desconhecido
- **WHEN** a pessoa acessar uma rota não prevista
- **THEN** SHALL receber indicação de página não encontrada e link para Visão Geral
- **AND** acionar o retorno SHALL restaurar a navegação normal, preservando aviso e tema da sessão

#### Scenario: Trocar venda sem exibir registro anterior
- **WHEN** a navegação interna mudar o detalhe de uma venda para outra e depois para um identificador inexistente
- **THEN** SHALL consultar o novo identificador a cada navegação, sem manter dados do anterior
- **AND** o identificador inexistente SHALL apresentar venda não encontrada, distinta de rota desconhecida, com retornos explícitos
- **AND** `/vendas/quitadas` SHALL continuar abrindo a coleção, nunca o detalhe de uma venda com esse nome
- **AND** `/vendas/nova` SHALL abrir cadastro, nunca detalhe de ID nova; edição SHALL atualizar o rascunho ao trocar o ID

#### Scenario: Orientar cadastro e edição dentro de Vendas
- **WHEN** abrir cadastro ou edição por ação interna ou acesso direto
- **THEN** Vendas SHALL permanecer como módulo ativo, com título principal específico e foco após navegação interna
- **AND** SHALL haver retorno explícito a Vendas e, na edição existente, ao detalhe correspondente, sem exigir histórico do navegador
- **AND** cancelamento por ação interna SHALL restaurar contexto e foco do acionador quando existente, com alternativa lógica se ausente

### Requirement: Conteúdo comercial honestamente indisponível

Visão Geral e Relatórios SHALL apresentar consultas financeiras reais da sessão conforme visao-geral e relatorios-financeiros, sem mensagens de conteúdo ainda indisponível. Vendas, Quitadas e detalhes SHALL manter consultas e ações funcionais de cadastro, edição e recebimento, conforme elegibilidade, sem exportação. Somente Relatórios SHALL oferecer Exportar relatório explicitamente ilustrativo e indisponível, sem arquivo ou falso sucesso.

#### Scenario: Abrir cada página comercial inicial
- **WHEN** a pessoa acessar Visão Geral ou Relatórios
- **THEN** SHALL encontrar dados derivados da sessão, com referência e períodos identificados, distinguindo consulta vazia de funcionalidade indisponível
- **AND** SHALL não encontrar números financeiros fixos, vendas inventadas à parte da fonte ou ações de cadastrar, editar ou pagar nesses dois módulos
- **AND** exportação SHALL aparecer somente em Relatórios com indisponibilidade explícita, sem produzir arquivo

#### Scenario: Consultar páginas entregues sem promessa de mutação
- **WHEN** a pessoa acessar Vendas, Quitadas ou detalhes
- **THEN** SHALL encontrar as consultas reais previstas em consulta-vendas, não a mensagem de que nenhuma consulta foi realizada
- **AND** SHALL encontrar somente ações funcionais: Nova venda em Vendas, Editar nas duas listas e detalhe, e Receber no detalhe com pendências; nenhuma exportação nesses destinos
- **AND** Configurações, aviso, temas e limites de demonstração SHALL continuar preservados
- **AND** abrir um fluxo ou navegar SHALL não confirmar operações automaticamente

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
