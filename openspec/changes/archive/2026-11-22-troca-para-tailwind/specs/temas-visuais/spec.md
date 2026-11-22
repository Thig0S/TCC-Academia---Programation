# Spec Delta

## MODIFIED Requirements

### Requirement: Consistência visual e legibilidade

Cada tema SHALL abranger navegação, cabeçalho, aviso, Visão Geral, Vendas, detalhes, formulários, recebimento, Relatórios, Configurações, modais e controles existentes. Toda a aplicação SHALL usar uma linguagem visual coerente com as referências fornecidas, com superfícies, tipografia, espaçamento, bordas, cantos, identidade cromática e estados visuais consistentes. Textos, bordas, foco e indicação ativa SHALL continuar perceptíveis, sem depender apenas de cor. Elementos SHALL respeitar movimento reduzido e contraste mínimo de 4,5:1 para texto comum, 3:1 para texto grande e indicadores essenciais de foco/controle.

#### Scenario: Conferir todas as superfícies nos dois temas

- **WHEN** a pessoa alternar temas e percorrer todos os destinos, incluindo páginas não encontradas e fluxos com modal
- **THEN** a interface SHALL apresentar superfícies claras no tema claro e grafite/escuras no tema escuro, com identidade vermelha e linguagem visual consistente com as referências em todos os módulos
- **AND** textos, rótulos e estados ativos SHALL permanecer compreensíveis além da cor, sem misturar superfícies de temas diferentes
- **AND** foco e contraste SHALL satisfazer os mínimos definidos sem alegação de certificação integral de acessibilidade
- **AND** telas sem referência específica SHALL seguir os mesmos tokens e padrões visuais sem introduzir funcionalidades não aprovadas
- **AND** consultas e links afetados SHALL continuar seguindo o contrato de âncoras integradas de consulta-vendas, sem azul/sublinhado padrão permanente, com legibilidade em normal, hover, foco e ativo

#### Scenario: Comparar composição com as referências sem perder informação

- **WHEN** comparar os módulos às referências visuais fornecidas nos dois temas em desktop, tela estreita e zoom nativo de 200%
- **THEN** composição, superfícies, tipografia, espaçamento, bordas, cantos e identidade cromática SHALL buscar máxima aproximação às referências, adaptando a composição para manter conteúdo e controles acessíveis
- **AND** a interface SHALL preservar os contratos funcionais existentes e não copiar dados pessoais, controles de janela/notificação ou ações indisponíveis mostrados nas imagens
- **AND** as referências SHALL ser `exemploListagemDeVendas.png` para listagem clara, `exemploDadosDaVenda.png` para detalhe, `exemploCadastrarVenda.png` para composição do cadastro e `exemploDesignDark.png` para a linguagem escura, todas em `frontend/public/imgs/exemplos/`
- **AND** edição, recebimento, Visão Geral, Relatórios, Configurações e estados de erro/ausência SHALL derivar o mesmo padrão visual, sem exigir cópia literal de uma tela que não possui referência própria
- **AND** a comparação SHALL considerar hierarquia, alinhamento, superfícies, cores, tipografia, espaçamento, bordas e cantos; diferenças para preservar acessibilidade, aviso, identidade original e comportamentos aprovados SHALL ser explicitadas em vez de exigir igualdade pixel a pixel

#### Scenario: Usar preferência de movimento reduzido

- **WHEN** a preferência de movimento reduzido estiver ativa e a pessoa navegar ou alternar o tema
- **THEN** a compreensão e o acionamento SHALL não depender de animações
