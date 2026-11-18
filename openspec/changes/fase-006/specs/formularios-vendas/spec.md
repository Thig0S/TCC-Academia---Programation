# Spec Delta

## Purpose

Permitir cadastrar vendas demonstrativas e corrigir os dados do cliente por formulários acessíveis, com conferência prévia, validação e preservação do estado diante de cancelamento ou falha.

## ADDED Requirements

### Requirement: Cadastro com cliente e dados financeiros no mesmo contexto

Nova venda SHALL oferecer nome, CPF, telefone, descrição opcional, data da venda, valor total, indicação de entrada e quantidade de parcelas. Entrada presente SHALL exigir valor e forma, usando a data da venda. A data inicial SHALL ser a referência da sessão e aceitar alteração não futura. Dados SHALL ser apenas sintéticos.

#### Scenario: Confirmar cadastro sem descrição e sem entrada
- **WHEN** preencher os obrigatórios válidos, revisar a prévia e confirmar sem descrição e sem entrada
- **THEN** SHALL criar uma única venda consultável com suas parcelas e identidade própria, sem exigir cadastro independente de cliente
- **AND** SHALL abrir seu detalhe, comunicar sucesso demonstrativo e permitir retornar às listas

#### Scenario: Cadastrar com entrada e descrição
- **WHEN** confirmar venda de R$ 1.000,00, entrada de R$ 200,00 com forma aceita e quatro parcelas, com descrição
- **THEN** SHALL mostrar a descrição no detalhe, R$ 200,00 pagos, R$ 800,00 de saldo, quatro parcelas de R$ 200,00 e zero parcelas pagas
- **AND** a entrada SHALL constar separadamente, na data da venda, sem dupla contabilização

### Requirement: Prévia fiel e sem publicação

O cadastro SHALL apresentar prévia atualizada de entrada, saldo a parcelar, valores e vencimentos das parcelas antes de confirmar. Prévia SHALL usar as regras financeiras do domínio, não publicar registros nem permanecer como válida após alterar os dados que a determinaram.

#### Scenario: Conferir centavos e calendário
- **WHEN** informar R$ 100,00 sem entrada, três parcelas e data 31/01/2027 em sessão cuja referência admita essa data
- **THEN** SHALL apresentar R$ 33,34, R$ 33,33 e R$ 33,33 com vencimentos 28/02, 31/03 e 30/04/2027
- **AND** mudar total, entrada, quantidade ou data SHALL recalcular a prévia ou indicar sua invalidade sem publicar venda

#### Scenario: Impedir prévia enganosa
- **WHEN** houver total não positivo/inseguro, entrada integral, quantidade inválida ou vencimento fora de 0001–9999
- **THEN** SHALL não oferecer confirmação válida nem apresentar a prévia anterior como atual
- **AND** SHALL explicar o problema e manter as entradas para correção, sem criar venda

### Requirement: Identificação validada e erros associados aos campos

Cadastro e edição SHALL exigir nome, CPF e telefone segundo dominio-vendas, sem unicidade de CPF. Envio inválido SHALL revelar mensagens em português junto aos campos, manter valores e orientar foco ao primeiro erro pertinente. Valores monetários SHALL aceitar reais com vírgula decimal e rejeitar conversões imprecisas.

#### Scenario: Validar identificação completa sem interferir na busca
- **WHEN** confirmar CPF válido com/sem pontuação e telefone de 10/11 dígitos com/sem formatação permitida
- **THEN** SHALL aceitar representações equivalentes e CPF repetido entre vendas, sem consulta externa
- **AND** a busca parcial nas listas SHALL continuar sem exigir CPF/telefone completos

#### Scenario: Corrigir campos inválidos
- **WHEN** tentar enviar obrigatórios vazios, CPF inválido/repetido em seus dígitos, telefone com letras/+55, dinheiro inválido ou data futura/inexistente
- **THEN** SHALL revelar erros associados aos campos e foco de correção, preservando valores e todo o estado anterior
- **AND** descrição vazia SHALL não bloquear; nenhum dado bancário ou de cartão SHALL ser solicitado

### Requirement: Edição visível exclusiva dos quatro campos do cliente

A edição SHALL iniciar com cópia dos valores de nome, CPF, telefone e descrição da venda selecionada, permitindo somente esses campos. SHALL atender vendas sem recebimentos, com entrada, com parcelas pagas e quitadas. Confirmação válida SHALL atualizar somente a venda selecionada e preservar todo o histórico financeiro e temporal.

#### Scenario: Editar venda e preservar finanças
- **WHEN** confirmar correção válida em cada situação financeira, inclusive quitada e com CPF também usado em outra venda
- **THEN** detalhe e listas SHALL refletir os quatro campos corrigidos somente nessa venda
- **AND** ID, data, total, entrada, parcelas, recebimentos, saldos e resumos SHALL permanecer idênticos, sem controles de edição financeira

#### Scenario: Abrir edição inexistente ou trocar de registro
- **WHEN** acessar edição de ID ausente ou navegar de uma edição para outra
- **THEN** SHALL indicar venda não encontrada com retorno explícito, ou carregar o rascunho correto do novo ID, respectivamente
- **AND** SHALL não reaproveitar valores do registro anterior nem criar venda por essa operação

### Requirement: Confirmação explícita e recuperação sem perda de rascunho

Somente confirmação explícita válida SHALL publicar cadastro ou edição. Cancelar ou abandonar o formulário SHALL descartar o rascunho sem mutação. Falha SHALL preservar entradas, comunicar ausência de sucesso e permitir nova tentativa. Confirmações concorrentes SHALL não produzir cadastros duplicados pelo mesmo envio.

#### Scenario: Cancelar e retornar ao contexto
- **WHEN** alterar campos e acionar Cancelar no cadastro ou edição
- **THEN** SHALL retornar à lista ou detalhe de origem, com foco no acionador correspondente quando presente e alternativa lógica quando ausente
- **AND** registros, parcelas, saldos e resumos SHALL permanecer inalterados

#### Scenario: Falhar e tentar novamente
- **WHEN** uma falha controlada ocorrer na confirmação em teste de componente/integração
- **THEN** SHALL mostrar falha compreensível sem sucesso, preservar rascunho e agregado anterior e liberar nova tentativa
- **AND** repetição de envio enquanto em andamento SHALL não publicar uma segunda operação

#### Scenario: Usar teclado e ambos os temas
- **WHEN** percorrer e enviar cadastro/edição nos dois temas, em 1366×768, 390×844 e zoom nativo 200%
- **THEN** rótulos, erros, prévia, ações e aviso SHALL permanecer legíveis e alcançáveis com foco perceptível, admitindo rolagem no formulário
- **AND** textos comuns SHALL alcançar contraste 4,5:1 e controles/foco essenciais 3:1, sem depender somente de cor
