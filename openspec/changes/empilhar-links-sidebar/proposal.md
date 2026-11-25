# Proposal

## Why

Quando Vendas está ativo, os links Quitadas, Inativas e Prejuízo aparecem na mesma linha porque são âncoras inline. Separá-los verticalmente melhora leitura, identificação e acionamento por teclado, sem alterar o acesso ou as coleções.

## What Changes

- Empilhar os três destinos administrativos sob Vendas, em linhas próprias e na ordem Quitadas, Inativas e Prejuízo.
- Preservar rotas, estado ativo, semântica acessível, foco, estilos e comportamento responsivo existentes.
- Adicionar verificação geométrica da ordem em viewport desktop/estreito e nos dois temas.

## Capabilities

### New Capabilities

### Modified Capabilities

- `navegacao-aplicacao`: definir a apresentação vertical dos destinos administrativos sob Vendas.

## Impact

- Template `frontend/src/app/compartilhado/componentes/barra-navegacao/barra-navegacao.html` e testes E2E de navegação.
- Sem mudança de rotas, APIs, dados, dependências ou regras de negócio.
- Mesmo PR #30 na branch `feature/feedback-luighi`.
