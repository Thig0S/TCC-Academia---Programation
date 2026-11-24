# Spec Delta

## MODIFIED Requirements

### Requirement: Análises mensais identificadas

Relatórios SHALL apresentar Recebimentos no mês de todos os status pela data efetiva e Vendas no mês apenas de Ativas pela data da venda, incluindo Ativas quitadas, no mês civil completo da referência fixa com início/fim inclusivos. Valor de vendas SHALL ser o total efetivo após acréscimos e entrada SHALL contar uma vez como parcela 1 recebida. SHALL permitir gráficos contextuais, mas não seletor de período nem a faixa de quatro indicadores globais da Visão Geral.

#### Scenario: Conferir recebimentos sem dupla contagem
- **WHEN** o mês contiver entrada e lote de várias parcelas, inclusive de venda de outro mês
- **THEN** SHALL listar entrada e lote uma vez cada, com origem, venda, data, forma, valor e soma exata em BRL
- **AND** SHALL incluir primeiro e último dia do mês e excluir recebimentos externos
- **AND** SHALL não somar alocações ou valor separado da entrada novamente nem confundir vencimento e data efetiva
- **AND** a linha de origem Entrada SHALL corresponder à parcela 1 Paga no detalhe

#### Scenario: Conferir vendas do mês
- **WHEN** houver vendas Ativas, Inativas e Prejuízo dentro e fora do mês da referência
- **THEN** SHALL listar apenas Ativas do período, abertas ou quitadas, com cliente, data e total efetivo
- **AND** SHALL informar quantidade e total vendido sem filtrar pela data de pagamentos ou situação financeira atual

#### Scenario: Reconciliar entrada e lote na mesma venda
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e pagar parcelas 2 e 3 por R$ 400,00 no mesmo mês
- **THEN** recebimentos SHALL totalizar R$ 600,00, em uma entrada e um lote
- **AND** detalhe SHALL mostrar 3/10 pagas e saldo R$ 1.400,00; indicadores e consulta por período SHALL reconciliar sem duplicação

#### Scenario: Preservar dinheiro recebido de venda inativada
- **WHEN** uma venda com recebimento no mês for inativada ou marcada Prejuízo
- **THEN** SHALL manter esse recebimento na seção mensal, mas retirar a venda do total operacional de Vendas no mês

## ADDED Requirements

### Requirement: Dashboard contextual com cartões e gráficos acessíveis

Relatórios SHALL destacar cartões de recebimentos e vendas no mês, saldo Ativo em aberto, parcelas vencidas Ativas e prejuízo elegível. SHALL exibir gráficos de recebimentos por dia efetivo do mês, comparação de saldo Ativo com prejuízo elegível e vencidas Ativas por data na posição atual, com unidade, legenda, valores e equivalente textual acessível.

#### Scenario: Reconciliar cartões e gráficos com detalhes
- **WHEN** houver pagamentos de todos os status, vendas Ativas e contratos em Prejuízo na referência
- **THEN** cartões e gráficos SHALL reconciliar com os totais e linhas das seções detalhadas sem somar um pagamento ou parcela duas vezes
- **AND** recebimentos por dia SHALL usar apenas datas do mês civil da referência, inclusive pagamentos de Inativas/Prejuízo, enquanto vencidas por data SHALL refletir a posição atual, mesmo com vencimento anterior ao mês
- **AND** a comparação Ativo × Prejuízo SHALL usar apenas pendências de contratos sem nenhum pagamento para o valor do Prejuízo

#### Scenario: Conferir gráficos sem visão visual
- **WHEN** a pessoa usar teclado, leitura assistiva ou consultar série sem registros
- **THEN** SHALL encontrar título, unidade, categorias, valores e mensagem de vazio também em texto ou tabela acessível, sem depender apenas de cor ou formato gráfico
- **AND** SHALL acessar os detalhes sem manipulação obrigatória do gráfico

### Requirement: Resumos de cobrança preservando tabelas completas

Relatórios SHALL apresentar resumos de cobrança por cliente com CPF, telefone, primeiro vencimento pendente, valor/situação e link para a venda. SHALL manter todas as tabelas detalhadas de recebimentos, vendas, pendências, vencidas e Prejuízo acessíveis abaixo dos painéis ou em seções expansíveis operáveis por teclado, sem truncar registros.

#### Scenario: Abrir cobrança e consultar histórico completo
- **WHEN** o dashboard resumir vários clientes e existirem mais linhas do que cabem na visão inicial
- **THEN** SHALL permitir abrir a venda correta por ID e consultar todas as linhas detalhadas das cinco seções
- **AND** expansão ou navegação SHALL preservar foco, cabeçalhos, estados vazios e a distinção entre mês civil e posição atual
