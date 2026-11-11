# Spec Delta

## Purpose

Permitir experimentar o cadastro de clientes e crediários com revisão das informações e prevenção de inconsistências comuns no preenchimento manual.

## ADDED Requirements

### Requirement: Cadastro de cliente em memória
O protótipo SHALL cadastrar nome, CPF e telefone fictícios, exigir nome e CPF com 11 dígitos, rejeitar CPF duplicado independentemente de pontuação e informar erros junto aos campos. Os registros SHALL permanecer disponíveis entre módulos até recarregar a aplicação.

#### Scenario: CPF repetido
- **WHEN** a pessoa tenta cadastrar um CPF já presente nos dados locais
- **THEN** o cadastro é bloqueado, os dados preenchidos são preservados e o cliente existente é indicado para consulta.

#### Scenario: Cadastro válido
- **WHEN** um nome e CPF não repetido de 11 dígitos são confirmados
- **THEN** o cliente aparece em Clientes e fica disponível para selecionar em Nova venda.

### Requirement: Cadastro de venda com revisão
O protótipo SHALL solicitar cliente existente, data da venda, valor total positivo, quantidade inteira de parcelas entre 1 e 24, primeiro vencimento e observações opcionais. SHALL apresentar prévia mensal antes de confirmar, manter a soma das parcelas igual ao total e impedir primeiro vencimento anterior à venda.

#### Scenario: Divisão com centavos
- **WHEN** uma venda de R$ 100,00 em três parcelas é revisada
- **THEN** a prévia apresenta R$ 33,33, R$ 33,33 e R$ 33,34, com total de R$ 100,00.

#### Scenario: Dia inexistente no mês
- **WHEN** o primeiro vencimento é 31/01/2027 e há três parcelas
- **THEN** os vencimentos seguintes são 28/02/2027 e 31/03/2027.

#### Scenario: Confirmar venda
- **WHEN** a pessoa confirma uma venda válida após revisar a prévia
- **THEN** a venda e suas parcelas aparecem nos módulos relacionados sem recarregar e os indicadores são atualizados.

### Requirement: Cancelamento sem alteração
Os formulários SHALL preservar os registros existentes quando cancelados e SHALL evitar confirmação duplicada da mesma submissão.

#### Scenario: Cancelar nova venda
- **WHEN** a pessoa preenche Nova venda e cancela antes de confirmar
- **THEN** nenhuma venda ou parcela é adicionada aos dados locais.

### Requirement: Validação no envio e recuperação de falha
O protótipo SHALL validar o cadastro e a edição ao confirmar, mesmo por teclado, revelar erros em português junto aos campos e preservar o preenchimento inválido. Uma falha SHALL ser informada sem sucesso indevido, sem alterações parciais e sem impedir nova tentativa após a correção.

#### Scenario: Confirmar formulário inválido pelo teclado
- **WHEN** a pessoa tenta confirmar um cadastro com campos obrigatórios ausentes pelo teclado
- **THEN** os erros ficam visíveis, os valores preenchidos são preservados e nenhum registro é criado.

#### Scenario: Nova tentativa após falha
- **WHEN** uma operação de cadastro falha e a pessoa tenta novamente após corrigir a causa
- **THEN** o formulário permite nova tentativa, informa a falha anterior e não mantém alterações parciais dessa tentativa.

### Requirement: Edição limitada de venda
O protótipo SHALL permitir editar uma venda ainda sem pagamentos, com revisão da nova prévia. Vendas com pagamentos SHALL permanecer consultáveis, mas sem edição financeira, com explicação visível dessa limitação demonstrativa.

#### Scenario: Venda já recebida parcialmente
- **WHEN** a pessoa consulta as ações de uma venda com uma parcela paga
- **THEN** a edição financeira está indisponível e o histórico e os saldos permanecem inalterados.

#### Scenario: Revisar venda sem pagamentos
- **WHEN** a pessoa confirma a edição válida de uma venda sem pagamentos
- **THEN** a mesma venda passa a refletir os novos valores e parcelas sem criar uma venda adicional.
