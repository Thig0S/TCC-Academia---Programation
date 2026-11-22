# Spec Delta

## MODIFIED Requirements

### Requirement: Conjunto inicial fictício e válido

A sessão SHALL iniciar com 12 vendas sintéticas válidas na referência 0001–9999, com/sem entrada e nomes semelhantes. Entradas SHALL ser parcelas 1 Pagas, com contagens ajustadas sem mudar valores financeiros, histórico ou vencimentos pendentes. SHALL preservar situações possíveis nas bordas sem mudar referência/invariantes. SHALL não copiar dados reais; CPF/telefone SHALL cumprir as validações locais, sem afirmar inexistência de titulares.

#### Scenario: Inicializar nas extremidades do calendário
- **WHEN** a referência estiver nas bordas de 0001–9999
- **THEN** SHALL produzir 12 vendas válidas, limitando o mês da venda entre janeiro/0001 e novembro/9999 e ajustando o dia ao mês
- **AND** SHALL usar até quatro parcelas futuras conforme meses até dezembro/9999, acrescentando a parcela 1 paga quando houver entrada; valores/pagamentos integrais SHALL permanecer compatíveis com o conjunto anterior na mesma referência
- **AND** SHALL preservar referência sem venda futura, ano zero ou vencimento fora do calendário
- **AND** SHALL dispensar situação somente onde impossível, preservando o conjunto anterior onde couber
- **AND** SHALL variar dia-base sintético e prefixo pago somente quando necessário para situações possíveis, sem alterar regras do domínio

#### Scenario: Inicializar e isolar o conjunto demonstrativo
- **WHEN** iniciar duas sessões independentes com a mesma referência
- **THEN** SHALL produzir conjuntos iniciais equivalentes sem objetos mutáveis compartilhados
- **AND** alterar uma sessão SHALL não modificar o conjunto original ou a outra sessão
- **AND** entradas e pagamentos históricos SHALL obedecer calendário, integralidade, sequência e limites aprovados

#### Scenario: Substituir marcadores por identificação sintética compatível
- **WHEN** iniciar o conjunto após adequação das validações da FASE-006
- **THEN** CPF-DEMO/TEL-DEMO SHALL ser substituídos por números sintéticos aceitos, sem copiar ou coletar dados reais
- **AND** SHALL preservar 12 vendas, IDs de venda e comportamento financeiro/temporal, exceto a inclusão planejada da entrada nas parcelas e contagens
- **AND** SHALL identificar dados como sintéticos sem alegar que números válidos não pertençam a pessoas reais

#### Scenario: Uniformizar a entrada sem alterar saldos ou histórico
- **WHEN** comparar a geração anterior e a nova para a mesma referência e venda com entrada e K parcelas futuras
- **THEN** a nova SHALL conter a entrada como parcela 1 Paga e K parcelas posteriores, quantidade total K+1, preservando total/pago/saldo e valores recebidos por período
- **AND** SHALL manter valores e vencimentos das pendentes, IDs de venda e vínculos das liquidações anteriores, renumerando parcelas sem duplicar recebimentos
- **AND** sem entrada SHALL permanecer com as mesmas parcelas, contagens e finanças
- **AND** recarregar SHALL recriar esse novo seed uniforme, sem persistir ou migrar sessão anterior
