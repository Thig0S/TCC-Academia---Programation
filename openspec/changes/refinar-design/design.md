# Design

## Context

Ver motivação e limites em `proposal.md`. Este desenho é necessário por atingir todas as funcionalidades, componentes compartilhados e estilos, mesmo sem mudar arquitetura.

### Fontes e rastreabilidade

| Fonte | Aplicação nesta Change |
| --- | --- |
| `docs/prd/vendas-em-aberto.md`, RNF-002/003/007/009 e CA-016/017/018/022/023/027/028/029/031/032 | Reutilizados para acessibilidade, coerência visual, preservação funcional, densidade e cadastro lateral. Não introduzir nova regra comercial. |
| `docs/tdd/tdd.md`, DEC-006/008/018/020/021/022/023/024/025/026 | Reutilizar temas, testes, consulta compacta, resumos, Tailwind, tabelas, ausência de aviso global, prévia lateral e entrada como primeira parcela. |
| `openspec/specs/temas-visuais/spec.md` completo | A delta acrescenta critérios de apresentação sem remover cenários nem modificar a lateral. |
| `frontend/src/app/app.routes.ts`, templates de todas as páginas, `app.html`, `app.css`, `src/styles.css` | Inventário real de destinos, composição e tokens; não assumir páginas apenas pelo README histórico. |
| `frontend/package.json`, `angular.json`, configurações Playwright e testes E2E existentes | Ferramentas e comandos já presentes; não atualizar versões ou budgets. |
| Skill `impeccable-design-polish`, fornecida na solicitação | Auditoria antes da edição, poucas correções decisivas, preservação de marca/conteúdo, acessibilidade e QA de apresentação. A fronteira de planejamento prevalece sobre sua orientação de editar o artefato. |
| Context7 `/tailwindlabs/tailwindcss.com`, documentação de overflow, responsividade e estados, consultada em 22/11/2026 | Confirma `min-w-0`, `overflow-x-auto` e variantes responsivas/movimento reduzido; não comprova execução no patch instalado. |

PRD e TDD foram considerados antes da criação dos artefatos SDD. Seus registros datados de ausência de implementação são históricos: fonte atual contém Tailwind e entrada como parcela. Não corrigir todo o histórico nesta Change. Os critérios novos são detalhamento visual dos requisitos existentes, não uma mudança de produto que exija novos IDs de PRD ou decisões arquiteturais.

### Auditoria inicial e limites da evidência

Inspeção em 22/11/2026, sem editar código:

| Área | Observado na fonte | Intervenção planejada |
| --- | --- | --- |
| Estrutura compartilhada | Lateral de 260 px a partir de `md`; cabeçalho e tokens próprios; conteúdo com padding de 12 px | Preservar lateral e fonte global; organizar espaçamentos do conteúdo sem alterar a grade estrutural. |
| Visão Geral | Quatro indicadores e três resumos reais; distância `mb-2` entre conjuntos, títulos e descrições com pesos próximos | Clarificar separação entre indicadores e listas e alinhar metadados; preservar os sete blocos e seus recortes. |
| Vendas/Quitadas | Contagem com `ms-2` nas abertas, sem equivalente em Quitadas; Nova venda combina `text-white` e `text-text`; tabelas herdam alinhamento à esquerda | Unificar recuos de contagem/rodapé, resolver conflito de texto da ação, alinhar colunas monetárias. |
| Detalhe | Resumo compacto com regras locais, `!important`, `::ng-deep` e margem negativa; mensagens de sucesso são parágrafos simples | Melhorar peso visual de saldo/receber e feedback; não reescrever indiscriminadamente o CSS que garante dez parcelas. |
| Nova venda | Duas colunas `md`, campos compactos, prévia com tabela própria; identificação carrega `mb-3` dentro de uma grade com `gap-3` | Harmonizar espaço entre grupos e ações sem remover campos ou mudar breakpoint, cálculo e validação. |
| Edição/recebimento | Campos e ações repetem classes; mensagens gerais sem superfície própria; modal nativo com rolagem | Padronizar apresentação de erros/resultados e ações, manter rascunho e ciclo de foco. |
| Relatórios | Quatro tabelas de 18 px; cabeçalhos, captions e descrições com alinhamentos diferentes; seções com `mb-1` | Organizar ritmo vertical e alinhamento financeiro, preservando captions, totais e conteúdo. |
| Configurações e ausências | Quatro explicações em `dl`; telas ausentes com um painel e retorno | Melhorar leitura e recuos; não preencher o espaço livre com novos controles ou decoração. |

