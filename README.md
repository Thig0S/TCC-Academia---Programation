# Prompt — Painel moderno de gestão de crediário (protótipo de MVP)

## Visão geral do projeto

Crie um **painel de gestão de vendas a prazo** moderno, limpo, intuitivo e profissional para uma ótica.

Utilize uma paleta de cores Dark-Theme

A aplicação substituirá um processo desatualizado baseado em Excel, atualmente utilizado para gerenciar vendas a prazo, parcelas, saldos em atraso e registros de pagamentos dos clientes.

> **IMPORTANTE:** Este é um protótipo de interface e experiência do usuário (UI/UX) para um MVP, NÃO uma aplicação pronta para produção.

O objetivo principal é criar um protótipo visualmente refinado, com aparência funcional, que possa ser apresentado ao proprietário e aos funcionários da loja para validação e coleta de opiniões.

Não implemente backend, banco de dados, autenticação ou integrações com APIs externas. Utilize dados demonstrativos estáticos e realistas em toda a aplicação.

Use as capturas de tela anexadas como referência:

- A imagem `exemplo/exemplo-planilha-vendas.jpeg` representa o processo atual e o tipo de informação gerenciada. Use-a como referência de organização, sem reproduzir seus dados pessoais.
- O exemplo de painel representa a disposição dos elementos, a organização, a funcionalidade de busca e a experiência geral desejadas.

Não reproduza o estilo visual da planilha. Redesenhe-o como uma aplicação moderna.

## 1. Direção de design

Construa um painel moderno e de alto padrão, no estilo SaaS, inspirado em plataformas de gestão financeira com visual limpo.

O design deve ser:

- Moderno, minimalista e profissional.
- Limpo e espaçoso, com excelente hierarquia visual.
- Fácil de entender para funcionários do comércio sem conhecimento técnico.
- Focado em usabilidade, legibilidade e eficiência.
- Visualmente consistente entre todos os módulos.
- Responsivo, mas otimizado principalmente para uso em computadores.

### Estilo visual

- Disponibilize dois temas visuais: **tema branco (claro)** e **tema escuro (dark)**, com o tema escuro por padrão.
- No tema branco, use fundo das páginas em branco levemente acinzentado ou cinza muito claro, com cartões e contêineres de tabelas brancos.
- No tema escuro, use fundos e superfícies em tons escuros, com textos claros e bordas discretas.
- Permita alternar entre os temas por um controle visível, acessível por teclado e com indicação do tema ativo, sem exigir persistência da preferência nesta etapa.
- Aplique o tema selecionado de forma consistente em todas as telas, tabelas, formulários e modais, preservando contraste, legibilidade e identificação das situações além da cor.
- Bordas discretas e sombras suaves.
- Cantos arredondados, com aproximadamente 10–14 px.
- Tipografia moderna, como Inter.
- Uma cor principal de destaque discreta, preferencialmente índigo ou azul.
- Verde para pagamentos realizados com sucesso.
- Vermelho para pagamentos em atraso.
- Âmbar para pagamentos pendentes.
- Estados discretos ao passar o cursor e transições suaves.
- Ícones simples do Lucide ou equivalentes.

Evite gradientes excessivos, efeitos de vidro, sombras fortes, elementos grandes demais e decorações desnecessárias.

O resultado deve parecer uma aplicação profissional de gestão financeira, não uma tabela HTML básica.

Todos os textos da interface voltados ao usuário devem ser escritos em **português brasileiro (pt-BR)**.

- **Moeda:** BRL (R$).
- **Formato de data:** DD/MM/AAAA.

## 2. Estrutura principal da aplicação

Crie uma estrutura de painel consistente, com três seções principais:

### A. Navegação lateral à esquerda

Crie uma barra lateral vertical fixa ou recolhível.

No topo, exiba uma identidade simples para a aplicação:

**Vendas em Aberto**

Use um logotipo minimalista ou um ícone relacionado à gestão financeira.

Inclua os seguintes módulos de navegação:

1. **Visão Geral** — Pagamentos recebidos no mês, pagamentos atrasados e próximos pagamentos.
2. **Vendas** — Listagem de vendas em aberto, cadastro de vendas com os dados do cliente e consulta das parcelas de cada venda.
3. **Relatórios** — Resumo financeiro da aplicação.
4. **Configurações** — Página de configurações, mantida no MVP.

