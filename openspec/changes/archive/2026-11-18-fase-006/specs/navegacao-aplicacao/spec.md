# Spec Delta

## MODIFIED Requirements

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

Visão Geral e Relatórios SHALL apresentar título e explicação de conteúdo ainda indisponível, sem totais, registros, busca, filtros, formulários ou ações comerciais. Vendas, Quitadas e detalhes SHALL oferecer consultas e ações funcionais de cadastro, edição e recebimento da FASE-006, conforme elegibilidade, sem exportação ou controles fictícios.

#### Scenario: Abrir cada página comercial inicial
- **WHEN** a pessoa acessar Visão Geral ou Relatórios
- **THEN** SHALL distinguir uma funcionalidade ainda indisponível de uma consulta realizada sem resultados
- **AND** SHALL não encontrar números financeiros, vendas inventadas ou ações de cadastrar, editar, pagar ou exportar

#### Scenario: Consultar páginas entregues sem promessa de mutação
- **WHEN** a pessoa acessar Vendas, Quitadas ou detalhes
- **THEN** SHALL encontrar as consultas reais previstas em consulta-vendas, não a mensagem de que nenhuma consulta foi realizada
- **AND** SHALL encontrar somente ações funcionais: Nova venda em Vendas, Editar nas duas listas e detalhe, e Receber no detalhe com pendências; nenhuma exportação
- **AND** Configurações, aviso, temas e limites de demonstração SHALL continuar preservados
- **AND** abrir um fluxo ou navegar SHALL não confirmar operações automaticamente
