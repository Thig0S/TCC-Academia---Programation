# Design

## Context

Ver `proposal.md` e o delta `specs/estado-demonstrativo/spec.md`. A fábrica atual gera nomes por índice e alterna somente entre dois totais; as parcelas, entradas e recebimentos históricos são preparados por funções de domínio já existentes.

## Goals / Non-Goals

**Goals:** produzir 12 nomes e totais determinísticos, variados e compatíveis com os cálculos atuais, preservando a distribuição dos cenários temporais.

**Non-Goals:** alterar regras globais de valores/parcelamento, vendas cadastradas na sessão, a UI, IDs, datas, CPF/telefone ou dependências.

## Decisions

- Manter arrays locais e explícitos de nomes e totais em centavos, indexados pelo mesmo índice estável do seed. Isso torna os exemplos revisáveis e reprodutíveis; geração aleatória foi descartada por prejudicar determinismo e testes.
- Usar nomes completos sintéticos distintos e totais distintos dentro do intervalo aprovado. Todos os totais escolhidos serão divisíveis por cinco, para permitir entrada de 20% sem arredondamento; os testes verificarão também que os valores derivados permanecem em centavos.
- Nas vendas que já possuem entrada, definir seu valor como 20% do total; usar `prepararCadastro` para distribuir o saldo entre parcelas futuras e `prepararPagamentoHistorico` com os valores efetivos das parcelas. Assim a entrada continua parcela 1 e não é contada duas vezes.
- Preservar a quantidade futura e os grupos que definem datas/situações. Ajustar somente as expectativas de teste que afirmam o nome ou valor fixo anterior.
- Não substituir a função de identificação sintética nem afirmar que os nomes ou números não coincidam com titulares reais.

## Risks / Trade-offs

- [Valores totais diferentes mudam parcela, entrada e resumos apresentados] → recalcular histórico a partir das parcelas geradas e testar reconciliação e todas as situações.
- [Nomes sintéticos podem coincidir com pessoas reais] → não coletar dados externos e manter a demonstração explicitamente fictícia, sem alegação de titularidade.
- [Testes de UI dependem do texto antigo] → localizar e atualizar expectativas do seed, mantendo fixtures e nomes inseridos por testes fora do escopo quando não representarem o conjunto inicial.

## Migration Plan

Não há migração: o conjunto é recriado em memória a cada inicialização. Atualizar implementação e testes; ao recarregar, a nova sessão usa o seed determinístico atualizado.
