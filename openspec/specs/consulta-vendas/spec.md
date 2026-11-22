# consulta-vendas Specification

## Purpose

Permitir localizar e conferir vendas demonstrativas e suas parcelas na interface, mantendo separação entre abertas e quitadas, consistência financeira e limites de consulta somente leitura.

## Requirements

### Requirement: Coleções de abertas e quitadas consultáveis

A aplicação SHALL apresentar em Vendas somente vendas com saldo positivo e em Quitadas somente vendas com saldo zero. Ambas SHALL consultar a mesma fonte da sessão, preservar identidade e dados de cada venda e permitir abrir seus detalhes pelo nome do cliente e por ação Visualizar identificável.

#### Scenario: Consultar as duas coleções
- **WHEN** a pessoa acessar Vendas e Quitadas com o conjunto sintético inicial
- **THEN** SHALL encontrar as vendas exclusivamente na coleção correspondente ao saldo, sem duplicá-las
- **AND** SHALL ver Cliente, Data da venda, Valor total, Parcelas pagas/total, Saldo devedor, Próximo vencimento, Situação e Ações
- **AND** quitadas SHALL mostrar Quitada, saldo zero, todas as parcelas pagas e ausência de próximo vencimento, sem data inventada

#### Scenario: Preservar identidade entre nomes semelhantes
- **WHEN** existirem vendas com nomes semelhantes e a pessoa acionar o nome ou Visualizar de uma linha
- **THEN** SHALL abrir somente o detalhe da venda identificada naquela linha
- **AND** o nome acessível da ação SHALL permitir distinguir seu contexto sem depender de hover

### Requirement: Resumos globais independentes da pesquisa

Vendas e Quitadas SHALL não exibir os quatro cartões globais, reservados à Visão Geral em fase própria. Consultar, buscar e paginar SHALL preservar os dados financeiros. Listas e detalhe SHALL identificar a referência civil fixa da sessão, valores em BRL e datas DD/MM/AAAA sem deslocamento de fuso.

#### Scenario: Pesquisar sem modificar cartões
- **WHEN** busca, situação ou sua combinação reduzir a lista de abertas a um registro ou a nenhum resultado
- **THEN** Vendas e Quitadas SHALL não apresentar Total em aberto, Valores em atraso, Recebimentos do mês ou Vendas cadastradas como cartões globais
- **AND** a consulta SHALL não alterar as projeções financeiras globais, cuja exibição na Visão Geral pertence à FASE-007, sem antecipá-la nesta fase

#### Scenario: Consultar fonte vazia e referência estável
- **WHEN** a fonte estiver vazia em cenário de avaliação ou a sessão atravessar meia-noite
- **THEN** a consulta vazia SHALL não inventar valores ou cartões para preencher o espaço
- **AND** a referência SHALL permanecer a capturada na abertura, inclusive ao navegar, e não ser substituída pelo dia da consulta

### Requirement: Busca única de nome e identificação

Cada coleção SHALL oferecer um único campo de busca com rótulo, orientação de nome/CPF/telefone/data e ação Limpar pesquisa. Nome SHALL corresponder parcialmente sem distinguir acentos ou caixa; CPF/telefone SHALL admitir sequência de dígitos ignorando pontuação usual. Basta corresponder a um campo. A busca SHALL atuar somente na coleção atual, sem busca global; Quitadas SHALL não oferecer filtros adicionais.

#### Scenario: Pesquisar texto equivalente
- **WHEN** a pessoa pesquisar parte do nome usando outra caixa ou sem acentos
- **THEN** SHALL encontrar os nomes que contêm esse texto normalizado
- **AND** SHALL não combinar palavras como campos separados nem selecionar automaticamente homônimos

#### Scenario: Pesquisar identificação com e sem pontuação
- **WHEN** uma sequência de dígitos de CPF ou telefone for pesquisada com ou sem pontos, hífens, espaços, parênteses ou sinal de mais
- **THEN** SHALL corresponder à mesma sequência contida na identificação da venda, ignorando essa pontuação
- **AND** uma entrada sem qualquer dígito SHALL não corresponder a todas as identificações por uma sequência vazia
- **AND** após a adequação do seed na FASE-006, a consulta SHALL localizar os números sintéticos compatíveis com as validações de identificação, sem exigir marcadores CPF-DEMO/TEL-DEMO no conjunto inicial
- **AND** pesquisa parcial SHALL não exigir comprimento completo ou verificadores de CPF, pois não é confirmação de cadastro/edição

