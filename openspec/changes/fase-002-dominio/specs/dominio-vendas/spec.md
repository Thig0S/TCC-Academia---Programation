# Spec Delta

## ADDED Requirements

### Requirement: Núcleo financeiro independente da interface e de recursos externos

O núcleo de domínio do backend SHALL executar cadastro, edição de cliente, baixa e correção individuais, mudança administrativa e projeções segundo as regras vigentes desta capability, sem interface, relógio implícito, rede, arquivos ou persistência. Operações temporais SHALL receber referência civil explícita e não alterar a demonstração existente.

#### Scenario: Executar sem host ou serviços externos
- **WHEN** um consumidor interno exercitar operações válidas com identificadores e referência fornecidos
- **THEN** SHALL obter resultados financeiros sem iniciar API, frontend, banco ou ler planilha
- **AND** a mesma entrada e referência SHALL produzir o mesmo resultado, sem consultar data atual

#### Scenario: Validar identificação e editar apenas o cliente
- **WHEN** cadastrar vendas com o mesmo CPF válido ou editar os dados do cliente de uma venda, inclusive quitada
- **THEN** SHALL aceitar identificação repetida entre vendas e alterar somente nome, CPF, telefone e descrição da venda selecionada
- **AND** identificação inválida SHALL falhar sem mutação e edição válida SHALL preservar datas, valores, IDs, parcelas, recebimentos e outras vendas

### Requirement: Precisão financeira compatível entre consumidores

O núcleo SHALL preservar centavos inteiros entre zero e 9.007.199.254.740.991 em valores e resultados financeiros, sem teto comercial adicional. SHALL rejeitar soma insegura individual ou do conjunto, inclusive de registros não visíveis, antes de devolver novo conjunto aceito. Datas SHALL preservar dias civis de 0001 a 9999, sem deslocamento por fuso.

#### Scenario: Rejeitar valor e soma fora do limite
- **WHEN** um valor ultrapassar o limite, for negativo ou a soma de vendas válidas ultrapassar o limite
- **THEN** SHALL devolver falha sem resultado financeiro impreciso nem novo conjunto aceito
- **AND** SHALL incluir na validação do conjunto também Inativas e Prejuízo

#### Scenario: Preservar o dia-base e o limite de calendário
- **WHEN** gerar parcelas da venda de 31/01/2027 ou de novembro/9999 com entrada e uma futura
- **THEN** SHALL preservar março no dia 31 após ajustar fevereiro e aceitar a única futura em dezembro/9999
- **AND** mais meses que o calendário permite SHALL falhar antes de materializar a coleção

#### Scenario: Classificar na referência máxima
- **WHEN** classificar pendências com referência 9999-12-31
- **THEN** SHALL classificar vencimentos anteriores como atrasados e o vencimento na referência como próximo
- **AND** SHALL não falhar tentando construir uma data posterior ao calendário

### Requirement: Resultados de domínio sem publicação parcial

Operações do núcleo SHALL devolver sucesso com novo estado validado ou falha esperada tipada com código estável, mensagem pública pt-BR e campo quando aplicável, sem contratos HTTP. Falhas SHALL não disponibilizar candidato como sucesso nem alterar entradas, coleções ou outras vendas. Estado e coleções devolvidos SHALL não permitir violar invariantes por mutação externa.

#### Scenario: Preservar origem e impedir mutação indireta
- **WHEN** realizar operação válida ou tentar modificar coleções de entrada e de saída posteriormente
- **THEN** o estado original SHALL permanecer íntegro e a saída SHALL proteger parcelas, recebimentos e alocações contra alterações externas

#### Scenario: Falhar após preparar candidato
- **WHEN** uma baixa válida individualmente produzir soma insegura ao validar o conjunto
- **THEN** SHALL devolver falha tipada sem publicar pagamento ou conjunto parcial
- **AND** o conjunto anterior SHALL continuar disponível para outra tentativa válida

#### Scenario: Descartar preparação e não confundir falha técnica
- **WHEN** um consumidor descartar um resultado ou ocorrer exceção técnica inesperada
- **THEN** o estado original SHALL permanecer inalterado
- **AND** exceção inesperada SHALL não ser convertida indiscriminadamente em validação ou regra comercial

### Requirement: Reconstrução validada de histórico financeiro

O núcleo SHALL distinguir entrada, pagamento individual e lote histórico na reconstrução de estado sintético e nas projeções. SHALL validar identidades únicas, vínculo das alocações, sequência integral, datas, formas e reconciliação antes de aceitar o histórico. Reconstrução SHALL não oferecer importação real, recalcular legado ambíguo ou autorizar nova baixa em lote.

#### Scenario: Reconstituir entrada e lote sem duplicação
- **WHEN** reconstruir venda sintética de 200.000 centavos em dez parcelas, entrada 20.000 e lote histórico 40.000 nas parcelas 2 e 3
- **THEN** SHALL obter 3/10 pagas, recebido 60.000, saldo 140.000 e parcela 4 como próxima
- **AND** SHALL contar entrada e lote uma vez cada e preservar IDs/origens

#### Scenario: Recusar histórico inconsistente
- **WHEN** histórico contiver ID duplicado, salto, parcela de outra venda, pagamento duplo, data inválida, forma desconhecida ou valor não reconciliado
- **THEN** SHALL rejeitar a reconstrução inteira sem criar estado parcialmente válido

