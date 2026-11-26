# Design

## Context

Motivação em `proposal.md`/Why. Base normativa: PRD/FON-043/044/RF-027–030/CA-054–060
e TDD/DEC-040, que centraliza contratos, versões, conversão de falhas e roadmap.
Situação no baseline deste desenho: somente planejamento autorizado; naquela revisão
nenhuma funcionalidade desta Change existia. A atualização de aplicação ao final registra
o estado posterior, sem reescrever os fatos observados no planejamento.

Inspeção no baseline: `Aplicacao/Persistencia/` já definia armazenamento,
snapshot/revisão e resultados; ainda não havia handlers. Dominio tem operações imutáveis e
projeções; Infraestrutura implementa adaptador SQLite internal com acesso de teste
por InternalsVisibleTo. UnitTests referencia Aplicacao diretamente. A API não referencia
Infraestrutura e permanece health-only; Angular continua em memória.

`ProjecaoVenda` não contém cliente, data da venda ou histórico integral; retornar apenas
esse objeto perderia dados necessários ao detalhe. A gravação aceita conjunto completo
e incrementa revisão até para snapshot idêntico: no-op deve ser tratado antes dela.

Este design é aplicável por cruzar Aplicacao/Infraestrutura/testes e introduzir
dependências. Não é condicionalmente omitido.

## Goals / Non-Goals

**Goals:**
- Tornar visíveis em cada handler as fronteiras carga/revisão/domínio/candidato/commit.
- Compor consumidores internos reais sem expor EF, alterar o contrato SQLite ou criar
  um novo host; validar o conjunto inteiro, não apenas a raiz alterada.
- Manter resposta coerente com a confirmação: projeções antes de gravar, revisão
  confirmada depois, sem trabalho cancelável obrigatório pós-commit.

**Non-Goals:**
- Não introduzir serviço amplo de vendas, base handler, behaviors transacionais,
  repository genérico, cache, Event Sourcing ou banco separado de leitura.
- Não criar DTO/status HTTP, handlers de exemplo, novas regras financeiras ou comandos
  de lote/importação. Exclusões de produto continuam em `proposal.md`/Impact.

## Decisions

### D1 — Slices explícitos sobre as camadas atuais

Implementar `Funcionalidades/Vendas/{CadastrarVenda,EditarClienteVenda,AlterarStatusVenda,
ConsultarVenda,ConsultarColecaoVendas}`, `Funcionalidades/Recebimentos/{RegistrarPagamento,
CorrigirPagamento}` e `Funcionalidades/Relatorios/{ConsultarResumo,ConsultarPeriodo,
ConsultarRelatorioMensal}` sob Aplicacao. Um Command/Query/Handler por caso de uso;
`ConsultarColecaoVendas` usa enum Abertas/Quitadas/Inativas/Prejuizo, sem controles extras.

Cada handler usa `IRequestHandler<TRequisicao, Result<TResposta>>`. Compartilhar só erros,
mapeadores e auxiliares concretos; não esconder transação em pipeline. Alternativa de
coordenador genérico foi discutida e rejeitada pelo solicitante: legibilidade do protocolo
é prioritária neste incremento. Dependência Aplicacao → Dominio permanece.

### D2 — Dependências exatas e gate técnico antes dos handlers

MediatR 12.5.0 Apache-2.0 e FluentResults 4.0.0 MIT na Aplicacao, com registro por assembly.
Versão antiga do MediatR é decisão explícita, não afirmação de gratuidade da linha atual.
Não usar LicenseKey/API da linha nova, pacote separado de DI ou extensão ASP.NET.
Referências diretas de DI/Logging.Abstractions 10.0.15 onde DEC-040 especifica; preservar
SDK/runtime/MSTest/EF existentes e gerar lockfiles apenas no apply.

NuGet e tag oficial confirmam licenças/assets; Context7 confirma padrão de registro/erros,
não execução neste projeto. APP-01 verifica metadados/transitivas/licenças/avisos, restaura,
compila e audita. Vulnerabilidade relevante ou incompatibilidade bloqueia e exige revisão
de PRD/TDD/SDD; não trocar versão ou suprimir alerta silenciosamente. Linha atual com
acordo/RPL foi preterida; dispatcher próprio alteraria DEC-034 sem autorização.

### D3 — Composição por destino sem efeitos colaterais

Aplicacao publica `AdicionarAplicacao` para handlers/preparação; Infraestrutura publica
`AdicionarPersistenciaSqlite(caminhoAbsoluto)` para destino imutável, adaptador interno
e gerador padrão. Manter contexto/modelos/adaptador internos. Sem ampliar amizade de
assembly nem adicionar dependência Aplicacao → Infraestrutura.

Destino em Aplicacao/Persistencia é dado imutável, injetado junto ao contrato existente;
não criar wrapper de armazenamento que replique o contrato. Configuração vazia/relativa
falha por argumento seguro antes de I/O. Provider representa um único destino, sem estado
estático compartilhado. Handlers/adaptador transient, destino/gerador stateless singleton.
Providers distintos podem apontar ao mesmo arquivo, exercitando a revisão global.

