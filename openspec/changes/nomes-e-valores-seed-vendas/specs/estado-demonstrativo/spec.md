# Spec Delta

## MODIFIED Requirements

### Requirement: Conjunto inicial fictício e válido

A sessão SHALL iniciar com 12 vendas sintéticas válidas na referência 0001–9999, com/sem entrada e nomes completos distintos. Os valores totais SHALL ser distintos e variar entre R$ 600,00 e R$ 2.400,00. Entradas SHALL ser parcelas 1 Pagas, com contagens ajustadas sem duplicar valores financeiros, histórico ou vencimentos pendentes. SHALL preservar situações possíveis nas bordas sem mudar referência/invariantes. SHALL não copiar dados reais; CPF/telefone SHALL cumprir as validações locais, sem afirmar inexistência de titulares.

#### Scenario: Inicializar nas extremidades do calendário
- **WHEN** a referência estiver nas bordas de 0001–9999
- **THEN** SHALL produzir 12 vendas válidas, limitando o mês da venda entre janeiro/0001 e novembro/9999 e ajustando o dia ao mês
- **AND** SHALL usar até quatro parcelas futuras conforme meses até dezembro/9999, acrescentando a parcela 1 paga quando houver entrada; os valores variados SHALL continuar compatíveis com a distribuição em centavos e o histórico integral
- **AND** SHALL preservar a referência e não gerar venda futura, ano zero ou vencimento além do calendário
- **AND** SHALL dispensar uma situação somente onde impossível, preservando os grupos e cenários possíveis
- **AND** SHALL variar dia-base sintético e prefixo pago somente quando necessário para situações possíveis, sem alterar regras do domínio

#### Scenario: Inicializar e isolar o conjunto demonstrativo
- **WHEN** duas sessões independentes forem inicializadas com a mesma referência
- **THEN** SHALL produzir conjuntos iniciais equivalentes, sem objetos mutáveis compartilhados
- **AND** alterar uma sessão SHALL não modificar o conjunto original nem a outra sessão
- **AND** entradas e pagamentos históricos SHALL obedecer calendário, integralidade, sequência e limites aprovados

#### Scenario: Substituir marcadores por identificação sintética compatível
- **WHEN** iniciar o conjunto demonstrativo
- **THEN** SHALL produzir 12 nomes completos distintos sem obter nomes ou identificações de pessoas ou serviços externos
- **AND** CPF/telefone SHALL ser números sintéticos aceitos pelas regras de identificação, sem alegar que números matematicamente válidos não pertençam a pessoas reais
- **AND** SHALL preservar IDs de venda, datas e comportamento financeiro/temporal, ressalvadas as variações explícitas de totais e seus valores derivados

#### Scenario: Variar totais sem perder reconciliação financeira
- **WHEN** gerar as 12 vendas iniciais
- **THEN** cada total SHALL ser distinto e estar entre R$ 600,00 e R$ 2.400,00
- **AND** parcelas SHALL somar exatamente o total, entrada SHALL manter-se inferior ao total e pagamentos históricos SHALL corresponder integralmente às parcelas liquidadas
- **AND** recarregar SHALL recriar o mesmo conjunto determinístico para a mesma referência, sem persistir ou migrar sessão anterior

#### Scenario: Uniformizar a entrada sem alterar saldos ou histórico
- **WHEN** comparar as vendas com entrada antes e depois da representação da entrada como parcela 1
- **THEN** a nova SHALL conter a entrada como parcela 1 Paga e K parcelas posteriores, quantidade total K+1, com totais e recebimentos conciliados conforme os valores definidos para cada venda
- **AND** SHALL manter vencimentos pendentes, IDs de venda e vínculos das liquidações anteriores, renumerando parcelas sem duplicar recebimentos
- **AND** sem entrada SHALL permanecer sem parcela paga inicial
- **AND** recarregar SHALL recriar o conjunto definido nesta Change, sem persistir ou migrar sessão anterior
