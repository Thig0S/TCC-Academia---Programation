# Tasks

Apply autorizado após revisão Harness. Referências: PRD “Publicação demonstrativa no GitHub Pages”, TDD “Deploy automatizado no GitHub Pages”, `proposal.md`, `design.md` e spec `publicacao-github-pages`. O deploy em produção ainda depende de integração na `main`.

## 1. Workflow e build

- [x] 1.1 Criar workflow com gatilho `push` em `main`, instalação reprodutível, Node compatível, build de produção e permissões mínimas; conferir que branches/PRs não disparam deploy automático.
- [x] 1.2 Configurar base path do projeto e produzir fallback de rota; verificar saída real do Angular e assets no subcaminho. Corrigida a referência da logo para caminho relativo e incluído teste de resolução no subcaminho.
- [x] 1.3 Publicar artefato via GitHub Pages Actions com ambiente e concorrência adequados; validar estrutura do YAML e artefato localmente.

## 2. Configuração e verificação

- [x] 2.1 Configurar Pages do repositório para source `GitHub Actions`; API confirmou URL e HTTPS habilitado.
- [ ] 2.2 Build local, caminhos e fallback verificados; após integração na `main`, conferir execução do workflow, URL, assets e acesso direto a rota.
- [x] 2.3 Registrar configuração/resultados locais em `frontend/README.md` e validar OpenSpec; deploy real segue pendente após integração.

## 3. Entrega

- [x] 3.1 Revisar escopo/diff e abrir um único PR para `main` usando `.github/pull_request_template.md`; PR #29 aberto para validação/revisão.
- [ ] 3.2 Não mesclar sem autorização explícita; confirmar estado remoto após integração antes de declarar deploy concluído.
