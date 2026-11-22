# relatorios-financeiros Specification

## Purpose

Permitir conferir os recebimentos e vendas do mês da sessão e distinguir essa
análise da posição atual de saldos e atrasos, sem prometer exportação real.

## Requirements

### Requirement: Análises mensais identificadas

Relatórios SHALL apresentar recebimentos e vendas do mês civil completo da referência fixa, com início/fim inclusivos. SHALL usar data efetiva do recebimento para entrada e lotes e data da venda para vendas, incluindo quitadas. Entrada SHALL identificar o recebimento da parcela 1 paga na data da venda, uma vez, sem segunda linha/valor pelo metadado ou pelas alocações. SHALL não oferecer seletor, gráfico ou faixa de quatro indicadores.

#### Scenario: Conferir recebimentos sem dupla contagem
- **WHEN** o mês contiver entrada e lote de várias parcelas, inclusive de venda de outro mês
- **THEN** SHALL listar entrada e lote uma vez cada, com origem, venda, data, forma, valor e soma exata em BRL
- **AND** SHALL incluir primeiro e último dia do mês e excluir recebimentos externos
- **AND** SHALL não somar alocações ou valor separado da entrada novamente nem confundir vencimento e data efetiva
- **AND** a linha de origem Entrada SHALL corresponder à parcela 1 Paga no detalhe

#### Scenario: Conferir vendas do mês
- **WHEN** houver vendas dentro e fora do mês da referência
- **THEN** SHALL listar todas as vendas do período, abertas ou quitadas, com cliente, data e total
- **AND** SHALL informar quantidade e total vendido sem filtrar pela data de pagamentos ou situação atual

#### Scenario: Reconciliar entrada e lote na mesma venda
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e pagar parcelas 2 e 3 por R$ 400,00 no mesmo mês
- **THEN** recebimentos SHALL totalizar R$ 600,00, em uma entrada e um lote
- **AND** detalhe SHALL mostrar 3/10 pagas e saldo R$ 1.400,00; indicadores e consulta por período SHALL reconciliar sem duplicação

### Requirement: Posição de saldos e parcelas vencidas

Relatórios SHALL apresentar saldos positivos por venda e parcelas pendentes vencidas, identificando sua posição na referência da sessão. SHALL separar essas seções das análises mensais, sem restringi-las à data da venda ou sugerir reconstrução histórica. SHALL apresentar totais próprios, sem a faixa global da Visão Geral.

#### Scenario: Distinguir posição atual de movimentação mensal
- **WHEN** uma venda de mês anterior ainda tiver saldo e parcela atrasada na referência
- **THEN** SHALL aparecer na posição em aberto e sua parcela na seção de vencidas, mesmo ausente das vendas do mês
- **AND** posição em aberto SHALL identificar cliente, data da venda e saldo; vencidas SHALL identificar venda, número, vencimento e valor da parcela
- **AND** após receber a parcela SHALL atualizar ambas as posições coerentemente com os detalhes, sem alterar a referência

### Requirement: Consulta completa e estados vazios

Relatórios SHALL exibir os registros elegíveis sem truncamento silencioso, com moeda e datas em pt-BR e mensagens de vazio por seção. SHALL permitir conferir a venda de origem pelos detalhes, sem modificar registros ao consultar ou navegar.

#### Scenario: Consultar sem resultados ou com muitos registros
- **WHEN** uma seção não tiver registros ou tiver mais de cinco
- **THEN** SHALL respectivamente exibir zero e mensagem de ausência, ou permitir acessar todos os registros elegíveis sem aplicar o limite dos resumos da Visão Geral
- **AND** links de origem SHALL preservar IDs completos e orientar foco ao título de destino

### Requirement: Exportação explicitamente indisponível

Relatórios SHALL apresentar Exportar relatório como ação ilustrativa com indisponibilidade explícita. Seu acionamento SHALL informar que exportação não está disponível no protótipo, sem gerar arquivo, transmitir dados ou anunciar sucesso.

#### Scenario: Acionar exportação ilustrativa
- **WHEN** a pessoa encontrar e acionar Exportar relatório, inclusive por teclado
- **THEN** SHALL encontrar explicação permanente de indisponibilidade e mensagem anunciável após acionamento
- **AND** SHALL não iniciar download, requisição de dados ou alteração na sessão, nem apresentar exportação concluída
