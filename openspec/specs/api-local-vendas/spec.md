# api-local-vendas Specification

## Purpose

Disponibilizar operações persistidas de vendas a consumidores HTTP locais por um
contrato versionado, exato e protegido, preparando a integração futura sem duplicar
regras comerciais ou tornar a demonstração dependente do backend.

## Requirements

### Requirement: Inicialização explícita antes de servir

A API SHALL exigir destino absoluto com diretório pai existente e segredo técnico
válido, preparar explicitamente o armazenamento antes de aceitar tráfego e iniciar
somente em loopback. SHALL não criar diretórios, inserir dados de exemplo ou reparar
banco incompatível implicitamente.

#### Scenario: Primeiro uso e reinicialização
- **WHEN** iniciar com destino inexistente em pai existente e configuração válida
- **THEN** SHALL preparar banco vazio e revisão zero antes de disponibilizar requisições
- **AND** após cadastrar e reiniciar no mesmo destino SHALL conservar registros/revisão sem seed ou duplicação

#### Scenario: Configuração inválida antes de I/O
- **WHEN** faltar caminho/segredo, houver caminho relativo ou segredo de formato inválido
- **THEN** SHALL falhar antes de acessar o banco ou abrir listener
- **AND** diagnóstico SHALL não revelar segredo, caminho pessoal ou valor de configuração

#### Scenario: Destino indisponível ou incompatível
- **WHEN** pai não existir ou preparação encontrar banco alheio, schema futuro ou indisponibilidade
- **THEN** SHALL não disponibilizar a API nem sobrescrever dados incompatíveis
- **AND** SHALL não criar o pai ou corrigir conteúdo silenciosamente

#### Scenario: Conservar fronteira de rede
- **WHEN** iniciar host válido com porta padrão ou configurada
- **THEN** SHALL usar somente loopback IPv4, default 5070 e porta configurável de 1024 a 65535
- **AND** sobrescritas de endpoints de hosting/Kestrel SHALL continuar recusadas

### Requirement: Credencial técnica para operações comerciais

As operações comerciais SHALL exigir uma única credencial `Authorization: Bearer`,
fornecida pelo iniciador em `Backend__SegredoLocal`, sem fallback público. O segredo
SHALL ser Base64 canônico de 32 bytes. A API SHALL não implementar contas, cookies
ou redirecionamento de login, nem publicar credencial em URL, arquivo, resposta ou log.

#### Scenario: Negar antes de executar operação
- **WHEN** acessar endpoint comercial sem credencial, com credencial incorreta, duplicada ou malformada
- **THEN** SHALL retornar 401 Problem Details com `codigo: "acesso-local-negado"` e challenge `WWW-Authenticate: Bearer`
- **AND** SHALL não processar o corpo comercial, consultar o negócio ou alterar armazenamento

#### Scenario: Aceitar credencial da execução corrente
- **WHEN** acessar endpoint comercial com a credencial configurada e requisição válida
- **THEN** SHALL permitir o processamento sem cookie ou identidade de funcionário
- **AND** após reiniciar com outra credencial SHALL recusar a anterior

#### Scenario: Body inválido sem autenticação
- **WHEN** enviar JSON malformado a endpoint comercial sem credencial válida
- **THEN** SHALL responder 401 em vez de expor detalhes de binding
- **AND** SHALL não executar a operação

### Requirement: Health e ausência de CORS permissivo

Após inicialização bem-sucedida, `/health` SHALL permanecer público em loopback,
200 `text/plain` com corpo `Healthy`, sem informações do banco ou credencial.
A API SHALL não habilitar CORS nem transformar rotas ausentes em login.

#### Scenario: Health sem credencial e com origem arbitrária
- **WHEN** requisitar `/health` sem Bearer e com origem web arbitrária
- **THEN** SHALL retornar 200 textual `Healthy`, sem Set-Cookie e sem Access-Control-Allow-Origin
- **AND** SHALL não oferecer prova de identidade do processo ou diagnóstico dos dados

