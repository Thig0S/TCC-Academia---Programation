# TDD — [Nome do produto ou iniciativa]

> Technical Design Document: documento de desenho técnico. Não representa implementação
> nem significa desenvolvimento orientado a testes.

## 1. Identificação e situação

- Produto e etapa:
- Situação do documento: Rascunho / Aguardando decisões / Consolidado para o escopo definido.
- Data e revisão:
- Escopo da solicitação e destino:
- Participantes e autoridade das decisões, somente quando conhecidos:
- Resumo das decisões confirmadas e pendências bloqueantes:

## 2. Contexto, objetivos e limites

Descreva o problema técnico, os requisitos de produto de referência, os objetivos desta etapa,
as restrições obrigatórias e o que fica fora. Diferencie requisitos confirmados de hipóteses.
Indique quais critérios permitirão avaliar se o desenho atende ao escopo, sem alegar resultados.

## 3. Fontes e estado atual

| Fonte | Caminho ou URL e seção | Versão/data de consulta, quando aplicável | Evidência ou restrição |
| --- | --- | --- | --- |

Descreva os arquivos e capacidades realmente existentes, o planejamento prévio e as
divergências encontradas. Não trate a ausência de uma aplicação como falha de implementação.

## 4. Síntese da entrevista técnica

| Tema | Pergunta ou lacuna | Resposta ou delegação explícita | Decisões relacionadas | Pendência |
| --- | --- | --- | --- | --- |

Registre apenas respostas relevantes para o desenho, sem transcrever conteúdo pessoal ou
fabricar uma entrevista. Separe respostas recebidas de recomendações ainda não confirmadas.

## 5. Arquitetura e responsabilidades

Apresente visão geral e diagrama textual ou Mermaid, identificados como atuais ou propostos.
Explique fronteiras, direção das dependências, responsabilidade de cada parte, pontos de
entrada e o que não pertence a cada camada. Referencie as decisões que sustentam o desenho.
Sugira um `flowchart` Mermaid para visualizar componentes e dependências quando isso tornar
a arquitetura mais clara. Inclua uma explicação textual e os IDs das decisões relacionadas.

## 6. Linguagem, framework e ferramentas

| Tecnologia | Finalidade | Versão ou faixa proposta | Compatibilidade e fonte | Situação | Decisão |
| --- | --- | --- | --- | --- | --- |

Detalhe opções relevantes da linguagem, modo estrito, APIs do framework, renderização,
roteamento, carregamento e ferramentas. Separe configuração existente de proposta e
identifique APIs experimentais, limitações e condições para sua adoção.

## 7. Organização estrutural e convenções

Inclua uma árvore de diretórios proporcional ao escopo, com caminho relativo explícito e
distinção entre existente e proposto. Explique organização por funcionalidade, critérios de
compartilhamento, nomenclatura, visibilidade, modelos e regras de dependência. Não crie
camadas vazias nem uma plataforma genérica sem necessidade documentada.

## 8. Estado, dados e cálculos

Descreva modelos conceituais e contratos internos necessários, propriedade e ciclo de vida do
estado, valores derivados e mutações. Explique nulabilidade, identificadores, dinheiro, datas,
fontes demonstrativas e consistência. Registre regras de domínio pendentes e seus impactos.
Persistência e contratos externos só entram quando autorizados no escopo.
Sugira `classDiagram` Mermaid para relacionamentos entre modelos ou `stateDiagram-v2` para
estados e transições relevantes. Use `erDiagram` apenas quando pertinente ao desenho de dados
autorizado; um modelo conceitual não representa automaticamente um esquema de banco.

## 9. Fluxos técnicos e tratamento de falhas

Para cada fluxo crítico, descreva:

- Gatilho, entradas e pré-condições.
- Caminho entre componentes e responsabilidades.
- Validações, transições de estado e resultado observável.
- Erros, cancelamento, prevenção de duplicidade e consistência após a operação.
- Dependências de decisões e regras ainda abertas.

Sugira `flowchart` Mermaid para caminhos e ramificações e `sequenceDiagram` para a ordem das
interações entre participantes. Inclua caminhos alternativos importantes sem inventar
integrações. Use blocos `mermaid`, rótulos em português e identificadores próprios sem acentos;
identifique o fluxo como atual ou proposto e preserve sua explicação textual.

## 10. Interface, estilos, formulários e acessibilidade

Descreva componentes e limites de reutilização, abordagem de estilos e tokens, temas,
formulários, validação e mensagens. Cubra navegação, foco, teclado, modais, estados vazios,
ausência de resultados, erro, idioma, moeda e datas. Referencie decisões sem duplicá-las.

## 11. Bibliotecas e alternativas

