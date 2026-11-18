# Design

> Acompanhamento em 18/11/2026: executado o apply interno autorizado após o PR #13.
> As restrições “neste PR”/“entrega documental” abaixo referem-se ao planejamento
> original. Implementação: validadores compartilhados, geração sintética determinística,
> `prepararEdicaoCliente` e `ServicoDemonstracao.editarCliente`, com adaptador sem estado
> seguindo o padrão de recebimento. Regressão e limitações em `frontend/README.md`.
> Sem UI comercial, avaliação ou sincronização/arquivamento nesta execução.

## Context

Motivação e limites em `proposal.md`. Fonte central: TDD 1.12/DEC-019, PRD 1.8/RN-021/022/023 e CA-007/012/016/017/030. Este desenho existe porque a validação alcança cadastro, novo comando interno, seed e testes, com conflito explícito na exigência de marcadores de busca.

Inspeção read-only: `venda.validacoes.ts` valida apenas presença e prepara parcelas; `servico-demonstracao.ts` possui cadastro/recebimento com cópia e publicação atômica, sem edição. `dados-demonstrativos.ts` e testes usam marcadores; `consulta-vendas` obriga mantê-los e as outras duas capacidades não exigem formato. Nenhuma dessas diferenças é falha de entrega da FASE-004/005: são regras novas, ainda sem implementação.

## Goals / Non-Goals

**Goals:**
- Reutilizar a fonte raiz e as preparações puras, adicionando validação consistente e edição com superfície mínima.
- Preservar IDs, finanças e isolamento por venda; planejar transição conjunta do seed e testes sem quebrar consultas.
- Distinguir regras decididas, ambiente caracterizado, implementação futura e avaliação ainda não realizada.

**Non-Goals:**
- Não implementar neste PR; não alterar código, seed, configs, versões, rotas ou specs principais.
- Não desenhar toda a UI da FASE-006, edição financeira, serviços externos, persistência ou produção.
- Não aprovar metas, participantes específicos, autoridade de aceite ou entrevistas reconstruídas por inferência.

## Decisions

### 1. Validadores puros compartilhados

Concentrar regras de identificação em funções puras específicas em `funcionalidades/vendas/`, chamadas por cadastro e preparação de edição. Reutilizar modelos de resultado em português; sem dependência nova. Validar após normalização de formatação permitida, sem remover letras silenciosamente. A futura UI reutilizará as mesmas regras e não substituirá a validação do núcleo. Alternativa rejeitada: validar só no formulário, deixando comandos internos inconsistentes.

CPF exige 11 dígitos, cálculo dos dois verificadores e rejeição de sequência repetida; telefone exige só comprimento 10/11 incluindo DDD, sem +55, tabela de DDDs ou prefixos. A busca parcial não usa esses validadores de campos completos. A forma exata de máscara/apresentação da UI não é decidida nesta preparação interna.

### 2. Comando interno específico de edição de cliente

Adicionar contrato com ID e somente nome/CPF/telefone/descrição em `venda.modelos.ts`, preparação pura de edição próxima das validações existentes e método específico na fonte raiz. Construir o agregado novo a partir do estado atual, substituindo exclusivamente o bloco de cliente da venda identificada. Não converter edição em cadastro, não regenerar parcelas e não usar CPF como chave de seleção.

Aceitar vendas sem recebimentos, com entrada, parcialmente pagas e quitadas. Revalidar identificação, copiar entradas e publicar uma vez no sucesso; inexistência, validação e falha preservam agregado completo. O contrato não inclui data, total, entrada, parcelas ou pagamentos; tentativas de alteração desses campos não podem ter efeito. O cancelamento futuro descarta rascunho, sem chamar comando. IDs continuam opacos, finanças imutáveis pela edição e sem propagação por CPF.

