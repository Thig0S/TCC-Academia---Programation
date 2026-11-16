# Design

## Context

Motivação e recorte: `proposal.md`. Base normativa: PRD 1.5, RN-018/019 e CA-026;
TDD 1.9, DEC-017 e roadmap FASE-005. A escrita deste desenho não autoriza código.

Design necessário: mudança transversal de listas, detalhe, Router e testes; IDs com
barras e migração dos contratos de indisponibilidade exigem decisões antes do apply.

Observado em 16/11/2026:
- `ServicoDemonstracao` já expõe `abertas`, `quitadas`, `resumo`, `referencia` e
  `consultarVenda(id)`, sem providers por página. App já inicializa a fonte na abertura.
- `ProjecaoVenda` contém saldo/pago, contagem, situação, próximo vencimento e parcelas
  com data/forma; não há necessidade de um segundo modelo financeiro canônico.
- IDs do seed são `seed/venda/1` e os novos internos usam `sessao/venda/1`.
  CPF/telefone são marcadores `CPF-DEMO-1`/`TEL-DEMO-1`; não devem virar dados plausíveis.
- Páginas de Vendas/Quitadas são placeholders. Não existem detalhe e busca; rotas
  estáticas usam lazy components, com wildcard final, e App gerencia foco no h1.
- `conteudo.spec.ts` e o E2E inicial proíbem campos/tabelas nas quatro páginas
  comerciais. São testes corretos para a FASE-004, mas precisam evoluir em Vendas.
- Angular/Router 22.2.6, Bootstrap 5.3.9, TypeScript 6.0.3, Vitest 5.1.0 e
  Playwright 1.65.0 fixados; não há `@angular/forms`, nem motivo para instalá-lo
  para um campo nativo de pesquisa. Formulários de negócio permanecem na FASE-006.
- PR #7 mesclado na main. Evidências anteriores: 156 testes/26 E2E e build aprovados;
  não são execução desta Change. A 004 continua ativa e não será modificada aqui.

## Goals / Non-Goals

**Goals:**
- Derivar UI de leitura da mesma fonte, com pesquisa pura e estado de interação local.
- Preservar ID opaco, reatividade na reutilização do detalhe, foco e ausência explícita.
- Compartilhar somente elementos de apresentação com consumidores reais.
- Migrar testes de indisponibilidade sem perder os controles de privacidade/temas.

**Non-Goals:**
- Não mudar regras financeiras, seed, IDs, comandos, política de edição ou identificação.
- Não manter filtros na URL/storage ou prometer preservação após sair da página.
- Não introduzir store, biblioteca de tabela, Forms, carregamento artificial, HTTP,
  backend, persistência, hooks de teste ou mutações no browser.
- Não concluir CA de cadastro/recebimento, CA-021 completo ou aceite da ótica.

## Decisions

### 1. Fonte raiz e projeções readonly — DEC-004/017

Páginas injetam a instância existente de `ServicoDemonstracao`. Listas escolhem
`abertas()` ou `quitadas()`; resumo lê exclusivamente `resumo()`. A busca não recebe
ou altera o resumo. Detalhe deriva `consultarVenda(id)` e utiliza seus derivados,
sem refazer fórmulas em template nem copiar vendas entre coleções.

Alternativas rejeitadas: dados estáticos por página, serviço por rota, totais de
coleção filtrada ou effects sincronizando saldo. São fontes de divergência e
contrariam o núcleo já entregue. Um comando interno de teste pode comprovar
reatividade, mas páginas não o chamam e produção não oferece acesso global.

```text
ServicoDemonstracao (raiz, existente)
  |-- abertas --> Lista abertas --> busca pura --> tabela
  |-- quitadas -> Lista quitadas -> busca pura --> tabela
  |-- resumo ----------------------------------> cartoes em Vendas
  |-- consultarVenda(id) -----------------------> detalhe + parcelas
  +-- referencia ------------------------------> todas as consultas
```

