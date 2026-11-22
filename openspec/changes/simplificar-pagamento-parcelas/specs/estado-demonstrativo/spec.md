# Spec Delta

## MODIFIED Requirements

### Requirement: Núcleo sem promessa de interface comercial

O núcleo SHALL preservar estrutura, temas e contexto demonstrativo. Projeções SHALL alimentar listas paginadas e detalhes sem cartões globais em Vendas/Quitadas, os indicadores e resumos de Visão Geral e as análises de Relatórios. Cadastro, edição de cliente e pagamento individual da primeira pendente SHALL continuar funcionais pela interface. Configurações SHALL preservar suas explicações. A interface SHALL não prometer persistência, exportação real ou uso operacional.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações
- **THEN** SHALL encontrar consultas reais em Vendas e Quitadas, com acesso aos detalhes, sem anunciar que nenhuma consulta foi realizada
- **AND** Visão Geral e Relatórios SHALL consultar a mesma fonte e referência, sem manter mensagem de indisponibilidade de seus conteúdos financeiros
- **AND** Configurações, contexto demonstrativo e temas SHALL permanecer disponíveis sem controles fictícios
- **AND** os quatro indicadores globais SHALL permanecer exclusivos da Visão Geral

#### Scenario: Consultar sem expor comandos de mutação
- **WHEN** a pessoa pesquisar, filtrar situação nas abertas, limpar critérios, paginar ou navegar entre listas, detalhes, painel e relatórios
- **THEN** SHALL consultar a mesma fonte sem criar ou alterar vendas ou recebimentos por essas operações
- **AND** ações de cadastro, edição e Pagar SHALL abrir fluxos reais, sem publicar antes de confirmação; exportação SHALL permanecer ausente em Vendas e somente ilustrativa em Relatórios
- **AND** a disponibilidade das consultas e mutações demonstrativas SHALL não prometer persistência nem uso operacional

#### Scenario: Preservar mutações somente durante a sessão
- **WHEN** confirmar cadastro, edição ou pagamento individual, navegar entre destinos e depois recarregar a aplicação
- **THEN** SHALL manter a alteração e referência na navegação e restaurar o conjunto inicial na recarga
- **AND** SHALL não salvar rascunhos ou registros em armazenamento persistente nem transmitir dados de negócio

#### Scenario: Atualizar análises após publicação aceita
- **WHEN** cadastrar com entrada ou pagar a primeira parcela pendente e voltar à Visão Geral ou Relatórios
- **THEN** indicadores, listas e totais SHALL refletir a mesma versão aceita da sessão sem recarga, contando entrada, cada pagamento individual e lotes históricos uma vez, sem somar novamente alocações
- **AND** editar apenas identificação SHALL atualizar os rótulos da venda nos resumos e relatórios sem alterar totais financeiros
- **AND** cancelamento ou rejeição SHALL preservar as projeções anteriores
