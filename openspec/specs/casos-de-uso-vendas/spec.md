# casos-de-uso-vendas Specification

## Purpose

Coordenar operações e consultas internas de vendas sobre domínio e armazenamento local,
preservando identidade, revisão, integridade financeira e resultados seguros para consumidores.

## Requirements

### Requirement: Destino configurado e preparação explícita

A aplicação SHALL usar um caminho absoluto de banco definido por composição interna.
Compor ou consultar SHALL não criar diretórios, arquivo ou schema. A preparação SHALL
ser operação explícita separada dos comandos comerciais, sem dados de exemplo.

#### Scenario: Compor e consultar destino ausente
- **WHEN** o consumidor compuser um destino absoluto inexistente em diretório existente e tentar consultar sem preparação
- **THEN** a composição SHALL não criar arquivo e a consulta SHALL falhar com código `banco-ausente`
- **AND** SHALL não haver preparação, gravação ou reparo implícitos

#### Scenario: Preparar e repetir sem perder dados
- **WHEN** o consumidor preparar explicitamente o destino, cadastrar uma venda e repetir a preparação
- **THEN** a primeira preparação SHALL disponibilizar conjunto vazio com revisão zero
- **AND** a repetição SHALL preservar a venda e a revisão, sem duplicação ou seed

#### Scenario: Recusar configuração de destino inválida
- **WHEN** o consumidor configurar destino vazio ou relativo
- **THEN** a composição SHALL rejeitar a configuração sem acesso a arquivo e sem expor caminho pessoal na mensagem

### Requirement: Referência civil e identidade controladas

Cada operação comercial ou consulta SHALL receber referência civil explícita e usá-la
de forma consistente, sem consultar relógio. A aplicação SHALL gerar os IDs de novos
registros e preservar IDs existentes como strings opacas, sem exigir formato GUID.

#### Scenario: Manter referência em toda a operação
- **WHEN** uma operação receber uma referência civil válida
- **THEN** carga, validação temporal, projeção e eventual gravação SHALL usar essa mesma referência
- **AND** a resposta SHALL identificá-la, independentemente da data do computador

#### Scenario: Gerar IDs e rejeitar colisão sem nova tentativa automática
- **WHEN** cadastrar venda com parcelas e entrada, ou registrar uma baixa individual
- **THEN** a aplicação SHALL gerar os novos identificadores necessários sem solicitá-los ao consumidor
- **AND** colisão com qualquer venda, parcela ou recebimento SHALL falhar sem gravar e sem regenerar IDs automaticamente

#### Scenario: Preservar identidade em correção e consulta
- **WHEN** corrigir pagamento ou consultar registros com identificadores opacos preexistentes
- **THEN** SHALL preservar e reconhecer os mesmos IDs e vínculos sem convertê-los para GUID ou gerar substitutos
- **AND** consultas SHALL não gerar identificadores

### Requirement: Cadastro persistido sem publicação parcial

O cadastro SHALL validar dados de cliente, dinheiro, parcelamento e calendário pelas
regras vigentes, acrescentar a nova venda ao conjunto completo e confirmar a gravação
antes de devolver sucesso. Falha SHALL não devolver candidato como operação aceita.

#### Scenario: Cadastrar sem entrada e reabrir
- **WHEN** cadastrar total de 10.000 centavos em três parcelas sem entrada num banco preparado com revisão zero
- **THEN** SHALL confirmar revisão 1 com bases de 3.334, 3.333 e 3.333 centavos
- **AND** ao reabrir em consumidor novo SHALL recuperar os mesmos IDs, cliente, datas e valores

#### Scenario: Cadastrar com entrada única
- **WHEN** cadastrar venda-base de 20.000 centavos em duas parcelas com entrada de 10.000 e forma válida
- **THEN** SHALL retornar recebido 10.000, saldo 10.000 e uma de duas parcelas paga
- **AND** entrada SHALL ter data da venda e contribuir uma única vez aos recebimentos do período

#### Scenario: Recusar cadastro inválido ou conjunto inseguro
- **WHEN** informar identificação inválida, total/entrada/parcelamento/calendário inválidos ou candidato que exceda o limite financeiro global
- **THEN** SHALL falhar sem gravação, avanço de revisão ou alteração das vendas anteriores
- **AND** SHALL não gerar uma lista de parcelas antes de validar seus limites

### Requirement: Alterações cadastrais e administrativas delimitadas

