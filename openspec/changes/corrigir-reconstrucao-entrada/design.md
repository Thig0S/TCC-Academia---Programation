# Design

## Context

Motivação em `proposal.md`. Reutilizados, sem revisão de requisitos/arquitetura:
PRD/RF-023/CA-046–048 e TDD/DEC-037, que já exigem reconstrução validada, entrada
única, reconciliação e falhas sem mutação. Este desenho registra as escolhas técnicas
necessárias para não confundir rejeição na fábrica com correção tardia na projeção.

Inspeção da base, sem execução de testes nesta proposta:

- `Venda.Reconstrucao.cs`: o ramo Entrada chama `ValidarAlocacao` e compara o valor
  recebido com a base; o helper verifica vínculo e valor positivo, não igualdade.
  O valor da alocação é copiado sem essa conferência. Os ramos Individual e
  HistoricoLote já têm comparações financeiras específicas.
- `Venda.Projecao.cs`: compara o total recebido com o total das alocações; por isso
  pode rejeitar uma venda antes aceita pela reconstrução.
- `ConjuntoVendas.cs`: confere IDs e somas dos recebimentos, não essa invariante
  interna. Não é a fronteira adequada para reparar o agregado.
- `VendaReconstrucaoTests.cs`: há teste de alocação Individual divergente e fixtures
  com entrada/lote; falta a variação equivalente da entrada.
- `backend/global.json` fixa SDK 10.0.404 e MSTest.Sdk 4.5.3. Preservar baseline,
  dependências e runner existentes.

A spec principal ainda não recebeu os requisitos ADDED da fase 002. O delta desta
Change modifica somente “Entrada como primeira parcela paga”, que já existe na
principal; não depende de sync/archive da Change anterior e não o executa.

## Goals / Non-Goals

**Goals:** impedir que a fábrica devolva sucesso para entrada financeiramente
inconsistente; demonstrar rejeição antecipada, imutabilidade e compatibilidade dos
históricos válidos com projeção/conjunto/período.

**Non-Goals:** mudar assinaturas, compartilhar todas as validações em novo serviço,
revalidar todos os agregados em `ConjuntoVendas`, recalcular valores informados,
mudar cadastro ou semântica de Individual/lote, otimizar relatórios ou importar dados.

## Decisions

### D1 — Validar igualdade no ramo Entrada antes da cópia

Acrescentar à validação existente do ramo Entrada em
`backend/src/VendasEmAberto.Dominio/Vendas/Venda.Reconstrucao.cs` a exigência de que
a alocação tenha o mesmo valor em centavos do recebimento, já comparado com a base.
Manter a falha existente: categoria `Validacao`, código `historico-invalido`, campo
`recebimentos.alocacoes` e mensagem pública em pt-BR. Não gerar novo código ou exceção.

Alternativas rejeitadas: normalizar a alocação ocultaria entrada inválida; rejeitar
somente ao projetar permitiria agregado inválido; tornar `ValidarAlocacao` sempre
igual à base quebraria pagamentos Individual com acréscimo. Uma refatoração geral
não é necessária para fechar essa lacuna.

### D2 — Regressões com oráculos constantes e tentativa válida posterior

Concentrar os novos testes em
`backend/tests/VendasEmAberto.UnitTests/Dominio/Vendas/VendaReconstrucaoTests.cs`,
reutilizando o padrão local de fábricas e assertions, sem pacotes ou host.

Fixture pequena: venda Ativa em 15/01/2027, referência 15/03/2027, base 20.000,
duas parcelas de 10.000 vencendo em 15/01 e 15/02, entrada recebida de 10.000 em
15/01, forma válida, IDs distintos e nenhuma outra baixa. Identificação sintética
válida segue os helpers existentes.

| Caso proposto | Alocação da entrada | Resultado exato |
| --- | --- | --- |
| HIS-005 | 1 e 9.999 | Falha Validacao/historico-invalido, campo recebimentos.alocacoes, sem valor de venda |
| HIS-006 | 10.001 | Mesma falha antecipada, sem ajustar o valor informado |
| HIS-007 | 10.000 | Sucesso; base/efetivo 20.000, recebido 10.000, saldo 10.000, 1/2 paga |

Usar arrays de entrada observáveis e comparar conteúdo após falhas. Preservar um
conjunto anterior válido, não chamar aceitação com valor extraído de uma falha e
confirmar que os snapshots anteriores permanecem intactos. Após as tentativas
inválidas, reconstruir o histórico exato e conferir que a venda pode ser projetada e
aceita em conjunto. Consultar janeiro inclusivo deve receber 10.000 uma única vez;
IDs, origem Entrada, alocação e valores permanecem iguais. Reexecutar os casos
existentes de entrada/lote, Individual com acréscimo e cadastro sem entrada.

Alternativa rejeitada: testar só a projeção falha não prova que a fábrica deixou de
aceitar o histórico inválido. Não usar fórmulas da implementação como oráculo.

### D3 — Evidências novas, sem reabrir a fase 002

No apply, adicionar HIS-005–007 ao catálogo preservando IDs anteriores e registrar
no README resultados reais e limitações específicos desta correção, sem substituir
evidências históricas. Reutilizar PRD/TDD por aderência ao contrato existente e
referenciá-los no PR futuro; não criar documentos vazios nem registrar nova regra.

## Risks / Trade-offs

- [Checagem inserida no helper comum restringe acréscimos] → Mudança no ramo Entrada
  e regressão dos ramos Individual/HistoricoLote.
- [Erro só aparece tardiamente] → Testar diretamente o resultado da reconstrução,
  categoria/código/campo e ausência de venda na falha.
- [Históricos inconsistentes deixam de ser aceitos] → Rejeição intencional, sem
  reparo silencioso ou migração; não há persistência ou dados reais neste recorte.
- [Suíte verde interpretada como prova anterior] → Registrar novas execuções e
  distinguir diagnóstico por inspeção de reprodução executada no apply.

## Migration Plan

1. Revisar os artefatos antes do apply. **Concluído:** apply autorizado por
   `opsx-apply corrigir-reconstrucao-entrada`.
2. Demonstrar as regressões negativas na base anterior à correção, corrigir o ramo
   Entrada e executar os casos negativos/positivos e regressões existentes.
3. Atualizar catálogo/README junto da correção coerente e seus testes; executar
   restore bloqueado, build Release, suíte backend e formatação sequencialmente.
4. Preservar CA-048: smoke real de loopback/health/404 e testes/build frontend com
   API desligada. Registrar E2E/visual/zoom como não executados, pois não há UI alterada.
5. Validar OpenSpec e diff; concluir todas as tarefas antes do PR único com template
   padrão. Commit da funcionalidade inclui testes e documentação; planejamento pode
   ter commit próprio. Nenhum PR antecipado e nenhum merge sem autorização explícita.

Resultado do apply: tarefas 1.1–2.3 concluídas; reprodução pré-correção (3 falhas
esperadas), regressões e suíte backend aprovadas, build/testes frontend aprovados,
smoke real de loopback aprovado, formatação e validação OpenSpec aprovadas. Evidências,
contagens e limitações estão registradas em `tasks.md` e `backend/README.md`.

Sem migração de banco. Se for necessário rollback após integração, usar reversão
revisada via PR, documentando que remover a guarda reintroduz a lacuna; não fazer
reset destrutivo. Nenhuma implementação ou verificação de aplicação ocorreu durante
a criação destes artefatos.
