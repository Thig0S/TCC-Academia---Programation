# Spec Delta

## MODIFIED Requirements

### Requirement: Fidelidade visual e âncoras integradas

As consultas e links afetados SHALL seguir as referências de `frontend/public/imgs/exemplos/` em composição, densidade, superfícies, tipografia, espaçamento, bordas, cantos, cores e estados nos dois temas. Âncoras de menu, cliente, Visualizar e retorno/breadcrumb SHALL integrar-se ao design, sem azul/sublinhado padrão permanente, preservando semântica, destinos e acessibilidade. O refinamento visual SHALL manter os contratos de conteúdo, paginação, densidade desktop, telas estreitas e zoom definidos nesta especificação.

#### Scenario: Comparar light e dark e percorrer links

- **WHEN** comparar consultas nos dois temas às imagens de listagem/detalhe e `exemploDesignDark.png` e percorrer links por teclado
- **THEN** SHALL encontrar fundo claro/tabelas brancas no claro, fundo quase preto/superfícies grafite/texto claro no escuro, identidade vermelha nos destaques e selos com texto
- **AND** links SHALL ter hover/foco perceptíveis, sublinhado permitido nesses estados, contraste e indicação ativa corretos; texto na lateral SHALL contrastar com sua superfície
- **AND** diferenças funcionais aprovadas SHALL ser preservadas: sem cartões em Vendas, busca global duplicada, controles de janela/notificação ou ações fictícias; dados pessoais das imagens SHALL não ser copiados

#### Scenario: Preservar densidade e acesso ao conteúdo após refinamento visual

- **WHEN** consultar listas e detalhes em 1366×768/100%, viewport 390×844 e zoom nativo de 200%, nos dois temas
- **THEN** em 1366×768/100% com dez resultados e textos curtos, listas SHALL mostrar dez linhas, cabeçalhos, critérios e faixa/total, além da navegação de paginação quando necessária, sem rolagem vertical da página
- **AND** no cenário desktop de detalhe com até dez parcelas, entrada e descrição curta, detalhes SHALL mostrar cliente e venda lado a lado e todas essas parcelas sem rolagem vertical da página; parcelas excedentes SHALL permanecer acessíveis em região de rolagem interna identificável
- **AND** em 390×844, zoom nativo de 200% ou textos extensos, a interface SHALL admitir reorganização e rolagem acessível, sem impor a ausência de rolagem do cenário desktop padrão; rolagem horizontal necessária SHALL ficar restrita à região da tabela
- **AND** o refinamento SHALL não ocultar informações, ações, foco ou controles para reproduzir visualmente as imagens
