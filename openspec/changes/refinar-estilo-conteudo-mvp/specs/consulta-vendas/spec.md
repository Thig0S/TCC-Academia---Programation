# Spec Delta

## MODIFIED Requirements

### Requirement: Fidelidade visual e âncoras integradas

As consultas e links afetados SHALL seguir as referências de `frontend/public/imgs/exemplos/` em composição, densidade, superfícies, tipografia, espaçamento, bordas, cantos, cores e estados nos dois temas. Âncoras de menu, cliente, Visualizar e retorno/breadcrumb SHALL integrar-se ao design, sem azul/sublinhado padrão permanente, preservando semântica, destinos e acessibilidade. O refinamento visual SHALL manter os contratos de conteúdo, paginação, densidade desktop, telas estreitas e zoom definidos nesta especificação.

#### Scenario: Comparar light e dark e percorrer links

- **WHEN** comparar consultas nos dois temas aos HTMLs `mercadao_oculos_dashboard_light.html` e `mercadao_oculos_dashboard_dark.html`, às imagens complementares de listagem/detalhe e `exemploDesignDark.png`, e percorrer links por teclado
- **THEN** SHALL encontrar fundo claro/tabelas brancas no claro, fundo quase preto/superfícies grafite/texto claro no escuro, identidade vermelha nos destaques e selos com texto
- **AND** links SHALL ter hover/foco perceptíveis, sublinhado permitido nesses estados, contraste e indicação ativa corretos; texto na lateral SHALL contrastar com sua superfície, sem redesenhar a lateral existente
- **AND** diferenças funcionais aprovadas SHALL ser preservadas: sem cartões em Vendas, busca global duplicada, controles de janela/notificação ou ações fictícias; dados pessoais das referências SHALL não ser copiados

#### Scenario: Preservar densidade e acesso ao conteúdo após refinamento visual

- **WHEN** consultar listas e detalhes em 1366×768/100%, viewport 390×844 e zoom nativo de 200%, nos dois temas
- **THEN** em 1366×768/100% com dez resultados e textos curtos, listas SHALL mostrar dez linhas, cabeçalhos, critérios e faixa/total, além da navegação de paginação quando necessária, sem rolagem vertical da página
- **AND** as tabelas de Vendas, Quitadas e parcelas SHALL usar tipografia de dados de 18 px e padding de célula consistente: 10 px horizontal e 4 px vertical nos dados, 10 px horizontal e 8 px vertical nos cabeçalhos, com line-height de 20 px
- **AND** no cenário desktop de detalhe com até dez parcelas, entrada e descrição curta, detalhes SHALL mostrar cliente e venda lado a lado e todas essas parcelas sem rolagem vertical da página; parcelas excedentes SHALL permanecer acessíveis em região de rolagem interna identificável
- **AND** se a fonte/padding da tabela exceder o viewport, a composição dos blocos existentes de cliente/venda SHALL ser compactada/reorganizada antes de aceitar rolagem vertical, sem remover campos ou reduzir sua legibilidade
- **AND** em 390×844, zoom nativo de 200% ou textos extensos, a interface SHALL admitir reorganização e rolagem acessível, sem impor a ausência de rolagem do cenário desktop padrão; rolagem horizontal necessária SHALL ficar restrita à região da tabela
- **AND** o refinamento SHALL não ocultar informações, ações, foco ou controles para reproduzir visualmente as referências, nem adotar as oito linhas dos HTMLs ou reduzir artificialmente fontes

#### Scenario: Refinar painel de listagem sem mudar consulta

- **WHEN** abrir Vendas ou Quitadas e utilizar pesquisa, ações e paginação
- **THEN** critérios, tabela e rodapé SHALL compor um conjunto visual coerente com painéis arredondados, cabeçalho de superfície suave, separadores e realce perceptível de hover/foco
- **AND** Vendas e Quitadas SHALL compartilhar fonte de 18 px, line-height de 20 px e padding de célula consistente, preservando as dez linhas no desktop e contendo eventual rolagem horizontal na região da tabela
- **AND** Nova venda em Vendas SHALL ter destaque de ação principal, preservando seu destino; nome do cliente, Visualizar e Editar SHALL continuar identificáveis e operáveis sem depender de hover ou de linha clicável
- **AND** busca local, opções atuais de situação, ausência de filtro extra em Quitadas, colunas e estados vazios SHALL permanecer inalterados; não SHALL existir aviso global persistente, ação conjunta “Limpar critérios” ou atalho contextual para Quitadas no cabeçalho; o acesso pelo menu lateral SHALL permanecer
- **AND** nas abertas, “Limpar pesquisa” SHALL preservar a situação, “Nova venda” SHALL ocupar a posição da ação removida na faixa e limpar o termo junto de selecionar “Todas” SHALL restaurar a lista completa
- **AND** selos SHALL usar fundo suave e texto contrastante de situação nos dois temas, sem trocar classificações por Em dia, Vencida ou Pendente dos HTMLs

#### Scenario: Refinar detalhe sem substituir sua página ou histórico

- **WHEN** visualizar uma venda aberta, quitada, com entrada ou com parcelas excedentes
- **THEN** blocos de cliente/venda, valores e situação SHALL receber hierarquia visual e superfícies coerentes com os HTMLs, adaptadas à composição compacta do MVP
- **AND** a tabela de parcelas SHALL usar a mesma fonte de 18 px e padding de célula de Vendas/Quitadas, preservando até dez parcelas no cenário desktop padrão e contendo rolagem horizontal dentro de sua região
- **AND** detalhe SHALL continuar página com retornos explícitos, edição e recebimento conforme elegibilidade, sem conversão para modal
- **AND** todos os dados existentes SHALL permanecer disponíveis, incluindo descrição quando presente, entrada separada, total pago, saldo, próximo vencimento, quantidade de parcelas e datas/formas de pagamento do histórico