#### Scenario: Restringir e limpar pesquisa
- **WHEN** a pessoa pesquisar um termo presente somente na outra coleção ou acionar Limpar pesquisa
- **THEN** a pesquisa restrita SHALL não incluir registros da outra coleção
- **AND** Limpar pesquisa ou informar termo vazio/espaços SHALL remover somente a restrição do termo, preservando a situação selecionada nas abertas, sem mutar registros nem exigir preservar o termo após sair da página
- **AND** limpar SHALL manter ou devolver o foco ao campo, sem navegar ou reiniciar a sessão

### Requirement: Filtro de situação nas abertas

Vendas SHALL oferecer um filtro de situação com Todas como padrão, Em aberto, Próximos dias e Atrasada. A seleção SHALL combinar-se com a busca por E, sem incluir quitadas ou alterar a fonte. Limpar critérios SHALL restaurar termo vazio e Todas; critérios SHALL permanecer locais, sem obrigação de preservá-los ao sair.

#### Scenario: Combinar situação e busca
- **WHEN** a pessoa selecionar cada situação com e sem termo de busca
- **THEN** SHALL ver somente vendas abertas que correspondam simultaneamente ao termo e à situação
- **AND** Todas SHALL incluir também próximas e atrasadas da coleção aberta, sem restringir à situação Em aberto
- **AND** uma combinação sem correspondências SHALL produzir zero resultados, sem trocar a situação automaticamente

#### Scenario: Limpar todos os critérios
- **WHEN** a pessoa acionar Limpar critérios depois de pesquisar e selecionar uma situação
- **THEN** SHALL restaurar termo vazio e Todas, exibindo a primeira página da coleção de abertas
- **AND** o foco SHALL ir ao campo de busca e a contagem de resultados SHALL ser atualizada sem reiniciar a sessão
- **AND** Limpar pesquisa isoladamente SHALL preservar a situação selecionada

### Requirement: Pesquisa de data civil exata

Um termo completo DD/MM/AAAA SHALL pesquisar exclusivamente a data exata da venda no calendário civil 0001–9999. Datas inválidas SHALL produzir ausência de correspondências sem exceção ou interpretação como CPF/telefone. Não SHALL haver busca de data parcial, intervalo ou mudança automática do dia informado.

#### Scenario: Consultar dia exato
- **WHEN** a pessoa informar a data completa de uma venda, incluindo ano de quatro dígitos
- **THEN** SHALL encontrar somente vendas da coleção atual realizadas nesse dia
- **AND** SHALL não pesquisar a data de vencimento ou de recebimento em seu lugar

#### Scenario: Rejeitar data inexistente sem reinterpretar
- **WHEN** a pesquisa for 31/02/2027, 29/02/1900 ou 01/01/0000
- **THEN** SHALL não encontrar registros, sem erro inesperado e sem correspondência pelo trecho numérico da entrada
- **AND** 29/02/2000 SHALL ser tratada como data válida, sem ajustes de fuso

### Requirement: Estados distintos de consulta

As consultas SHALL distinguir coleção sem registros, busca/filtro sem correspondências e venda não encontrada. Nenhum estado SHALL criar registros, sugerir consulta ainda indisponível em Vendas/Quitadas ou ocultar os retornos. Os estados SHALL ser comunicados por texto e não apenas por cor.

#### Scenario: Diferenciar vazio de ausência de resultados
- **WHEN** a coleção fonte estiver vazia ou houver registros mas nenhum corresponder à busca e situação selecionadas
- **THEN** SHALL explicar, respectivamente, ausência de vendas abertas/quitadas ou ausência de resultados para a pesquisa
- **AND** ausência de resultados por busca/filtro SHALL permitir limpar todos os critérios e restaurar os registros existentes
- **AND** a coleção vazia SHALL não oferecer cadastro fictício ou quitação fictícia; Nova venda em Vendas SHALL abrir o cadastro funcional da FASE-006, inclusive sem vendas abertas

#### Scenario: Identificar venda ausente
- **WHEN** um identificador desconhecido for consultado no detalhe
- **THEN** SHALL apresentar Venda não encontrada, sem reutilizar dados da consulta anterior
- **AND** SHALL oferecer retorno explícito a Vendas e Quitadas, distinguindo ausência de registro de caminho desconhecido

### Requirement: Detalhes e parcelas somente da venda selecionada

 O detalhe SHALL mostrar nome, CPF, telefone, descrição quando preenchida, data da venda, total, entrada, quantidade total, pago, saldo e situação da venda selecionada. SHALL exibir todas as parcelas com número/total, valor, vencimento, situação, data e forma de pagamento. Entrada SHALL ser identificada na parcela 1 Paga e incluída em pagas/total; eventual resumo da entrada SHALL não representar outra cobrança ou somar valores novamente.

