# Spec Delta

## MODIFIED Requirements

### Requirement: Isolamento do host e da demonstração

Os casos de uso SHALL ser consumíveis internamente e pela API local com dados
sintéticos. O host SHALL compor persistência e preparar explicitamente o banco
antes de aceitar requisições. O frontend SHALL continuar demonstrativo e
independente. Preparação/testes SHALL não acessar planilha real ou base operacional.

#### Scenario: Iniciar API sem banco
- **WHEN** iniciar host com configuração válida e destino inexistente em pai existente
- **THEN** SHALL preparar explicitamente banco vazio antes de servir, somente em loopback
- **AND** SHALL manter `/health` 200 textual `Healthy` e `/vendas` 404, expondo operações comerciais apenas no contrato local versionado protegido

#### Scenario: Executar consumidores internos e frontend independentemente
- **WHEN** testar casos de uso com armazenamento real em temporários e executar frontend com API desligada
- **THEN** SHALL usar somente fixtures sintéticas e arquivos próprios com conexões liberadas ao terminar
- **AND** frontend SHALL não depender dos casos de uso nem consumir seus dados persistidos

#### Scenario: Composição não substitui preparação
- **WHEN** consumidor interno apenas registrar dependências ou consultar destino ausente sem chamar preparação
- **THEN** SHALL continuar sem criar arquivo/schema e consulta SHALL falhar como banco ausente
- **AND** preparação pelo host SHALL ser chamada explícita separada, nunca efeito de query ou comando

## ADDED Requirements

### Requirement: Visão Geral consolidada em um snapshot

A aplicação SHALL consultar indicadores e três resumos da Visão Geral a partir de
um único snapshot, com a mesma referência explícita e revisão. SHALL devolver DTOs
protegidos, sem preparar/gravar banco, gerar IDs, chamar uma consulta por venda ou
recalcular regras financeiras no consumidor.

#### Scenario: Indicadores e itens coerentes
- **WHEN** consultar painel de conjunto com Ativas abertas/quitadas, Inativas e Prejuízo
- **THEN** saldo, atraso e contagem SHALL considerar somente Ativas, incluindo quitadas na contagem
- **AND** recebido mensal SHALL manter recebimentos de todos os status sem dupla contagem de entrada, lote ou acréscimo
- **AND** todos os blocos SHALL usar a revisão/referência da mesma carga, inclusive seus resumos aninhados

#### Scenario: Banco vazio e respostas protegidas
- **WHEN** consultar banco preparado vazio e tentar modificar listas da resposta
- **THEN** SHALL devolver indicadores zero, três listas vazias e revisão lida
- **AND** SHALL não permitir mutação do snapshot ou de respostas anteriores através dessas coleções

### Requirement: Resumos do painel com seleção e limite estáveis

Os resumos consolidados SHALL incluir somente Ativas: até cinco recentes por data
decrescente, até cinco parcelas pendentes próximas de hoje a +7 inclusive e até
cinco atrasadas por vencimento crescente. SHALL selecionar/ordenar antes de limitar,
preservando ordem de origem nos empates e identidade completa dos itens.

#### Scenario: Ordenação e desempate com mais de cinco elegíveis
- **WHEN** existirem mais de cinco vendas/parcelas elegíveis e empates de data/vencimento
- **THEN** SHALL devolver os primeiros cinco após ordenar, preservando ordem original de vendas e de parcelas no empate
- **AND** recentes SHALL incluir Ativas quitadas; itens de parcela SHALL identificar venda/cliente/data, número, vencimento e valores

#### Scenario: Bordas da janela e calendário extremo
- **WHEN** houver vencimentos ontem, hoje, em +7 e +8 dias, parcelas pagas e referência nos anos 0001 ou 9999
- **THEN** próximas SHALL incluir apenas pendentes da referência a +7 representáveis e atrasadas somente pendentes anteriores
- **AND** SHALL não transbordar data nem alterar referência; blocos sem elegíveis SHALL ser vazios independentemente dos demais

#### Scenario: Mudança administrativa e histórico preservado
- **WHEN** consultar após inativar, marcar Prejuízo ou reativar uma venda pelas transições vigentes
- **THEN** SHALL retirar ou recolocar a venda nos resumos/indicadores operacionais conforme status atual
- **AND** SHALL manter recebimentos efetivos no mês e as identidades, sem criar nova venda ou pagamento
