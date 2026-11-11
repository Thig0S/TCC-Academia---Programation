# Spec Delta

## Purpose

Permitir validar a conferência e o registro visual de pagamentos de parcelas com atualização consistente dos saldos, sem movimentações financeiras reais.

## ADDED Requirements

### Requirement: Conferência antes do pagamento
O protótipo SHALL abrir Registrar pagamento a partir de uma parcela não paga e mostrar cliente, CPF, venda, número da parcela e vencimento. SHALL solicitar valor recebido, data e forma de pagamento entre Dinheiro, Pix, Cartão de débito e Cartão de crédito, com confirmação explícita.

#### Scenario: Abrir pagamento
- **WHEN** a pessoa seleciona Registrar pagamento em uma parcela pendente
- **THEN** o modal identifica o cliente e a parcela, preenche o valor integral e a data de referência e permite conferir os dados antes de confirmar.

### Requirement: Limites do recebimento demonstrativo
O protótipo SHALL aceitar somente o valor integral de uma parcela, com data entre a data da venda e a data de referência, e SHALL rejeitar pagamento duplicado. Valores diferentes SHALL gerar explicação de que pagamento parcial, juros e troco não são simulados.

#### Scenario: Valor divergente
- **WHEN** a pessoa informa R$ 50,00 para uma parcela de R$ 100,00
- **THEN** a confirmação é bloqueada, uma mensagem explica o limite e nenhum saldo é alterado.

#### Scenario: Parcela já paga
- **WHEN** a pessoa consulta uma parcela paga
- **THEN** não consegue registrar outro pagamento para ela.

### Requirement: Atualização compartilhada do pagamento
Ao confirmar um pagamento válido, o protótipo SHALL marcar a parcela como paga, registrar data e forma, atualizar saldo, contagem de parcelas e indicadores em todos os módulos e exibir confirmação. Cancelar SHALL manter o estado anterior.

#### Scenario: Quitar última parcela
- **WHEN** a última parcela em aberto de uma venda é paga
- **THEN** o saldo fica zerado, a venda aparece Quitada e o próximo vencimento é exibido como não aplicável.

#### Scenario: Cancelar recebimento
- **WHEN** a pessoa fecha o modal sem confirmar
- **THEN** a parcela e os indicadores permanecem inalterados.

### Requirement: Confirmação segura e recuperável
O protótipo SHALL validar o pagamento também no envio por teclado, impedir confirmações simultâneas e permitir nova tentativa após falha. Em caso de falha, SHALL preservar os campos e o estado financeiro anterior, informando o problema em português sem apresentar sucesso.

#### Scenario: Confirmação repetida
- **WHEN** a pessoa aciona duas vezes a confirmação do mesmo pagamento
- **THEN** somente um pagamento é registrado e o saldo é reduzido uma única vez.

#### Scenario: Falha ao registrar
- **WHEN** o registro do pagamento falha
- **THEN** os campos continuam disponíveis, a parcela permanece sem pagamento, os saldos não mudam e a pessoa pode tentar novamente.

### Requirement: Situações derivadas das parcelas
O protótipo SHALL classificar como Paga uma parcela recebida, Vencida uma não paga anterior à data de referência e Pendente as demais. Uma venda SHALL ser Quitada sem saldo, Atrasada com alguma parcela vencida e Em dia nos demais casos; vencimentos de hoje não contam como atraso.

#### Scenario: Pagar única parcela vencida
- **WHEN** a pessoa paga a única parcela vencida de uma venda que ainda tem parcelas futuras
- **THEN** a venda passa de Atrasada para Em dia e mantém o saldo correspondente às parcelas futuras.
