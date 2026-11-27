# Design

## Context

Ver `proposal.md/Why`. PRD/FON-047/048/RF-037–043/CA-069–078 e TDD/DEC-042 centralizam
o escopo e contrato técnico; este desenho organiza sua aplicação. Criar design é
necessário: mudança transversal nas telas, composição, segurança e protocolo assíncrono.
O planejamento foi concluído e o apply foi autorizado em 27/11/2026; as tarefas 1.1–1.3
estão concluídas, com a integração das telas ainda não iniciada.

Main integrada `a8de117`: API técnica v1 e specs da fase 005 disponíveis; telas ainda
dependem de `ServicoDemonstracao`, comandos síncronos e Relatórios/painel calculados da
fonte local. O PR #41/head `4fe279ef65621cf0d2b3a70e396f5724d97dfa9e` foi integrado em
27/11/2026 e reconferido na tarefa 1.1. Rotas, campos, Bearer de ambiente e revisão
textual estão equivalentes à referência; nenhum desvio material foi encontrado. Os IDs
de PRD/TDD da fase 005 permanecem reservados àquela entrega integrada.

Specs de abertura/estado/consulta ainda afirmam ausência global de API/persistência;
as deltas limitam isso ao demo. Textos legados de lote/dashboard não autorizam novos
lotes nem retirada do dashboard atual; preservar RF-018–020 e comportamento vigente.

## Goals / Non-Goals

**Goals:**
- Fronteira de dados independente da fonte e modelos próprios de apresentação.
- Uma escrita por confirmação; revisão do contexto, nunca renovada silenciosamente.
- Precisão wire e estado assíncrono sem publicar consultas obsoletas.
- Proxy dev privilegiado comprovadamente restrito antes de conectar telas.
- Recuperação conservadora quando resposta se perde, inclusive ao navegar.

**Non-Goals:**
- Store global do domínio, SDK genérico, pipeline de retry, atualização otimista,
  detecção automática de cadastro perdido ou exatamente uma vez após desconexão.
- Alterar API/schema, abrir CORS, implantar frontend local no Pages ou criar launcher
  desktop. `/resumo` e `/periodo` não exigem UI/chamadas artificiais nesta fase.

## Decisions

### D1 — Dois modos por composição, não por condicionais nas telas

Reutilizar `ServicoDemonstracao` por adaptador e introduzir fonte HTTP com contrato
assíncrono comum para coleções, detalhe, painel, mês e cinco comandos. Configuração
padrão continua demo em start/build/Pages; configuração local troca providers com
fileReplacement e ativa proxy. Sem token em providers/ambiente compilado, seletor por
URL ou fallback por falha. App e Configurações obtêm referência/limites pela composição.

Alternativa de substituir a fonte original eliminaria demonstração independente;
ifs por tela espalhariam política de modo. Adapter HTTP fingindo entidade `Venda`
exigiria reconstruir/calcular domínio já projetado; usar modelos de leitura próprios.
Helpers de prévia/validação e formatação existentes podem ser compartilhados; não
portar saldos, situações, juros/acréscimos, elegibilidade financeira ou série para mapper.

Estrutura proposta em DEC-042/7: `nucleo/dados/` para fronteira/modelos/cliente e
coordenador de confirmação, estado/fachadas junto das features, config de providers
em `src/configuracoes/`, proxy Node fora de src e E2E local separado. Sem pacote novo.

### D2 — Proxy do CLI com gate anterior ao encaminhamento

Implementado e exercitado proxy com credencial fora do browser. `proxy-local.cjs` é carregado
somente em start local, lendo `Backend__SegredoLocal` (Base64 canônico, 32 bytes) e
`Backend__Porta` (default 5070, limites da API); alvo imutável 127.0.0.1. API é iniciada
separadamente com mesmo segredo e caminho sintético explícito. Proxy não prepara banco.
O perfil local só instala o serve/proxy neste estágio; providers e telas ainda usam demo até
INT-02.1.

```text
Browser 127.0.0.1:4200 --> Gate Host / Fetch Metadata / Origin
                                      |
                                Admitir ou negar
                                      |
                         Remover auth/cookie de entrada
                         Injetar Bearer do ambiente Node
                                      |
                             API 127.0.0.1:5070
```

