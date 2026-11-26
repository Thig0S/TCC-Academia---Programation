# Tasks

## 1. Tornar a resolução do MSTest independente da solução temporária

- [ ] 1.1 Fixar `MSTest.Sdk/4.5.3` nos dois projetos de teste e conferir que a versão coincide com `backend/global.json`.
- [ ] 1.2 Documentar abertura da solução `backend/VendasEmAberto.slnx`, comandos de restore/teste e requisito de SDK .NET 10.0.404 (ou patch permitido), conferindo comandos e paths.

## 2. Verificação integrada

- [ ] 2.1 Executar restore, build e testes da solução a partir de `backend/`, validar a Change com OpenSpec e `git diff --check`; registrar resultados efetivos e limitações.
