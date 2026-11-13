# Instruções para agentes

## Geral

- Sempre utilizar o sistema de questões de ambiente (Harness) ao ínves de fazer perguntas na resposta.

## Fluxo de trabalho obrigatório

Siga a ordem **PRD → TDD → SDD → pull request** para cada mudança, reutilizando os
artefatos existentes quando eles já cobrirem o escopo:

1. **PRD — requisitos de produto:** definir ou revisar problema, objetivos, escopo, requisitos
   e critérios de aceite. Referência atual: `docs/prd/vendas-em-aberto.md`.
2. **TDD — desenho técnico:** definir ou revisar arquitetura, decisões, dependências, roadmap
   de implementação e estratégia de verificação com base no PRD. Referência atual:
   `docs/tdd/tdd.md`. TDD significa Technical Design Document, não desenvolvimento orientado
   a testes.
3. **SDD — desenvolvimento orientado por especificações (Spec-Driven Development):** usar
   OpenSpec para transformar requisitos e decisões técnicas em proposta, especificações,
   desenho e tarefas da mudança. Revisar os artefatos antes de implementar; executar apenas
   tarefas autorizadas e verificar seus critérios de aceite. Manter rastreabilidade com PRD
   e TDD e registrar os resultados reais das verificações.
4. **Pull request:** após as etapas anteriores aplicáveis, apresentar a mudança para revisão,
   usando `.github/pull_request_template.md`. Referenciar os artefatos, resumir o escopo
   entregue, informar verificações realizadas e não executadas e explicitar limitações.

- Não iniciar implementação com requisitos ou decisões bloqueantes em aberto. Resolver as
  dependências dos casos afetados antes de executá-los; não inventar regras para avançar.
- Se uma decisão posterior alterar requisitos ou arquitetura, atualizar primeiro o PRD e/ou
  o TDD e depois os artefatos SDD afetados, preservando a coerência e os IDs existentes.
- Uma mudança apenas documental não autoriza implementar o que descreve. Não criar artefatos
  vazios para cumprir o fluxo: no PR, justificar etapas não aplicáveis e referenciar os
  documentos existentes que sustentam a alteração.
- Diferenciar planejamento, autorização e implementação comprovada. Não alegar testes,
  aprovação ou conclusão sem evidência. Durante uma mudança autorizada, o agente tem
  autonomia para criar commits, publicar a feature branch e abrir ou atualizar pull requests
  do escopo autorizado, sem pedir confirmação a cada operação. Essa autonomia não autoriza
  ampliar o escopo nem mesclar PR sem autorização explícita do usuário.

## Feature branches e integração na main

- Executar o fluxo completo **PRD → TDD → SDD → pull request** em uma feature branch
  dedicada à mudança, incluindo documentação, especificações, implementação e verificações.
  Não realizar alterações ou commits diretamente na `main`.
- Antes de iniciar as alterações, conferir a branch atual e o estado do diretório de trabalho.
  Criar a branch a partir da `main` atualizada ou reutilizar uma feature branch pertinente,
  com nome descritivo como `feature/cadastro-vendas`. Não descartar nem incorporar trabalho
  alheio silenciosamente; se houver alterações que impeçam a troca segura, pedir orientação
  pelo sistema de questões do Harness.
- Manter os commits restritos ao escopo da mudança e abrir o pull request da feature branch
  para a `main`, usando o template padrão e as referências de PRD, TDD e SDD.
- Dentro de cada Change do OpenSpec, criar commits individuais por funcionalidade
  desenvolvida, assim que ela estiver coerente e suas verificações aplicáveis tiverem sido
  executadas. Não acumular funcionalidades independentes em um único commit grande ao final
  da Change. Incluir no commit da funcionalidade seus testes e atualizações de documentação
  e tarefas correspondentes; separar alterações de planejamento ou documentação independentes
  em commits próprios. Não incluir alterações alheias no staging ou nos commits.
- Seguir o padrão já utilizado no histórico para as mensagens de commit: prefixo de tipo
  seguido de dois-pontos e descrição objetiva, em português, do que foi realizado, como
  `feat: adicionar cadastro de vendas` e `docs: atualizar regras de commits por funcionalidade`.
  Usar tipos adequados ao conteúdo, como `feat`, `fix`, `docs`, `refactor`, `test` e `chore`,
  evitando mensagens genéricas que não identifiquem a entrega.
- Integrar na `main` por meio do pull request, somente após as verificações aplicáveis,
  revisão e aprovação exigidas pelo repositório e autorização explícita do usuário para
  mesclar. Não contornar proteções da branch nem substituir o PR por push direto na `main`.
- Após a integração, conferir o estado do PR e a presença da mudança na `main` antes de
  informar conclusão. Se publicação, revisão ou merge estiverem bloqueados ou não autorizados,
  informar a etapa pendente sem alegar que o fluxo foi concluído.
- Uma solicitação apenas para documentar esse processo autoriza a edição documental, mas
  não aciona, por si só, a autonomia operacional descrita acima para criar branches, fazer
  commits ou publicar pull requests. A autonomia se aplica ao executar mudanças autorizadas,
  não à implementação das funcionalidades apenas descritas nos documentos. O merge continua
  dependendo de autorização explícita do usuário.
