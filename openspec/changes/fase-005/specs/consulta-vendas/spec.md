# Spec Delta

## Purpose

Permitir localizar e conferir vendas demonstrativas e suas parcelas na interface, mantendo separação entre abertas e quitadas, consistência financeira e limites de consulta somente leitura.

## ADDED Requirements

### Requirement: Coleções de abertas e quitadas consultáveis

A aplicação SHALL apresentar em Vendas somente vendas com saldo positivo e em Quitadas somente vendas com saldo zero. Ambas SHALL consultar a mesma fonte da sessão, preservar identidade e dados de cada venda e permitir abrir seus detalhes pelo nome do cliente e por ação Visualizar identificável.

#### Scenario: Consultar as duas coleções
- **WHEN** a pessoa acessar Vendas e Quitadas com o conjunto sintético inicial
- **THEN** SHALL encontrar as vendas exclusivamente na coleção correspondente ao saldo, sem duplicá-las
- **AND** SHALL ver Cliente, Data da venda, Valor total, Parcelas pagas/total, Saldo devedor, Próximo vencimento, Situação e Ações
- **AND** quitadas SHALL mostrar Quitada, saldo zero, todas as parcelas pagas e ausência de próximo vencimento, sem data inventada

#### Scenario: Preservar identidade entre nomes semelhantes
- **WHEN** existirem vendas com nomes semelhantes e a pessoa acionar o nome ou Visualizar de uma linha
- **THEN** SHALL abrir somente o detalhe da venda identificada naquela linha
- **AND** o nome acessível da ação SHALL permitir distinguir seu contexto sem depender de hover

### Requirement: Resumos globais independentes da pesquisa

Vendas SHALL exibir Total em aberto, Valores em atraso, Recebido no mês e Vendas cadastradas, derivados de toda a fonte da sessão. A pesquisa SHALL não alterar esses valores. As listas e o detalhe SHALL identificar a referência civil fixa da sessão; valores monetários SHALL usar BRL e datas DD/MM/AAAA sem deslocamento de fuso.

#### Scenario: Pesquisar sem modificar cartões
- **WHEN** uma busca reduzir a lista de abertas a um registro ou a nenhum resultado
- **THEN** os quatro cartões SHALL manter os totais globais anteriores
- **AND** Vendas cadastradas SHALL incluir as quitadas e Recebido no mês SHALL usar o mês civil da referência e contar entrada/recebimentos uma vez

#### Scenario: Consultar fonte vazia e referência estável
- **WHEN** a fonte estiver vazia em cenário de avaliação ou a sessão atravessar meia-noite
- **THEN** os cartões da fonte vazia SHALL mostrar zero, sem valores ilustrativos fixos
- **AND** a referência SHALL permanecer a capturada na abertura, inclusive ao navegar, e não ser substituída pelo dia da consulta

### Requirement: Busca única de nome e identificação

Cada coleção SHALL oferecer um único campo de busca com rótulo, orientação de nome/CPF/telefone/data e ação Limpar. Nome SHALL corresponder parcialmente sem distinguir acentos ou caixa; CPF/telefone SHALL admitir sequência de dígitos ignorando pontuação usual. Basta corresponder a um campo. A busca SHALL atuar somente na coleção atual, sem filtros extras ou busca global.

#### Scenario: Pesquisar texto equivalente
- **WHEN** a pessoa pesquisar parte do nome usando outra caixa ou sem acentos
- **THEN** SHALL encontrar os nomes que contêm esse texto normalizado
- **AND** SHALL não combinar palavras como campos separados nem selecionar automaticamente homônimos

#### Scenario: Pesquisar identificação com e sem pontuação
- **WHEN** uma sequência de dígitos de CPF ou telefone for pesquisada com ou sem pontos, hífens, espaços, parênteses ou sinal de mais
- **THEN** SHALL corresponder à mesma sequência contida na identificação da venda, ignorando essa pontuação
- **AND** uma entrada sem qualquer dígito SHALL não corresponder a todas as identificações por uma sequência vazia
- **AND** os marcadores textuais sintéticos existentes, como CPF-DEMO-1 e TEL-DEMO-1, SHALL também ser localizáveis por seu texto, sem substituir o conjunto por dados pessoais plausíveis

#### Scenario: Restringir e limpar pesquisa
- **WHEN** a pessoa pesquisar um termo presente somente na outra coleção ou acionar Limpar
- **THEN** a pesquisa restrita SHALL não incluir registros da outra coleção
- **AND** Limpar ou informar termo vazio/espaços SHALL restaurar somente a coleção atual, sem mutar registros nem exigir preservar o termo após sair da página
- **AND** limpar SHALL manter ou devolver o foco ao campo, sem navegar ou reiniciar a sessão

### Requirement: Pesquisa de data civil exata

Um termo completo DD/MM/AAAA SHALL pesquisar exclusivamente a data exata da venda no calendário civil 0001–9999. Datas inválidas SHALL produzir ausência de correspondências sem exceção ou interpretação como CPF/telefone. Não SHALL haver busca de data parcial, intervalo ou mudança automática do dia informado.