| Necessidade | Biblioteca existente ou candidata | Alternativa nativa ou sem dependência | Impactos, licença e manutenção | Decisão |
| --- | --- | --- | --- | --- |

Justifique cada dependência, considere compatibilidade, tamanho, acessibilidade e risco de
abandono. Declare o que foi efetivamente consultado; não invente métricas ou auditorias.

## 12. Qualidade e plano de verificação

| Área ou requisito | Cenário e resultado esperado | Nível e ferramenta proposta | Método ou comando | Situação |
| --- | --- | --- | --- | --- |

Inclua testes de regras e arredondamentos quando pertinentes, datas e vencimentos, busca e
filtros, validação, duplicidade, cancelamento, pagamentos e acessibilidade. Explique critérios
de conclusão, análise estática e formatação. Separe plano de testes de testes executados.

## 13. Segurança, privacidade e desempenho

Descreva riscos proporcionais ao escopo, tratamento de dados sintéticos, limites de exposição
e requisitos de acessibilidade e desempenho verificáveis. Metas não medidas devem ser
identificadas como propostas. Não introduza autenticação, telemetria ou infraestrutura sem autorização.

## 14. Execução, entrega e evolução

Documente pré-requisitos, diretório de execução, comandos existentes ou propostos e artefatos
esperados. Registre limitações da demonstração e condições para evolução.

### Roadmap de implementação — obrigatório

Inclua sempre fases ordenadas que cubram o escopo técnico desenhado, inclusive em rascunhos e
revisões. Não substitua o roadmap por uma lista genérica de próximos passos. Use identificadores
estáveis como `FASE-001` e preencha a tabela com conteúdo específico do projeto.

| Fase | Objetivo e entregas | Dependências e bloqueios | Critérios verificáveis de conclusão | Estado da implementação |
| --- | --- | --- | --- | --- |

Referencie decisões, requisitos e pendências por seus IDs. Distribua testes e acessibilidade
pelas fases pertinentes. Explique a ordem, as possibilidades de trabalho paralelo e os casos
que aguardam decisão. Separe plano proposto de execução autorizada e resultados comprovados;
registre a falta de evidências sem presumir conclusão. Não invente prazos ou responsáveis.
Em entregas parciais, mantenha as fases propostas e sinalize seus bloqueios. O roadmap não
autoriza implementação.

### Evolução futura

Mantenha a arquitetura futura separada das fases do escopo atual e condicionada a nova
autorização. Não transforme tecnologias futuras em entregas obrigatórias do roadmap atual.

## 15. Registro central de decisões técnicas

### Índice

| ID | Tema | Escolha ou questão aberta | Situação da decisão | Estado da implementação | Dependências |
| --- | --- | --- | --- | --- | --- |

### DEC-001 — [Título da decisão]

- **Problema e contexto:**
- **Escopo e restrições:**
- **Alternativas consideradas:** vantagens, desvantagens e razões de descarte.
- **Escolha ou recomendação:**
- **Justificativa e contrapartidas:**
- **Consequências estruturais e operacionais:**
- **Origem:** resposta explícita, delegação, fonte normativa ou proposta do agente.
- **Fontes e requisitos relacionados:**
- **Situação:** Proposta / Confirmada / Pendente / Rejeitada / Substituída.
- **Estado da implementação e evidência:** Não implementada / Parcial / Implementada com
  evidência / Não verificada.
- **Dependências e condições de revisão:**
- **Forma de validação:**
- **Substitui ou é substituída por:** somente quando aplicável.

Repita o registro para cada decisão material. Mantenha IDs estáveis nas revisões; não duplique
o conteúdo completo em outras seções nem registre uma mesma escolha com situações conflitantes.

## 16. Riscos, hipóteses e pendências

| ID | Tipo | Descrição | Impacto | Decisões afetadas | Como resolver ou validar | Bloqueante? |
| --- | --- | --- | --- | --- | --- | --- |

Use `RIS-001`, `HIP-001` e `PEN-001`, sem reutilizar IDs. Para pendências, inclua a pergunta
necessária e o responsável somente se conhecido. Não transforme hipóteses em aprovação tácita.

## 17. Rastreabilidade e revisão documental

| Requisito ou restrição | Fontes | Decisões | Seção ou fluxo | Verificação planejada |
| --- | --- | --- | --- | --- |

Registre coerência, referências e compatibilidade conferidas, consultas não realizadas e
limitações. Explicite se o documento permanece rascunho por decisões abertas.

## 18. Histórico de revisões

| Revisão e data conhecida | Alteração | Decisões adicionadas ou substituídas | Origem da mudança |
| --- | --- | --- | --- |