O servidor em 4200 já estava ativo: `npm.cmd start` encerrou com porta ocupada. A navegação exploratória usou esse servidor, sem encerrá-lo e sem garantir isolamento/identidade de build. Foram visitadas todas as rotas de página, detalhe/edição de uma venda e modal com cancelamento, em cenários desktop/estreitos. A captura desktop da Visão Geral foi inspecionada visualmente. Não houve mutação financeira. As medições exploratórias das páginas visitadas não mostraram overflow horizontal global; não são uma regressão automatizada completa. Alternância clara foi confirmada aguardando `data-tema=light` no cadastro estreito; leituras imediatas após clique em outros percursos não confirmaram a troca e não comprovam cobertura dos dois temas.

Capturas exploratórias locais em `.playwright-mcp/` não são baseline versionada nem prova de aceite. No apply, produzir baseline reproduzível com referência/fixtures determinísticas e esperar a renderização do tema antes de medir. Build, suítes de teste, contraste completo, estados de falha, fronteiras responsivas e zoom nativo não foram executados nesta proposta.

## Goals / Non-Goals

**Goals:**

- Concretizar a delta de `temas-visuais` com intervenções pequenas na camada de apresentação, rastreadas à auditoria acima.
- Cobrir todas as páginas e estados, admitindo preservação sem edição de uma superfície já adequada, com justificativa registrada.
- Evitar regressões funcionais e de geometria e comparar antes/depois com dados e tema controlados.

**Non-Goals:**

- Não criar design system genérico, componente universal de tabela, nova store ou dependência.
- Não tocar em cálculos, seed, serviço demonstrativo, rotas ou bindings/validadores Signal Forms; dados de teste sintéticos adicionais pertencem somente às fixtures.
- Não igualar telas pixel a pixel aos exemplos, mudar logo/lateral, fonte global ou reproduzir controles ausentes dos HTMLs de referência.

## Decisions

### D1 — Polimento incremental com os tokens existentes

Usar Tailwind literal nos templates e CSS local apenas para composição específica, conforme DEC-021. Reutilizar superfícies, cores semânticas, foco e proteção de movimento reduzido de `styles.css`. Preservar fonte, dimensões e tokens da lateral; qualquer ajuste de conteúdo fica escopado ao conteúdo ou componente pertinente.

Manter cantos e sombras discretos já existentes. O ritmo proposto usa passos de 4/8/12/16 px, diferenciando intervalo interno de separação de seções; os contratos compactos têm precedência sobre aplicar a mesma distância em todas as páginas. Não adicionar animação nesta Change: hover e foco bastam para feedback.

Alternativas: redesign amplo e kit de componentes trariam risco e churn sem necessidade; seletores globais de `button`, `p`, `table` ou `fieldset` poderiam alterar lateral/fixture. Preferir mudanças locais e extrair apenas padrões realmente repetidos, sem abstrações novas por antecipação.

### D2 — Priorizar leitura financeira e coerência das ações

Aplicar `text-right tabular-nums` aos valores monetários e `text-right` aos cabeçalhos correspondentes em `tabela-vendas.html`, parcelas do detalhe, prévia e quatro tabelas de Relatórios. Não mudar texto, formatação monetária, ordem ou semântica. Preservar 18/20 px e paddings contratados nas tabelas operacionais/Relatórios; a prévia continua com sua escala própria.

Uniformizar ação principal vermelha/texto branco com foco e contraste comprovados; eliminar a combinação concorrente `text-white text-text` de Nova venda. Manter âncora de navegação, em vez de convertê-la em botão. Receber deve se distinguir de retornos sem criar ação para venda quitada. Cancelar, limpar e links de retorno continuam secundários e funcionais.

