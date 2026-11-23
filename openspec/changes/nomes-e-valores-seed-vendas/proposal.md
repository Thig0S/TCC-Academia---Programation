# Proposal

## Why

Os nomes “Cliente DEMO Aurora 1” e os totais repetidos tornam as vendas iniciais pouco naturais para demonstrações e dificultam a leitura dos exemplos. Nomes completos sintéticos e valores variados tornam a apresentação mais verossímil, sem usar dados pessoais obtidos de terceiros.

## What Changes

- Substituir os rótulos atuais por 12 nomes completos sintéticos distintos.
- Variar os 12 valores totais no intervalo de R$ 600,00 a R$ 2.400,00, recalculando parcelas e histórico financeiro de forma coerente.
- Preservar IDs, datas, situações possíveis, grupos de entrada e regras de domínio.
- Atualizar testes e documentação do seed.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `estado-demonstrativo`: definir nomes completos sintéticos distintos e valores totais variados no conjunto inicial, preservando sua validade e os cenários existentes.

## Impact

- `frontend/src/app/nucleo/demonstracao/dados-demonstrativos.ts` e seus testes.
- PRD, TDD e documentação de verificação da aplicação.
- Sem mudança de APIs, dependências, regras de cadastro, cálculo, persistência ou dados criados durante a sessão.
