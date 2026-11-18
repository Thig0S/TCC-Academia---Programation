# Proposal

## Why

As consultas já permitem conferir vendas, mas cadastrar, corrigir dados do cliente e simular recebimentos ainda exige comandos internos. A FASE-006 deve tornar esses fluxos utilizáveis pela interface, reaproveitando o núcleo validado e preservando a integridade financeira.

## What Changes

- Entregar cadastro com dados do cliente e da venda, entrada opcional, prévia das parcelas e confirmação explícita.
- Entregar edição exclusivamente de nome, CPF, telefone e descrição, inclusive em quitadas, sem edição financeira ou propagação entre vendas.
- Entregar modal acessível de recebimento integral sequencial, seleção de lote, conferência de valor/data/forma e proteção contra confirmação duplicada.
- Integrar ações funcionais às listas/detalhe, atualizar consultas após sucesso e preservar rascunhos após erros; cancelamento nunca publica alterações.
- Substituir as restrições históricas de UI somente leitura apenas nesses fluxos; conservar busca, paginação, densidade, temas e aviso demonstrativo.
- Planejamento somente nesta solicitação: nenhuma implementação, instalação, execução de avaliação, sync/archive ou PR antecipado.

## Capabilities

### New Capabilities

- `formularios-vendas`: cadastro com prévia e edição restrita, rascunhos, validação, confirmação, resultados e cancelamento acessíveis.

### Modified Capabilities

- `recebimentos-parcelas`: acrescentar o fluxo visual de lote e seu modal acessível sobre as regras financeiras existentes.
- `consulta-vendas`: permitir acesso às mutações implementadas e manter consultas sem efeitos colaterais.
- `estado-demonstrativo`: permitir comandos pela UI, mantendo atomicidade, fonte única e descarte da sessão.
- `navegacao-aplicacao`: incluir destinos de cadastro/edição no contexto de Vendas e manter indisponibilidade honesta somente dos conteúdos futuros.

## Impact

- Base: PRD `docs/prd/vendas-em-aberto.md` 1.8, RF-004/005/006/007/008/011, RN-011 a RN-023, CA-006 a CA-014/016/017/018/021/024/027/028/030; TDD `docs/tdd/tdd.md` 1.12, DEC-004/005/007/010/015/016/018/019 e FASE-006. Reutilizados sem novas regras de produto ou arquitetura.
- Dependência entregue: PR #14 integrado em `9fdd455`, validadores, seed e edição interna; nenhuma dessas funcionalidades deve ser recriada como entrega pendente.
- Áreas futuras: rotas, páginas de cadastro/edição, componentes de identificação, tabela/listas/detalhe, modal compartilhado e fluxo de parcelas; adaptadores puros para rascunhos/prévia e testes associados.
- Dependência proposta: `@angular/forms` no mesmo patch 22.2.6 da base, com manifesto/lockfile alterados somente no apply e após verificar compatibilidade. Sem troca de framework, plugins Bootstrap, persistência ou serviço externo.
- Fora do escopo: indicadores e Relatórios da FASE-007, infraestrutura operacional, edição financeira, exclusão, pagamentos parciais/excedentes, juros, descontos, estorno, exportação e aceite da ótica. PEN-013/014 e HIP-006 continuam abertos em seus recortes de avaliação.
- Um único PR da Change somente após implementação autorizada e todas as verificações aplicáveis. Artefatos prontos não autorizam apply nem comprovam conclusão da fase.
