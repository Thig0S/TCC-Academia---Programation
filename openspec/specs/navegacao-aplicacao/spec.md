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

A aplicação SHALL disponibilizar as rotas atuais de Visão Geral, Vendas, quatro
coleções, cadastro, detalhe, edição, Relatórios e Configurações; `/` SHALL abrir
Visão Geral. Detalhe/edição SHALL preservar ID completo. Caminho desconhecido SHALL
mostrar página não encontrada com retorno, sem inventar registro ou erro não tratado.
Recarga SHALL seguir a fonte do modo, sem tratar persistência local como sessão
demonstrativa perdida.

#### Scenario: Abrir e recarregar destinos diretamente
- **WHEN** abrir diretamente ou recarregar `/visao-geral`, `/vendas`, `/vendas/quitadas`, `/vendas/inativas`, `/vendas/prejuizo`, `/vendas/nova`, `/vendas/:id`, `/vendas/:id/editar`, `/relatorios` ou `/configuracoes`
- **THEN** SHALL encontrar página identificada e navegação coerente, sujeita à existência do registro e disponibilidade da fonte
- **AND** `/` SHALL resultar em `/visao-geral`; detalhe/edição SHALL consultar ID completo, inclusive barras codificadas
- **AND** no demo, edição de venda criada na sessão anterior SHALL informar ausência; no local, registro persistido SHALL ser recuperado após recarga sem seed

#### Scenario: Recuperar-se de caminho desconhecido
- **WHEN** a pessoa acessar uma rota não prevista
- **THEN** SHALL receber indicação de página não encontrada e link para Visão Geral
- **AND** retorno SHALL restaurar navegação normal, preservando tema e limites do modo

#### Scenario: Trocar venda sem exibir registro anterior
- **WHEN** mudar detalhe de uma venda para outra e depois para identificador inexistente
- **THEN** SHALL consultar novo ID a cada navegação sem manter dados do anterior; no local, resposta atrasada anterior SHALL não substituir destino atual
- **AND** ID ausente SHALL mostrar venda não encontrada com retornos, distinta de rota desconhecida e indisponibilidade da API
- **AND** `/vendas/quitadas` SHALL abrir coleção, nunca detalhe de ID quitadas
- **AND** `/vendas/nova` SHALL abrir cadastro, nunca detalhe de ID nova; edição SHALL preparar rascunho correto ao trocar ID

#### Scenario: Orientar cadastro e edição dentro de Vendas
- **WHEN** abrir cadastro ou edição por ação interna ou acesso direto
- **THEN** Vendas SHALL permanecer como módulo ativo, com título principal específico e foco após navegação interna
- **AND** SHALL haver retorno explícito a Vendas e, na edição existente, ao detalhe correspondente, sem exigir histórico do navegador
- **AND** cancelar antes de envio SHALL restaurar contexto/foco do acionador existente ou alternativa lógica; após envio local SHALL não afirmar rollback

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

Configurações SHALL explicar dados fictícios e ausência de uso operacional. No modo
demo SHALL explicar memória e descarte ao recarregar; no local SHALL explicar
persistência sintética no SQLite, referência fixa e conferência após resposta perdida.
Tema SHALL continuar em memória nos dois modos. SHALL não haver controles fictícios
de contas, integração, regras comerciais, reset ou persistência.

#### Scenario: Reconhecer os limites em Configurações
- **WHEN** acessar Configurações pela navegação ou atalho em qualquer modo
- **THEN** SHALL encontrar título e explicações fiéis à fonte ativa, sem prometer descarte de vendas persistidas nem uso operacional
- **AND** SHALL não encontrar controles que prometam operações indisponíveis

#### Scenario: Conferir orientação após recarga local
- **WHEN** reabrir modo local e consultar seus limites
- **THEN** SHALL explicar que negócios persistem, referência é renovada e rascunhos/tema não são recuperados do browser
- **AND** SHALL orientar conferir dados antes de repetir operação cuja resposta foi perdida, sem prometer deduplicação automática

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