### 2. Pesquisa pura e estado local — PRD/RN-018/019

Acrescentar `venda.busca.ts` junto ao domínio de vendas, sem Angular. Entrada:
coleção readonly de projeções e termo. Saída: coleção filtrada na ordem de origem.
Não ordenar, mutar, escrever na fonte ou interpretar múltiplos campos separados.

Ordem de interpretação:
1. Remover espaços externos. Vazio ou só espaços restaura a coleção atual.
2. Se corresponder a DD/MM/AAAA completo, reorganizar para AAAA-MM-DD e validar
   com `interpretarDataCivil`; só comparar `dataVenda`. Inválida retorna vazio,
   sem fallback por dígitos, normalização automática de dia ou exceção escapando.
3. Nos demais termos, normalizar texto por Unicode, remoção de diacríticos e caixa;
   substring de nome ou marcadores textuais de CPF/telefone constitui correspondência.
4. Consulta composta só por dígitos/pontuação usual (`. - ( ) +` e espaços), com
   pelo menos um dígito, também corresponde à substring dos dígitos de CPF/telefone.
   Não retirar letras de um termo misto para fazê-lo corresponder acidentalmente.

Não há data parcial ou período: `31/01` não filtra por data. Identificação é
pesquisável sem validar checksum ou modificar marcadores existentes. Fixtures de
teste usam números deliberadamente inválidos para CPF, sem dados reais ou persistência.

Páginas mantêm signal de termo e `computed` de resultados. Campo `<input type="search">`
tem `[value]` e evento tipado; não usar `ngModel`, adicionar Forms ou embrulhar em
formulário de negócio. Sem debounce, subscribe manual ou espera fictícia.
Limpar redefine termo e mantém/devolve foco ao campo; contagem usa região anunciável.

Alternativas: AND com controles separados e filtros de período foram oferecidos
e não escolhidos no Harness. Busca global e tokenização alterariam o requisito.

### 3. Composição de listas e detalhes

Destinos propostos, relativos a `frontend/src/app/`:

```text
funcionalidades/vendas/
  venda.busca.ts + venda.busca.spec.ts                  (novos)
  listar-vendas/                                       (evoluir)
  listar-vendas-quitadas/                               (evoluir)
  detalhes-venda/                                      (novo)
  componentes/tabela-vendas/                           (novo, duas listas)
compartilhado/componentes/
  selo-situacao/                                       (novo, listas e parcelas)
app.routes.ts + app.routes.spec.ts                     (evoluir)
funcionalidades/conteudo.spec.ts                        (migrar assertivas afetadas)
```

Campo de busca ou cartão somente será extraído se realmente compartilhado; não criar
arquivos vazios ou uma tabela genérica configurável. Componentes recebem dados e
eventos tipados, sem importar páginas ou modificar estado financeiro. Templates
separados, standalone, OnPush, `@if` e `@for` com `track` por ID estável.

Listas apresentam as colunas da spec. Quitadas não precisa duplicar os quatro
cartões. Vendas os apresenta mesmo sem linhas na pesquisa. Referência aparece em
ambas as listas e no detalhe. Usar `formatarDinheiro`/`formatarDataCivil` existentes,
sem DatePipe sobre string civil ou divisão de valores em float no componente.

Detalhe mostra identificação, descrição preenchida, dados financeiros e entrada
separada (valor/data/forma ou Sem entrada). Todas as parcelas continuam visíveis;
pagas mostram data/forma derivadas, pendentes explicitam ausência. Ausência de
próximo vencimento não vira data zero. Sem ações Editar/Pagar/Nova venda desabilitadas
ou links para rotas que não existem; explicar o recorte somente leitura, se necessário.

### 4. Router e IDs opacos

