# Design

## Context

Motivação e limite de autorização em `proposal.md`; contrato em `specs/dominio-vendas/spec.md`. O desenho é necessário pela divergência de contrato interno e pelo remapeamento de referências entre documentos. Não introduz arquitetura ou dependências.

PRD reutilizado: RF-023/CA-046–048, RF-013/016, RN-025/026 e CA-038. TDD reutilizado: DEC-037, fluxos/projeções e estratégia de verificação. O solicitante confirmou no Harness vendas do período somente Ativas e recebimentos de todos os status. A ordem PRD → TDD → SDD usa essas decisões existentes; no apply, corrigir primeiro as referências do PRD/TDD e registrar a reconciliação, antes do código dependente.

### Inspeção que fundamenta o plano

| Fonte | Estado observado | Consequência |
| --- | --- | --- |
| `ConjuntoVendas.Consultas.cs`, consulta por período | Filtra vendas somente por data; recebimentos percorrem todas as vendas separadamente | Acrescentar status apenas ao primeiro filtro |
| `ConjuntoVendasConsultasTests.cs` | Espera `venda-inicio` e `venda-fim` Inativa em fevereiro, recebido 20.000 | Lista passará a conter só `venda-inicio`; recebido continua 20.000 |
| `ConjuntoVendas.Relatorios.cs` | Vendas mensais já filtradas por Ativo; utiliza consulta por período para reconciliar recebidos | Preservar cálculo e testar regressão, sem refatorar relatório |
| `VendaReconstrucaoTests.cs`, teste positivo da entrada | Reconstrói somente dados válidos; testes negativos são separados | Completar HIS-007 no mesmo método, sem alterar produção da reconstrução |
| PRD/TDD | Persistência e MSTest reutilizam CA-049/DEC-038; TDD também atribui FON-041 a ambos | Remapear somente MSTest com correspondência explícita |
| Capabilities principais e Changes concluídas | Deltas de domínio/reconstrução ainda estão separados das specs principais | Não sincronizar ou reescrever outras Changes para produzir esta delta |

Uma busca por `ConsultarPeriodo` em `backend/**/*.cs` localizou os consumidores de produção nas projeções de conjunto e relatório, além dos testes. Não há handler ou endpoint de negócio a migrar. Evidência desta proposta é inspeção, não execução de testes.

## Goals / Non-Goals

**Goals:** filtro operacional consistente sem perda de recebimentos; teste sequencial independente de ordem da suíte; referências documentais inequívocas com histórico preservado; alteração de produção mínima.

**Non-Goals:** generalizar consultas com parâmetros de status, adicionar novo DTO/serviço, reescrever relatório, alterar a validação de entrada já corrigida, abrir persistência à API, adicionar/atualizar dependências ou editar manifestos/lockfiles, mudar schema ou tratar dados reais. Exceção autorizada no Harness em 26/11/2026: `npm ci` em `frontend/` para reconstruir `node_modules` estritamente a partir do `package-lock.json` existente, se necessário à verificação. A confirmação da extensão VS Code continua pendente e fora deste recorte.

## Decisions

### D1 — Filtrar somente a coleção de vendas do período

Manter assinatura e tipo `ConsultaPeriodoVendas`. A seleção de `Vendas` exige Ativo e data da venda entre início/fim inclusivos, preservando a ordem da coleção original. O laço de recebimentos continua percorrendo todas as vendas, selecionando somente pela data efetiva do recebimento.

Alternativas: manter todos os status e mudar o TDD foi rejeitado pelo solicitante; filtrar todo o conjunto antes de somar foi rejeitado por apagar recebidos de Inativas/Prejuízo. Não criar flag opcional para oferecer os dois contratos nesta correção.

Vendas Ativas quitadas continuam elegíveis. Venda fora do período pode ter recebimento dentro dele. Mudar o status altera a elegibilidade da venda, não seu dinheiro recebido. Vazio, intervalo invertido, centavos e proteção de coleções mantêm contratos anteriores. Não alterar a validação global de IDs/somas, que inclui registros não operacionais.

