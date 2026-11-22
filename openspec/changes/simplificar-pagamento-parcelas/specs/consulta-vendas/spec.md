# Spec Delta

## MODIFIED Requirements

### Requirement: Detalhes e parcelas somente da venda selecionada

O detalhe SHALL mostrar nome, CPF, telefone, descrição quando preenchida, data da venda, total, entrada, quantidade total, pago, saldo e situação da venda selecionada. SHALL exibir todas as parcelas com número/total, valor, vencimento, situação, data e forma de pagamento e ações conforme elegibilidade. Entrada SHALL ser identificada na parcela 1 Paga e incluída em pagas/total; eventual resumo da entrada SHALL não representar outra cobrança ou somar valores novamente.

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
- **WHEN** cadastrar R$ 2.000,00 em 10x com entrada de R$ 200,00 e depois pagar parcela 2 e parcela 3 em confirmações separadas
- **THEN** listas e detalhe SHALL mostrar inicialmente 1/10, depois 2/10 e depois 3/10 pagas, com pago R$ 600,00 e saldo R$ 1.400,00 após as duas confirmações
- **AND** a entrada SHALL não oferecer nova ação de pagamento

#### Scenario: Exibir ações sequenciais sem botão geral
- **WHEN** abrir detalhe com parcelas pagas, primeira pendente e pendentes posteriores
- **THEN** SHALL existir coluna Ações com Pagar somente na primeira pendente por número, inclusive se futura
- **AND** posteriores SHALL mostrar “Aguardando parcela anterior” em texto, sem botão Pagar desabilitado; pagas SHALL ficar sem ação
- **AND** SHALL não existir botão geral Receber, nem opção de pagamento em lote

#### Scenario: Manter densidade e acesso com a coluna Ações
- **WHEN** consultar a tabela com as novas ações nos dois temas
- **THEN** SHALL preservar fonte 18 px, line-height 20 px e paddings vigentes, com até dez parcelas no cenário desktop 1366×768/100% sem rolagem da página
- **AND** excedente SHALL permanecer em região interna acessível; viewport 390×844, textos extensos e zoom nativo 200% SHALL permitir reorganização/rolagem sem ocultar dados ou ações
- **AND** eventual rolagem horizontal SHALL ficar na região da tabela, não no documento

### Requirement: Consulta acessível e sem mutações

A consulta SHALL preservar contexto demonstrativo, dois temas, teclado, foco e privacidade. Pesquisar, limpar, paginar e navegar SHALL não alterar registros. Ações funcionais de cadastrar, editar cliente e pagar parcela SHALL depender de confirmação explícita conforme suas capacidades, sem exportação. Tabelas e busca SHALL ser legíveis nos viewports técnicos existentes; rolagem horizontal necessária SHALL ficar restrita à região da tabela.

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
- **AND** os recortes somente leitura da FASE-004/005 SHALL ser históricos; somente confirmações explícitas dos fluxos comerciais SHALL permitir mutações

#### Scenario: Acessar ações funcionais e refletir alterações
- **WHEN** acessar Nova venda em Vendas, Editar em uma linha de abertas/quitadas ou no detalhe, ou Pagar na primeira parcela pendente do detalhe
- **THEN** SHALL abrir o fluxo funcional da venda e parcela corretas, com nomes acessíveis contextualizados e sem ações fictícias
- **AND** sucesso SHALL atualizar dados e coleções da mesma sessão; critérios e paginação SHALL continuar seguindo os contratos existentes, incluindo ajuste da última página após redução
- **AND** Vendas e Quitadas SHALL continuar sem os quatro cartões globais, busca global ou exportação
- **AND** Pagar SHALL abrir somente o modal da parcela acionada, sem permitir trocar a seleção por quantidade ou saltar anteriores
