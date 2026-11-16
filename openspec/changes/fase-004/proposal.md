# Proposal

> Retomada autorizada em 16/11/2026: PRD 1.4/TDD 1.8 e política técnica revisados
> e aprovados via Harness antes do código. Adaptar datas/parcelamento do seed nas
> bordas, sem trocar a referência nem restringir o domínio; manter 12 vendas e
> dispensar situações somente quando impossíveis. Concluir 4.1, 5.2 e 5.3 na mesma
> branch, com verificações e PR único apenas ao concluir. Registros abaixo históricos.

> Retomada de apply em 15/11/2026: 18/21 tarefas concluídas. Recebimentos e fonte
> de sessão implementados nos commits `72fba45`/`17255d2`; regressão limpa aprovada
> (143 testes e 26 E2E), com evidências no README. Revisão final identificou lacuna
> do seed nas extremidades do calendário; tarefa 4.1 reaberta, 5.2/5.3 pendentes.
> O solicitante escolheu pausar para revisão, sem definir limite ou fallback.
> Não abrir PR enquanto o comportamento não for decidido, especificado e verificado.
> As avaliações e próximos passos abaixo são históricos; não comprovam conclusão.

> Avaliação em 15/11/2026: 9/21 tarefas concluídas. Utilitários e domínio de vendas
> implementados; recebimentos parciais versionados em `14077ca`, ainda sem o
> `PreparadorRecebimento` e as operações substituíveis previstos no TDD 1.7/DEC-016.
> Fonte de sessão e seed ausentes. PRD 1.3 e decisões do TDD 1.7 são reutilizados:
> não há nova capacidade, regra, dependência, runner ou UI nesta revisão.
> Esta solicitação autoriza somente avaliação e planejamento; a autorização histórica
> de apply não será usada para retomar implementação nesta etapa.

## Why

A FASE-003 entregou a estrutura navegável e os temas, mas as páginas ainda não possuem uma fonte comum de vendas ou cálculos financeiros. O próximo passo é um núcleo demonstrativo consistente, conforme PRD 1.3 e TDD 1.6, para que consultas e mutações futuras não dupliquem saldos ou inventem regras comerciais.

## What Changes

- Planejar modelos de venda, cliente da venda, parcelas, entrada separada e recebimentos com alocações integrais, com dinheiro em centavos e datas civis.
- Aplicar as decisões confirmadas: calendário com último dia do mês afetado, centavos residuais nas primeiras parcelas, entrada recebida na data da venda, situações e resumos globais derivados.
- Definir cadastro por comando interno e liquidação integral de uma ou mais parcelas consecutivas desde a primeira pendente, numa operação atômica. Permitir antecipação; rejeitar saltos, parcialidade, excedente e duplicidade.
- Preparar 12 vendas sintéticas relativas à referência local capturada na abertura, uma única fonte em memória e testes de invariantes, isolamento e integração com navegação.
- Preservar IDs e rastreabilidade com PRD/TDD. O planejamento original evoluiu para implementação parcial: cadastro e pagamentos possuem preparação pura, mas não há serviço publicador da sessão. Planejamento completo não comprova entrega integral.

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

## Current Assessment and Next Steps

1. Concluir o grupo 3 antes da sessão: seguir o adaptador sem estado e operações
   tipadas já definidos no TDD 1.7, substituir os spies de exports relativos por
   doubles e comprovar falha posterior/final sem mutação e nova tentativa válida.
   Corrigir a formatação dos dois arquivos de validação de pagamentos no apply.
2. Implementar o grupo 4: fábrica de 12 vendas sintéticas, referência substituível,
   serviço raiz com publicação única, IDs somente no sucesso e proteção profunda;
   depois integrar a inicialização em App e verificar navegação e recriação.
3. Executar o grupo 5 integralmente e registrar evidências no README e nas tarefas;
   somente então preparar o único PR da fase. Não antecipar telas das fases seguintes.

Evidências desta avaliação: build de produção saída 0, 467,06 kB iniciais e aviso
Sass preexistente; `format:check` saída 1 em `pagamento.validacoes.ts` e seu spec.
A execução imediatamente anterior nesta conversa de `npm test -- --watch=false`
teve 127 aprovações e uma falha em 10 arquivos: `Cannot redefine property:
prepararAlocacao` no `vi.spyOn`. O cenário de falha controlada não foi exercitado;
isso não prova defeito transacional nem atomicidade. Build aprovado não comprova o
núcleo, ainda não conectado a App. Instalação limpa e E2E não foram reexecutados
nesta avaliação. Specs comportamentais permanecem válidas e inalteradas.