`IPreparacaoArmazenamentoVendas.PrepararAsync(token)` é operação técnica separada,
retorna Result e traduz a chamada InicializarAsync. Não recebe referência/revisão nem
é Command comercial. Compor/resolver serviço não migra; Queries/Commands nunca o chamam.
Manter API/Program.cs sem registro dessas entradas. Alternativas de auto-migration ou
caminho por requisição foram preteridas pelo escopo confirmado.

### D4 — Referência, IDs e contratos próprios

Contratos detalhados estão em DEC-040/Contratos internos propostos. Todas as requisições
comerciais/Queries recebem Referencia; Commands também RevisaoEsperada. Cadastro recebe
cliente/data/total/quantidade/entrada opcional; baixa identifica VendaId/ParcelaId;
correção identifica VendaId/RecebimentoId. IDs novos não fazem parte da entrada.

Gerador injetável padrão GUID formato N na Infraestrutura. Validar limites de entrada
antes de materializar IDs de parcelas; colisões falham pelo domínio/conjunto sem retry.
Correção não gera ID e recebe o conjunto carregado para distinguir recebimento de outra
venda. Preservar strings opacas existentes; não prometer deduplicação de transporte.

DTOs são próprios da Aplicacao com revisão/referência e dados necessários, long em
centavos e DateOnly. Usar enums próprios mapeados explicitamente e cópias defensivas
realmente não mutáveis. Detalhe combina raiz/projeção por ID e inclui parcelas e
recebimentos/alocações em ordem; resumo/listas/relatório seguem catálogo de DEC-040.
Não retornar entidades/Result serializado nem recalcular valores no mapper. Alternativa
de expor projeções de domínio foi rejeitada para não acoplar consumidores.

### D5 — Protocolo explícito de Command e no-op delimitado

```text
Validar entrada/token --> Carregar snapshot --> Conferir revisao
                                                   |
                                 Localizar / Executar dominio
                                                   |
                              No-op? -- sim --> DTO + revisao lida
                                |
                               nao
                                v
                   Montar conjunto / validar / preparar DTO
                                |
                                v
                   Salvar uma vez --> DTO + revisao confirmada
```

Validações estruturais podem falhar antes da carga; após carga, revisão é conferida
antes de localizar/operar/gerar IDs/no-op. Retornar primeira falha esperada em ordem
determinística, sem misturar categorias. Substituir só a raiz mantendo a posição;
cadastro acrescenta no fim. Conferir ConjuntoVendas.Criar/AceitarCandidato antes de
SalvarAsync com conjunto inteiro e revisão esperada. Preservar todas as vendas.

Preparar projeções/DTO antes de Save para não descobrir erro financeiro após commit.
Depois do sucesso, apenas incorporar a revisão confirmada; não exigir recarga nem
rechecar token para converter commit confirmado em cancelamento. Falhas esperadas
não disponibilizam candidato como sucesso. Exceção/cancelamento propagam sem catch-all.

No-op só cobre mesmo status e cliente com quatro campos normalizados idênticos, após
validação e revisão conferida; não chama Save, devolve revisão observada e respeita
cancelamento já observado. Correção idêntica continua gravação com revisão +1. A
revisão de no-op/Query não é uma reserva: outra escrita posterior pode invalidá-la.
Sem retry de conflito/bloqueio nem troca automática de parcela em repetição de baixa.

### D6 — Queries de snapshot único

Uma carga por Query, usando referência explícita; projetar no domínio e mapear DTO.
Nenhuma inicialização, Save, geração de IDs ou seleção global de mês. Consultar detalhe
ausente é Inexistencia; coleção vazia é sucesso com revisão e totais zero. Mês/ano e
intervalo são validados antes de construir datas; extremos válidos não transbordam.

Resumo usa Projetar; período usa ConsultarPeriodo (Ativas nas vendas e todos os status
nos recebimentos); relatório usa GerarRelatorioMensal, preservando ordenação de saldos/
atrasadas, todas as linhas de Prejuízo e IncluirNoTotal. Mapeamento por ID recupera dados
de cliente das raízes sem calcular finanças novamente. Busca/paginação não pertencem
a esta Query; não alterar a ordenação comercial já existente nos relatórios.

### D7 — Erros tipados e confirmação incerta

Aplicar integralmente a tabela de DEC-040/Falhas e fronteiras. `ErroAplicacao : Error`
tem Categoria/Codigo/Campo e mensagem pt-BR; quatro categorias de domínio preservadas,
mais Infraestrutura e EstadoIndeterminado. Não escolher por mensagem nem por ordem
arbitrária de Reasons. Não criar segundo Result nem consumir Value na falha.

