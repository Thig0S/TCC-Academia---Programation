# Spec Delta

## MODIFIED Requirements

### Requirement: Busca única de nome e identificação

Cada coleção SHALL oferecer um único campo de busca com rótulo, orientação de nome/CPF/telefone/data e ação Limpar pesquisa. Nome SHALL corresponder parcialmente sem distinguir acentos ou caixa; CPF/telefone SHALL admitir sequência de dígitos ignorando pontuação usual. Basta corresponder a um campo. A busca SHALL atuar somente na coleção atual, sem busca global; Quitadas SHALL não oferecer filtros adicionais.

#### Scenario: Pesquisar texto equivalente
- **WHEN** a pessoa pesquisar parte do nome usando outra caixa ou sem acentos
- **THEN** SHALL encontrar os nomes que contêm esse texto normalizado
- **AND** SHALL não combinar palavras como campos separados nem selecionar automaticamente homônimos

#### Scenario: Pesquisar identificação com e sem pontuação
- **WHEN** uma sequência de dígitos de CPF ou telefone for pesquisada com ou sem pontos, hífens, espaços, parênteses ou sinal de mais
- **THEN** SHALL corresponder à mesma sequência contida na identificação da venda, ignorando essa pontuação
- **AND** uma entrada sem qualquer dígito SHALL não corresponder a todas as identificações por uma sequência vazia
- **AND** após a adequação do seed na FASE-006, a consulta SHALL localizar os números sintéticos compatíveis com as validações de identificação, sem exigir marcadores CPF-DEMO/TEL-DEMO no conjunto inicial
- **AND** pesquisa parcial SHALL não exigir comprimento completo ou verificadores de CPF, pois não é confirmação de cadastro/edição

#### Scenario: Restringir e limpar pesquisa
- **WHEN** a pessoa pesquisar um termo presente somente na outra coleção ou acionar Limpar pesquisa
- **THEN** a pesquisa restrita SHALL não incluir registros da outra coleção
- **AND** Limpar pesquisa ou informar termo vazio/espaços SHALL remover somente a restrição do termo, preservando a situação selecionada nas abertas, sem mutar registros nem exigir preservar o termo após sair da página
- **AND** limpar SHALL manter ou devolver o foco ao campo, sem navegar ou reiniciar a sessão
