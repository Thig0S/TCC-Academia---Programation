# Proposal

## Why

A FASE-003 entregou a estrutura navegável e os temas, mas as páginas ainda não possuem uma fonte comum de vendas ou cálculos financeiros. O próximo passo é um núcleo demonstrativo consistente, conforme PRD 1.3 e TDD 1.6, para que consultas e mutações futuras não dupliquem saldos ou inventem regras comerciais.

## What Changes

- Planejar modelos de venda, cliente da venda, parcelas, entrada separada e recebimentos com alocações integrais, com dinheiro em centavos e datas civis.
- Aplicar as decisões confirmadas: calendário com último dia do mês afetado, centavos residuais nas primeiras parcelas, entrada recebida na data da venda, situações e resumos globais derivados.
- Definir cadastro por comando interno e liquidação integral de uma ou mais parcelas consecutivas desde a primeira pendente, numa operação atômica. Permitir antecipação; rejeitar saltos, parcialidade, excedente e duplicidade.
- Preparar 12 vendas sintéticas relativas à referência local capturada na abertura, uma única fonte em memória e testes de invariantes, isolamento e integração com navegação.
- Conciliar PRD/TDD com o estado local da FASE-003, preservar IDs e registrar pendências remanescentes. Esta entrega cria somente planejamento; nenhum comando de domínio está implementado.

## Capabilities

### New Capabilities

- `dominio-vendas`: contratos internos, geração e classificação de parcelas, entrada, calendário, centavos e projeções reconciliáveis de vendas.
- `recebimentos-parcelas`: liquidação integral sequencial em lote, elegibilidade, alocações e rejeição atômica sem duplicidade.
- `estado-demonstrativo`: inicialização de sessão, fonte única imutável, dados sintéticos, comandos internos e ciclo de descarte sem persistência.

### Modified Capabilities

Nenhuma. `demonstracao-inicial`, `navegacao-aplicacao` e `temas-visuais` são preservadas; não haverá alteração de seu comportamento visível. Existência de dados internos não transforma as páginas indisponíveis em consultas realizadas.

## Impact

- Planejamento: `docs/prd/vendas-em-aberto.md` 1.3, `docs/tdd/tdd.md` 1.6 e artefatos desta mudança. Rastreabilidade principal: PRD/RN-011 a RN-017, CA-008/009/011/013/014/020/024/025; TDD/FASE-004 e DEC-004/005/008/011/015/016.
- No apply futuro: `frontend/src/app/nucleo/demonstracao/`, domínio em `funcionalidades/vendas/` e `funcionalidades/parcelas/`, inicialização na raiz e testes colocados junto ao código; registro de evidências no README do frontend.
- Sem nova dependência, upgrade, Forms, modal, rota, lista, busca, filtro, indicador visível, edição, backend, HTTP, banco, persistência, autenticação, Tauri ou exportação.
- Busca, edição, validação completa de CPF/telefone, filtros e aceite de produto continuam pendentes para as fases afetadas. Telas de consulta pertencem à FASE-005; cadastro/recebimento visíveis à FASE-006; indicadores à FASE-007.
- Verificações de aplicação serão executadas apenas em apply autorizado. Planejamento completo não autoriza implementação ou PR antecipado: um único PR será preparado somente após toda a Change implementada e verificada; merge exige autorização explícita.