#### Scenario: Conferir entrada e histórico
- **WHEN** abrir uma venda com entrada e parcelas pagas e pendentes
- **THEN** SHALL mostrar a entrada identificada na parcela 1 Paga, com data/forma efetivas da venda, contando-a entre as pagas e no total
- **AND** as demais liquidadas SHALL mostrar data/forma efetivas; pendentes SHALL indicar ausência desses dados sem inventar valores
- **AND** pago, saldo, quantidade, próximo vencimento e situação SHALL corresponder às mesmas projeções das listas, sem duplicar entrada

#### Scenario: Consultar sem entrada ou descrição
- **WHEN** abrir venda sem entrada e sem descrição
- **THEN** SHALL informar Sem entrada, sem valor/data/forma fictícios de recebimento
- **AND** descrição ausente SHALL não aparecer como texto inventado nem impedir consulta

#### Scenario: Contagem inicial e após lote
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e depois receber as parcelas 2 e 3
- **THEN** listas e detalhe SHALL mostrar inicialmente 1/10 e depois 3/10 pagas, com pago R$ 600,00 e saldo R$ 1.400,00 após o lote
- **AND** a entrada SHALL não oferecer nova ação de recebimento

### Requirement: Consulta acessível e sem mutações

A consulta SHALL preservar aviso demonstrativo, dois temas, teclado, foco e privacidade. Pesquisar, limpar, paginar e navegar SHALL não alterar registros. Ações funcionais de cadastrar, editar cliente e receber SHALL depender de confirmação explícita conforme suas capacidades, sem exportação. Tabelas e busca SHALL ser legíveis nos viewports técnicos existentes; rolagem horizontal necessária SHALL ficar restrita à região da tabela.

#### Scenario: Consultar por teclado em ambos os temas
- **WHEN** a pessoa pesquisar, limpar, abrir detalhes e retornar por teclado nos dois temas e viewports técnicos
- **THEN** SHALL alcançar os controles com foco perceptível, rótulos inequívocos, cabeçalhos de tabela e situações textuais
- **AND** resultados SHALL ser anunciáveis sem mover o foco durante digitação; ações SHALL não depender de hover
- **AND** texto comum SHALL atingir contraste mínimo 4,5:1, texto grande e indicadores essenciais de foco/controle 3:1
- **AND** eventual região de rolagem da tabela SHALL ser identificável e operável por teclado, sem corte horizontal do restante da página

#### Scenario: Navegar sem alterar ou persistir vendas
- **WHEN** a pessoa consultar as listas e detalhes, pesquisar, limpar, alternar temas e recarregar
- **THEN** SHALL não criar ou modificar vendas, pagamentos e dados pessoais por essas ações, nem gravar storage, cookies ou banco do navegador
- **AND** SHALL não consultar serviços externos ou expor mecanismos globais de teste para mutar o estado
- **AND** a nova sessão SHALL restaurar referência/conjunto inicial conforme as regras do núcleo, sem prometer persistência
- **AND** os recortes somente leitura da FASE-004/005 SHALL ser históricos; somente confirmações explícitas dos fluxos da FASE-006 SHALL permitir mutações

#### Scenario: Acessar ações funcionais e refletir alterações
- **WHEN** acessar Nova venda em Vendas, Editar em uma linha de abertas/quitadas ou no detalhe, ou Receber no detalhe com pendências
- **THEN** SHALL abrir o fluxo funcional da venda correta, com nomes acessíveis contextualizados e sem ações fictícias
- **AND** sucesso SHALL atualizar dados e coleções da mesma sessão; critérios e paginação SHALL continuar seguindo os contratos existentes, incluindo ajuste da última página após redução
- **AND** Vendas e Quitadas SHALL continuar sem os quatro cartões globais, busca global ou exportação

### Requirement: Paginação local das coleções de vendas

Abertas e Quitadas SHALL apresentar até 10 vendas por página após os critérios, preservando ordem e identidade. Abaixo da tabela SHALL haver faixa/total de resultados e, quando necessário, navegação numerada com anterior/próxima e página atual identificada. Paginar SHALL não alterar a fonte ou incluir registros da outra coleção.

