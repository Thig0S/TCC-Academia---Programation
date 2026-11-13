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
  aprovação ou conclusão sem evidência, nem abrir, publicar ou mesclar PR sem solicitação
  explícita do usuário.

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
- Integrar na `main` por meio do pull request, somente após as verificações aplicáveis,
  revisão e aprovação exigidas pelo repositório e autorização explícita do usuário para
  mesclar. Não contornar proteções da branch nem substituir o PR por push direto na `main`.
- Após a integração, conferir o estado do PR e a presença da mudança na `main` antes de
  informar conclusão. Se publicação, revisão ou merge estiverem bloqueados ou não autorizados,
  informar a etapa pendente sem alegar que o fluxo foi concluído.
- Uma solicitação para documentar esse processo não autoriza, por si só, criar branches,
  fazer commits, publicar ou mesclar pull requests.
