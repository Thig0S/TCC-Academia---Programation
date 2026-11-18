# Spec Delta

## MODIFIED Requirements

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