A aplicação SHALL oferecer edição dos quatro campos do cliente e transições
administrativas vigentes, preservando contrato-base, parcelas, recebimentos e outras
vendas. Não SHALL oferecer exclusão ou edição financeira por esses comandos.

#### Scenario: Editar cliente sem propagar para outra venda
- **WHEN** editar nome, CPF, telefone e descrição válidos em uma venda, inclusive quitada, Inativa ou Prejuízo
- **THEN** SHALL alterar apenas esses campos nessa venda e confirmar a nova revisão
- **AND** outra venda com o mesmo CPF e todo o contrato financeiro SHALL permanecer inalterados

#### Scenario: Aplicar ou rejeitar transições administrativas
- **WHEN** solicitar transição administrativa na revisão vigente
- **THEN** SHALL aceitar Ativo para Inativo, Ativo para Prejuízo com saldo e retorno de ambos para Ativo
- **AND** SHALL rejeitar Inativo para Prejuízo, Prejuízo para Inativo e marcação de quitada como Prejuízo sem gravar

### Requirement: Recebimento e correção individuais persistidos

A baixa SHALL identificar explicitamente a primeira parcela pendente de venda Ativa,
sem deslocar seleção antiga. Correção SHALL alterar somente pagamento Individual
e preservar identidade e alocação. Ambas SHALL respeitar valores, datas, forma e
observação vigentes e confirmar o conjunto completo sem edição de entrada ou lote.

#### Scenario: Baixar e corrigir acréscimo entre meses
- **WHEN** baixar parcela-base 10.000 por 11.000 em fevereiro e corrigir o mesmo pagamento para 10.500 em março, ambos até a referência
- **THEN** SHALL preservar IDs do recebimento/parcela, apresentar acréscimo 500 e mover o recebimento para março uma vez
- **AND** saldo-base das parcelas restantes e demais pagamentos SHALL não mudar

#### Scenario: Rejeitar salto ou repetição sem avançar alvo
- **WHEN** tentar baixar parcela que não seja a primeira pendente ou repetir baixa da parcela já paga com a revisão corrente
- **THEN** SHALL falhar sem gerar segundo recebimento, gravar ou selecionar outra parcela

#### Scenario: Rejeitar dados ou origem inelegíveis
- **WHEN** houver valor abaixo do base, data fora dos limites, forma inválida, nota com mais de 20 valores escalares Unicode, venda não Ativa ou correção de entrada/lote
- **THEN** SHALL retornar falha identificável sem alterar histórico, projeções ou revisão

#### Scenario: Distinguir recebimento ausente de outra venda
- **WHEN** uma correção informar ID de recebimento inexistente ou pertencente a outra venda conhecida
- **THEN** SHALL distinguir inexistência de inelegibilidade pelo código/categoria, preservando ambas as vendas

### Requirement: Revisão esperada e gravação única

Cada comando comercial SHALL exigir revisão esperada não negativa e compará-la à
revisão carregada antes de operar. Alteração válida SHALL salvar o conjunto completo
uma única vez, devolver a revisão confirmada e preservar a ordem das vendas. Conflito
SHALL exigir recarga, sem retry ou mesclagem automáticos.

#### Scenario: Rejeitar comando obsoleto antes de executar alteração
- **WHEN** um comando informar revisão diferente da revisão carregada
- **THEN** SHALL falhar com `conflito-revisao` sem gravar, gerar IDs ou executar a alteração
- **AND** SHALL aplicar essa regra mesmo se a mudança anterior tiver ocorrido em outra venda

#### Scenario: Disputa depois da leitura
- **WHEN** dois consumidores na mesma revisão prepararem alterações distintas e tentarem gravar
- **THEN** no máximo um SHALL confirmar; o outro SHALL receber conflito ou bloqueio identificável
- **AND** cada tentativa SHALL fazer no máximo uma gravação, sem repetir a operação sobre outro estado

#### Scenario: Salvar conjunto e preservar ordem
- **WHEN** uma alteração válida modificar venda existente ou cadastrar nova venda
- **THEN** SHALL preservar todas as outras vendas, mantendo a posição da alterada e acrescentando cadastro no fim
- **AND** sucesso de escrita SHALL informar a revisão confirmada, sem devolver sucesso antes do commit

#### Scenario: Recusar revisão negativa
- **WHEN** um comando informar revisão esperada negativa
- **THEN** SHALL retornar validação com código `revisao-invalida` e campo `revisaoEsperada`, sem gravar

