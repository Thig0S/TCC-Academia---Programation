# Spec Delta

## MODIFIED Requirements

### Requirement: Descarte de sessão sem persistência ou serviços de dados

No modo demonstrativo padrão, o núcleo SHALL manter dados e referência apenas em
memória e descartar mutações ao recriar a aplicação. SHALL não consultar APIs de dados,
coletar dados reais, criar cookies, gravar storage, banco do navegador ou arquivo, nem
exigir login. Recursos SHALL continuar locais. O modo local persistido SHALL ser
selecionado separadamente e nunca ativado como fallback da demonstração ou vice-versa.

#### Scenario: Recriar aplicação após alteração
- **WHEN** uma sessão demonstrativa tiver alterações internas aceitas e uma nova aplicação demonstrativa for inicializada
- **THEN** SHALL restaurar o conjunto inicial correspondente à nova referência, sem recuperar alterações anteriores
- **AND** SHALL não existir armazenamento persistente ou transmissão de dados de negócio nesse modo

#### Scenario: Executar demonstração sem backend
- **WHEN** iniciar execução/build padrão ou Pages com API desligada e sem segredo configurado
- **THEN** SHALL oferecer a demonstração funcional com seu seed e descartes existentes
- **AND** SHALL não fazer requisições comerciais, recuperar dados do SQLite ou exigir configuração local

#### Scenario: Não trocar fonte por falha
- **WHEN** modo local apresentar indisponibilidade de API ou credencial
- **THEN** SHALL não iniciar o núcleo demonstrativo para preencher a tela ou anunciar dados sintéticos como persistidos
- **AND** a falha SHALL continuar identificada no modo local

### Requirement: Núcleo sem promessa de interface comercial

O núcleo demonstrativo SHALL preservar temas, limites e fonte comum para listas,
detalhes, Visão Geral e Relatórios. Cadastro, edição e recebimento SHALL continuar
funcionais na demonstração, sem promessa de persistência, exportação ou uso operacional.
O modo local separado SHALL usar a fonte persistida e informar seus limites próprios,
sem reutilizar mensagens de descarte que contradigam o SQLite.

#### Scenario: Abrir páginas após inicializar o domínio
- **WHEN** a pessoa acessar Visão Geral, Vendas, Quitadas, Relatórios ou Configurações no modo demonstrativo
- **THEN** SHALL encontrar consultas reais da sessão, acesso aos detalhes e conteúdos financeiros disponíveis
- **AND** Configurações, aviso e temas SHALL permanecer disponíveis sem controles fictícios
- **AND** os quatro indicadores globais SHALL permanecer exclusivos da Visão Geral

#### Scenario: Consultar sem expor comandos de mutação
- **WHEN** a pessoa pesquisar, filtrar situação nas abertas, limpar critérios, paginar ou navegar entre listas, detalhes, painel e relatórios
- **THEN** SHALL consultar a fonte do modo selecionado sem criar ou alterar vendas ou recebimentos
- **AND** cadastro, edição e recebimento SHALL depender de confirmação explícita; exportação SHALL permanecer ausente em Vendas e ilustrativa em Relatórios
- **AND** disponibilidade de consultas e mutações SHALL não prometer uso operacional

#### Scenario: Preservar mutações somente durante a sessão
- **WHEN** confirmar cadastro, edição ou recebimento demonstrativos, navegar e depois recarregar a demonstração
- **THEN** SHALL manter alteração e referência na navegação e restaurar conjunto inicial na recarga
- **AND** SHALL não salvar rascunhos ou registros em storage nem transmitir dados de negócio nesse modo

#### Scenario: Atualizar análises após publicação aceita
- **WHEN** cadastrar com entrada ou confirmar recebimento permitido e voltar à Visão Geral ou Relatórios
- **THEN** indicadores, listas e totais SHALL refletir a fonte aceita do modo, sem duplicação de entrada, recebimento e alocações
- **AND** editar apenas identificação SHALL atualizar rótulos sem alterar totais financeiros
- **AND** cancelar antes do envio ou rejeitar operação SHALL preservar projeções; incerteza local SHALL seguir o protocolo de conferência
