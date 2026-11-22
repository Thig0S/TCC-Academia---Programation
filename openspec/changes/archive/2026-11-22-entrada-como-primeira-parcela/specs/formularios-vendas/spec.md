# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Cadastro com cliente e dados financeiros no mesmo contexto

Nova venda SHALL oferecer nome, CPF, telefone, descrição opcional, data da venda, valor total, escolha explícita de entrada e quantidade total N de parcelas, incluindo a entrada quando presente. Entrada SHALL exigir valor e forma e ser a parcela 1 Paga na data da venda. Data inicial SHALL ser a referência e aceitar alteração não futura. Dados SHALL ser sintéticos; limites SHALL seguir dominio-vendas.

#### Scenario: Confirmar cadastro sem descrição e sem entrada
- **WHEN** preencher obrigatórios válidos, selecionar Não em Possui Entrada, revisar a prévia e confirmar sem descrição
- **THEN** SHALL criar uma única venda consultável com N parcelas pendentes e identidade própria, sem cadastro independente de cliente
- **AND** SHALL abrir seu detalhe, comunicar sucesso demonstrativo e permitir retorno às listas

#### Scenario: Cadastrar com entrada e descrição
- **WHEN** confirmar R$ 2.000,00 em 10x, Sim em Possui Entrada, R$ 200,00 de entrada com forma aceita e descrição
- **THEN** SHALL mostrar descrição, R$ 200,00 pagos, R$ 1.800,00 de saldo e 1/10 paga
- **AND** a entrada SHALL ser a parcela 1 Paga de R$ 200,00 na data da venda, seguida de nove de R$ 200,00, sem dupla contabilização

### Requirement: Prévia fiel e sem publicação

O cadastro SHALL apresentar prévia atualizada de entrada, saldo futuro, números, valores, vencimentos e situações textuais das parcelas antes de confirmar. SHALL identificar a entrada como parcela 1 Paga, incluída nas N linhas, aplicando o domínio às demais. Prévia SHALL não publicar registros, consumir ID ou efetivar recebimento e SHALL perder a validade quando seus dados se tornarem inválidos. SHALL preservar a composição lateral vigente e rolagem interna acessível.

#### Scenario: Conferir centavos e calendário
- **WHEN** informar R$ 100,00, selecionar Não, três parcelas e data 31/01/2027 com referência que admita a data
- **THEN** SHALL mostrar R$ 33,34, R$ 33,33 e R$ 33,33 em 28/02, 31/03 e 30/04/2027, com situações derivadas
- **AND** alterar total, entrada, quantidade ou data SHALL recalcular ou invalidar a prévia sem publicação

#### Scenario: Impedir prévia enganosa
- **WHEN** houver total não positivo/inseguro, entrada integral, quantidade inválida, ausência da escolha obrigatória ou vencimento irrepresentável
- **THEN** SHALL não oferecer confirmação válida nem apresentar a prévia anterior como atual
- **AND** SHALL explicar o problema e manter entradas para correção, sem criar venda

#### Scenario: Conferir entrada paga e saldo futuro
- **WHEN** selecionar Sim em venda de R$ 2.000,00 em 10x com entrada de R$ 500,00 válida
- **THEN** SHALL mostrar dez linhas, com Entrada/Paga de R$ 500,00 na primeira e nove futuras dividindo R$ 1.500,00
- **AND** a soma SHALL ser exata, situação SHALL não depender só de cor e tabela/erros/ações SHALL ser alcançáveis nos dois temas e por teclado

#### Scenario: Preservar prévia lateral e responsividade
- **WHEN** preencher cadastro nos dois temas em 1366×768, 390×844 e na fronteira 767/768 px
- **THEN** formulário e prévia SHALL permanecer lado a lado a partir de 768 px, alinhados ao topo, e empilhados abaixo disso
- **AND** nome/descrição SHALL manter mais espaço que valor/quantidade onde a grade permitir; não SHALL haver overflow global ou corte de rótulos/erros/ações; tabela extensa SHALL rolar na região identificada