#### Scenario: Rotas antigas e de template permanecem ausentes
- **WHEN** requisitar `/vendas`, `/pagamentos`, `/weatherforecast`, `/swagger`, `/openapi/v1.json` ou `/__test/failure` no host normal
- **THEN** SHALL retornar 404 sem redirecionar para login
- **AND** rotas de falha de teste SHALL não existir no produto

### Requirement: Tipos externos exatos e IDs opacos

O contrato SHALL usar JSON camelCase, dinheiro inteiro em centavos seguros, datas
civis ISO `yyyy-MM-dd`, revisão decimal textual canônica de 0 a 9223372036854775807 e
enums textuais explícitos. IDs SHALL permanecer opacos em query/body, sem segmentos
de rota, conversão GUID ou normalização. A referência SHALL ser fornecida por operação.

#### Scenario: Preservar revisão além da precisão JavaScript
- **WHEN** transportar revisão `9007199254740993` ou `9223372036854775807` válida no contrato
- **THEN** SHALL usar respectivamente as strings exatas, inclusive em resumos aninhados
- **AND** dinheiro SHALL continuar token numérico inteiro, não string ou valor em reais

#### Scenario: Recusar revisão e dinheiro de tipos incorretos
- **WHEN** receber revisão numérica, negativa, fora de long, com sinal/espaço/zero inicial, dinheiro textual ou fracionário
- **THEN** SHALL retornar 400 seguro sem executar operação comercial
- **AND** SHALL não truncar ou arredondar a entrada

#### Scenario: Preservar identificador reservado
- **WHEN** consultar por query corretamente codificada ou alterar por body um ID contendo barras, `%`, `+`, `?`, `#` ou Unicode
- **THEN** SHALL localizar o ID literal após uma única decodificação de query
- **AND** SHALL não tratar barra como hierarquia, aparar o ID ou gerar substituto

#### Scenario: Exigir referência e formato civil exato
- **WHEN** faltar referência ou receber data impossível, formato local ou data com horário/timezone
- **THEN** SHALL retornar 400 sem inferir data do relógio ou executar negócio
- **AND** datas válidas entre `0001-01-01` e `9999-12-31` SHALL preservar seu valor civil

#### Scenario: Enums e nulabilidade explícitos
- **WHEN** transportar formas, status, situações, origem, descrição ou observação
- **THEN** SHALL usar enums textuais definidos em DEC-041, recusar números/desconhecidos e preservar nulabilidade contratada
- **AND** listas vazias SHALL ser arrays e observação SHALL seguir a normalização vigente, sem apagar Unicode

### Requirement: Consultas HTTP completas sem mutação

A API SHALL oferecer as seis consultas GET da tabela abaixo em `/api/v1`, com
credencial, referência explícita e resposta 200 fiel ao snapshot. SHALL manter
campos, vínculos, ordens, nulabilidade e totais dos casos de uso, sem recalcular
finanças, preparar/gravar banco ou paginar coleções implicitamente.

#### Scenario: Rotas e seletores das consultas
- **WHEN** requisitar uma consulta com os parâmetros obrigatórios correspondentes
- **THEN** SHALL oferecer o comportamento abaixo

| GET | Query obrigatória | Representação |
| --- | --- | --- |
| `/api/v1/vendas` | colecao, referencia | Coleção completa com revisão/referência; colecao Abertas/Quitadas/Inativas/Prejuizo |
| `/api/v1/vendas/detalhe` | vendaId, referencia | Resumo, parcelas, recebimentos e alocações da venda |
| `/api/v1/resumo` | referencia | Quatro indicadores globais com revisão/referência |
| `/api/v1/periodo` | inicio, fim, referencia | Período, recebidos, vendas elegíveis, revisão/referência |
| `/api/v1/relatorios/mensal` | ano, mes, referencia | Todas as seções e totais, série diária completa e revisão/referência |
| `/api/v1/visao-geral` | referencia | Indicadores, recentes, próximas e atrasadas do mesmo snapshot |