Aplicar DEC-042/9 integralmente: rawHeaders para duplicatas, Host único exato,
Sec-Fetch-Site same-origin obrigatório, Origin exato quando presente e obrigatório
em POST/PUT; negar null/externo/same-site/none/ausente, métodos não admitidos e headers
Upgrade/Expect antes de proxy.web. `Expect` é rejeitado porque o Vite 8.3.5 não emite
`proxyReq` quando esse header está presente. Ativar `ws` só para passar upgrades pela
validação: o gate retorna `false` sem resposta HTTP e o Vite encerra o handshake 404,
sem chamar `proxy.ws`.
Match ancorado `/api/v1` sem alterar query/IDs em pedidos admitidos. Não confiar só em
allowedHosts, pois Vite admite IPs por padrão; não emitir CORS permissivo.
Cliente técnico sem esses headers usa API direta autenticada, não bypass do proxy.

Hooks `bypass`/`configure` verificados pela execução real Angular CLI 22.2.6/Vite 8.3.5:
`bypass` roda antes de
`proxy.web`; a recusa termina 403/no-store, redige o caminho com sentinel fixo e retorna
string, para o ramo do Vite que observa `writableEnded` retornar sem `next()`. O hook
`proxyReq` injeta Bearer/remove Authorization e cookie somente após admissão. Logging
do erro foi interceptado antes do logger padrão; o preloader local remove `DEBUG`/`PORT`.
Upgrade real recebe 404 do listener Vite sem chamar `proxy.ws`; `Expect` é negado pois
Vite omite `proxyReq` quando presente. Execução Chromium/upstream temporário comprovou
query/ID preservados, recusa sem upstream, 502/no-store genérico e ausência de marcadores
nos logs, assets, respostas e requests do browser. API .NET real rejeitou credencial distinta
e válida (401/no-store). `npm run build` demo passou; providers/telas locais continuam em
INT-02.1. O proxy não afirma entrega/rollback de comando que resulte em erro de transporte.

Alternativa direta com token/CORS ou SPA hospedada no backend ampliaria decisões não
escolhidas; servidor proxy separado não é adicionado por padrão. A implementação não
adicionou dependências nem alterou os scripts padrão `start`/`build`. Gate INT-01.3 passou
com CLI real e comprovou negação **sem upstream receber**, erro/logging e caminho feliz;
não enfraquecer gate ou abrir CORS ao avançar para as telas.

### D3 — Contratos exatos e referência por sessão

HttpClient/RxJS existentes, DTOs wire v1 separados dos modelos de apresentação e
validação estrutural de unknown. Revisão sempre string canônica 0..long.MaxValue,
centavos number seguro, datas ISO sem Date/UTC, enums explícitos e null/arrays. IDs
em query/body, codificados uma vez, sem trim ou segmentação. Fonte de referência
reutiliza a política atual sem instanciar demo/seed no modo HTTP. Mês não muda referência.

Não usar `Number(revisao)` nem supor que o tipo genérico de HttpClient valida JSON.
Resposta inválida em leitura é falha de contrato; após envio de comando é resultado
não confiável e exige conferência. API continua autoridade da confirmação; prévia local
é informativa e testada contra exemplos literais, não nova persistência financeira.

### D4 — Consultas com chave e geração, sem estado completo do domínio

Fachadas de feature possuem `inicial/carregando/pronto/erro/inexistente`; chave inclui
coleção/ID/mês/referência e geração de invalidação. Leituras obsoletas são canceladas
ou descartadas, por switchMap/checagem da chave e geração, inclusive respostas anteriores
a comando confirmado. Não converter erro em lista vazia nem manter detalhe de outro ID.
Se dado anterior for mostrado durante refresh, marcar desatualizado e bloquear comandos
dependentes até obter contexto válido. Sem polling/cache persistente/sync entre abas.

Listas recebem resumos completos e aplicam busca/sort/página existentes; detalhe recebe
representação completa; painel usa GET `/api/v1/visao-geral`; mês usa
`/api/v1/relatorios/mensal`. Não montar painel/relatório com consulta por venda ou
refazer totais de domínio. Gráfico só calcula escala geométrica dos dados recebidos.

### D5 — Comando fixado na revisão observada e sem replay

Revisão do detalhe é fixada ao abrir/preparar edição/status/baixa/correção; cadastro
adquire revisão por consulta de coleção antes de habilitar confirmação. Não renovar
revisão no submit nem adotar a mais recente recebida por outro contexto. 409 preserva
rascunho e alvo; exigir recarga explícita e novo aceite, nunca deslocar parcela.

Coordenador por aba garante um comando em andamento, uma subscription, sem retry ou
resubscription por navegação. Tela destruída não cancela o acompanhamento da escrita;
resultado confirmado invalida dependentes e conserva detalhe/revisão. Erro em refresh
não reclassifica escrita aceita nem sugere reenviá-la. Consulta antiga não sobrepõe
sucesso. Mapear erros para rascunhos explicitamente, com resumo seguro para campo desconhecido.

### D6 — Conferência de incerteza em toda a aba