Não haverá módulos separados de **Clientes** ou **Parcelas**. Os dados do cliente serão informados diretamente no cadastro da venda. As parcelas serão consultadas dentro de Vendas, ao clicar no cliente da venda correspondente.

Haverá também uma página de **Vendas quitadas** para consultar vendas totalmente pagas, com a situação **Quitada**, acessível por uma opção dentro de **Vendas**, sem criar um quinto módulo na navegação principal.

Cada item de navegação deve incluir:

- Um ícone correspondente.
- Um rótulo legível.
- Uma indicação clara do estado ativo.
- Efeitos discretos ao passar o cursor.

Na parte inferior da barra lateral, exiba um pequeno perfil de usuário estático, como "Administrador", e um atalho para configurações.

A navegação entre as telas do protótipo deve funcionar, mas não é necessária lógica de negócio real nem backend.

### B. Cabeçalho superior e busca de vendas

Crie um cabeçalho de navegação limpo que ocupe toda a largura da área principal de conteúdo.

Na seção de Vendas, o elemento mais importante é uma **barra de pesquisa em destaque**, posicionada acima da listagem. Ela deve permitir pesquisar por **nome do cliente, CPF, telefone e data da venda**.

Texto de orientação do campo de busca:

> Buscar por nome, CPF, telefone ou data da venda...

Requisitos:

- Campo de busca com cantos arredondados.
- Ícone de busca à esquerda.
- Largura e espaçamento interno confortáveis.
- Destaque visual sem tamanho excessivo.
- Borda e estado de foco bem definidos.
- Ícones opcionais de notificações e avatar do usuário à direita.

A pesquisa pertence à seção de Vendas; não é necessário criar uma busca global para outros módulos.

Para o protótipo, a pesquisa deve funcionar apenas no frontend, sobre as vendas demonstrativas. A forma de combinar os critérios e a pesquisa por data exata ou período ainda devem ser confirmadas.

### C. Área principal de conteúdo

A área central deve exibir o módulo selecionado no momento.

Use uma estrutura consistente:

- Título da página.
- Subtítulo curto.
- Botão de ação principal.
- Cartões de resumo, quando pertinentes.
- Filtros.
- Tabela ou cartões com o conteúdo principal.

Mantenha espaçamento generoso e uma hierarquia visual clara.

## 3. Página de gestão de vendas — Tela principal

**Esta é a página mais importante de todo o protótipo.**

A loja atualmente utiliza o Excel para registrar vendas a prazo e acompanhar parcelas.

Crie uma interface moderna baseada em tabela que facilite significativamente a visualização desse processo.

A listagem principal deve apresentar **todas as vendas em aberto**. Quando uma venda for totalmente paga, ela ficará com a situação **Quitada** e passará para a página de **Vendas quitadas**, deixando a listagem de vendas em aberto.

### Cabeçalho da página

Título: **Vendas**

Subtítulo: "Gerencie vendas parceladas e acompanhe os pagamentos dos clientes."

Botão de ação principal:

**+ Nova venda**

### Cartões de resumo

Acima da tabela, exiba quatro cartões compactos de resumo financeiro:

1. **Total em aberto** — Saldo total restante.
2. **Valores em atraso** — Valor total em atraso.
3. **Recebido no mês** — Pagamentos recebidos neste mês.
4. **Vendas cadastradas** — Quantidade de vendas registradas.

Use valores demonstrativos e ícones adequados.

### Tabela de vendas

Crie uma tabela de dados moderna, profissional e legível com as seguintes colunas:

| Coluna | Descrição |
| --- | --- |
| Cliente | Nome do cliente, com um avatar discreto contendo suas iniciais |
| Data da venda | Data de registro da venda |
| Valor total | Valor total da venda |
| Parcelas | Parcelas pagas / total de parcelas |
| Saldo devedor | Valor restante ainda não pago |
| Próximo vencimento | Data de vencimento da próxima parcela não paga |
| Situação | Indicador visual da situação |
| Ações | Visualizar, editar e outras opções |

A situação **Quitada** identifica vendas totalmente pagas na página de Vendas quitadas. Não deduza a situação geral das vendas a partir das situações das parcelas sem confirmação das regras de agregação.

Requisitos de design:

- Contêiner da tabela com cantos arredondados: branco no tema claro e em tom escuro no tema dark.
- Separadores discretos entre as linhas.
- Espaçamento interno confortável nas células.
- Tipografia legível.
- Alinhamento claro das colunas.
- Valores monetários alinhados de maneira consistente.
- Situações exibidas como etiquetas coloridas e minimalistas com cantos arredondados.
- Efeitos ao passar o cursor sobre as linhas da tabela.
- Menu de ações com três pontos.
- Paginação opcional na parte inferior.

Utilize pelo menos 10 a 15 registros fictícios e realistas de vendas no contexto brasileiro.

### Busca e filtros

Acima da tabela, adicione uma barra compacta de filtros.

Inclua:

- Pesquisa por nome do cliente.
- Pesquisa por CPF.
- Pesquisa por telefone.
- Pesquisa por data da venda.
- Ação para limpar filtros.

Evite duplicar a pesquisa no cabeçalho e na listagem. Não inclua vendas quitadas na listagem de vendas em aberto; elas terão uma página própria.

Faça a pesquisa funcionar com dados demonstrativos locais, sem presumir critérios de combinação ou filtros adicionais não confirmados.

## 4. Detalhes da venda e parcelas

Quando o usuário clicar no cliente de uma venda na seção de Vendas, abra os detalhes e as parcelas dessa venda em uma página ou painel lateral visualmente refinado. Não abra um cadastro independente de cliente nem uma seção separada de parcelas.

Exiba:

### Informações do cliente

- Nome completo
- CPF
- Telefone
- Descrição, quando preenchida (opcional)

### Informações da venda

- Data da venda
- Valor total
- Indicação de existência ou não de entrada
- Quantidade de parcelas
- Total pago
- Saldo devedor
- Situação geral

### Tabela de parcelas

Mostre as parcelas pertencentes à venda.

Colunas:

- Parcela (por exemplo, 1/6)
- Valor
- Vencimento
- Situação
- Data do pagamento
- Forma de pagamento
- Ações

Situações:

- **Aberto**.
- **Próximos dias** — Janela de 7 dias; os limites exatos, incluindo o tratamento do vencimento no dia atual, ainda devem ser confirmados.
- **Atrasado**.
- **Paga** — A parcela paga continua visível nos detalhes da venda.

Exiba parcelas pagas em verde, atrasadas em vermelho e as demais em âmbar ou tons neutros, sempre com o texto da situação. Não crie regras adicionais de classificação sem confirmação.

Inclua um botão de ação visualmente claro:

**Registrar pagamento**

Ao clicar nesse botão, deve ser aberto um modal demonstrativo de registro de pagamento contendo:

- Valor recebido
- Data do pagamento
- Forma de pagamento
- Confirmar pagamento

A interação pode simular sucesso utilizando o estado local do frontend. Não é necessária persistência dos dados.

## 5. Dados do cliente no cadastro da venda

Não crie uma página, listagem ou formulário independente de clientes.

O nome do cliente, CPF e telefone serão obrigatoriamente informados no próprio cadastro da venda, seguindo a referência de organização da imagem em `exemplo/`.

Inclua também um campo de **Descrição do cliente**, de preenchimento opcional, nesse mesmo cadastro. Quando preenchida, a descrição deve ser exibida nas informações do cliente nos detalhes da venda.

Não presuma cadastro prévio, seleção de cliente existente, unicidade por CPF ou compartilhamento automático de dados entre vendas. Essas regras não foram definidas.

## 6. Página de vendas quitadas

Crie uma página para consultar as vendas totalmente pagas, identificadas pela situação **Quitada**.

Ao quitar uma venda, ela deve sair da listagem de vendas em aberto e passar a constar nesta página. As parcelas pagas continuam disponíveis nos detalhes da venda.

O acesso a essa página será uma opção dentro de **Vendas**. Seus filtros específicos ainda precisam ser confirmados. Não adicione um módulo separado de parcelas.

## 7. Painel de visão geral

Crie uma página de visão geral com visual limpo, acessível pelo módulo **Visão Geral**.

Inclua:

- Saldo total em aberto.
- Saldo total em atraso.
- Pagamentos recebidos neste mês.
- Vendas recentes.
- Próximos pagamentos e vencimentos de parcelas, com destaque para a janela de 7 dias definida para **Próximos dias**.
- Pagamentos em atraso que exigem atenção.