Alternativas: a opção de editar finanças antes de receber foi retirada pelo solicitante; não implementar essa alternativa nem distinguir entrada como autorização para edição. Novos recebimentos continuam nos comandos já existentes, não são edição de histórico.

### 3. Transição do conjunto demonstrativo e regressão

O solicitante escolheu adequar futuramente o seed, não manter exceções permanentes para marcadores. Produzir identificações numéricas sintéticas compatíveis, mantendo 12 vendas, seus IDs, dados financeiros e a política civil nas bordas. Usar exclusivamente geração/dados sintéticos, sem copiar pessoas/entrevistas; avisar que validade matemática não garante inexistência de titular.

Revisar fixtures de cadastro/integração que hoje passam CPF-DEMO/TEL-DEMO e testes que exigem esses marcadores. Preservar fixtures explicitamente inválidas como negativas quando necessárias. Adaptar testes de busca/E2E dependentes dos valores, sem remover cobertura, alterar seed para 15 registros ou criar hooks/rotas de produção. As três deltas precisam permanecer coerentes; não sincronizá-las nesta entrega documental.

### 4. Ambiente de avaliação não é um novo requisito geométrico

Registrar o hardware informado pelo solicitante e Windows observado localmente conforme DEC-019; a correção final da escala é 125%, não 100%. Tela física 1920×1080, Chrome com zoom 100%, não equivale a viewport CSS 1920×1080 ou 1366×768. Versão Chrome e viewport útil serão coletados na execução. Preservar CA-028 e testes Chromium nos viewports técnicos, sem alegar nova execução ou homologação.

PEN-008/010 estão decididas, ainda não implementadas. PEN-013 é parcial por versão/viewport/medições faltantes. PEN-014 permanece aberta por papéis/autoridade, quantidade/consentimento, metas e confirmação de reconstruções; só a participação prevista do solicitante/equipe foi confirmada. MET e 300 ms/15 vendas permanecem para discussão, não são metas finais desta Change.

## Risks / Trade-offs

- Identificação sintética numericamente válida coincidir com pessoa real --> não coletar dados reais nem afirmar anonimato; manter aviso de demonstração e ausência de consultas externas.
- Novo validador quebrar o seed e testes --> atualizar dados/testes conjuntamente no futuro apply e cobrir determinismo/bordas; não enfraquecer a regra para acomodar marcadores.
- Reutilizar cadastro para editar e reescrever histórico --> comando específico e comparação profunda dos campos financeiros antes/depois em todas as situações.
- Escala física ser confundida com viewport --> coletar dimensões reais na avaliação e preservar evidências técnicas anteriores separadamente.
- Planejamento parecer conclusão técnica --> tasks futuras desmarcadas; nenhum apply ou avaliação neste PR documental.

## Migration Plan

1. Entrega atual: PRD 1.8 → TDD 1.12 → esta Change e README, na branch do PR #13 após aprovação explícita; somente documentação.
2. Após novo pedido de apply: implementar regras internas de identificação, adequação de seed/fixtures, comando de edição e integração, em commits funcionais com verificações e evidências reais. Não antecipar UI comercial.
3. Planejar separadamente as interfaces da FASE-006 com estas regras já definidas; não marcar a fase inteira como entregue pela preparação interna.
4. Fazer revisão e regressão antes de eventual sync/archive. Não aplicar deltas durante este planejamento. A forma de PR de uma futura implementação dependerá do estado da branch/PR então, sem abrir outro PR de planejamento agora.
5. Sem migração persistente: cada sessão é reconstruída; reversão futura somente por mudança autorizada, nunca descarte de trabalho ou reescrita de histórico financeiro.

## Open Questions

Somente de avaliação, sem bloquear o desenho interno: versão Chrome/viewport CSS real serão coletados na execução. Papéis/autoridade de aceite, número/consentimento dos participantes, confirmação de reconstruções e metas dependem de nova decisão, e bloqueiam declarações de avaliação/aceite, não autorizam inventar valores neste plano.