#### Scenario: Consultar dia exato
- **WHEN** a pessoa informar a data completa de uma venda, incluindo ano de quatro dígitos
- **THEN** SHALL encontrar somente vendas da coleção atual realizadas nesse dia
- **AND** SHALL não pesquisar a data de vencimento ou de recebimento em seu lugar

#### Scenario: Rejeitar data inexistente sem reinterpretar
- **WHEN** a pesquisa for 31/02/2027, 29/02/1900 ou 01/01/0000
- **THEN** SHALL não encontrar registros, sem erro inesperado e sem correspondência pelo trecho numérico da entrada
- **AND** 29/02/2000 SHALL ser tratada como data válida, sem ajustes de fuso

### Requirement: Estados distintos de consulta

As consultas SHALL distinguir coleção sem registros, pesquisa sem correspondências e venda não encontrada. Nenhum estado SHALL criar registros, sugerir consulta ainda indisponível em Vendas/Quitadas ou ocultar os retornos. Os estados SHALL ser comunicados por texto e não apenas por cor.

#### Scenario: Diferenciar vazio de ausência de resultados
- **WHEN** a coleção estiver vazia sem pesquisa ou houver registros mas nenhum corresponder ao termo
- **THEN** SHALL explicar, respectivamente, ausência de vendas abertas/quitadas ou ausência de resultados para a pesquisa
- **AND** a pesquisa sem resultados SHALL permitir limpar e restaurar os registros existentes
- **AND** a coleção vazia SHALL não oferecer cadastro fictício ou quitação fictícia nesta fase

#### Scenario: Identificar venda ausente
- **WHEN** um identificador desconhecido for consultado no detalhe
- **THEN** SHALL apresentar Venda não encontrada, sem reutilizar dados da consulta anterior
- **AND** SHALL oferecer retorno explícito a Vendas e Quitadas, distinguindo ausência de registro de caminho desconhecido

### Requirement: Detalhes e parcelas somente da venda selecionada

O detalhe SHALL mostrar nome, CPF, telefone, descrição quando preenchida, data da venda, valor total, entrada, quantidade de parcelas, total pago, saldo e situação da venda selecionada. SHALL exibir todas as suas parcelas, inclusive pagas, com número/total, valor, vencimento, situação, data e forma de pagamento. Entrada SHALL permanecer separada das parcelas.

#### Scenario: Conferir entrada e histórico
- **WHEN** uma venda com entrada e parcelas pagas e pendentes for aberta
- **THEN** SHALL mostrar valor, data e forma da entrada separadamente, sem contá-la como parcela paga
- **AND** parcelas liquidadas SHALL apresentar sua data/forma efetivas e situação Paga; pendentes SHALL indicar ausência de data/forma sem inventar valores
- **AND** pago, saldo, quantidades, próximo vencimento e situações SHALL corresponder às mesmas projeções da lista

#### Scenario: Consultar sem entrada ou descrição
- **WHEN** o detalhe de uma venda sem entrada e sem descrição for aberto
- **THEN** SHALL informar Sem entrada, sem valor/data/forma fictícios de recebimento
- **AND** descrição ausente SHALL não aparecer como texto inventado nem impedir a consulta

### Requirement: Consulta acessível e sem mutações

A consulta SHALL preservar aviso demonstrativo, dois temas, teclado, foco e privacidade. Nesta fase SHALL não oferecer cadastrar, editar, pagar ou exportar, nem alterar registros ao pesquisar, limpar ou navegar. Tabelas e busca SHALL ser legíveis nos viewports técnicos existentes; rolagem horizontal necessária SHALL ficar restrita à região da tabela.

#### Scenario: Consultar por teclado em ambos os temas
- **WHEN** a pessoa pesquisar, limpar, abrir detalhes e retornar por teclado nos dois temas e viewports técnicos
- **THEN** SHALL alcançar os controles com foco perceptível, rótulos inequívocos, cabeçalhos de tabela e situações textuais
- **AND** resultados SHALL ser anunciáveis sem mover o foco durante digitação; ações SHALL não depender de hover
- **AND** texto comum SHALL atingir contraste mínimo 4,5:1, texto grande e indicadores essenciais de foco/controle 3:1
- **AND** eventual região de rolagem da tabela SHALL ser identificável e operável por teclado, sem corte horizontal do restante da página

#### Scenario: Navegar sem alterar ou persistir vendas
- **WHEN** a pessoa consultar as listas e detalhes, pesquisar, limpar, alternar temas e recarregar
- **THEN** SHALL não criar ou modificar vendas, pagamentos e dados pessoais, nem gravar storage, cookies ou banco do navegador
- **AND** SHALL não consultar serviços externos ou expor mecanismos globais de teste para mutar o estado
- **AND** a nova sessão SHALL restaurar referência/conjunto inicial conforme as regras do núcleo, sem prometer persistência
- **AND** o recorte sem UI comercial da FASE-004 SHALL ser entendido como histórico; a FASE-005 acrescenta somente estas consultas, não as mutações da FASE-006
