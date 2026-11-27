# Proposal

## Why

As telas ainda usam estado demonstrativo síncrono, enquanto a fase 005 oferece um
contrato HTTP persistido. Validar agora o fluxo completo com dados sintéticos evita
levar problemas de precisão, concorrência e confirmação perdida para a futura etapa desktop.

Base: PRD/FON-047/048/RF-037–043/CA-069–078 → TDD/DEC-042. Somente planejamento
autorizado; não confundir com a FASE-006 histórica dos formulários.

## What Changes

- Separar a fonte das telas por composição: demonstração padrão, independente da API,
  e modo local persistido explícito, sem fallback silencioso entre os dois.
- Adotar proxy de desenvolvimento em loopback, com credencial só no processo servidor,
  controle de Host/proveniência antes de encaminhar e CORS da API mantido desligado.
- Integrar quatro coleções, detalhe, Visão Geral consolidada, relatório mensal e cinco
  comandos existentes, preservando prévia, busca, ordenação, paginação e identidade visual.
- Tratar carregamento, falha, ausência, respostas obsoletas, revisão observada e
  invalidação após sucesso sem refazer projeções financeiras da API no browser.
- Bloquear confirmações na aba após resultado incerto até consulta bem-sucedida e
  reconhecimento humano explícito; sem retry, atualização otimista ou promessa exactly-once.
- Manter referência civil fixa por sessão; recarga renova a referência sem apagar SQLite.
- Adequar mensagens/Configurações ao modo e verificar cliente/proxy/UI/E2E com SQLite
  sintético, incluindo regressão demonstrativa com API desligada.

Não muda o contrato público da API ou schema. A refatoração do contrato interno síncrono
do frontend exige adaptação de componentes/testes, não alteração de comportamento demo.

## Capabilities

### New Capabilities

- `integracao-local-vendas`: conexão local privilegiada, precisão do cliente, leituras
  assíncronas e confirmação/conferência de comandos sobre a API persistida.

### Modified Capabilities

- `estado-demonstrativo`: limitar descarte/ausência de serviços ao modo demonstrativo
  e preservar isolamento sem fallback para o modo persistido.
- `demonstracao-inicial`: comunicar limites do modo sem afirmar ausência de persistência
  local; preservar padrão demonstrativo sem dados externos ou storage no browser.
- `consulta-vendas`: permitir leitura persistida no modo local sem revogar busca,
  paginação e ausência de efeitos comerciais nas consultas.
- `formularios-vendas`: distinguir recusa de resultado incerto e confirmação assíncrona,
  preservando rascunhos e bloqueando duplicidade.
- `recebimentos-parcelas`: fechamento do modal após envio não equivale a rollback;
  recuperação de incerteza e atualização depois de baixa confirmada.
- `navegacao-aplicacao`: recarga de rotas preserva vendas locais; Configurações informa
  o modo efetivo sem controles fictícios ou promessa operacional.

## Impact

Afeta composição/modelos de leitura e funcionalidades em `frontend/src/app/`, configuração
local/proxy/scripts e testes em `frontend/`, documentação e deltas listadas. Não cria
pacotes novos, SDK cliente genérico, UI de `/resumo` ou `/periodo`, seed, Tauri,
instalador, importação, dados reais, login humano, exportação, backup ou deploy local
no Pages. Não altera nem arquiva outras Changes.

**Pré-requisito do apply:** integrar e reconferir o PR #41 (head
`4fe279ef65621cf0d2b3a70e396f5724d97dfa9e`). Gate satisfeito em 27/11/2026: PR merged
na main pelo commit `a8de117`; contrato reconferido na tarefa 1.1 e main incorporada à
feature por merge próprio. A main de planejamento era `d84d568`. A integração do PR não
foi feita silenciosamente por esta Change nem inferida do planejamento.
Compatibilidade dos hooks do CLI fixado exige gate real antes das telas; falha exige
revisar o desenho, não enfraquecer proteção. A proposta, isoladamente, não autorizou o
apply; o pedido posterior e o início autorizado estão registrados na tarefa 1.1.
Archive ou abertura de PR continuam condicionados à conclusão integral da Change.
