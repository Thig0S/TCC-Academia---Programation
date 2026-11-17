# Spec Delta

## MODIFIED Requirements

### Requirement: Identidade cromática da barra lateral

A barra lateral SHALL usar vermelho da identidade no tema claro e degradê vertical estático vermelho/vinho no escuro, seguindo os exemplos indicados. Textos, ícones, perfil, links, ativo/hover e foco SHALL respeitar os mínimos de contraste sobre todo o fundo. A logo SHALL permanecer preservada; superfícies das consultas SHALL admitir o refinamento previsto em consulta-vendas. Esse tratamento SHALL acompanhar o bloco responsivo sem exigir animação.

#### Scenario: Ler a navegação vermelha nos dois temas
- **WHEN** a pessoa alternar o tema e percorrer os destinos nos dois viewports técnicos
- **THEN** a lateral SHALL apresentar vermelho no claro e degradê vermelho/vinho no escuro
- **AND** as referências SHALL ser `exemploListagemDeVendas.png` para claro e `exemploDesignDark.png` para escuro, sem copiar dados ou campos
- **AND** textos e ícones claros, estado ativo e foco SHALL manter contraste nos extremos e regiões intermediárias do fundo
- **AND** a localização SHALL continuar indicada por semântica e estado visual distinguível além de cor, sem exigir sublinhado permanente; hover/foco SHALL permanecer perceptíveis, admitindo sublinhado nesses estados

### Requirement: Consistência visual e legibilidade

Cada tema SHALL abranger navegação, cabeçalho, aviso, páginas e controles existentes. Textos, bordas, foco e indicação ativa SHALL continuar perceptíveis, sem depender apenas de cor. As consultas SHALL seguir as referências light/dark e os links integrados de consulta-vendas. Elementos existentes SHALL respeitar movimento reduzido e contraste mínimo de 4,5:1 para texto comum, 3:1 para texto grande e indicadores essenciais de foco/controle.

#### Scenario: Conferir todas as superfícies nos dois temas
- **WHEN** a pessoa alternar temas e percorrer todos os destinos, incluindo página não encontrada
- **THEN** a interface SHALL não misturar superfícies de temas diferentes nem tornar textos e controles ilegíveis
- **AND** rótulos e estados ativos SHALL permanecer compreensíveis além da cor
- **AND** foco e contraste SHALL satisfazer os mínimos definidos sem alegação de certificação integral de acessibilidade
- **AND** consultas SHALL apresentar superfícies claras/brancas no tema claro e quase pretas/grafite com texto claro no escuro, sem azul/sublinhado padrão permanente nos links afetados, preservando legibilidade nos estados normal, hover, foco e ativo

#### Scenario: Usar preferência de movimento reduzido
- **WHEN** a preferência de movimento reduzido estiver ativa e a pessoa navegar ou alternar o tema
- **THEN** a compreensão e o acionamento SHALL não depender de animações