### D2 — Oráculos explícitos e não derivados do filtro de produção

Preservar o teste das bordas existente e corrigir suas expectativas. Acrescentar matriz sintética na referência 31/03/2027 para consulta 01/02–28/02/2027:

| Venda | Data da venda | Estado atual | Recebido em fevereiro | Elegível em Vendas |
| --- | --- | --- | --- | --- |
| ativa-aberta | 01/02/2027 | Ativo, total-base 20.000 e saldo 10.000 | 10.000 em 01/02 | Sim |
| ativa-quitada | 28/02/2027 | Ativo, total-base 10.000 e saldo zero | 10.000 em 28/02 | Sim |
| inativa | 10/02/2027 | Inativo, total-base 10.000 | 10.000 em 15/02 | Não |
| prejuizo | 12/02/2027 | Prejuizo, total-base 20.000 e saldo 10.000 | 10.000 em 16/02 | Não |
| ativa-fora | 31/01/2027 | Ativo, total-base 10.000 | 10.000 em 20/02 | Não |

Oráculo: recebido 50.000; apenas duas Ativas vendidas no intervalo. Inserir `ativa-quitada` antes de `ativa-aberta` para provar ordem de origem, não ordenação acidental por nome/data. Criar pagamentos antes das transições administrativas. Acrescentar casos de pagamentos externos em 31/01 e 01/03, mantendo 50.000 no período; consultar subconjunto apenas Inativa/Prejuízo deve retornar lista vazia e recebido 20.000. Conferir originais e consulta repetida sem efeitos.

### D3 — Completar HIS-007 sem nova regra financeira

No teste positivo existente, construir o conjunto anterior antes da primeira tentativa; executar reconstrução da fixture de entrada 10.000/alocação 9.999, verificar a falha e a preservação dos arrays. Em seguida, na mesma referência e no mesmo método, reconstruir fixture independente com os mesmos IDs e alocação 10.000. Preservar asserções existentes de projeção, conjunto e período: base/efetivo 20.000, recebido/saldo 10.000, 1/2 paga e entrada contada uma vez.

Registrar cópias das entradas de ambas as tentativas e verificar que a rejeitada continua com 9.999; não "consertar" o array inválido para montar o sucesso. Conferir que o conjunto anterior conserva a raiz original e só o candidato contém a nova venda. Manter os três testes negativos existentes. Atualizar HIS-007 no catálogo para apontar o cenário sequencial. Alternativa apenas documental foi preterida para cumprir a tarefa originalmente descrita sem mudar `Venda.Reconstrucao.cs`.

### D4 — Corrigir identificadores pelo assunto, nunca por substituição global

Mapeamento planejado, com IDs livres na inspeção desta proposta:

| Assunto | Identificação atual ambígua | Identificação canônica após apply |
| --- | --- | --- |
| Persistência SQLite | DEC-038 / CA-049 / FON-041 | Preservar DEC-038 / CA-049 / FON-041 |
| Resolução MSTest | DEC-038 / CA-049 / menção FON-041 no TDD | DEC-039 / CA-053 / FON-042 |

Em `docs/prd/vendas-em-aberto.md`, revisar só a seção MSTest: nomear FON-042, usar CA-053 e DEC-039. Em `docs/tdd/tdd.md`, revisar só a decisão MSTest para DEC-039, PRD/CA-053 e FON-042. Incluir nota datada e qualificada por assunto com os aliases antigos; não manter duas definições canônicas nem considerar citações históricas como definições novas.

Preservar o texto dos critérios, versões, resultados anteriores e limitação do VS Code. As referências explícitas encontradas em `backend/README.md` e na Change SQLite são de persistência e devem permanecer. A Change MSTest atualmente remete genericamente ao PRD/TDD; somente ajustar links/IDs se necessário à resolução, sem alterar checkboxes, escopo ou evidências antigas. Revalidar as referências tocadas, sem sync/archive ou renumeração massiva. Se algum novo ID tiver sido ocupado antes do apply, resolver a colisão e atualizar primeiro este plano, não sobrescrever outro assunto.

