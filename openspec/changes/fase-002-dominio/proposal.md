# Proposal

## Why

A fase 001 já entregou a fundação técnica, mas suas camadas de negócio estão vazias
por desenho. O próximo passo é consolidar as regras vigentes em domínio C# puro e
testável, antes de expor operações ou introduzir persistência.

## What Changes

- Planejar domínio completo confirmado no Harness: identificação por venda,
  valores/datas, cadastro/entrada, edição restrita, baixa/correção individual,
  status e projeções financeiras por conjunto/período/mês.
- Preservar regras do protótipo, com centavos seguros, referência explícita,
  operações imutáveis e falhas de domínio tipadas; sem dependências de aplicação.
- Distinguir entrada, individual e histórico em lote; reconstruir apenas históricos
  sintéticos válidos para testes/consulta, sem autorizar importação ou nova baixa em lote.
- Adicionar futuramente MSTest e catálogo rastreável de paridade, protegendo
  isolamento de coleções, estado original e reconciliação financeira.
- Atualizar primeiro PRD/FON-040/RF-023/CA-046–048 e TDD/DEC-037 e registrar a
  avaliação da base. Criar planejamento nesta solicitação, não código.

## Capabilities

### New Capabilities

Nenhuma. O núcleo financeiro pertence à capability já existente.

### Modified Capabilities

- `dominio-vendas`: acrescentar contrato de execução independente em C#, operações
  imutáveis, reconstrução histórica validada, falhas tipadas e paridade verificável,
  sem substituir requisitos demonstrativos ou apresentação de outras capabilities.

## Impact

No apply futuro: `backend/src/VendasEmAberto.Dominio/`, referência direta de
UnitTests ao domínio, testes em `backend/tests/VendasEmAberto.UnitTests/Dominio/`
e documentação de evidências no README. Preservar grafo, .NET 10, MSTest, lockfiles,
host loopback e `/health`; sem pacotes novos de produção ou mudanças HTTP públicas.

Fora: Aplicacao/handlers/MediatR/FluentResults, ORM/banco/migrations, repositórios,
autenticação, IPC/Tauri, backup, CI, frontend/seed/dashboard visual, planilha real e
homologação operacional. Licenças futuras de MediatR não bloqueiam esta biblioteca
sem essa dependência. Não há breaking change do protótipo ou de `/health`.

Base avaliada: fontes/testes existentes e `backend/README.md` (24 testes aprovados
registrados, não reexecutados). Preâmbulos antigos ainda dizem “planejamento”; não
interpretar isso como ausência da fase 001 nem reabrir sua implementação.
Um único PR somente após apply explicitamente solicitado e conclusão integral da
Change; planejamento pronto não autoriza PR antecipado.
