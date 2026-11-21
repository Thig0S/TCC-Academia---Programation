# Spec Delta

## Purpose

Permitir a leitura da situação financeira da sessão por indicadores conciliáveis
e resumos navegáveis, sem confundir recortes limitados com o conjunto completo.

## ADDED Requirements

### Requirement: Indicadores globais exclusivos

Visão Geral SHALL exibir Total em aberto, Valores em atraso, Recebimentos do mês e Vendas cadastradas, derivados de toda a sessão conforme RN-013/014/015. SHALL identificar referência e mês, sem duplicar essa faixa em Vendas, Quitadas ou Relatórios.

#### Scenario: Reconciliar indicadores e manter universo global
- **WHEN** comparar o painel com os detalhes antes e depois de cadastro com entrada, recebimento ou quitação
- **THEN** total em aberto SHALL somar saldos, atraso SHALL somar somente parcelas pendentes vencidas e recebido no mês SHALL contar entradas e lotes pela data, uma única vez
- **AND** vendas cadastradas SHALL incluir quitadas; editar identificação SHALL preservar valores financeiros
- **AND** buscar, filtrar ou paginar Vendas SHALL não restringir indicadores

#### Scenario: Consultar sessão sem vendas
- **WHEN** a fonte da sessão estiver vazia
- **THEN** os quatro indicadores SHALL ser zero e os resumos SHALL informar ausência de itens, sem números fixos ou registros fictícios adicionais

### Requirement: Resumos limitados com ordenação explícita

Visão Geral SHALL apresentar até cinco vendas recentes por data da venda decrescente, até cinco parcelas pendentes com vencimento da referência a +7 dias inclusive e até cinco atrasadas, ambas por vencimento crescente. SHALL indicar o limite em cada resumo e preservar a ordem da fonte nos empates, sem filtros, paginação ou gráfico.

#### Scenario: Limitar após selecionar e ordenar
- **WHEN** houver mais de cinco itens elegíveis em um resumo
- **THEN** SHALL exibir apenas os cinco primeiros segundo sua ordenação, sem alterar a fonte
- **AND** vendas recentes SHALL incluir quitadas; empates de parcelas da mesma venda SHALL preservar a ordem das parcelas
- **AND** cada resumo SHALL explicar seu recorte e limite, sem sugerir listagem completa

#### Scenario: Respeitar bordas temporais e liquidação
- **WHEN** houver parcelas vencendo ontem, hoje, em +7 e +8 dias ou já pagas
- **THEN** próximas SHALL incluir apenas pendentes de hoje e +7, e atrasadas SHALL incluir somente pendentes anteriores à referência
- **AND** nas bordas de 0001–9999 SHALL considerar somente datas representáveis, sem erro ou alteração da referência
- **AND** um bloco sem itens elegíveis SHALL apresentar mensagem própria, mesmo que outros blocos tenham dados

### Requirement: Acesso identificável aos detalhes

Cada item de resumo SHALL identificar a venda por cliente e data; parcelas SHALL também informar número, vencimento e valor. SHALL permitir abrir os detalhes da venda correspondente, preservando o identificador completo e as convenções de foco e navegação.

#### Scenario: Abrir venda de um resumo por teclado
- **WHEN** acionar um item de venda recente, parcela próxima ou atrasada por teclado
- **THEN** SHALL abrir a venda correta, inclusive com barras no ID, e orientar o foco para o título do detalhe
- **AND** SHALL manter referência, estado, tema e aviso da sessão sem confirmar mutações