Alternativa: destacar todos os números/controles em vermelho eliminaria hierarquia e confundiria identidade com atraso. Usar vermelho de identidade para ação, cores semânticas existentes para situação, texto e peso para distinguir significado.

### D3 — Melhorar mensagens sem mudar estado ou anúncios

Estilizar mensagens existentes com superfície/borda/espaço adequados, mantendo `role=status`, `role=alert`, texto, `aria-describedby` e ligação aos campos. Evitar um painel visual vazio quando a mensagem estiver vazia, sem remover o mecanismo necessário ao anúncio. Não adicionar toast, confirmação intermediária ou ícone decorativo obrigatório.

Distinguir erro geral de erro de campo e sucesso; não simular envio ou sucesso visualmente. Conservar prévia inválida, coleção vazia, pesquisa sem resultados e registro ausente como contextos distintos. Cobrir erros/retry por mecanismos de teste existentes, sem expor controles novos na UI.

Alternativa: um serviço global de notificações exigiria alterar fluxos e ciclo de foco; desnecessário para corrigir apresentação.

### D4 — Resiliência sem enfraquecer densidade e sem redesenhar lateral

Verificar grades/flex com `min-w-0`, colunas `minmax(0,...)`, quebra de textos e regiões `overflow-x-auto` identificadas. Corrigir apenas pontos comprovados pela medição; não aplicar `overflow-x:hidden` ao documento para esconder defeitos. Não reduzir fonte nem eliminar campos para caber.

Cadastro mantém 768 px e container queries atuais. Edição mantém seus quatro campos, recebimento continua `dialog` nativo e detalhe preserva composição compacta e excedente interno. Relatórios e formulários podem rolar verticalmente; o requisito de dez linhas/dez parcelas não se estende a eles. A lateral responsiva existente pode ocupar espaço em telas pequenas; esta Change não cria menu recolhível.

Alternativa: ocultar colunas, transformar todas as tabelas em cartões ou mudar breakpoint do cadastro violaria contratos aprovados. Textos longos e zoom admitem reorganização/rolagem, não truncamento sem acesso ao conteúdo.

### D5 — Verificação proporcional e evidência antes/depois

Estender os testes existentes, sobretudo `frontend/e2e/refinamento-visual.spec.ts`. Manter assertions de valores, foco, contraste e geometria; atualizar expectativas puramente cosméticas apenas quando a nova apresentação justificar, sem relaxar dimensões, contagens ou semântica contratuais. Testes com `fontFamily` igual à lateral continuam válidos pois a fonte global não muda.

| Cobertura | Método e aceite |
| --- | --- |
| Todos os destinos | Capturas antes/depois em 1366×768 e 390×844, nos dois temas, incluindo modal, inexistências e cadastro válido/inválido. Mesma referência e dados. |
| Valores e tabelas | Estilos computados de alinhamento, `font-variant-numeric`, fonte/line-height/padding; conferir valores de magnitudes diferentes. |
| Densidade | Fixture com 10 vendas nas duas coleções, até 10 parcelas e excedente; tabela/paginação visíveis em desktop e excedente rolável. Seed de 12 não substitui fixture paginada. |
| Responsividade | Medir largura de documento versus viewport em 390, 767, 768, 1024 e 1366 px, nos dois temas, todas as páginas e modal. Textos sintéticos extensos e valores grandes nas fixtures; controles e erros alcançáveis. |
| Estados | Coleções vazias, filtro sem resultado, campos inválidos, prévia válida/inválida, sucesso, falha/retry, envio indisponível, cancelamento e Escape. Manter as diferenças e efeitos de cada estado. |
| Acessibilidade | Teclado/Shift+Tab, foco, modal/retorno, contraste normal/hover/foco/disabled pertinentes, região de rolagem, reduzido movimento e sem dependência exclusiva da cor. |
| Zoom | Verificação manual de zoom nativo 200% nos dois temas para todos os destinos/modal. Registrar navegador/versão, viewport útil e limitações; emulação CSS não substitui. |
| Regressão funcional | Consulta/filtros/paginação, cadastro com entrada parcela 1, edição só do cliente, recebimento sequencial/quitação, resumos e recarga sem persistência. |