#### Scenario: Consulta vazia e detalhe inexistente
- **WHEN** consultar banco preparado vazio, mês sem movimento ou detalhe inexistente
- **THEN** coleções/indicadores SHALL retornar 200 com arrays vazios/zeros, e mês SHALL conservar todos os dias e a posição da referência
- **AND** detalhe inexistente SHALL retornar 404 `venda-inexistente`, sem confundir com armazenamento ausente

#### Scenario: Respeitar universos e período
- **WHEN** consultar conjunto com entrada, lote sintético, pagamento individual e status mistos nas bordas do período
- **THEN** SHALL preservar recebimentos de todos os status pela data efetiva, vendas do período somente Ativas e série diária conciliada
- **AND** selecionar mês SHALL não alterar referência ou reconstruir dívida histórica

### Requirement: Comandos HTTP com confirmação e revisão

A API SHALL oferecer cadastro, edição de cliente, mudança administrativa, baixa e
correção individuais conforme a tabela abaixo. Cada comando SHALL exigir referência
e revisão esperada; SHALL confirmar antes de devolver sucesso e conservar regras,
histórico e no-ops existentes. SHALL não fornecer exclusão, edição contratual ou lote.

#### Scenario: Rotas e entradas dos comandos
- **WHEN** enviar comando autenticado com body JSON válido
- **THEN** SHALL aplicar o contrato de campos abaixo e devolver detalhe confirmado

| Método e caminho | Body além de referencia/revisaoEsperada | Sucesso |
| --- | --- | --- |
| POST `/api/v1/vendas` | nome, cpf, telefone, descricao?, dataVenda, valorTotalCentavos, quantidadeParcelas, entrada? {valorCentavos, forma} | 201, detalhe e Location relativo para consulta por ID codificado e referência |
| PUT `/api/v1/vendas/cliente` | vendaId, nome, cpf, telefone, descricao? | 200 detalhe |
| PUT `/api/v1/vendas/status` | vendaId, novoStatus | 200 detalhe |
| POST `/api/v1/recebimentos` | vendaId, parcelaId, valorRecebidoCentavos, data, forma, observacao? | 200 detalhe |
| PUT `/api/v1/recebimentos` | vendaId, recebimentoId, valorRecebidoCentavos, data, forma, observacao? | 200 detalhe |

#### Scenario: Cadastrar e reabrir pela localização confirmada
- **WHEN** cadastrar 10.000 centavos sem entrada em três parcelas na revisão `"0"`
- **THEN** SHALL responder 201 com revisão `"1"`, bases 3.334/3.333/3.333 e Location `/api/v1/vendas/detalhe` com ID/referência em query
- **AND** consultar Location autenticado após reabertura SHALL conservar dados/IDs sem duplicação

#### Scenario: No-op e conflito
- **WHEN** solicitar status atual ou cliente normalizado idêntico na revisão vigente
- **THEN** SHALL responder 200 com a revisão observada sem gravação
- **AND** revisão obsoleta SHALL produzir 409 inclusive para no-op, sem buscar revisão nova para forçar sucesso

#### Scenario: Receber e corrigir sem alterar identidade
- **WHEN** baixar a primeira parcela pendente e corrigir pagamento Individual com acréscimo/data válidos
- **THEN** SHALL confirmar dados/revisão e preservar identidade, alocação, contrato-base e outras vendas na reabertura
- **AND** salto, repetição, entrada/lote inelegível ou valor inválido SHALL falhar sem deslocar alvo ou escrever parcialmente

### Requirement: Binding inválido sem efeitos comerciais

A API SHALL distinguir entradas ausentes, null indevido, JSON malformado, tipo
incorreto e content type não suportado antes de executar negócio. SHALL ignorar
propriedades JSON desconhecidas sem permitir edição extra, recusar chaves conhecidas
repetidas e parâmetros query obrigatórios duplicados, sem expor valores inválidos.