Registrar `/vendas/:id` depois das rotas estáticas de Vendas e antes do wildcard.
Usar `[routerLink]="['/vendas', venda.id]"`: Router recebe o ID como um segmento
separado e faz serialização, incluindo barras. Não concatenar `/vendas/` + ID,
não mudar ID e não codificar duas vezes. Confirmar round-trip na versão instalada
por RouterTestingHarness e no browser, antes de concluir a integração.

Detalhe observa `ActivatedRoute.paramMap` por `toSignal`, com valor inicial do
snapshot, e consulta derivada; o snapshot não pode ser a única leitura. Isso evita
dados antigos quando Angular reutiliza o componente ao navegar A→B→inexistente.
Não habilitar uma nova estratégia de input binding na configuração global só para
esta tela. Os observables do Router não implicam HTTP.

Um `Resultado` de inexistência mostra Venda não encontrada; não vira lista vazia,
detalhe do registro anterior ou erro de rota. Qualquer ID desconhecido que caiba no
parâmetro, inclusive `cadastrar` sem rota implementada, é ausência de venda; caminhos
fora dos padrões continuam no wildcard. Links explícitos a Vendas e Quitadas são
estáveis mesmo em acesso direto. Termo da lista pode reiniciar ao retornar.

Preservar App como dono do foco pós-navegação e atualizar somente o necessário em
seus testes para incluir detalhes. Contexto visual do módulo Vendas continua ativo,
sem aplicar aria-current à lista enquanto o detalhe é a página atual.

Alternativas rejeitadas: ID numérico extraído do namespace, wildcard que absorve
barras, estado de navegação como única identificação ou snapshot fixo. Essas opções
perdem identidade, quebram endereço direto ou não acompanham navegações.

Documentação consultada via Context7 `/websites/angular_dev`: Router/createUrlTree,
Signals, leitura do estado de rota e toSignal em 16/11/2026. Confirma os padrões,
não o comportamento executado do patch 22.2.6; os testes locais continuam obrigatórios.

### 5. Estilos, foco e apresentação acessível

Reutilizar Bootstrap 5.3.9 já instalado, somente estilos, tokens dos dois temas e
SCSS pontual. Não refazer a lateral/logo, adicionar plugins JS ou pacote de ícones.
Tabela semântica com caption, th/scope, dinheiro alinhado e link de cliente; Visualizar
nomeia a venda. Selo sempre tem texto, com contraste no fundo real, não só cor.

Busca com rótulo visível, descrição do formato de data e ação Limpar nomeada. Região
de status anuncia contagem/nenhum resultado sem forçar foco a cada tecla. Região de
rolagem da tabela, se necessária, recebe nome e acesso por teclado; apenas ela pode
rolar horizontalmente em 390×844, sem esconder permanentemente Ações. Verificar
1366×768, ambos os temas, foco, movimento reduzido e zoom nativo de 200%.

Estado vazio consulta fonte realmente vazia em teste, sem controles de limpar seed
na aplicação. Em Vendas vazia não oferecer Nova venda sem consumidor implementado.
Não simular rede, sucesso financeiro, skeleton ou modal neste recorte síncrono.

### 6. Verificação por funcionalidade e rastreabilidade

| Área | Verificação planejada | Nível | Referência |
| --- | --- | --- | --- |
| Busca | Acentos/caixa, parcial, dígitos/pontuação, marcadores, termo vazio, pontuação sem dígito, data válida/inválida/extrema, coleção imutável e ordem | Unitário | RN-018/019; CA-004/005/019 |
| Listas/cartões | Coleções separadas, colunas, zero/vazio, referência e cartões globais invariantes à pesquisa | Componente/integração | CA-002/003/014/025/026 |
| Detalhes | Mesmo ID, parcelas pagas/pendentes, entrada ausente/presente, nulls, nomes semelhantes, nenhuma mutação | Componente/integração | CA-010/020/026 |
| Rotas | ID com barras round-trip, endereço direto/recarga, A→B→ausente, contexto ativo, foco e retornos | Harness + E2E | CA-001/018/026 |
| Reatividade | Um cadastro/lote aceito por comando interno de teste atualiza listas/detalhe/cartões sem forçar detecção | TestBed/whenStable | DEC-004/017; CA-014/025 |
| Consulta pelo browser | Nome e identificação do seed, data lida da UI, limpar, separar coleções e conferir detalhe/retorno | E2E dois viewports | CA-004/005/010/019/026 |
| Acessibilidade | Rótulos, teclado, foco, selos/tabela/campo nos dois temas, região de rolagem, zoom 200% | E2E + manual | RNF-002/003/007/009 |
| Limites | Indisponibilidade só nas páginas restantes; rede local, sem storage/console inesperado/mutações e regressão financeira | E2E + suíte existente | RF-011; RNF-004/010 |

