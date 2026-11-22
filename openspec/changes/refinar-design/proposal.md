# Proposal

## Why

A interface já possui identidade e fluxos completos, mas ainda apresenta desalinhamentos entre consultas, valores financeiros pouco comparáveis e mensagens com acabamento desigual. Refinar o que existe, pela abordagem de auditoria e polimento da skill `impeccable-design-polish`, melhora a leitura sem reiniciar o projeto nem mudar suas regras.

## What Changes

- Refinar hierarquia, ritmo de espaçamento e alinhamentos em Visão Geral, Vendas, Quitadas, Nova venda, detalhe, edição, recebimento, Relatórios, Configurações e páginas/registro ausentes.
- Uniformizar alinhamento à direita e algarismos tabulares nas colunas monetárias, mantendo datas, situações e identificação distinguíveis.
- Tornar ações primárias, secundárias e mensagens existentes visualmente consistentes; corrigir conflitos de classes e espaçamentos sem alterar textos, eventos ou regras.
- Fortalecer adaptação a larguras intermediárias, telas estreitas, textos extensos e zoom, preservando foco, contraste e movimento reduzido.
- Comparar antes/depois de todas as superfícies, incluindo estados vazios, erros e modal. Preservar lateral, logo, temas e contratos compactos já aprovados.
- Reutilizar o PRD e o TDD existentes: o escopo é o acabamento previsto em RNF-002/003/007/009, RF-001 a RF-012, CA-016/017/018/022/023/027/028/029/031/032 e DEC-006/008/018/020/021/022/023/024/025/026. Nenhuma regra de produto ou arquitetura nova exige revisão desses documentos.

Fora do escopo: redesign da marca ou lateral, novos módulos, gráficos, filtros, controles fictícios, alterações financeiras, persistência, backend, bibliotecas, migração de framework, animação decorativa e modificação dos dados sintéticos. Não remover os três resumos úteis da Visão Geral por uma regra estética genérica.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `temas-visuais`: explicitar critérios observáveis de alinhamento financeiro, hierarquia de ações/mensagens e cobertura responsiva do polimento transversal, complementando os requisitos existentes sem substituir seus contratos.

## Impact

- Implementação futura limitada à apresentação em `frontend/src/styles.css`, `frontend/src/app/app.css`, componentes compartilhados e templates/estilos das funcionalidades; TypeScript apenas se estritamente necessário para semântica de apresentação, sem alterar domínio, serviço, rotas ou Signal Forms.
- Estender verificações em `frontend/e2e/refinamento-visual.spec.ts`, `acessibilidade-formularios.spec.ts`, `formularios-vendas.spec.ts`, `demonstracao-inicial.spec.ts`, fixture de paginação e testes de componentes pertinentes. Registrar resultados reais em `frontend/README.md` durante o apply, não nesta proposta.
- Sem novas dependências, APIs, fontes remotas ou alteração de budgets. Reutilizar Angular 22.2.6 e Tailwind 4.3.5 observados no manifesto.
- Planejamento na branch `feature/refinar-design`, criada de `origion/main` atualizada (`ebe203e`), inicialmente limpa. Esta solicitação autoriza somente os artefatos; tarefas de implementação permanecem desmarcadas. Revisão e apply explícito são necessários; nenhum PR antecipado ou merge está autorizado.
