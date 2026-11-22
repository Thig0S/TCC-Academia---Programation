# Spec Delta

## ADDED Requirements

### Requirement: Alinhamento comparável dos valores financeiros

Colunas monetárias das listas de vendas, parcelas, prévia e quatro tabelas de Relatórios SHALL alinhar cabeçalhos e valores à direita e usar algarismos tabulares nos valores. A apresentação SHALL preservar moeda, precisão, conteúdo, ordem, tipografia e densidade contratadas, sem aplicar alinhamento numérico indiscriminadamente às colunas textuais.

#### Scenario: Comparar valores de magnitudes diferentes

- **WHEN** consultar valores monetários curtos e extensos em Vendas, Quitadas, detalhe, prévia ou Relatórios, nos temas claro e escuro
- **THEN** cabeçalhos monetários e valores SHALL compartilhar o alinhamento à direita, e os valores SHALL usar algarismos de largura tabular
- **AND** nomes, datas, situações e ações SHALL conservar uma leitura distinta e o conteúdo completo
- **AND** Vendas, Quitadas, parcelas do detalhe e as quatro tabelas de Relatórios SHALL manter fonte de 18 px, line-height de 20 px e padding de 10×4 px nos dados e 10×8 px nos cabeçalhos, em ordem horizontal×vertical
- **AND** a prévia SHALL manter sua tipografia própria existente, sem estender a ela a obrigação de 18 px

#### Scenario: Preservar densidade ao alinhar valores

- **WHEN** abrir listas com dez vendas ou detalhe com até dez parcelas e textos curtos em 1366×768, zoom de 100%, em cada tema
- **THEN** o alinhamento SHALL preservar tabela e paginação das listas e as dez parcelas do detalhe acessíveis sem rolagem vertical da página
- **AND** em tabelas mais largas que sua área, a rolagem horizontal SHALL permanecer contida na região identificada e acessível por teclado, sem ocultar colunas

### Requirement: Hierarquia uniforme das ações e mensagens existentes

As páginas SHALL distinguir visualmente ações primárias de secundárias e mensagens de sucesso de erros, usando texto e tratamento visual coerente nos dois temas. Mensagens e ações SHALL preservar rótulos, posição lógica, anúncios acessíveis e comportamentos existentes; o polimento SHALL não criar confirmações, estados ou controles fictícios.

#### Scenario: Identificar a ação principal sem competição visual

- **WHEN** usar Nova venda na lista, confirmar cadastro, confirmar edição ou confirmar recebimento
- **THEN** cada ação primária SHALL ter fundo vermelho, texto legível e apresentação consistente em normal, hover, foco e indisponibilidade, quando aplicáveis
- **AND** cancelamento, limpeza e retornos SHALL permanecer distinguíveis como ações secundárias, sem perder acesso por teclado
- **AND** a ação de receber no detalhe SHALL ser distinguível dos links de retorno, sem alterar sua elegibilidade ou fluxo
- **AND** Visão Geral e Configurações SHALL não ganhar uma ação principal artificial, e exportação SHALL permanecer explicitamente indisponível

#### Scenario: Reconhecer resultados e corrigir erros

- **WHEN** uma operação produzir sucesso, erro de campo, falha recuperável ou envio em andamento já previstos no fluxo
- **THEN** a mensagem existente SHALL ficar legível, próxima do contexto pertinente e sem sobrepor ações ou campos
- **AND** erros e sucesso SHALL ser distinguíveis por texto e aparência além de cor, preservando anúncios e associações de campo existentes
- **AND** cancelar SHALL não produzir sucesso, falhar SHALL preservar dados e permitir nova tentativa, e envio repetido SHALL não duplicar a operação

### Requirement: Composição refinada e resiliente em todos os destinos

Todos os destinos e o modal de recebimento SHALL apresentar hierarquia entre título, contexto e conteúdo, alinhamentos consistentes e espaçamento proporcional à tarefa. A composição SHALL preservar textos, marca, lateral e contratos funcionais, mantendo todo o conteúdo alcançável em telas estreitas, larguras intermediárias, textos extensos e zoom nativo de 200%.

#### Scenario: Percorrer todos os destinos com acabamento coerente

- **WHEN** percorrer Visão Geral, Vendas, Quitadas, cadastro, detalhe, edição, recebimento, Relatórios, Configurações, caminho inexistente e venda inexistente no detalhe e edição, nos dois temas
- **THEN** títulos, informações auxiliares, painéis, tabelas, campos, ações e retornos SHALL compartilhar hierarquia visual consistente, sem decoração que compita com os dados
- **AND** referência, limites dos resumos, períodos, campos, estados vazios e avisos demonstrativos existentes SHALL permanecer completos
- **AND** os quatro indicadores e três resumos da Visão Geral SHALL permanecer, sem introduzir gráficos, filtros ou seções de marketing
- **AND** logo, dimensões, cores, degradê, tipografia, perfil e comportamento responsivo da lateral SHALL permanecer equivalentes à linha de base

#### Scenario: Adaptar sem corte ou ocultação de dados

- **WHEN** consultar cada destino em 390×844, nas larguras de 767, 768 e 1024 px, ou com zoom nativo de 200% e textos extensos
- **THEN** campos, títulos, mensagens, retornos e ações SHALL permanecer alcançáveis sem overflow horizontal da página ou sobreposição
- **AND** tabelas SHALL poder rolar em regiões próprias identificadas, e a página e o modal SHALL admitir rolagem vertical quando necessária
- **AND** cadastro SHALL manter formulário à esquerda e prévia à direita a partir de 768 px, empilhados nessa ordem abaixo disso, sem ocultar rótulos, erros ou entrada condicional
- **AND** ajustes SHALL não reduzir artificialmente a fonte ou apagar conteúdo para satisfazer a geometria desktop

#### Scenario: Manter interação acessível após o polimento

- **WHEN** navegar com teclado, alternar tema ou usar recebimento com preferência de movimento reduzido
- **THEN** controles SHALL manter foco perceptível, sequência lógica, nome acessível e indicação textual de situação, e o modal SHALL manter Escape, contenção e retorno de foco
- **AND** textos comuns SHALL ter contraste mínimo de 4,5:1; textos grandes e indicadores essenciais de foco/controle SHALL ter no mínimo 3:1
- **AND** animações SHALL não ser necessárias à compreensão ou ação, e a lateral SHALL não ser redesenhada por estilos compartilhados
