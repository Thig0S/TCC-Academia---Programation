# Spec Delta

## MODIFIED Requirements

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
