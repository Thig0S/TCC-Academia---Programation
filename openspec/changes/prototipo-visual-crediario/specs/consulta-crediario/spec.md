# Spec Delta

## Purpose

Permitir localizar clientes e seus crediários com clareza, reduzindo barreiras de pesquisa e facilitando a conferência das parcelas no atendimento.

## ADDED Requirements

### Requirement: Busca tolerante por nome e CPF
O protótipo SHALL pesquisar clientes e vendas por trechos de nome ou CPF, ignorando caixa, acentos, espaços externos e pontuação do CPF. A busca no cabeçalho SHALL apresentar resultados globais independentes dos filtros de página e permitir abrir cliente ou venda.

#### Scenario: Nome com acento
- **WHEN** a pessoa busca " joao " e há um cliente chamado João Pereira
- **THEN** o cliente e suas vendas aparecem nos resultados globais.

#### Scenario: CPF formatado
- **WHEN** a pessoa pesquisa um CPF fictício com ou sem pontos e hífen
- **THEN** os mesmos registros são encontrados em ambas as formas.

### Requirement: Identificação e consulta de vendas
A listagem SHALL conter 10–15 vendas iniciais e exibir cliente com CPF, data, valor total, parcelas pagas/total, saldo, próximo vencimento e situação. Os detalhes SHALL exibir telefone, total pago e parcelas com valor, vencimento, situação e dados de pagamento quando existentes.

#### Scenario: Clientes com nomes semelhantes
- **WHEN** duas pessoas com nomes semelhantes aparecem na listagem
- **THEN** seus CPFs fictícios permitem distingui-las e cada venda abre somente suas próprias parcelas.

### Requirement: Filtros com recuperação visível
Vendas SHALL oferecer filtros por situação e intervalo de data da venda, com limites inclusivos, contagem de resultados e limpeza dos filtros. Uma lista vazia SHALL diferenciar ausência de resultados de restrições por filtros e nunca afirmar que o cliente não possui dívida.

#### Scenario: Registro oculto por filtro
- **WHEN** uma venda quitada é excluída pelo filtro Atrasadas
- **THEN** o filtro ativo fica visível e a ação Limpar filtros recupera as vendas, sem restringir a busca global.

#### Scenario: Busca sem correspondência
- **WHEN** a busca global não encontra nome ou CPF
- **THEN** a interface informa que não encontrou resultados, sugere revisar o nome ou CPF e permite limpar o termo, sem criar automaticamente um cadastro.

### Requirement: Clientes e parcelas relacionados
Clientes SHALL permitir consulta por nome ou CPF e exibir nome, CPF, telefone, quantidade de vendas, saldo e situação. Seus detalhes SHALL mostrar vendas associadas. Parcelas SHALL exibir cliente, venda, número, valor, vencimento e situação, com filtros Todas, Pendentes, Vencidas e Pagas.

#### Scenario: Cliente com múltiplas vendas
- **WHEN** a pessoa abre o detalhe de um cliente com duas vendas
- **THEN** ambas aparecem separadas e o saldo do cliente corresponde à soma dos saldos dessas vendas.

#### Scenario: Consultar atrasos
- **WHEN** a pessoa seleciona Vencidas em Parcelas
- **THEN** aparecem somente parcelas não pagas com vencimento anterior à data de referência da demonstração.
