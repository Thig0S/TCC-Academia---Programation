# Proposal

## Why

A base técnica já executa e possui automações, mas ainda não permite avaliar a organização do produto. A FASE-003 transforma essa abertura em uma estrutura navegável e visualmente consistente, sem antecipar regras financeiras pendentes.

## What Changes

- Planejar navegação dos quatro módulos: Visão Geral, Vendas, Relatórios e Configurações, com Quitadas como destino interno de Vendas e perfil Administrador explicitamente estático.
- Definir entrada em Visão Geral, acesso direto às rotas, estados ativos, retorno de caminho desconhecido e orientação por teclado/foco.
- Manter identidade e aviso demonstrativo em todos os destinos. Páginas comerciais informarão indisponibilidade, sem vendas, números, busca, formulários ou ações fictícias.
- Definir Configurações como explicação de dados fictícios, estado em memória, perda na recarga e ausência de uso operacional, sem controles fictícios.
- Definir temas claro/escuro com escuro inicial, alternância acessível e estado somente em memória, consistente entre rotas e descartado na recarga.
- Evoluir o contrato da abertura técnica: identidade global e título específico por página substituem a exigência de nome do produto como único título principal. Preservar aviso, idioma e isolamento.
- Conciliar PRD 1.1 e TDD 1.4 antes das deltas: PEN-006 resolvida documentalmente; HIP-004 aceita somente para o conteúdo explicativo. PEN-012 continua aberta para filtros de Quitadas.

**Fora do escopo:** FASE-004 a FASE-008, domínio e dados comerciais, consultas efetivas, filtros, indicadores, cadastro, edição, recebimento, modal, exportação, persistência, login, backend e Tauri. Não incorporar imagens não versionadas ou decidir regras financeiras.

## Capabilities

### New Capabilities

- `navegacao-aplicacao`: orientação entre módulos e Quitadas, retorno de rotas desconhecidas, páginas iniciais honestas, Configurações explicativa e acesso por teclado.
- `temas-visuais`: aparência clara/escura global, controle acessível, estado de sessão e restauração do padrão na recarga.

### Modified Capabilities

- `demonstracao-inicial`: adaptar identidade, leitura e reabertura à estrutura navegável, preservando os cenários existentes e as restrições de isolamento.

## Impact

- **Referências:** PRD 1.1, RF-001/011/012, RNF-001/002/003/004/007/008/009/010, CA-001/022/023; TDD 1.4, FASE-003 e DEC-003/006/008/013/014. CA-021 integral depende de mutações futuras.
- **Futuro apply:** raiz e configuração da aplicação, rotas, páginas e componentes efetivamente consumidos, serviço de tema, estilos globais e testes em `frontend/`.
- **Dependência futura:** acrescentar `@angular/router` alinhado ao Angular 22.2.6 existente, após conferir peers. Sem Forms, biblioteca visual extra ou upgrade incidental.
- **Regressão:** testes atuais fixam ausência de botões/links e layout da página técnica; deverão evoluir sem perder monitoramento de erros, idioma, aviso ou inspeção de rede/storage.
- **Entrega atual:** documentação e artefatos de planejamento na branch `feature/fase-003`, para revisão por PR. Nenhum código, manifesto, lockfile ou configuração de execução é alterado. Implementação somente em novo pedido explícito de apply.
