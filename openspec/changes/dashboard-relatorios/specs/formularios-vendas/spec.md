# Spec Delta

## MODIFIED Requirements

### Requirement: Identificação validada e erros associados aos campos

Cadastro e edição SHALL exigir nome, CPF e telefone segundo dominio-vendas, sem unicidade de CPF. Envio inválido SHALL revelar mensagens em português junto aos campos, manter valores e orientar o foco ao primeiro controle inválido após a apresentação do erro. Valores monetários SHALL aceitar reais com vírgula decimal e rejeitar conversões imprecisas.

#### Scenario: Validar identificação completa sem interferir na busca

- **WHEN** confirmar CPF válido com/sem pontuação e telefone de 10/11 dígitos com/sem formatação permitida
- **THEN** SHALL aceitar representações equivalentes e CPF repetido entre vendas, sem consulta externa
- **AND** a busca parcial nas listas SHALL continuar sem exigir CPF/telefone completos

#### Scenario: Corrigir campos inválidos

- **WHEN** tentar enviar obrigatórios vazios, CPF inválido/repetido em seus dígitos, telefone com letras/+55, dinheiro inválido ou data futura/inexistente
- **THEN** SHALL revelar erros associados aos campos, preservar valores e estado anterior e orientar o foco ao primeiro controle inválido
- **AND** descrição vazia SHALL não bloquear; nenhum dado bancário ou de cartão SHALL ser solicitado
