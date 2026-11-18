# Spec Delta

## MODIFIED Requirements

### Requirement: Dados de cliente vinculados à venda

O domínio SHALL manter identificadores estáveis para vendas e parcelas e dados de cliente próprios de cada venda, com nome, CPF e telefone obrigatórios e descrição opcional. Cadastro e edição SHALL validar CPF e telefone conforme os requisitos de identificação. SHALL não exigir cadastro mestre, unicidade de CPF ou consulta externa de identificação.

#### Scenario: Cadastrar duas vendas com os mesmos dados de identificação
- **WHEN** dois comandos válidos informarem os mesmos dados de cliente
- **THEN** SHALL existir uma venda distinta para cada comando aceito, com identificadores de venda e parcelas não colidentes
- **AND** descrição ausente SHALL não impedir o cadastro e os dados SHALL não ser compartilhados como cliente mestre mutável

## ADDED Requirements

### Requirement: CPF com formato e verificadores válidos

Cadastro e edição SHALL aceitar CPF obrigatório com ou sem pontuação, exigir 11 dígitos com verificadores válidos e rejeitar sequências repetidas. A validação SHALL ser local, sem unicidade entre vendas ou alegação de existência, titularidade ou inexistência de pessoa real.

#### Scenario: Aceitar formatos equivalentes e CPF repetido entre vendas
- **WHEN** cadastro ou edição informar CPF sintético matematicamente válido com ou sem pontuação
- **THEN** SHALL aceitar as representações equivalentes, sem bloquear por CPF já presente em outra venda
- **AND** SHALL não consultar serviços externos ou propagar alterações para outros registros

#### Scenario: Rejeitar identificação inválida sem mutação
- **WHEN** cadastro ou edição informar CPF vazio, com comprimento diferente de 11 dígitos, verificadores inválidos ou sequência repetida
- **THEN** SHALL retornar validação em português sem criar ou alterar venda, parcelas ou recebimentos
- **AND** SHALL não aceitar marcadores textuais sintéticos como substitutos de CPF válido nesses comandos

### Requirement: Telefone brasileiro com DDD e comprimento válido

Cadastro e edição SHALL exigir telefone brasileiro obrigatório com 10 ou 11 dígitos incluindo DDD, aceitando espaços, parênteses e hífen como formatação. SHALL não aceitar código +55, consultar serviços externos, impor lista de DDDs ou validar prefixos de fixo/celular.

#### Scenario: Aceitar telefone com ou sem formatação
- **WHEN** cadastro ou edição informar telefone sintético com 10 ou 11 dígitos, com ou sem espaços, parênteses e hífen
- **THEN** SHALL aceitar os formatos equivalentes sem exigir DDD ou prefixo pertencente a uma lista
- **AND** a aceitação SHALL não comprovar que o número existe ou não pertence a pessoa real

#### Scenario: Rejeitar telefone fora do formato
- **WHEN** informar telefone vazio, com código +55, letras ou comprimento diferente de 10/11 após remover a formatação permitida
- **THEN** SHALL retornar validação em português sem mutação

### Requirement: Edição limitada aos dados do cliente

Após cadastro, a edição SHALL permitir somente nome, CPF, telefone e descrição da venda selecionada em qualquer situação, inclusive Quitada. SHALL preservar ID, data da venda, valor total, entrada, parcelas, recebimentos e todos os derivados financeiros. Alterações SHALL não se propagar para outras vendas.

#### Scenario: Corrigir cliente em qualquer situação financeira
- **WHEN** editar dados válidos do cliente em venda sem recebimentos, com entrada, com parcelas pagas ou quitada
- **THEN** SHALL atualizar somente os quatro campos autorizados da venda selecionada
- **AND** IDs, data da venda, total, existência/valor/data/forma da entrada, quantidade/valores/vencimentos das parcelas, pagamentos e resumos SHALL permanecer inalterados
- **AND** outra venda com o mesmo CPF SHALL permanecer inalterada

#### Scenario: Preservar histórico diante de tentativa de edição financeira
- **WHEN** uma tentativa de edição pretender modificar data da venda, total, entrada, parcelamento ou pagamentos existentes, mesmo antes de qualquer recebimento
- **THEN** SHALL não efetivar nenhuma alteração financeira ou temporal pela edição
- **AND** registrar novo pagamento permitido SHALL continuar sendo operação distinta da edição de cliente, sem autorização para editar recebimentos anteriores