#### Scenario: Percorrer resultados sem duplicação
- **WHEN** a coleção filtrada tiver 11 ou 21 vendas e a pessoa percorrer números e anterior/próxima
- **THEN** SHALL encontrar todas exatamente uma vez entre as páginas, com no máximo 10 por página
- **AND** faixa/total SHALL representar os resultados filtrados; anterior na primeira e próxima na última SHALL estar indisponíveis
- **AND** a página atual SHALL ser indicada visual e programaticamente; reticências SHALL não funcionar como páginas

#### Scenario: Redefinir página com critérios ou redução da coleção
- **WHEN** a pessoa alterar termo/situação, limpar pesquisa/critérios ou a coleção diminuir durante a consulta
- **THEN** mudanças e limpezas de critérios SHALL voltar à página 1, preservando a semântica de cada limpeza
- **AND** redução da coleção sem mudança de critérios SHALL limitar a seleção à última página válida, sem tabela vazia causada por página inexistente
- **AND** zero resultados SHALL mostrar o estado sem resultados/coleção vazia pertinente, sem páginas fictícias; uma única página SHALL dispensar controles de troca
- **AND** Quitadas SHALL continuar sem filtro de situação; paginação SHALL ser operável por teclado com anúncio de faixa/total e foco preservado no controle acionado

### Requirement: Listagem compacta no desktop

Em 1366×768 e zoom 100%, nos dois temas, o cenário padrão SHALL mostrar critérios, 10 linhas de vendas e paginação sem rolagem vertical da página. Nas abertas, busca, situação, Limpar pesquisa e Limpar critérios SHALL ficar lado a lado em uma faixa. Não SHALL haver busca duplicada no cabeçalho.

#### Scenario: Ver vendas na primeira tela
- **WHEN** a pessoa abrir Vendas ou Quitadas no topo em 1366×768/100%, com 10 resultados e textos curtos do cenário padrão
- **THEN** SHALL ver as 10 linhas, cabeçalhos, critérios pertinentes e rodapé de paginação dentro do viewport, sem rolar a página
- **AND** nas abertas, os quatro controles SHALL ocupar a mesma faixa horizontal; Quitadas SHALL não ganhar filtro extra
- **AND** aviso, referência, legibilidade e acesso às ações SHALL ser preservados, sem reduzir artificialmente fonte ou ocultar informações

### Requirement: Detalhe compacto com histórico completo

Em desktop 1366×768/100%, o detalhe padrão SHALL apresentar cliente e venda em blocos condensados lado a lado e até 10 parcelas visíveis sem rolagem da página, incluindo a entrada entre essas dez. Mais parcelas SHALL permanecer acessíveis por rolagem interna da tabela, sem paginação ou perda do histórico. SHALL preservar o padrão vigente de fonte 18 px, line-height 20 px e padding compartilhado.

#### Scenario: Conferir dados e dez parcelas sem rolar a página
- **WHEN** abrir venda com até dez parcelas no total, inclusive a entrada, e descrição curta no desktop de referência em qualquer tema
- **THEN** SHALL ver cliente/venda, indicação da entrada e cabeçalho com as até dez linhas sem rolagem vertical da página
- **AND** disposição e densidade SHALL preservar a referência complementar `frontend/public/imgs/exemplos/exemploDadosDaVenda.png` e o refinamento integrado no PR #20, sem copiar dados pessoais ou ações indisponíveis

#### Scenario: Acessar excedente e conteúdo adaptado
- **WHEN** houver mais de dez parcelas totais, textos extensos, viewport 390×844 ou zoom nativo 200%
- **THEN** excedente SHALL ser alcançável em região interna identificada, por teclado e com cabeçalho identificável, sem cortar histórico
- **AND** telas menores, zoom e textos extensos SHALL permitir reorganização/rolagem sem ocultar campos, contexto demonstrativo, ações ou foco para cumprir artificialmente o cenário padrão

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

### Requirement: Atraso no dia civil seguinte ao vencimento

Parcela pendente SHALL ser classificada Atrasado a partir do primeiro dia civil após vencer, sem tolerância adicional ou contagem de 24 horas. Parcela liquidada SHALL continuar Paga. Situação da venda e valores em atraso SHALL usar a mesma regra da referência fixa da sessão.

#### Scenario: Comparar vencimento e dia seguinte
- **WHEN** consultar parcela pendente que vence em 10/11 com referência em 10/11 e, em outra sessão de avaliação, em 11/11
- **THEN** SHALL ser Próximos dias no dia 10 e Atrasado no dia 11
- **AND** se liquidada SHALL ser Paga em ambas as referências; a venda e os derivados SHALL manter a classificação consistente sem mudar as regras financeiras existentes
