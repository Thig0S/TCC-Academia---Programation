# Spec Delta

## MODIFIED Requirements

### Requirement: Análises mensais identificadas

Relatórios SHALL apresentar Recebimentos no mês de todos os status por data efetiva e Vendas no mês apenas de Ativas, pela data da venda, no mês civil selecionado com início/fim inclusivos, inicialmente o da referência. O total de vendas SHALL usar o total efetivo com acréscimos aceitos; a entrada SHALL contar como recebimento da parcela 1 uma vez. SHALL oferecer seleção mensal, cartões contextuais e gráfico diário, sem copiar a faixa de quatro indicadores globais da Visão Geral.

#### Scenario: Conferir recebimentos sem dupla contagem
- **WHEN** o mês contiver entrada e lote de várias parcelas, inclusive de venda de outro mês
- **THEN** SHALL listar entrada e lote uma vez cada, com origem, venda, data, forma, valor e soma exata em BRL
- **AND** SHALL incluir primeiro e último dia do mês e excluir recebimentos externos
- **AND** SHALL não somar alocações ou valor separado da entrada novamente nem confundir vencimento e data efetiva
- **AND** a linha de origem Entrada SHALL corresponder à parcela 1 Paga no detalhe

#### Scenario: Conferir vendas do mês
- **WHEN** houver vendas Ativas, Inativas e Prejuízo dentro e fora do mês selecionado
- **THEN** SHALL listar apenas Ativas do período, abertas ou quitadas, com cliente, data e total efetivo
- **AND** SHALL informar quantidade e total vendido sem filtrar pela data de pagamentos ou situação financeira atual

#### Scenario: Reconciliar entrada e lote na mesma venda
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e pagar parcelas 2 e 3 por R$ 400,00 no mesmo mês
- **THEN** recebimentos SHALL totalizar R$ 600,00, em uma entrada e um lote
- **AND** detalhe SHALL mostrar 3/10 pagas e saldo R$ 1.400,00; indicadores e consulta por período SHALL reconciliar sem duplicação

#### Scenario: Preservar dinheiro recebido de venda inativada
- **WHEN** uma venda com recebimento no mês for inativada ou marcada Prejuízo
- **THEN** SHALL manter esse recebimento na seção mensal, mas retirar a venda do total operacional de Vendas no mês

#### Scenario: Incluir venda reativada nas posições operacionais
- **WHEN** uma venda Inativa for reativada como Ativa
- **THEN** SHALL voltar uma única vez às seções operacionais aplicáveis conforme período e saldo atual
- **AND** seus recebimentos históricos SHALL permanecer no mês da data efetiva, sem duplicação

## ADDED Requirements

### Requirement: Seleção mensal independente da posição atual

Relatórios SHALL permitir selecionar mês/ano civil entre 0001 e 9999, iniciando no mês da referência. Aplicar seleção válida SHALL atualizar somente movimentação mensal e manter posições atuais e referência fixas. Seleção vazia/inválida SHALL manter o último resultado válido e informar erro acessível. A seleção SHALL ser local à página e reiniciada ao recriá-la, sem persistência.

#### Scenario: Consultar outro mês sem reconstruir dívida histórica
- **WHEN** aplicar outro mês/ano, inclusive mês sem movimentos ou futuro à referência
- **THEN** vendas, recebimentos e gráfico SHALL usar somente movimentos efetivamente registrados no mês escolhido
- **AND** saldos, vencidas e Prejuízo SHALL permanecer na posição atual, identificada pela mesma referência
- **AND** SHALL não inventar previsão, histórico de status ou saldo do mês selecionado

#### Scenario: Validar seleção e limites do calendário
- **WHEN** informar mês/ano inválido, vazio, ano zero ou superior a 9999 e tentar aplicar
- **THEN** SHALL anunciar erro, manter a última seleção aplicada e seus resultados e não alterar registros ou referência
- **AND** seleção válida SHALL respeitar fevereiro bissexto, virada dezembro/janeiro e anos 0001/9999, sem conversões de fuso

#### Scenario: Recriar a página sem recuperar preferências persistidas
- **WHEN** sair de Relatórios e recriar a página, ou recarregar a aplicação
- **THEN** SHALL iniciar no mês da referência da sessão correspondente, sem recuperar a seleção mensal anterior

