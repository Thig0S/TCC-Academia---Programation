# Spec Delta

## MODIFIED Requirements

### Requirement: Consulta acessível e sem mutações

A consulta SHALL preservar limites do modo, dois temas, teclado, foco e privacidade.
Pesquisar, limpar, paginar e navegar SHALL não alterar negócios. Cadastro, edição e
recebimento SHALL depender de confirmação explícita, sem exportação em Vendas.
Tabelas/busca SHALL ser legíveis nos viewports existentes, com rolagem horizontal
restrita à tabela. O modo local SHALL distinguir carregamento/falha de vazio/ausência.

#### Scenario: Consultar por teclado em ambos os temas
- **WHEN** a pessoa pesquisar, limpar, abrir detalhes e retornar por teclado nos dois temas e viewports técnicos
- **THEN** SHALL alcançar controles com foco perceptível, rótulos inequívocos, cabeçalhos e situações textuais
- **AND** resultados SHALL ser anunciáveis sem mover foco durante digitação e ações SHALL não depender de hover
- **AND** texto comum SHALL alcançar contraste 4,5:1; texto grande, foco e controles essenciais 3:1
- **AND** região de rolagem da tabela SHALL ser identificável e operável por teclado, sem corte do restante da página

#### Scenario: Navegar sem alterar ou persistir vendas
- **WHEN** consultar listas/detalhes, pesquisar, limpar, alternar temas e recarregar
- **THEN** SHALL não criar ou modificar vendas/pagamentos por essas ações nem gravar negócios, cookies ou preferências no browser
- **AND** SHALL não consultar serviços externos ou expor mecanismos globais de teste para mutar estado
- **AND** no demo SHALL restaurar referência/conjunto inicial sem persistência; no local SHALL consultar SQLite pela API sem inserir seed, mantendo negócios existentes
- **AND** recortes históricos somente leitura SHALL não impedir comandos atuais, que continuam exigindo confirmação explícita

#### Scenario: Acessar ações funcionais e refletir alterações
- **WHEN** acessar Nova venda em Vendas, Editar numa linha de abertas/quitadas ou detalhe, ou Receber no detalhe elegível
- **THEN** SHALL abrir o fluxo da venda correta com nomes acessíveis contextualizados, sem ações fictícias
- **AND** sucesso confirmado SHALL atualizar ou invalidar consultas da fonte do modo, com ajuste de página inválida após redução da coleção
- **AND** Vendas e Quitadas SHALL continuar sem quatro cartões globais, busca global ou exportação

#### Scenario: Não inventar vazio durante falha local
- **WHEN** consulta local estiver pendente, falhar ou retornar detalhe contratualmente ausente
- **THEN** SHALL apresentar respectivamente carregamento, falha recarregável ou venda não encontrada com retorno
- **AND** SHALL não reutilizar dados de outro ID ou apresentar erro de banco como venda ausente
