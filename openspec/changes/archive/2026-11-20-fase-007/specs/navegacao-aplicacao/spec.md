# Spec Delta

## MODIFIED Requirements

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