Fixar referência por provider somente nos testes de componentes. E2E usa a sessão
real e lê datas/linhas existentes, sem congelar o seed em data fixa, expor hooks ou
chamar serviços via window. Vazio e reatividade após mutação são comprovados com
TestBed, não falsamente atribuídos ao E2E enquanto não houver comandos visíveis.

Executar formatação/build/testes aplicáveis antes de cada commit funcional; atualizar
README e tarefas com resultados reais e limitações. Regressão final com instalação
limpa, scripts existentes e OpenSpec estrito, sem presumir 156/26 como contagem nova.
Nenhum percentual de cobertura, meta de desempenho ou aceite é inferido.

## Risks / Trade-offs

- IDs com barras ou detalhe obsoleto → testes de round-trip, recarga e reutilização;
  se a abordagem falhar, revisar DEC-017 antes de contornar o problema.
- Pesquisa numérica vazia corresponder a tudo → exigir dígitos e dar precedência
  exclusiva à data completa; testar marcador sintético e pontuação isolada.
- Cartões ou detalhes divergirem → consumir projeções canônicas, testar comparações
  em centavos e reatividade sem cópias financeiras.
- Migração enfraquecer regressão → preservar testes de indisponibilidade em Visão
  Geral/Relatórios e todas as verificações de Configurações/temas/rede/storage.
- Perda do termo ao retornar → aceita como limite de estado local; sem persistência
  ou URL de filtros. Ordem permanece a da fonte, sem ordenação/paginação nova.
- Bootstrap padrão não garantir contraste de selo → medir cores efetivas de todos
  os estados em ambos os temas, sem alegar certificação de acessibilidade.
- UI não representar estados sintéticos impossíveis nas bordas do calendário →
  manter política da FASE-004 e usar fixtures explícitas nos testes, não alterar seed.
- Specs da 004 ainda não consolidadas → preservar sua Change e registrar que a
  restrição de ausência de UI era daquela fase. Futuro sync deverá manter a evolução
  temporal, sem sobrescrever os requisitos novos; arquivamento permanece fora daqui.

## Migration Plan

1. Planejamento: PRD 1.5 → TDD 1.9 → esta Change; validar e apresentar artefatos
   completos para revisão. Não abrir PR ou iniciar código nesta etapa.
2. Após novo apply autorizado, manter `feature/fase-005`, revalidar base/estado e
   executar grupos de tarefas em ordem. Busca pura antecede listas; detalhe e
   migração de navegação antecedem a regressão integrada.
3. Substituir asserts de indisponibilidade de Vendas/Quitadas por testes de consulta;
   preservar os das páginas não entregues, o aviso, a sessão e todos os contratos
   de domínio existentes. Nenhuma migração de dados, API ou versão é necessária.
4. Registrar verificações por funcionalidade, commits separados e evidências; abrir
   o único PR para main apenas com todo o escopo concluído. Merge exige autorização.
5. Se houver regressão, corrigir na mesma branch antes da entrega; eventual rollback
   de integração deverá ocorrer por PR autorizado, nunca reset destrutivo, descarte
   de trabalho alheio ou push direto na main. Não há dados persistidos a migrar.