Alternativa de renumerar SQLite foi rejeitada pelo maior alcance de referências; substituição global de DEC-038/CA-049/FON-041 destruiria rastreabilidade correta.

### D5 — Evidência nova separada de resultados históricos

No apply, acrescentar ao README uma seção desta correção com comandos, SDK realmente usado, contagens, resultados e limitações. Não mudar os números anteriores para fingir que já cobriam o novo cenário. Atualizar CON-008 e HIS-007 preservando seus IDs e acrescentar entradas identificadas para casos novos sem colisões.

Regressão planejada: testes direcionados das duas classes, relatório/projeções e suíte completa incluindo persistência; restore bloqueado, Release e format verify com baseline existente, sequencialmente. Preservar o smoke real da API (loopback/health/404, sem banco e sem processo próprio residual) e testes/build frontend com API desligada; se o ambiente impedir execução, documentar bloqueio real sem declarar aprovação. Sem UI nova, E2E visual/zoom não se aplicam. Não atualizar SDK/pacotes como contorno.

### D6 — Restaurar somente dependências frontend já travadas

Na execução inicial de VER-01/4.2, `npm test` não encontrou o builder `@angular/build:unit-test`, embora `@angular/build@22.2.6` esteja declarado em `frontend/package.json` e `package-lock.json`; Node `v24.21.0` e npm `11.19.0` atendem aos `engines`/`packageManager`. O Harness autorizou em 26/11/2026 a preparação do ambiente por `npm ci`, que substitui `node_modules` e restaura apenas a árvore exata do lockfile. Executar em `frontend/`, sem `npm install` ad hoc, `npm update` ou alteração de `package.json`/`package-lock.json`; conferir o diff desses manifestos vazio. Registrar o erro inicial, versões de Node/npm, restauração, nova execução de testes/build e seus códigos/contagens reais. A instalação não altera dependências escolhidas nem o escopo funcional.

## Risks / Trade-offs

- [Filtrar recebimentos junto às vendas] → Matriz de status, venda fora do período e recebido sem vendas elegíveis.
- [Teste passa repetindo fórmula do domínio] → IDs e valores esperados literais da matriz; sem derivar universo esperado do método testado.
- [Quebra silenciosa de consumidor interno] → Destacar incompatibilidade semântica, auditar chamadas e manter assinatura; não alterar persistência.
- [Remapeamento destrói fontes de SQLite] → Revisão contextual e mapa de IDs; preservar DEC-038/CA-049/FON-041 desse assunto.
- [Histórico de evidências confundido com aceite atual] → Seção nova datada; testes não executados permanecem não executados.
- [Deltas concluídas ainda não sincronizadas] → Esta Change modifica somente o requisito principal existente e adiciona garantia independente; não duplica nem apaga deltas de entrada de outras Changes.

## Migration Plan

Não há migração de dados, banco ou transporte. Após revisão e novo pedido explícito de apply, executar na mesma branch:

1. MAN-01: desambiguar PRD/TDD, registrar reconciliação com as regras vigentes e revisar referências.
2. COR-01: corrigir seleção de vendas e testes/catálogo/documentação da consulta.
3. HIS-01: completar cenário sequencial e suas evidências/catálogo, sem mudar produção da reconstrução.
4. VER-01: regressão integrada, smoke, validação OpenSpec e auditoria final de escopo/rastreabilidade.

Cada funcionalidade coerente inclui testes/documentação/tarefas e commit próprio em português; manutenção documental independente tem commit próprio. Não abrir PR de planejamento. Um PR único com o template do repositório somente após todo o apply e verificações aplicáveis. Merge exige autorização explícita.

Rollback eventual: reversão revisada dos commits desta Change por PR, sem reset destrutivo e sem restaurar banco, pois nenhum schema/dado muda. A proposta atual não executa nenhum desses marcos.
