# Spec Delta

## MODIFIED Requirements

### Requirement: Rotas acessíveis diretamente e retorno de caminho desconhecido

A aplicação SHALL disponibilizar as rotas atuais de Visão Geral, Vendas, quatro
coleções, cadastro, detalhe, edição, Relatórios e Configurações; `/` SHALL abrir
Visão Geral. Detalhe/edição SHALL preservar ID completo. Caminho desconhecido SHALL
mostrar página não encontrada com retorno. Recarga SHALL seguir a fonte do modo,
sem tratar persistência local como sessão demonstrativa perdida.

#### Scenario: Abrir e recarregar destinos diretamente
- **WHEN** abrir diretamente ou recarregar `/visao-geral`, `/vendas`, `/vendas/quitadas`, `/vendas/inativas`, `/vendas/prejuizo`, `/vendas/nova`, `/vendas/:id`, `/vendas/:id/editar`, `/relatorios` ou `/configuracoes`
- **THEN** SHALL encontrar página identificada e navegação coerente, sujeita à existência do registro e disponibilidade da fonte
- **AND** `/` SHALL resultar em `/visao-geral`; detalhe/edição SHALL consultar ID completo, inclusive barras codificadas
- **AND** no demo, edição de venda criada na sessão anterior SHALL informar ausência; no local, registro persistido SHALL ser recuperado após recarga sem seed

#### Scenario: Recuperar-se de caminho desconhecido
- **WHEN** acessar rota não prevista
- **THEN** SHALL receber página não encontrada e link para Visão Geral
- **AND** retorno SHALL restaurar navegação normal, preservando tema e limites do modo

#### Scenario: Trocar venda sem exibir registro anterior
- **WHEN** mudar detalhe de uma venda para outra e depois para identificador inexistente
- **THEN** SHALL consultar novo ID a cada navegação sem manter dados do anterior; no local, resposta atrasada anterior SHALL não substituir destino atual
- **AND** ID ausente SHALL mostrar venda não encontrada com retornos, distinta de rota desconhecida e indisponibilidade da API
- **AND** `/vendas/quitadas` SHALL abrir coleção, nunca detalhe de ID quitadas
- **AND** `/vendas/nova` SHALL abrir cadastro, nunca detalhe de ID nova; edição SHALL preparar rascunho correto ao trocar ID

#### Scenario: Orientar cadastro e edição dentro de Vendas
- **WHEN** abrir cadastro ou edição por ação interna ou acesso direto
- **THEN** Vendas SHALL permanecer módulo ativo, com título específico e foco após navegação interna
- **AND** SHALL haver retorno explícito a Vendas e, na edição existente, ao detalhe, sem depender de histórico do navegador
- **AND** cancelar antes de envio SHALL restaurar contexto/foco do acionador existente ou alternativa lógica; após envio local SHALL não afirmar rollback

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