### Requirement: Cartões contextuais agrupados

Relatórios SHALL exibir dois cartões em Movimentação do mês (recebido e vendido, com quantidade de vendas) e três em Posição atual (saldo Ativo em aberto, valor vencido Ativo e Prejuízo elegível). SHALL identificar mês, referência e universos, explicar que vencidas integram o saldo aberto e que Prejuízo soma somente pendências de contratos sem recebimentos. SHALL preservar identidade visual e temas atuais.

#### Scenario: Reconciliar cinco cartões sem somar universos sobrepostos
- **WHEN** houver pagamentos de todos os status, vendas Ativas e contratos em Prejuízo
- **THEN** os cinco valores SHALL igualar os totais das respectivas tabelas, inclusive zeros
- **AND** SHALL não apresentar soma de saldo aberto com vencidas ou misturar Prejuízo ao total operacional
- **AND** Prejuízo com recebimento anterior SHALL aparecer no detalhe, mas não no total do cartão

### Requirement: Gráfico diário de recebimentos acessível

Relatórios SHALL apresentar um gráfico de barras de recebido por dia efetivo do mês selecionado, com todos os dias civis, zeros nos dias sem movimento, unidade BRL, datas e tabela diária equivalente acessível sem hover. A soma diária SHALL igualar o recebido mensal em centavos. SHALL informar mês sem recebimentos e não apresentar outros gráficos, tendências ou resumos extras por cliente.

#### Scenario: Somar entrada, lote e individual pelo dia efetivo
- **WHEN** houver entrada, lote e pagamento individual no mesmo dia, de vendas de qualquer status
- **THEN** SHALL agregar cada recebimento uma única vez nesse dia, sem somar novamente alocações ou metadados da entrada
- **AND** SHALL incluir primeiro/último dia do mês e excluir os demais meses

#### Scenario: Refletir correção de data entre meses
- **WHEN** corrigir um pagamento individual para data válida de outro mês
- **THEN** SHALL removê-lo da série/tabela/total do mês anterior e incluí-lo uma vez no novo dia/mês, preservando o ID do movimento
- **AND** troca de status SHALL não apagar recebimentos históricos do gráfico

#### Scenario: Consultar sem depender de visão ou ponteiro
- **WHEN** consultar por teclado ou tecnologia assistiva, inclusive mês vazio ou valores muito desiguais
- **THEN** SHALL acessar datas e valores exatos em tabela diária equivalente, com título e unidade, sem depender de cor, tooltip ou interação com barras
- **AND** mês vazio SHALL manter todos os dias com zero, mensagem de ausência e escala gráfica válida, sem barras fictícias

### Requirement: Cinco detalhes expansíveis independentes

Relatórios SHALL manter cinco seções de detalhes na mesma página, inicialmente recolhidas, com título e total sempre visíveis; Vendas também SHALL informar quantidade. Expansões SHALL ser independentes e operáveis por teclado, expor seu estado e preservar abertura/foco ao aplicar mês. Cada seção SHALL conservar tabela completa, ordenação, identificação, links por ID e vazio próprios, com rolagem horizontal localizada.

#### Scenario: Expandir mais de uma seção sem perder registros
- **WHEN** abrir Recebimentos e Parcelas vencidas por teclado, com mais de cinco registros elegíveis
- **THEN** ambas SHALL permanecer abertas e permitir consultar todas as linhas sem truncamento
- **AND** detalhes de cobrança SHALL preservar CPF, telefone, primeiro vencimento quando aplicável, ordenação e links para os mesmos IDs
- **AND** Prejuízo SHALL distinguir linhas excluídas de seu total

#### Scenario: Trocar mês com detalhes abertos
- **WHEN** aplicar outro mês com uma ou mais seções abertas
- **THEN** SHALL atualizar detalhes mensais sem recolher seções ou mover foco inesperadamente
- **AND** detalhes de posição atual SHALL permanecer inalterados pela seleção mensal

#### Scenario: Preservar leitura nos temas e telas suportados
- **WHEN** consultar em claro/escuro, 1366×768 ou 390×844, e ampliar a interface
- **THEN** SHALL preservar contraste, foco visível, valores legíveis e tipografia vigente das tabelas sem overflow horizontal global
- **AND** SHALL manter tabelas roláveis em regiões locais e controles de expansão acessíveis
