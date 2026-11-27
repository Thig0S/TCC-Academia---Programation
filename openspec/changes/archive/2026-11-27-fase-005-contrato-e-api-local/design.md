# Design

## Context

Ver `proposal.md/Why`. Base: PRD/fase 005/FON-045/046/RF-031–036/CA-061–068 e
TDD/DEC-041. DEC-041 centraliza o contrato detalhado, incluindo tabela de 11 endpoints,
campos, tipos JSON, configuração, status e roadmap; este desenho organiza sua execução.

Inspeção: `Api/Program.cs` configura loopback, health e erro técnico; `Api.csproj`
só referencia Aplicacao. `AdicionarAplicacao` registra handlers/preparação sem I/O;
`AdicionarPersistenciaSqlite` configura destino/adaptador/gerador sem abrir banco.
`ConsultarResumoHandler` usa uma carga e projeção do conjunto. Não há endpoint
comercial, autenticação ou consulta consolidada de painel. Os testes HTTP existentes
não fornecem destino/segredo e precisarão de fixture explícita, sem perder cobertura.

Decisões materiais confirmadas no Harness: painel incluso, preparação ao iniciar,
segredo técnico obrigatório, referência fornecida, revisão textual, IDs em query/body,
CORS desligado e pai existente. Contrato detalhado proposto para revisão; apply não
autorizado. Não há build, instalação, smoke ou teste de aplicação desta fase executados.

## Goals / Non-Goals

**Goals:**
- Adaptador HTTP fino, uma chamada a ISender por operação, sem recalcular finanças.
- Startup antes do listener e contrato externo sem perda de precisão.
- Consulta de painel com snapshot único, sem fan-out por venda.
- Falhas seguras iguais em Development/Production e protocolo sem repetição automática.

**Non-Goals:**
- Alterar domínio/schema, criar serviço genérico, pipeline transacional ou cache persistente.
- Conectar Angular, adicionar origem CORS ou SDK cliente, Rust/Tauri, instalador ou login humano.
- Garantir exactly-once após perda de conexão, criptografia, proteção de usuário comprometido,
  escala, backup, importação ou aptidão operacional.

## Decisions

### D1 — Host como composition root (DEC-041/5–7)

Api referencia Infraestrutura para chamar somente suas entradas públicas. Manter direção
Aplicacao → Dominio e Infraestrutura → Aplicacao/Dominio, sem tornar contexto/modelos
públicos. Alternativa de projeto-host novo adicionaria fronteira sem necessidade; manter
API sem persistência impediria o objetivo confirmado. Essa revisão é explícita na delta
`casos-de-uso-vendas`, sem alterar demais garantias da fase 004.

Fluxo proposto:

```text
Validar config --> Compor --> PrepararAsync --> Abrir listener loopback
                                     |
                                     +--> Falhar partida sem servir

HTTP --> Autenticar --> Validar/mapear --> ISender --> Handler --> SQLite
                                               |
                                               +--> DTO HTTP / Problem Details
```

`Backend__CaminhoBanco` não tem default: absoluto e pai existente. Segredo Base64/32
bytes vem exclusivamente de `Backend__SegredoLocal`, nunca CLI/appsettings, nem é
impresso. Validar tudo antes de I/O; preparação explícita antes de Run, sem seed,
criação de pais ou reset. Usar protocolo de preparação existente sem capturar tudo
como falha de negócio. Configuração inválida e falha esperada de preparação devem
terminar com diagnóstico seguro; não propagar exceção sensível para console.

### D2 — Contratos HTTP separados (DEC-041/8)

DTOs da API mapeiam todos os campos das respostas internas, mas fixam v1; mudança
interna futura não muda automaticamente o wire. Converter somente revisões para
texto; centavos permanecem inteiros seguros. Alternativa de serialização direta
acoplaria domínio/Result e permitiria perda de precisão ou evolução acidental.

Estrutura proposta em `backend/src/VendasEmAberto.Api/`:

```text
Configuracao/   destino, segredo e bootstrap
Seguranca/     esquema Bearer opaco
Contratos/     entradas, saidas, parse e mapeadores HTTP
Erros/         adaptador Problem Details e tratamento de binding
Endpoints/     Vendas, Recebimentos, Relatorios, Resumo, VisaoGeral
```

Usar camelCase e enum textual exato mapeado explicitamente; referência obrigatória,
ISO civil exato, revisão canônica em string; preservar null/arrays. Tipos de entrada
distinguem ausência de valor-default. Validar formato antes de Command, mantendo
validação comercial no domínio. IDs só em query/body: evita ambiguidade com barras.
Query decodificada uma vez; Location relativo usa escaping correto de ID e referência.

Contrato de rotas/campos e inventário integral de DTOs estão em DEC-041/8 e
`specs/api-local-vendas/spec.md`. Propriedade desconhecida é ignorada, não vinculada;
duplicata conhecida é 400. Não adicionar OpenAPI/Swagger ou pacote de mapper.

### D3 — Proteção de processo, não identidade humana (DEC-041/10)

Esquema de autenticação ASP.NET customizado, segredo opaco e comparação de 32 bytes
com FixedTimeEquals; não JWT nem cookie. Exigir autorização no grupo comercial,
antes de binding/ISender. Health público e rotas não mapeadas permanecem sem login.
Ausência/erro produz 401 Problem Details e Bearer challenge, nunca redirect.