Classificação em DEC-042/9: transporte/status 0, timeout, 502/504, 5xx genérico,
resposta de sucesso estruturalmente inválida ou confirmação indeterminada após envio
entram no protocolo incerto. Recusas conhecidas da API são tratadas por categoria/código,
não somente status arbitrário. Nenhum caso presume rollback da desconexão.

```text
Disponivel --> Enviando --> Confirmado --> Invalidar consultas
                  |
                  +--> Recusa conhecida --> Corrigir / recarregar / novo aceite
                  |
                  +--> Incerto --> Bloquear comandos na aba
                                      |
                               Consultar dados com sucesso
                                      |
                               Reconhecimento humano
                                      |
                                  Disponivel
```

Rascunho/alvo mantidos em memória; alerta de aba sobrevive à navegação e permite sair
do modal para conferir. Cadastro confere coleção, outros conferem detalhe; consulta
falha mantém bloqueio. Reconhecimento humano libera sem enviar ação e sem inferir
identidade de cadastro por nome/CPF. Não há exactly-once/idempotency key. Recarga
descarta memória, não recupera comando e nunca o envia; orientação de conferir antes
de repetir permanece nos limites do modo. Não persistir bloqueio/draft/segredo em storage.

### D7 — Acessibilidade e verificação por funcionalidade

Preservar rotas, tokens, temas e densidade no pronto; loading/erro/conferência usam
anúncios e foco lógico, sem roubar foco em digitação. Escape antes de envio cancela;
depois de envio pode fechar sem prometer rollback e coordenador continua acompanhando.
Erros mantêm rascunho/associação e retorno de foco; aviso incerto não fica preso no modal.
Configurações e mensagens usam explicação correta do modo. Não há redesign/exportação.

Vitest + HttpTestingController cobrem wire/uma escrita/corridas/protocolo; Node tests
e CLI real comprovam proxy; Playwright local usa API/SQLite temporários e fixtures via
API direta autenticada, sem endpoint seed ou banco operacional. Processos próprios,
portas verificadas, testes sem compartilhar banco em paralelo. Cenários de resposta
perdida antes/depois do commit distinguem prova de transporte de falha nativa do gravador.
Configuração demo continua API desligada; não contaminar suas fixtures/defaults.

Roadmap INT-01–06 de DEC-042/14: composição/proxy → contratos/estado → consultas →
cinco comandos separados → conferência integrada → E2E/regressão/auditoria. Cada entrega
tem testes/documentação e commit próprio; qualidade não é adiada toda para a última fase.

## Risks / Trade-offs

- [Proxy transforma origem permitida em acesso privilegiado] → gate antes de upstream,
  segredo só servidor, loopback e dados sintéticos; não protege processo/conta comprometidos.
- [Hooks/logging da versão real diferirem das fontes atuais] → gate técnico inicial,
  falha bloqueia a integração; revisão explícita, não workaround permissivo.
- [HTTP frio gerar escrita duplicada] → uma subscription por confirmação e testes por
  endpoint; sem retry, reenvio por mudança de rota ou atualização otimista.
- [Consulta atrasada sobrescrever sucesso] → chave+geração e invalidação transversal.
- [Recarga perder bloqueio em memória] → nunca recuperar/replay de comando e orientar
  conferência; não alegar proteção persistente ou identificação automática de cadastro.
- [Modelos novos ampliarem refatoração] → somente campos usados pelas telas, preservar
  domínio/cálculos demo e testes existentes; sem store genérico ou novos pacotes.
- [Fase 005 mudar no review] → gate de integração do PR #41 e reconciliação pré-apply.

## Migration Plan

Sem migração de dados/schema. Depois de integração da fase 005 e novo apply explícito,
introduzir modo/composição e proxy primeiro; validar os gates antes de adaptar consultas
e comandos. Manter build/demo padrão e Pages independentes durante toda a Change.
Build local não é distribuição; documentar configuração de três valores (segredo,
porta upstream e caminho de banco só da API), sem gravar segredos ou dados reais.

Rollback de frontend seleciona modo demo para demonstração, não como fallback oculto
da sessão local e não apaga banco. Reverter código não autoriza reset, reparo ou
downgrade SQLite. Atualizar docs e tarefas com resultados reais apenas no apply.
Após escopo integral verificado, sincronizar specs, arquivar **esta** Change e abrir
PR único conforme template; não arquivar nem abrir PR por planejamento pronto.

## Open Questions

Nenhuma decisão material de produto permanece aberta. Integração do PR #41 e prova
dos hooks são gates explícitos, não perguntas transferidas ao implementador. Falhas
nesses gates exigem revisão do planejamento antes de código dependente. Homologação,
desktop e operação com dados reais continuam fora e exigem nova autorização.
