# formularios-vendas Specification

## Purpose

Permitir cadastrar vendas demonstrativas e corrigir os dados do cliente por formulários acessíveis, com conferência prévia, validação e preservação do estado diante de cancelamento ou falha.

## Requirements

### Requirement: Escolha explícita de entrada antes dos dados financeiros

Nova venda SHALL apresentar “Possui Entrada” antes de data da venda, valor total e quantidade de parcelas, visualmente e na tabulação, com opções “Selecione uma opção”, “Sim” e “Não”. SHALL iniciar na opção sem resposta e aceitar somente Sim/Não. Sem escolha válida, SHALL impedir cadastro/prévia válida e revelar no envio o erro associado “Informe se a venda possui entrada ou não.”, mantendo dados e foco compreensível.

#### Scenario: Enviar sem escolher se possui entrada
- **WHEN** os outros obrigatórios estiverem válidos e a pessoa tentar enviar em “Selecione uma opção”
- **THEN** SHALL mostrar o erro associado a Possui Entrada, orientar foco ao campo e preservar todos os valores
- **AND** SHALL não criar venda ou recebimento nem consumir ID; a prévia SHALL não parecer válida

#### Scenario: Selecionar Não e Sim explicitamente
- **WHEN** selecionar Não e depois Sim, preenchendo valor/forma válidos
- **THEN** Não SHALL ocultar valor/forma e produzir N pendentes sem entrada; Sim SHALL mostrar/exigir esses campos e produzir uma paga e N−1 pendentes
- **AND** voltar à opção inicial ou informar opção desconhecida SHALL invalidar novamente prévia e envio

### Requirement: Rascunho de entrada preservado sem envio de valores ocultos

Ao mudar Sim para Não, o cadastro SHALL preservar valor e forma no rascunho local, mas ocultar os campos e ignorá-los no cálculo, validação da entrada e confirmação sem entrada. Voltar a Sim SHALL restaurar e revalidar o preenchimento. Alternar opções SHALL não publicar alterações, alterar a quantidade total informada automaticamente ou efetivar pagamento.

#### Scenario: Alternar com entrada preenchida
- **WHEN** preencher entrada em Sim, mudar para Não e depois voltar a Sim
- **THEN** SHALL recuperar valor/forma anteriores ao voltar, sujeitos à validação atual do total/data/quantidade
- **AND** enquanto Não, valores ocultos inclusive inválidos SHALL não criar entrada ou bloquear um cadastro sem entrada válido

### Requirement: Cadastro com cliente e dados financeiros no mesmo contexto

 Nova venda SHALL oferecer nome, CPF, telefone, descrição opcional, data da venda, valor total, escolha explícita de entrada e quantidade total N de parcelas, incluindo a entrada quando presente. Entrada SHALL exigir valor e forma e ser a parcela 1 Paga na data da venda. Data inicial SHALL ser a referência e aceitar alteração não futura. Dados SHALL ser sintéticos; limites SHALL seguir dominio-vendas.

#### Scenario: Confirmar cadastro sem descrição e sem entrada
 - **WHEN** preencher obrigatórios válidos, selecionar Não em Possui Entrada, revisar a prévia e confirmar sem descrição
- **THEN** SHALL criar uma única venda consultável com suas parcelas e identidade própria, sem exigir cadastro independente de cliente
- **AND** SHALL abrir seu detalhe, comunicar sucesso demonstrativo e permitir retornar às listas

#### Scenario: Cadastrar com entrada e descrição
 - **WHEN** confirmar R$ 2.000,00 em 10x, Sim em Possui Entrada, R$ 200,00 de entrada com forma aceita e descrição
 - **THEN** SHALL mostrar descrição, R$ 200,00 pagos, R$ 1.800,00 de saldo e 1/10 paga
 - **AND** a entrada SHALL ser a parcela 1 Paga de R$ 200,00 na data da venda, seguida de nove de R$ 200,00, sem dupla contabilização

### Requirement: Prévia fiel e sem publicação

 O cadastro SHALL apresentar prévia atualizada de entrada, saldo futuro, números, valores, vencimentos e situações textuais das parcelas antes de confirmar. SHALL identificar a entrada como parcela 1 Paga, incluída nas N linhas, aplicando o domínio às demais. Prévia SHALL não publicar registros, consumir ID ou efetivar recebimento e SHALL perder a validade quando seus dados se tornarem inválidos. SHALL preservar a composição lateral vigente e rolagem interna acessível.

#### Scenario: Conferir centavos e calendário
 - **WHEN** informar R$ 100,00, selecionar Não, três parcelas e data 31/01/2027 com referência que admita a data
- **THEN** SHALL apresentar R$ 33,34, R$ 33,33 e R$ 33,33 com vencimentos 28/02, 31/03 e 30/04/2027
- **AND** mudar total, entrada, quantidade ou data SHALL recalcular a prévia ou indicar sua invalidade sem publicar venda

#### Scenario: Impedir prévia enganosa
 - **WHEN** houver total não positivo/inseguro, entrada integral, quantidade inválida, ausência da escolha obrigatória ou vencimento irrepresentável
- **THEN** SHALL não oferecer confirmação válida nem apresentar a prévia anterior como atual
- **AND** SHALL explicar o problema e manter as entradas para correção, sem criar venda

#### Scenario: Conferir entrada paga e saldo futuro
- **WHEN** selecionar Sim em venda de R$ 2.000,00 em 10x com entrada de R$ 500,00 válida
- **THEN** SHALL mostrar dez linhas, com Entrada/Paga de R$ 500,00 na primeira e nove futuras dividindo R$ 1.500,00
- **AND** a soma SHALL ser exata, situação SHALL não depender só de cor e tabela/erros/ações SHALL ser alcançáveis nos dois temas e por teclado

#### Scenario: Preservar prévia lateral e responsividade
- **WHEN** preencher cadastro nos dois temas em 1366×768, 390×844 e na fronteira 767/768 px
- **THEN** formulário e prévia SHALL permanecer lado a lado a partir de 768 px, alinhados ao topo, e empilhados abaixo disso
- **AND** nome/descrição SHALL manter mais espaço que valor/quantidade onde a grade permitir; não SHALL haver overflow global ou corte de rótulos/erros/ações; tabela extensa SHALL rolar na região identificada

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