### Requirement: No-op sem avanço de revisão

Com revisão conferida, solicitar o status atual ou os quatro campos de cliente
normalizados idênticos SHALL retornar sucesso sem gravar nem incrementar revisão.
A revisão retornada SHALL ser a observada, sem prometer bloqueio contra escritas
posteriores. Essa regra SHALL não tornar cadastro, baixa ou correção idempotentes.

#### Scenario: Repetir status atual e cliente equivalente
- **WHEN** solicitar status já aplicado ou editar cliente com os quatro campos iguais após a normalização vigente
- **THEN** SHALL retornar os dados vigentes com a revisão observada e nenhuma chamada de gravação

#### Scenario: No-op com revisão obsoleta
- **WHEN** solicitar operação sem mudança usando revisão antiga
- **THEN** SHALL retornar `conflito-revisao`, não sucesso de no-op

#### Scenario: Correção idêntica não adota política de no-op
- **WHEN** corrigir pagamento Individual com os mesmos dados válidos e revisão corrente
- **THEN** SHALL seguir o fluxo normal de correção com uma gravação e revisão confirmada incrementada
- **AND** SHALL preservar o ID e não duplicar o pagamento

### Requirement: Consultas completas sem mutação

A aplicação SHALL consultar detalhe, coleções Abertas/Quitadas/Inativas/Prejuízo e
resumo a partir de um snapshot por consulta. SHALL devolver todos os itens elegíveis
na ordem vigente, com referência/revisão desse snapshot, sem preparar/gravar banco,
gerar IDs, aplicar busca, paginação ou ordenação parametrizável.

#### Scenario: Consultar coleções e resumo em status mistos
- **WHEN** consultar conjunto com Ativas abertas/quitadas, Inativas e Prejuízo
- **THEN** SHALL separar as quatro coleções sem truncamento e preservar a ordem de origem de cada uma
- **AND** resumo SHALL considerar somente Ativas nos indicadores operacionais, mas conservar recebimentos mensais de todos os status

#### Scenario: Consultar banco vazio e detalhe ausente
- **WHEN** consultar banco preparado vazio ou detalhe por ID não existente
- **THEN** coleções/resumo SHALL retornar sucesso com listas vazias, totais zero e revisão lida
- **AND** detalhe ausente SHALL falhar com categoria Inexistencia e código `venda-inexistente`

#### Scenario: Recusar seletor de coleção ou ID inválido
- **WHEN** consultar coleção desconhecida ou detalhe com ID vazio
- **THEN** SHALL retornar validação identificável sem escrita ou interpretação silenciosa do parâmetro

### Requirement: Períodos e relatório mensal reconciliáveis

Consultas de período e mês SHALL usar as projeções vigentes, com vendas apenas Ativas
e recebimentos de todos os status pela data efetiva. Mês selecionado SHALL não alterar
a referência da posição atual. Resultados SHALL preservar detalhamento, ordenações,
totais separados e série diária completa, sem reconstruir dívida histórica.

#### Scenario: Conferir bordas e soma diária
- **WHEN** consultar período inclusivo e mês com entrada, lote sintético, Individual e status mistos
- **THEN** SHALL incluir movimentos nas duas bordas uma vez, excluir externos e manter recebimentos de vendas fora do período
- **AND** somente vendas Ativas vendidas no intervalo SHALL integrar vendas; soma diária SHALL igualar recebido mensal

#### Scenario: Preservar posição e prejuízo separado
- **WHEN** selecionar outro mês com a mesma referência civil
- **THEN** SHALL alterar apenas a movimentação mensal, mantendo saldos e atrasos na referência
- **AND** pendências Prejuízo SHALL ficar separadas, identificando linhas não somadas por já haver recebimentos no contrato

#### Scenario: Mês vazio, extremos e parâmetros inválidos
- **WHEN** consultar mês vazio ou datas civis extremas válidas, intervalo invertido, ano fora de 1–9999 ou mês fora de 1–12
- **THEN** mês vazio SHALL retornar totais mensais zero e todos seus dias com zero, preservando a posição na referência
- **AND** extremos válidos SHALL não transbordar; parâmetros inválidos SHALL falhar como validação, sem escrita

### Requirement: Respostas próprias e protegidas

