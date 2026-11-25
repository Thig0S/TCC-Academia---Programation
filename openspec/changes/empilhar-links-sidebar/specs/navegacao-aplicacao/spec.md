# Spec Delta

## MODIFIED Requirements

### Requirement: Navegação principal e contexto de Vendas

A aplicação SHALL oferecer navegação com ícones decorativos e rótulos Visão Geral, Vendas, Relatórios e Configurações, indicando visualmente o módulo ativo. Quitadas, Inativas, Prejuízo e detalhes de venda SHALL pertencer a Vendas, sem quinto módulo, Clientes ou Parcelas independentes. Quando Vendas estiver ativo, os destinos administrativos SHALL aparecer na barra lateral em linhas verticais separadas, na ordem Quitadas, Inativas e Prejuízo. O perfil Administrador SHALL ser identificado como estático, sem sugerir autenticação.

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

#### Scenario: Empilhar destinos administrativos na barra lateral
- **WHEN** a pessoa acessar `/vendas` ou qualquer destino de Vendas com a navegação principal visível
- **THEN** Quitadas, Inativas e Prejuízo SHALL aparecer um abaixo do outro, cada qual em uma linha própria e nessa ordem
- **AND** cada destino SHALL continuar acionável por teclado e indicar corretamente a página atual
- **AND** o empilhamento SHALL permanecer nos dois temas e nos viewports técnicos de 1366 × 768 e 390 × 844, sem corte horizontal nem alteração das rotas