Revisão negativa é revisao-invalida; revisão divergente é conflito-revisao. Falhas físicas
não são 404 de venda nem regra comercial. confirmacao-indeterminada não informa nova
revisão confirmada, não faz retry e orienta recarga; não afirma rollback. Exceção/token
não viram Result.Fail(ex.Message). Código desconhecido propaga erro técnico de contrato.
Não anexar SQL/CPF/telefone/caminho/exceção interna em mensagens públicas ou Reasons.
Mapper HTTP para essas categorias fica explicitamente para outra Change.

### D8 — Verificação por funcionalidade e protocolo

UnitTests/Aplicacao usa fake de armazenamento, gerador determinístico e contadores para
provar argumentos, token, referência, candidato completo, número de cargas/gravações e
ausência de Save/geração de IDs nos ramos proibidos. Sem nova biblioteca de mocks.
IntegrationTests/Aplicacao usa DI real + ISender + SQLite em arquivo temporário,
reabertura com provider novo e comparação por valores literais. Testes do gravador
existentes continuam prova de rollback/commit nativos; double de handler não os substitui.

Matriz de casos é a spec `casos-de-uso-vendas`/ADDED Requirements, vinculada a CA-054–060
e às tarefas APP-01–06. Incluir colisão/overflow global, CPF repetido, datas/Unicode,
entrada/lote/correção entre meses, status mistos, vazio, imutabilidade, no-op/obsolescência,
corrida após carga, exceção/cancelamento/commit incerto e isolamento do host/frontend.
Builds/testes sequenciais na mesma saída; evidências por funcionalidade no README/tasks.
Não usar contagens históricas como expectativa fixa ou declarar homologação operacional.

## Risks / Trade-offs

- [MediatR em linha anterior] → licenças oficiais fixadas e gate de segurança/compatibilidade;
  revisar o desenho se servicing necessário não existir, sem atualização silenciosa.
- [Coordenação repetida em handlers] → testes de protocolo compartilhados quando úteis,
  sem abstração genérica prematura que esconda commits/no-ops.
- [Cliente/histórico ausentes na projeção financeira] → joins por ID no mapper e asserts
  explícitos por campo; nenhum cálculo monetário duplicado.
- [Snapshot completo custa proporcionalmente à base] → custo já aceito em DEC-038,
  sem cache/otimização SQL ou nova promessa de escala nesta fase.
- [Falha anunciada após sucesso real] → projeções antes de Save e nenhum passo cancelável
  obrigatório após commit confirmado; erro indeterminado continua indeterminado.
- [Revisão de leitura/no-op envelhece] → devolver a observada, não prometer lock; próximo
  Command deve reapresentar e conferir a revisão.
- [Dados reais confundidos com teste] → fixtures sintéticas/temporários próprios; sem
  importação, acesso à planilha, base operacional ou homologação presumida.

## Migration Plan

Não houve alteração de schema/migration nem migração de dados. O apply adicionou
dependências/lockfiles e composição interna, verificados com temporários próprios. A API
não ativa os casos de uso: não houve deploy operacional ou preparação automática para
reverter.

O gate técnico passou nas verificações registradas em `backend/README.md`; não foi
necessário rever dependências por vulnerabilidade observada. Correção/reversão de código
ocorre por nova alteração revisada, nunca reset/downgrade/remoção de arquivo de banco.
Não apagar histórico ou dados para testar.

Roadmap completo em TDD/DEC-040: APP-01 contratos/composição → APP-02 cadastro/detalhe →
APP-03 cliente/status e APP-04 recebimentos → APP-05 Queries → APP-06 regressão/evidências.
APP-03/04/05 podem avançar após APP-02, mas builds não compartilham saída em paralelo.
Cada caso de uso é commit próprio com testes/docs; um PR só após toda a Change aplicada,
verificada e arquivada. No baseline deste desenho, archive/PR aguardavam autorização de
apply; o estado atual está registrado ao final deste documento.

## Open Questions

Nenhuma decisão material de produto/arquitetura permanece em aberto. Restore/build/
auditoria do APP-01 foram executados; os resultados e suas limitações estão no README.
Contratos HTTP, proteção IPC e importação são fora de escopo, não tarefas indefinidas
desta implementação. Resta somente o fechamento documental da tarefa 6.5.

## Implementação e estado de verificação — 26/11/2026

O apply autorizado implementou APP-01–05 e completou APP-06/6.1–6.4 na branch
`feature/fase-004-aplicacao`, com commits por funcionalidade. A suíte completa backend
passou com 285 testes, sem falhas/ignorados; restore bloqueado, build Release, format,
auditoria de pacotes, smoke loopback e testes/build do frontend também passaram. A API
continua sem endpoints comerciais e sem acesso ao SQLite; não houve alteração de schema,
migration, Angular, dados reais ou outras Changes.

APP-06/6.5 concluiu a matriz de aceite, validação OpenSpec estrita e revisão do diff;
archive automático desta Change é o próximo passo antes do PR único. Esses resultados
técnicos não equivalem a homologação operacional ou aprovação de produto.