Credencial fornecida pelo iniciador não pode ter sua aleatoriedade provada pelo host;
validar representação/tamanho e documentar geração externa por execução. Não prometer
isolamento contra processo do mesmo usuário. CORS desligado não substitui a credencial;
incluir token no Angular e habilitar origens são decisões futuras, não parte deste apply.

### D4 — Erros com semântica consistente (DEC-035 e DEC-041/10)

Adaptador central por categoria/código: 400 validação, 404 inexistência, 409 conflito,
422 regra, 503 infraestrutura; 500 com `resultadoOperacao: "indeterminado"` somente
para `confirmacao-indeterminada`; demais inesperadas 500 `falha-interna`. Não usar
Result.Value em falha, serializar Reasons ou escolher status pelo primeiro erro.
Somente múltiplos erros de validação coerentes usam `erros-validacao`/lista segura;
resultados mistos/contrato desconhecido são 500 genérico.

Uniformizar falhas de binding: .NET 10 não preserva automaticamente 400/415 quando
BadHttpRequestException entra no exception handler. Tratamento explícito mantém o
status tanto na resposta quanto no corpo; nunca ecoar mensagem da exceção. Não ativar
DeveloperExceptionPage. Cancelamento de RequestAborted segue ao handler e não vira
400/422; se resposta não pode ser entregue, não inventar garantia de rollback.

Todas as respostas comerciais no-store, inclusive 401. Sem Retry-After/retry automático
de comandos. Não logar query/body/header/token/SQL/exceção com dados; revisar logging
automático, usar códigos/eventos genéricos e testar marcadores sintéticos de vazamento.

### D5 — Painel interno sem segundo motor financeiro (DEC-041/9)

Adicionar Query/Handler em `Aplicacao/Funcionalidades/VisaoGeral/ConsultarVisaoGeral/`,
resposta protegida e mapeamento via DTOs internos existentes. Carregar uma vez;
projetar conjunto; filtrar Ativas para resumos. Indicadores vêm da projeção e conservam
recebidos de todos os status. Recentes: data desc/índice original; parcelas: vencimento
asc/índices de venda e parcela; filtrar elegibilidade e depois limitar cinco. Reutilizar
classificação temporal do domínio, sem AddDays que transborde nos extremos.

Alternativas rejeitadas: chamar resumo + coleções + detalhes por venda (revisões
divergentes/N+1) ou portar todo cálculo do Angular ao handler (duplicação financeira).
A spec visual é referência de regra, não autorização para alterar componentes.

### D6 — Verificação por funcionalidade (DEC-041/12–13)

MSTest unitário para binding, projeção wire, erro, autenticação e painel; integração
WebApplicationFactory com SQLite real temporário e reabertura, além de smoke real
da DLL para listener/startup/restart. Fixture altera segredo em ambiente antes da
criação do host, restaura em finally e serializa alterações ambientais; não usar
ambiente global em testes paralelos. Cada operação terá cenário positivo e falhas
pertinentes, não só smoke feliz. Doubles de falha/cancelamento identificam protocolo,
não comprovam falha nativa; testes reais existentes do gravador permanecem.

Roadmap API-01–05 em DEC-041/13 e detalhamento em tasks: contratos/host/segredo →
painel interno → seis consultas HTTP → cinco comandos → regressão/smoke/auditoria.
Cada funcionalidade inclui teste/documentação/tarefas e commit próprio. Sem builds
simultâneos na mesma saída e sem interferência em processos de desenvolvimento alheios.

## Risks / Trade-offs

- [Segredo em ambiente acessível ao mesmo usuário] → escopo sintético/local, sem alegação de proteção de SO; supervisão desktop futura.
- [Cadastro/baixa confirmado com resposta perdida] → nenhum retry automático; conferência explícita; não prometer exactly-once ou identificação inequívoca de cadastro perdido.
- [Mais campos e mappers HTTP] → custo aceito para contrato externo estável; testes por campo e precisão, sem mapper genérico.
- [Snapshot proporcional à base] → painel com uma carga; manter limite conhecido, sem benchmark ou promessa de escala.
- [Preparação no startup altera a execução técnica] → configuração obrigatória documentada, testes de host atualizados e delta explícita, sem preparar em query.
- [Logs padrão revelarem detalhes] → tratar respostas e logging automático, com marcadores sintéticos verificados nos dois ambientes.
- [Dependências de persistência agora na API] → auditar grafo novo intencional, sem antigo teste falso de ausência.

## Migration Plan

Sem migração de dados de usuário ou novo schema. Introduzir contratos e composição
na mesma feature; atualizar fixtures de host para destino/segredo válidos. Não acessar
banco operacional. Iniciadores passam a fornecer configuração obrigatória; versão
antiga não entende o contrato comercial e não é consumidor compatível do novo v1.

Antes de entrega, restore/build/test/format/auditoria e smoke completo com banco
temporário/reinício. Frontend continua testado com API desligada. Se o incremento
falhar em revisão, corrigir na feature; rollback de código não autoriza apagar,
recriar ou fazer downgrade de qualquer arquivo de dados.

Somente depois de novo pedido de apply, execução integral e evidências: sincronizar
specs/arquivar esta Change, conferir resultado e abrir PR único conforme template.
Não arquivar outras Changes, abrir PR antecipado ou mesclar sem autorização.

## Open Questions

Nenhuma decisão bloqueante do escopo atual permanece aberta. Origens do Angular,
porta dinâmica, diretório de dados do desktop e distribuição/backup são novas etapas
fora do recorte; não são tarefas exploratórias transferidas ao implementador desta fase.