#### Scenario: Entrada estrutural ausente ou duplicada
- **WHEN** faltar campo obrigatório ou houver chave conhecida repetida em body/query
- **THEN** SHALL retornar 400 Problem Details `requisicao-invalida` sem efeitos comerciais
- **AND** SHALL não substituir campo ausente por zero, enum padrão ou data mínima

#### Scenario: Content type incorreto
- **WHEN** enviar body comercial em formato não suportado com credencial válida
- **THEN** SHALL retornar 415 `tipo-conteudo-nao-suportado`, em Development e Production
- **AND** SHALL não transformar falha de binding conhecida em 500

#### Scenario: Campo extra não amplia edição
- **WHEN** enviar edição de cliente com propriedade financeira desconhecida adicional
- **THEN** SHALL ignorar a propriedade extra e alterar somente os quatro campos de cliente válidos
- **AND** SHALL preservar contrato financeiro e histórico

### Requirement: Falhas HTTP tipadas e privadas

Falhas SHALL usar Problem Details seguro pt-BR, com status coerente e código estável,
sem serializar resultado interno ou diagnóstico sensível. Categoria SHALL determinar
400/404/409/422/503; confirmação indeterminada SHALL ser 500 identificável e exceção
inesperada 500 genérico. Respostas comerciais SHALL impedir cache.

#### Scenario: Traduzir categorias e preservar campos
- **WHEN** ocorrer validação, inexistência, conflito, regra comercial ou infraestrutura conhecida
- **THEN** SHALL responder respectivamente 400, 404, 409, 422 ou 503 com codigo, detail seguro e campo pertinente
- **AND** SHALL não classificar por mensagem, sugerir retry automático ou emitir Retry-After para comandos

#### Scenario: Falha técnica ou resultado inválido
- **WHEN** ocorrer exceção inesperada ou resultado com categoria/código interno desconhecido ou categorias incompatíveis
- **THEN** SHALL responder 500 `falha-interna` genérico em ambos os ambientes
- **AND** SHALL não publicar SQL, token, caminho, dados pessoais, stack, Reasons ou valores recebidos em resposta/log

#### Scenario: Proteger corpo e cache
- **WHEN** devolver sucesso ou falha de operação comercial, inclusive 401
- **THEN** SHALL usar `Cache-Control: no-store`
- **AND** falha SHALL conter type about:blank, title, status, detail e codigo, sem instance contendo query sensível

### Requirement: Concorrência e confirmação incerta sem repetição

O transporte SHALL preservar revisão global e cancelamento dos casos de uso, sem
retry, mesclagem ou confirmação otimista. Falha de confirmação conhecida SHALL
exigir conferência; desconexão ou timeout SHALL não prometer rollback nem tornar
cadastro/baixa idempotentes.

#### Scenario: Dois consumidores disputam revisão
- **WHEN** dois clientes enviarem alterações distintas baseadas na mesma revisão
- **THEN** no máximo um SHALL confirmar e o outro SHALL receber conflito ou bloqueio identificável
- **AND** SHALL não haver segunda tentativa automática ou perda de vendas alheias

#### Scenario: Confirmação indeterminada
- **WHEN** armazenamento informar confirmação indeterminada
- **THEN** SHALL responder 500 `confirmacao-indeterminada` com `resultadoOperacao: "indeterminado"`
- **AND** SHALL não anunciar sucesso/rollback, devolver nova revisão confirmada ou reenviar a escrita

#### Scenario: Cancelamento e desconexão
- **WHEN** houver cancelamento antes do commit ou desconexão depois de commit confirmado
- **THEN** SHALL preservar o protocolo transacional e não converter cancelamento em erro comercial
- **AND** SHALL não alegar rollback após confirmação ou garantir que a resposta chegou ao consumidor
