# Design

## Context

Motivação e rastreabilidade em `proposal.md`. PRD 1.8 e TDD 1.12 já definem os requisitos, a arquitetura e a FASE-006; são reutilizados, sem alterar suas regras. O planejamento parte de `origion/main` em `9fdd455` (PR #14), em `feature/fase-006`, com diretório limpo antes do scaffold.

Inspeção constatou:
- `ServicoDemonstracao` raiz oferece `cadastrarVenda`, `editarCliente`, `registrarPagamento`, consultas congeladas e projeções reativas. O núcleo copia comandos e publica atomicamente; não criar outra store.
- `prepararCadastro` gera parcelas sem publicar; `prepararEdicaoCliente`, `cpfValido`, `telefoneValido`, `interpretarDinheiro` e funções de data civil já existem. Os resultados de domínio não carregam mapa completo de erros por campo.
- Listas/detalhe usam componentes standalone, templates separados, Bootstrap, IDs opacos como `seed/venda/1`, paginação e regiões roláveis. Não há modal compartilhado nem páginas de formulário. Detalhe reage a `paramMap`.
- `frontend/package.json` fixa Angular 22.2.6 e não possui `@angular/forms`. E2E existente verifica inclusive ausência de mutações; essas asserções precisam evoluir seletivamente, não ser removidas em bloco.
- As cinco deltas desta Change substituem proibições vigentes de UI comercial; as regras financeiras de `dominio-vendas` e dos quatro requisitos existentes de `recebimentos-parcelas` continuam intactas.

## Goals / Non-Goals

**Goals:** separar rascunho, conversão, validação, prévia e publicação; tornar cancelamento e resultados explícitos; comprovar fluxos no browser real sem hooks globais de teste; manter consultas compactas e limites de sessão.

**Non-Goals:** criar clientes mestres, camada de API, repository fictício, segunda store, nova regra financeira, infraestrutura de produção, interface de indicadores/Relatórios, ou aceite da ótica. Não modificar código nesta etapa de planejamento.

## Decisions

### D1 — Páginas de cadastro e edição; modal somente para recebimento

Adicionar páginas lazy `/vendas/nova` e `/vendas/:id/editar`, com `nova` antes de `vendas/:id` e preservação de `quitadas`. Construir URLs por segmentos do Router, nunca interpolar/decompor IDs com barras. Usar Nova venda na faixa de ações existente de Vendas, Editar em ambas as tabelas e no detalhe, Receber no detalhe com pendências. Acionar uma linha nunca seleciona registro pelo nome ou CPF.

Cadastro e edição ganham formulário e espaço de conferência sem a restrição de dez linhas sem rolar, aplicável apenas às consultas. Alternativa: modal para todos os fluxos foi preterida pelo volume de campos e prévia. Nenhuma nova navegação principal será criada.

Sucesso de cadastro/edição navega ao detalhe do ID retornado, com mensagem demonstrativa anunciável em memória. Cancelar retorna ao contexto acionador (Vendas, Quitadas ou detalhe). Guardar apenas contexto interno validado e identificação lógica do acionador, nunca URL arbitrária ou referência DOM desmontada. Na ausência desse contexto, cadastro retorna a Vendas e edição ao detalhe; registro ausente oferece Vendas/Quitadas. A navegação preserva foco no título como contrato geral; cancelamento restaura o acionador após renderização quando presente e usa título/retorno lógico como fallback. Não exigir histórico do browser nem persistência de critérios/rascunhos. Saída por outros links descarta o rascunho; não introduzir guarda ou confirmação de abandono não solicitada.

### D2 — Signal Forms com um único modelo de rascunho

No apply, adicionar `@angular/forms@22.2.6` e lockfile, sem atualizar os demais patches. Consulta real `npm view` confirmou versão e peers core/common/platform-browser 22.2.6 e RxJS compatível com 7.8.2; não houve instalação nem prova de compilação.

Usar `form`, `FormField`, validadores síncronos e caminho oficial `submit` de `@angular/forms/signals`. Consultas Context7 a angular.dev confirmaram modelo em signal, `validate`, erros associados, foco e bloqueio concorrente de submissão. A consulta à branch 22.0.x não trouxe exemplos; documentação geral não comprova todas as APIs no patch instalado. Conferir exports/estabilidade nas declarações/documentação do patch durante a instalação; não migrar para Reactive Forms nem ativar APIs experimentais para contornar incompatibilidade. Divergência material exige revisar o desenho antes de prosseguir.

Modelos locais separados para cadastro, edição e recebimento. Identificação compartilhada em componentes/esquemas pequenos somente quando usada nos dois formulários, sem construtor genérico de formulários. Edição copia apenas os quatro campos e recomeça ao trocar ID; não vincular o modelo diretamente à projeção. Não oferecer controles financeiros desabilitados como se fossem editáveis.

### D3 — Adaptadores puros e prévia com a mesma regra do cadastro

Rascunhos mantêm dinheiro e quantidade como texto para preservar entrada inválida. Reutilizar `interpretarDinheiro` (vírgula decimal, sem arredondamento via float), CPF/telefone e datas civis; quantidade deve ser inteiro positivo seguro antes da conversão ao comando. Não usar `Date`/UTC para datas de negócio. Campos de data usam string civil ISO em controle nativo de data, orientação local e datas de conferência em DD/MM/AAAA. Inicializar cadastro e data do recebimento pela referência fixa da sessão, não por novo relógio à meia-noite; RF-004/RN-015 prevalecem sobre a frase histórica de CA-006 sobre dia local do cadastro.

Adaptadores puros próximos às funcionalidades convertem rascunhos para comandos e associam erros de estrutura aos respectivos campos, reutilizando funções de domínio. Validações cruzadas indicam entrada/quantidade/data pertinentes; erros de agregado/falha ficam no resumo do formulário, sem fingir conhecer um campo. A fonte permanece autoridade final, inclusive overflow das projeções.

Para prévia, converter dados atuais e chamar `prepararCadastro` com identificador local de prévia, nunca o serviço de publicação. Exibir entrada, saldo e todas as parcelas em região rolável; a prévia só é válida quando a preparação atual for bem-sucedida. Não reservar ID real nem incrementar contadores. Alternativa de recodificar centavos/calendário no componente foi rejeitada por divergência; não refatorar o núcleo sem necessidade comprovada. Dados inválidos não mantêm prévia anterior com aparência atual.

### D4 — Submissão e resultado de negócio são coisas distintas

Usar uma única via de submit por formulário, inclusive Enter, revelar erros e focar primeiro campo pertinente. O callback converte rascunho novamente e chama o comando uma vez. Não navegar, limpar ou fechar apenas porque uma Promise resolveu: verificar `Resultado.tipo === 'sucesso'`. Mapear rejeições para erros de submissão/mensagem em português e tratar exceções com `try/catch/finally`, liberando envio e mantendo rascunho.

Combinar proteção concorrente do submit com guarda local de operação concluída até navegação/fechamento: o serviço de cadastro cria uma nova venda a cada comando válido, portanto só desabilitar o botão não impede duplicidade pelo mesmo envio. Recebimento também revalida as mesmas parcelas no serviço, sem deslocar seleção antiga para as próximas. Não adicionar atraso artificial, RxJS de rede ou retry automático. Cancelar é `type="button"`; fechamento não executa comando. Mensagens de sucesso são locais e transitórias, sem storage.

### D5 — Prefixo de pendentes explícito e modal nativo

No detalhe, Receber abre componente de parcelas dentro de um encapsulamento de `<dialog>` compartilhado efetivamente consumido. Seleção por quantidade de parcelas consecutivas desde a primeira pendente, inicialmente uma; listar números, valores e soma do prefixo atual. Isso torna impossível saltar pela UI sem alterar o contrato que o serviço revalida. Valor recebido continua campo obrigatório editável, inicialmente vazio, para conferência exata; data inicia na referência, forma inicia sem seleção. Oferecer apenas `FORMAS_PAGAMENTO`.

Rascunho captura IDs selecionados, não referências mutáveis. Se houver rejeição por seleção obsoleta, manter mensagem e exigir revisão explícita/reabertura, nunca substituir automaticamente parcelas já pagas. Uma venda quitada não oferece Receber; novo recebimento não é edição financeira.

Encapsulamento usa `showModal()`, título via `aria-labelledby`, sem `tabindex` no dialog, foco inicial na seleção de quantidade, botões de cancelamento e tratamento de `cancel`/`close`. Escape descarta; clique no backdrop não confirma nem tem obrigação de fechar. Conteúdo interno rolável mantém ações alcançáveis e herda `data-bs-theme`. JS Bootstrap/Popper e CDK não são necessários.

Sucesso fecha, anuncia resultado e mantém detalhe atualizado. Restaurar foco a Receber se ainda existir; após quitação, ao título de Parcelas ou outro destino lógico persistente com foco programático. Browser real comprova modalidade, contenção e retorno, não jsdom. Se navegação desmontar o componente, fechar e descartar, sem manter dialog órfão.

### D6 — Verificação por camada e evolução seletiva da regressão

| Camada | Evidência exigida no apply | Rastreabilidade |
| --- | --- | --- |
| Adaptadores/prévia | Conversões exatas, erro por campo, calendário 31/01, centavos, entrada, referência fixa, limites e ausência de publicação | CA-006/007/008/009/030 |
| Componentes/serviço | Rascunhos isolados, envio concorrente/Enter, resultados rejeitados/exceções, cancelamento, retry, troca/ausência de ID; finanças invariáveis na edição | CA-012/013/016/017/018 |
| E2E UI real | Criar, conferir detalhe, editar abertas/quitadas, receber prefixo/antecipação e quitar; conferência em listas após navegação interna, perda no reload, sem console inesperado | CA-006 a CA-013/021/024 |
| Modal/browser | Teclado, foco inicial, Tab/Shift+Tab, Escape, retorno após cancelar/sucesso/quitação, reabrir | CA-016; DEC-007 |
| Visual/acessível | Dois temas, 1366×768/390×844, textos extensos, erros, prévia extensa, zoom nativo 200%, contraste e consultas ainda compactas | RNF-002/003/007/009; CA-027/028 |

Falhas controladas em TestBed por doubles de serviço/preparadores, não botão de falha ao usuário nem hook em produção. Fixture de paginação permanece em alvo próprio; E2E da aplicação deve produzir vendas pelas ações reais e usar navegação interna para preservar sessão (`page.goto` reinicia a aplicação). Testar ajuste da página após redução com fixture apropriada/componentes, sem alterar o seed padrão de 12 vendas.

Não manter a asserção antiga de ausência global de Nova venda/Editar/Receber nas consultas; manter ausência de exportação, indicadores em Vendas e ações comerciais de Visão Geral/Relatórios. Comparar estado financeiro profundamente em serviço/componentes e valores visíveis no E2E; resumos internos não exigem antecipar UI da FASE-007.

## Risks / Trade-offs

- [Deriva da documentação Signal Forms] -> conferir patch/exports ao adicionar dependência e parar diante de incompatibilidade material; não escolher substituto silencioso.
- [Duplicidade em comandos de cadastro] -> submit único, guarda de conclusão e testes com cliques/Enter repetidos; não prometer idempotência geral do serviço.
- [Ações extras quebram densidade] -> integrar à faixa existente, medir tabelas e detalhe novamente, não reduzir fonte/ocultar dados para caber.
- [Muitas parcelas geram prévia extensa] -> região acessível rolável sem teto comercial novo; testes nos limites do calendário e sem prévia obsoleta.
- [Acionador removido/desmontado] -> restauração por identidade lógica após renderização, fallback persistente e E2E de quitação.
- [CPF/telefone sintéticos podem coincidir com titulares] -> orientações de uso exclusivamente sintético, sem alegar anonimato ou consultar serviços.
- [Testes antigos confundidos com aceite] -> registrar somente execuções reais por commit, sem tratar runner Chromium como avaliação no Chrome da ótica; PEN-013/014/HIP-006 seguem separados.

## Migration Plan

1. Revisar esta proposta/deltas/desenho/tarefas; aguardar novo pedido explícito de apply.
2. Na mesma feature branch, adicionar dependência compatível e entregar por funcionalidades com testes, documentação e tarefas nos respectivos commits. Mensagens em português com prefixos do histórico.
3. Executar regressão, registrar evidências e atualizar acompanhamento de PRD/TDD sem mudar requisitos. Não sincronizar/arquivar automaticamente como efeito de testes passarem.
4. Publicar um único PR para main somente quando toda a Change estiver entregue/verificada, usando o template do repositório; merge exige autorização explícita. Planejamento isolado não abre PR.
5. Não existe migração de dados persistentes. Regressão impeditiva bloqueia entrega; rollback de entrega publicada ocorre por reversão revisada via PR, não descarte de trabalho local ou push direto à main.

## Open Questions

Somente de avaliação posterior: versão Chrome/viewport CSS da execução, participantes/papéis/autoridade/consentimento e metas finais de PEN-013/014/HIP-006. Não bloqueiam o planejamento técnico desta UI nem estão resolvidas por ele; bloqueiam alegar avaliação/aceite completo. Nenhuma decisão de negócio bloqueante da FASE-006 foi presumida.

## Implementation Evidence

Apply autorizado em 18/11/2026, na feature original. Patch instalado confirma
`form`, `FormField`, `validate` e `submit` públicos desde 22.0; somente forms como
dependência direta nova, sem atualizar patches anteriores. Identificação recebe
`Pick<FieldTree<RascunhoCliente>, keyof RascunhoCliente>`, não a raiz do cadastro:
preserva referências dos quatro campos sem exigir compatibilidade do iterador
com campos financeiros/booleanos. Correção do TS2322 revisada no Harness.

Confirmar usa submit oficial e `onInvalid` para foco; mensagens de negócio são
distintas da resolução da Promise e rascunhos permanecem após erro/exceção. Anúncio
de sucesso fica em serviço transitório em memória, sem estado do histórico Router.
Modal efetivamente usado pelo recebimento mantém showModal e ciclagem explícita
nos limites de Tab/Shift+Tab após evidência browser de foco em BODY. Foco retorna
ao acionador ou título de Parcelas após quitação, e desmonte descarta sem confirmar.
IDs capturados na abertura não avançam para outras pendências após alteração da fonte.

Referência de verificações: README, subseções incrementais e regressão integrada;
340 testes em 25 arquivos, 52 E2E, 8 E2E da fixture. Geometria/capturas e contrastes
nos dois temas em 1366×768/390×844; zoom nativo 200% é relato manual do solicitante,
sem navegador/versão ou dimensões da janela informados. Limitações e falhas
intermediárias mantidas no registro; Sass e budget inicial de 510,89 kB com aviso
de 500 kB, sem mudar budgets. Não comprova avaliação/aceite da ótica. Sync/archive
não executados; revisão/merge não presumidos.