Respostas SHALL conter dados próprios da aplicação, centavos inteiros exatos, datas
civis e coleções protegidas contra mutação. SHALL não expor entidades persistentes,
raízes de domínio ou detalhes internos de resultado. Detalhe SHALL preservar cliente,
contrato, parcelas, recebimentos e alocações com suas identidades e ordens.

#### Scenario: Conferir detalhe após reabertura
- **WHEN** consultar venda reaberta com descrição ausente, nota Unicode, entrada, lote sintético e Individual corrigido
- **THEN** SHALL preservar nulabilidade, campos, valores, origens, vínculos e ordem de histórico, sem ordenar recebimentos pela data
- **AND** montantes SHALL ser centavos inteiros, sem conversão por ponto flutuante ou formatação monetária no contrato interno

#### Scenario: Impedir alteração através da resposta
- **WHEN** um consumidor tentar modificar coleções de uma resposta ou conservar uma resposta antes de outra operação
- **THEN** SHALL não conseguir mutar o snapshot, outras respostas ou estado persistido através dessas coleções

### Requirement: Falhas esperadas tipadas e seguras

Falhas esperadas SHALL informar categoria, código estável, mensagem pública pt-BR e
campo quando pertinente, sem classificação por texto. Falha de armazenamento SHALL
ser distinguível de inexistência de venda. Exceção inesperada SHALL propagar, sem
conversão genérica para validação ou exposição de dados técnicos/pessoais.

#### Scenario: Distinguir falhas sem vazar diagnóstico
- **WHEN** ocorrer validação, inexistência, conflito, inelegibilidade ou falha física conhecida
- **THEN** SHALL devolver a categoria/código definidos e mensagem sem SQL, CPF, telefone ou caminho pessoal
- **AND** banco ausente/incompatível/inválido SHALL não ser informado como venda inexistente

#### Scenario: Propagar falha inesperada
- **WHEN** uma dependência lançar exceção inesperada ou devolver código desconhecido do contrato
- **THEN** SHALL propagar falha técnica sem inventar erro de negócio, gravar novamente ou anunciar sucesso

### Requirement: Cancelamento e confirmação incerta preservados

Cancelamento SHALL propagar sem virar erro de negócio. Sucesso de commit confirmado
SHALL não ser reclassificado como rollback por cancelamento tardio. Confirmação
indeterminada SHALL ser distinguível de sucesso e de falha com rollback conhecido,
exigindo recarga sem repetição automática.

#### Scenario: Cancelar antes da confirmação
- **WHEN** o token estiver previamente cancelado ou o armazenamento observar cancelamento antes de confirmar o commit
- **THEN** SHALL propagar cancelamento e não devolver sucesso ou candidato publicado
- **AND** estado/revisão anteriores SHALL permanecer conforme a garantia transacional do armazenamento

#### Scenario: Cancelamento recebido após commit confirmado
- **WHEN** a gravação devolver sucesso confirmado e o token for cancelado tardiamente
- **THEN** SHALL devolver sucesso com a revisão confirmada, sem nova leitura obrigatória ou alegação de rollback

#### Scenario: Confirmação de commit indeterminada
- **WHEN** o armazenamento informar `confirmacao-indeterminada`
- **THEN** SHALL devolver categoria EstadoIndeterminado sem revisão nova confirmada nem sucesso
- **AND** SHALL exigir recarga/conferência, sem retry automático ou afirmação de que houve rollback

### Requirement: Isolamento do host e da demonstração

Os casos de uso SHALL ser consumidos internamente nesta fase com dados sintéticos.
A API SHALL continuar técnica, sem endpoints de negócio nem acesso ao SQLite, e o
frontend SHALL continuar demonstrativo e independente. Preparação/testes SHALL não
acessar planilha real ou base operacional.

#### Scenario: Iniciar API sem banco
- **WHEN** iniciar o host técnico sem armazenamento preparado
- **THEN** SHALL manter listener somente loopback, `/health` 200 textual `Healthy` e `/vendas` 404
- **AND** SHALL não criar, abrir ou migrar arquivo SQLite

#### Scenario: Executar consumidores internos e frontend independentemente
- **WHEN** testar casos de uso com armazenamento real em temporários e executar frontend com API desligada
- **THEN** SHALL usar somente fixtures sintéticas e arquivos próprios com conexões liberadas ao terminar
- **AND** frontend SHALL não depender dos casos de uso nem consumir seus dados persistidos