Comandos existentes a executar apenas no apply, em `frontend/`: `npm.cmd test -- --watch=false`, `npm.cmd run build`, `npx.cmd ng run vendas-em-aberto:build-paginacao-fixture`, `npm.cmd run test:e2e`, `npm.cmd run test:e2e:paginacao-fixture` e `npm.cmd run format:check`. O `webServer` dos E2E não reutiliza servidor existente: usar portas livres em ambiente controlado e não encerrar processo alheio. Registrar avisos e falhas reais, sem aumentar budgets para mascará-los.

Alternativa: confiar apenas em screenshots pode perder acessibilidade e regras financeiras; confiar só em estilos computados não identifica uma hierarquia ruim. Combinar medições com inspeção visual.

## Risks / Trade-offs

- [Estilos compartilhados alterarem a lateral] → Escopo local; comparar capturas e estilos da lateral antes/depois nos dois temas/viewports.
- [Espaçamento maior quebrar CA-028] → Ajustar por contexto e medir fixtures durante cada entrega, não apenas ao final; se houver conflito real insolúvel, pausar para revisão PRD → TDD → SDD.
- [Classes concorrentes esconderem mudança] → Conferir estilos computados e contraste da ação, não a ordem das classes no atributo.
- [CSS legado do detalhe causar regressão] → Evitar limpeza ampla; editar somente o necessário com verificação de dez parcelas e textos extensos.
- [Capturas instáveis por data/tema] → Referência fixa, dados sintéticos e espera explícita de renderização; não inferir alternância pelo clique.
- [Melhoria estética confundida com aceite] → Separar comparação técnica, relato manual e aprovação da ótica; pendências globais de avaliação permanecem.
- [Mais cenários aumentarem a suíte] → Reutilizar fixtures/helpers existentes e agrupar verificações sem remover cobertura contratual.

## Migration Plan

### Roadmap de implementação

Todas as fases estão **planejadas e não implementadas**; exigem revisão destes artefatos e novo pedido explícito de apply. IDs abaixo são locais desta Change, não renumeração do roadmap central do TDD.

| Fase | Entrega e dependência | Conclusão verificável |
| --- | --- | --- |
| RD-01 — Linha de base | Registrar capturas/medidas determinísticas e matriz de destinos/estados usando a auditoria já realizada | Baseline comparável e contratos preservados identificados, sem investigação genérica pendente |
| RD-02 — Apresentação comum e consultas | Após RD-01: ações/mensagens compartilhadas, recuos de listas/paginação, alinhamento monetário de listas e detalhe | Testes afetados, contraste/foco, densidade de dez e lateral equivalente; commit coerente da funcionalidade |
| RD-03 — Formulários e recebimento | Após RD-02: cadastro/prévia, edição, modal e estados de validação | Campos/rascunhos/regra da entrada preservados, 767/768 e erro/retry/cancelamento/foco verificados; commit próprio |
| RD-04 — Leitura gerencial e estados auxiliares | Após RD-02: Visão Geral, Relatórios, Configurações e inexistências | Valores/dados/recortes mantidos; todas as superfícies auditadas, mudanças ou preservação justificadas; commits por funcionalidade |
| RD-05 — QA e entrega integral | Após RD-03/04: matriz completa, regressão, zoom e documentação real | Comandos e limitações registrados, critérios atendidos e todas as tarefas concluídas antes do PR único |

RD-03 e RD-04 são independentes depois da estabilização dos padrões comuns, mas não requerem subagentes nem PRs separados. Testes e documentação de cada funcionalidade acompanham seu commit, conforme `AGENTS.md`. Não acumular tudo em um commit final.

Sem migração de dados ou implantação: é uma SPA demonstrativa com estilos atualizados. Em regressão, reverter apenas commits próprios de apresentação pelo fluxo normal da feature, preservando trabalho alheio; não executar reset destrutivo. Não há flag ou fallback novo.

Abrir um único PR para `main`, com `.github/pull_request_template.md`, somente após implementar e verificar o escopo integral autorizado. Esta etapa de proposta não abre PR, não sincroniza specs e não arquiva a Change. Merge continua dependente de autorização explícita.