Opcionalmente, inclua um gráfico simples com os pagamentos recebidos nos últimos meses.

O painel deve priorizar informações financeiras úteis em vez de gráficos decorativos.

## 8. Página de relatórios

Crie uma página de **resumo financeiro da aplicação**, com dados demonstrativos consistentes com as vendas, parcelas e pagamentos simulados.

Inclua cartões ou gráficos demonstrativos de relatórios para:

- Recebimentos mensais.
- Valores em aberto.
- Parcelas vencidas.
- Vendas realizadas por período.

Inclua um botão "Exportar relatório" apenas como elemento visual ilustrativo.

Não é necessário um mecanismo real de relatórios nem a geração de arquivos.

## 9. Formulários e modais

Crie formulários de protótipo visualmente consistentes para:

- Cadastrar venda.
- Editar venda.
- Registrar pagamento.

No formulário de nova venda, os seguintes campos serão obrigatórios:

- Nome do cliente.
- CPF.
- Telefone.
- Valor da venda.
- Indicação de existência ou não de entrada.
- Quantidade de parcelas.
- Data da venda.

Além dos campos obrigatórios, inclua **Descrição do cliente** como campo opcional. Deixá-lo vazio não deve impedir o cadastro da venda.

A data da venda deve iniciar com a data do dia do cadastro, representando o dia em que a venda é realizada por padrão, e permitir alteração pelo usuário.

As parcelas devem vencer no mesmo dia da data da venda, nos meses seguintes. A regra para meses que não possuem esse dia ainda precisa ser confirmada; não escolha automaticamente outra data.

Quando houver entrada, informe seu valor e desconte-o do valor total da venda antes de dividir o restante pela quantidade de parcelas:

**Valor a parcelar = valor total da venda − valor da entrada.**

**Valor-base da parcela = valor a parcelar ÷ quantidade de parcelas.**

Por exemplo, uma venda de R$ 1.000,00 com entrada de R$ 200,00 e quatro parcelas terá R$ 800,00 a parcelar, resultando em quatro parcelas de R$ 200,00.

A forma de registrar a entrada como pagamento e sua apresentação nos recebimentos ainda precisam ser confirmadas. O tratamento de diferenças de centavos também permanece pendente; não deduza essas regras da planilha.

Observações podem permanecer como campo opcional. Não mantenha um campo independente de primeiro vencimento que contradiga o calendário mensal definido, sem autorização explícita.

Exiba uma prévia simples e simulada das parcelas com base no valor da venda e na quantidade de parcelas informados.

Use a regra confirmada de desconto da entrada e divisão do restante. Antes de implementar casos com diferenças de centavos, confirme a regra de arredondamento. A prévia não deve apresentar regras ainda pendentes como definitivas.

São permitidos cálculos realizados apenas no frontend.

Todos os formulários devem ter visual limpo, bom espaçamento e ser fáceis de entender para usuários sem conhecimento técnico.

Não é necessária integração com backend.

## 10. Dados e interações demonstrativas

Utilize dados demonstrativos realistas em português brasileiro.

Exemplos:

- Maria Oliveira.
- João Pereira.
- Ana Souza.
- Carlos Ferreira.
- Juliana Martins.

Inclua valores de venda, quantidades de parcelas, vencimentos e situações variados.

Todos os dados demonstrativos devem ficar claramente separados dos componentes de interface, para que possam ser substituídos por respostas de API no futuro.

Para o protótipo, implemente interações locais simples quando forem úteis:

- Navegação pela barra lateral.
- Pesquisa de vendas por nome, CPF, telefone e data da venda.
- Abertura de detalhes da venda.
- Consulta das parcelas ao clicar no cliente da venda.
- Consulta de vendas quitadas.
- Abertura de modais de cadastro.
- Simulação de registro de pagamento.
- Fechamento de modais.
- Exibição de mensagens demonstrativas de confirmação.

Essas interações devem tornar a aplicação realista durante uma apresentação ao cliente.

Não implemente autenticação, endpoints de backend, acesso a banco de dados ou chamadas a APIs externas.

## 11. Estrutura do código e implementação

Primeiro, inspecione a estrutura existente do projeto e identifique o framework de frontend e a abordagem de estilização.

Preserve as tecnologias existentes sempre que possível.

Se este for um projeto Angular, prefira:

- Componentes standalone.
- Sintaxe moderna de templates do Angular.
- Signals para o estado local da interface.
- Componentes reutilizáveis.
- TailwindCSS para estilização, se já estiver configurado ou for adequado.
- Organização por funcionalidade.

Componentes de interface reutilizáveis recomendados:

- `BarraNavegacao`
- `Cabecalho`
- `CabecalhoPagina`
- `IndicadorResumo`
- `TabelaDados`
- `SeloSituacao`
- `CampoBusca`
- `BarraFiltros`
- `DetalhesVenda`
- `ModalPagamento`
- `FormularioVenda`

Utilize serviços demonstrativos ou arquivos locais de dados em TypeScript quando apropriado.

Evite complexidade arquitetural desnecessária.

Não instale grandes frameworks de componentes de interface, a menos que sejam realmente necessários.

Concentre-se em código de frontend limpo e de fácil manutenção.

## 12. Requisitos de experiência do usuário

Lembre-se de que os principais usuários são funcionários do comércio que atualmente trabalham com Excel.

A interface deve ser compreensível de imediato, mesmo sem experiência técnica.

Priorize:

1. Encontrar uma venda rapidamente pelo nome do cliente, CPF, telefone ou data da venda.
2. Identificar parcelas em aberto.
3. Registrar um pagamento com poucos cliques.
4. Visualizar claramente as parcelas vencidas.
5. Entender a situação financeira geral.

Evite navegação complicada, excesso de menus ou tabelas muito densas.

Garanta que as ações importantes estejam visíveis e sejam fáceis de acessar.

## 13. Escopo e prioridades do protótipo

Este é um **protótipo de MVP visual para validação com as partes interessadas**.

Não dedique tempo à implementação de infraestrutura desnecessária para uma demonstração.

Concentre o esforço de desenvolvimento nesta ordem de prioridade:

1. Estrutura principal da aplicação com navegação para Visão Geral, Vendas, Relatórios e Configurações.
2. Listagem de vendas em aberto com tabela visualmente refinada e pesquisa por nome, CPF, telefone e data da venda.
3. Cadastro de venda com dados obrigatórios do cliente e da venda no mesmo formulário.
4. Detalhes das parcelas dentro de Vendas, com as situações Aberto, Próximos dias, Atrasado e Paga.
5. Página de vendas quitadas.
6. Painel de visão geral com recebimentos do mês, pagamentos atrasados e próximos pagamentos.
7. Resumo financeiro em Relatórios e página de Configurações.
8. Interações com modais apenas no frontend.

Todas as páginas devem ser navegáveis e visualmente consistentes.

É melhor entregar uma interface muito bem-acabada e coerente, com dados demonstrativos realistas, do que criar funcionalidades desnecessárias de backend.

### Definições pendentes de confirmação

- Como tratar vencimentos em meses sem o dia da venda, como uma venda realizada no dia 31.
- Como registrar a entrada como pagamento e apresentá-la nos recebimentos.
- Como distribuir diferenças de centavos no parcelamento.
- Quais são os limites exatos de Próximos dias, incluindo parcelas com vencimento hoje.
- Como combinar os critérios de pesquisa e se a data será pesquisada por dia exato ou período.

Pergunte ao usuário antes de definir essas regras. A planilha é referência visual e de processo, não autorização para inferir regras de negócio.

## 14. Resultado final esperado

Entregue um protótipo completo e navegável de frontend, com a aparência de uma aplicação SaaS real de gestão financeira.

O protótipo deve demonstrar como a loja poderia migrar de uma planilha complexa do Excel para um sistema moderno e intuitivo de gestão de vendas a prazo.

O resultado deve ser adequado para apresentação ao proprietário e aos funcionários da loja, ajudando a validar:

- Se a disposição dos elementos proposta é compreensível.
- Se as informações de clientes e vendas são fáceis de localizar.
- Se a gestão de pagamentos é mais simples do que no Excel.
- Se a navegação e os módulos propostos correspondem ao processo de trabalho diário.

**O requisito mais importante é uma tela de gestão de vendas bonita, moderna, limpa e muito fácil de usar, com navegação lateral à esquerda, barra de busca superior e listagem central das vendas dos clientes.**

Construa o protótipo real de frontend no projeto existente, em vez de apenas descrever o design.
