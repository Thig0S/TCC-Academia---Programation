# Proposal

> Acompanhamento em 18/11/2026: o PR #13 foi integrado somente com planejamento.
> Novo pedido explícito de apply autorizou as tarefas internas desta Change em
> `feature/edicao-identificacao-vendas`. Validadores, seed e edição interna foram
> implementados/testados; evidências em `frontend/README.md` e `tasks.md`.
> O escopo documental mencionado abaixo é o histórico do PR #13, não restrição ao
> apply posterior. UI da FASE-006, avaliação, sync/archive e merge não foram executados.

## Why

PEN-008 e PEN-010 impediam definir edição e identificação sem inventar regras. O solicitante resolveu esses limites e definiu seu ambiente de avaliação, mantendo metas e autoridade de aceite em discussão; é necessário registrar as decisões antes de qualquer implementação.

## What Changes

- Planejar edição interna somente de nome, CPF, telefone e descrição de qualquer venda, inclusive quitada, sem propagar para outras vendas ou editar finanças/data da venda.
- **BREAKING** para futuros comandos de cadastro/edição: exigir CPF com 11 dígitos e verificadores válidos, rejeitando sequências repetidas; telefone BR de 10/11 dígitos incluindo DDD, sem +55, lista de DDDs ou prefixos. Sem unicidade ou serviços externos.
- Planejar para a FASE-006 a substituição dos marcadores do seed por números sintéticos compatíveis, preservando 12 vendas, IDs e regras financeiras/temporais; adequar a exigência conflitante de marcadores na busca.
- Registrar no PRD/TDD o ambiente do solicitante: i7-1165G7, 16 GB RAM, gráfica informada 128 MB, SSD 954 GB; Windows 11 Home build 26200, Chrome, tela 1920×1080, escala Windows 125%, zoom Chrome 100%. Versão Chrome, viewport CSS útil e medições serão registrados na execução.
- Preservar PEN-014 e HIP-006/MET para discussão: participação prevista do solicitante/equipe não define papéis, autoridade, consentimento, metas ou aceite; entrevistas reconstruídas ainda requerem confirmação.

## Capabilities

### New Capabilities

Nenhuma; reutilizar os limites existentes.

### Modified Capabilities

- `dominio-vendas`: identificação validada e edição restrita dos dados de cliente, sem edição financeira em qualquer situação.
- `estado-demonstrativo`: seed com identificações compatíveis e comandos internos de edição atômicos/refletidos na fonte única, sem antecipar UI comercial.
- `consulta-vendas`: retirar a obrigação de manter CPF-DEMO/TEL-DEMO no seed, preservando a busca parcial por nome/dígitos e data exata.

## Impact

- Planejamento aprovado: PRD 1.8/FON-011, RF-004/006, RN-021/022/023, CA-007/012/016/017/030; TDD 1.12/FON-023/DEC-019 e roadmap FASE-006/008.
- Observado: validação atual só exige presença; serviço tem cadastro/recebimento, sem edição; seed e testes usam marcadores. Futuro impacto em `venda.modelos.ts`, `venda.validacoes.ts`, serviço/seed, testes unitários/integração/busca e E2E dependentes desses dados.
- Escopo desta entrega no PR #13: PRD, TDD, README e artefatos de planejamento. Nenhuma implementação, alteração do seed, dependência, rota, formulário, sync de specs principais, archive ou avaliação; tasks futuras ficam desmarcadas. Não é proposta de toda a UI da FASE-006. Novo pedido é necessário antes do apply; revisão documental não autoriza merge.
