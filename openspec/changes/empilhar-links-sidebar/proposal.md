# Proposal

## Why

Quando Vendas está ativo, Quitadas, Inativas e Prejuízo precisam ser destinos fáceis de distinguir. Além de ficarem um por linha, devem ter respiro visual entre si e ícones que ajudem a reconhecer cada coleção sem depender somente do texto.

## What Changes

- Empilhar os três destinos administrativos sob Vendas, em linhas próprias, com espaçamento vertical natural e na ordem Quitadas, Inativas e Prejuízo.
- Associar ícones decorativos distintos de check, pausa/arquivo e alerta respectivamente, sem alterar os nomes acessíveis.
- Preservar rotas, estado ativo, semântica acessível, foco, estilos e comportamento responsivo existentes.
- Verificar ordem, espaçamento e ícones em viewport desktop/estreito e nos dois temas.

## Capabilities

### New Capabilities

### Modified Capabilities

- `navegacao-aplicacao`: definir a apresentação vertical dos destinos administrativos sob Vendas.

## Impact

- Template `frontend/src/app/compartilhado/componentes/barra-navegacao/barra-navegacao.html` e testes E2E de navegação.
- Sem mudança de rotas, APIs, dados, dependências ou regras de negócio.
- Mesmo PR #30 na branch `feature/feedback-luighi`.
