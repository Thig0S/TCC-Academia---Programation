# Spec Delta

## MODIFIED Requirements

### Requirement: Núcleo sem promessa de interface comercial

O núcleo SHALL preservar estrutura, temas e aviso demonstrativo. Na FASE-005, projeções SHALL alimentar listas paginadas e detalhes somente leitura, sem cartões globais em Vendas/Quitadas e sem eliminar projeções financeiras internas. Comandos SHALL continuar internos e testáveis, sem interface de cadastro, pagamento, edição ou exportação. Visão Geral e Relatórios SHALL manter conteúdo indisponível; Configurações SHALL preservar suas explicações.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações
- **THEN** SHALL encontrar consultas reais em Vendas e Quitadas, com acesso aos detalhes, sem anunciar que nenhuma consulta foi realizada
- **AND** Visão Geral e Relatórios SHALL continuar explicando a indisponibilidade de seus conteúdos comerciais
- **AND** Configurações, aviso e temas SHALL permanecer disponíveis sem controles fictícios
- **AND** a retirada dos cartões de Vendas SHALL não antecipar os indicadores exclusivos da Visão Geral, planejados na FASE-007

#### Scenario: Consultar sem expor comandos de mutação
- **WHEN** a pessoa pesquisar, filtrar situação nas abertas, limpar critérios, paginar ou navegar entre listas e detalhes
- **THEN** SHALL consultar a mesma fonte sem criar ou alterar vendas ou recebimentos
- **AND** SHALL não encontrar ações de cadastro, edição, pagamento ou exportação nesta fase
- **AND** a disponibilidade das consultas SHALL não prometer persistência nem uso operacional
