# Tasks

## 1. Seed e testes

- [x] 1.1 Substituir os rótulos por 12 nomes sintéticos distintos e definir 12 totais determinísticos dentro do intervalo aprovado; verificar no teste focado que todos são únicos e estão na faixa.
- [x] 1.2 Calcular entradas de 20% e preparar históricos pelos valores efetivos das parcelas; atualizar asserts de nomes/valores antigos e verificar soma das parcelas, pagamentos e IDs preservados.
- [x] 1.3 Atualizar testes de UI que dependam dos nomes iniciais antigos; verificar busca por nome e exibição sem alterar dados de fixtures não relacionadas.

## 2. Regressão e rastreabilidade

- [x] 2.1 Executar suíte unitária, build e formatação; registrar os resultados em `frontend/README.md` e conferir situações, datas e determinismo do seed.
- [x] 2.2 Validar os artefatos da Change e `git diff --check`; verificar `openspec validate nomes-e-valores-seed-vendas --strict`.