### Requirement: Baixa individual segura no núcleo independente

Novas baixas SHALL operar somente em venda Ativa e na primeira parcela pendente, inclusive futura, com valor efetivo ao menos igual à base, data entre venda e referência e forma aceita. A observação opcional SHALL limitar-se a 20 valores escalares Unicode. Repetição, salto, entrada já paga e identidade de recebimento em uso SHALL falhar sem deslocar o alvo.

#### Scenario: Receber com acréscimo e preservar saldo-base
- **WHEN** pagar uma parcela-base de 10.000 por 11.000 centavos com data e forma válidas
- **THEN** SHALL criar um individual, acrescer 1.000 ao total efetivo e 11.000 ao recebido
- **AND** saldo das demais parcelas e vencimentos SHALL permanecer inalterados

#### Scenario: Rejeitar estado inelegível ou confirmação repetida
- **WHEN** pagar venda Inativa/Prejuízo, parcela posterior ou já paga, repetir baixa aceita ou reutilizar ID de recebimento
- **THEN** SHALL falhar sem outro recebimento ou quitação e sem selecionar automaticamente a próxima pendente

#### Scenario: Contar observação sem divergência de Unicode
- **WHEN** informar observação com 20 caracteres Unicode, incluindo caracteres representados por pares UTF-16, ou com 21
- **THEN** SHALL aceitar a primeira se os demais dados forem válidos e rejeitar a segunda
- **AND** SHALL aplicar a mesma contagem na correção

### Requirement: Correção e status sem reescrita do contrato

O núcleo SHALL corrigir somente recebimento Individual de venda Ativa, inclusive quitada, preservando IDs, parcela e bases, com as mesmas validações de valor, data, forma e nota da baixa. SHALL aplicar a matriz administrativa vigente sem estornar recebimentos, aceitar mesmo status como no-op e rejeitar Inativo↔Prejuízo e Prejuízo sem saldo.

#### Scenario: Corrigir valor e mês sem duplicar
- **WHEN** corrigir individual de 11.000 para 10.500 centavos sobre base 10.000 e mover sua data para outro mês permitido
- **THEN** SHALL conservar IDs e quitação, reduzir acréscimo e total efetivo em 500 e mover o recebimento uma vez entre meses
- **AND** outros recebimentos, entrada, parcelas futuras e estado original SHALL permanecer iguais

#### Scenario: Recusar origem ou venda não elegível
- **WHEN** corrigir entrada, lote histórico, recebimento inexistente/de outra venda ou individual de Inativa/Prejuízo
- **THEN** SHALL falhar sem alterar histórico ou totais

#### Scenario: Exercitar matriz administrativa sem efeitos financeiros
- **WHEN** inativar e reativar uma Ativa, marcar e reabrir Prejuízo elegível ou repetir status atual
- **THEN** SHALL preservar identidade, parcelas, recebimentos e suas datas/valores
- **AND** transição direta Inativo↔Prejuízo ou Prejuízo em quitada SHALL falhar sem alterações

### Requirement: Projeções mensais e de posição reconciliadas no núcleo

Projeções do núcleo SHALL separar movimento mensal inclusivo e posição na referência: recebimentos de todos os status, vendas/posição operacional só de Ativas e Prejuízo separado. SHALL detalhar todas as pendências de Prejuízo, totalizando apenas contratos sem recebimentos. Série diária SHALL cobrir todo o mês com zeros e reconciliar o total, sem reconstruir posição histórica.

#### Scenario: Trocar mês e preservar posição
- **WHEN** consultar meses diferentes, inclusive mês vazio, fevereiro bissexto e dezembro/janeiro, sobre o mesmo estado e referência
- **THEN** SHALL alterar apenas movimentos e série diária mensais, mantendo posição, referência e estado
- **AND** soma diária SHALL igualar recebido mensal e incluir primeiro e último dia

#### Scenario: Separar universos sem apagar recebimentos
- **WHEN** existirem Ativas abertas/quitadas, Inativas e Prejuízo com e sem pagamento anterior
- **THEN** SHALL separar as quatro coleções, considerar somente Ativas nos saldos/atrasos/vendas e manter todos os recebimentos no mês efetivo
- **AND** Prejuízo com pagamento anterior SHALL aparecer no detalhe sem contribuir para o total separado

#### Scenario: Consultar vazio e período inválido
- **WHEN** consultar conjunto vazio ou intervalo invertido
- **THEN** SHALL devolver zeros e coleções vazias no primeiro caso e falha tipada no segundo
- **AND** consultas SHALL não modificar o estado

### Requirement: Paridade verificável do núcleo financeiro

O núcleo SHALL cumprir catálogo sintético rastreável às regras e cenários vigentes, com entradas e resultados exatos para sucessos, falhas e bordas. Verificação SHALL cobrir invariantes de venda e conjunto, preservação de identidade e ausência de mutação, sem depender de execução da interface ou de dados pessoais reais.

#### Scenario: Conferir casos financeiros e temporais de referência
- **WHEN** executar catálogo de identificação, centavos, entrada, vencimentos, baixa, correção, status e projeções
- **THEN** SHALL verificar resultados explícitos, incluindo 10.000/3 = 3.334+3.333+3.333, calendário extremo, hoje/+7/+8 e soma insegura agregada
- **AND** SHALL identificar o requisito/cenário de origem e não tratar quantidade de testes como prova suficiente de paridade
