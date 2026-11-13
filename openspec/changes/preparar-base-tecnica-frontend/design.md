# Design

## Context

Ver motivação e recorte em `proposal.md`. O contrato observável está em
`specs/demonstracao-inicial/spec.md`; a autoridade técnica permanece no TDD v1.3,
DEC-001/002/003/008/009/013/014 e roadmap FASE-001/002.

Na inspeção de 12/11/2026, `frontend/` contém diretórios `src/`, `public/`, `.vscode/`,
`dist/` e `.angular/`, mas a busca de arquivos, inclusive ocultos, não encontrou fonte,
manifesto, testes ou configuração. Não há implementação a migrar comprovada. O Node.js
local informa 24.21.0; isso não comprova instalação compatível das outras ferramentas.
O `.gitignore` da raiz não cobre saídas Angular ou dependências; a base precisará de
regras locais de exclusão em `frontend/.gitignore`.

O `AGENTS.md` atual trata do fluxo de entrega e não mais da antiga orientação de tema claro.
PRD e TDD ainda divergem sobre temas. Esta mudança não resolve a divergência nem implementa
temas. A compilação do CSS Bootstrap não equivale à entrega da FASE-003.

## Goals / Non-Goals

**Goals:**
- Base pequena e reproduzível que permita verificar build estrito, inicialização zoneless,
  compilação Sass e três níveis mínimos de teste antes das funcionalidades.
- Artefatos novos apenas quando necessários, com comandos reais documentados no frontend.
- Separar decisões já confirmadas de resolução mecânica de patches e resultados ainda ausentes.

**Non-Goals:**
- Não criar antecipadamente a árvore completa da seção 7 do TDD ou serviços sem consumidor.
- Não criar rotas funcionais, estado comercial, componentes compartilhados vazios ou formulários.
- Não usar um smoke test como aprovação de CA-001 a CA-022 do MVP, suporte móvel ou WCAG.

## Decisions

### Base standalone estrita, sem migração destrutiva

Aplicar DEC-002/003/009: Angular/CLI 22.x alinhados, TypeScript `>=6.0.0 <6.1.0`,
Node.js `>=24.15.0 <25.0.0`, npm e `package-lock.json`. Usar `bootstrapApplication`,
configuração standalone, HTML separado e SCSS, com tipos e templates estritos, sem ZoneJS,
SSR, PWA ou providers HTTP de dados. Manter configuração de rotas vazia, se necessária ao
scaffold, sem entregar navegação funcional. Evitar flags antigas copiadas de outras majors.

Preferir geração da base em diretório temporário isolado e transferência apenas dos arquivos
necessários após comparar os destinos; não executar geração forçada sobre `frontend/`.
Alternativas descartadas: sobrescrever a pasta para simplificar o scaffold; criar manualmente
configuração extensa sem referência da CLI; usar outra major sem decisão explícita.

Arquivos previstos, a ajustar somente se a CLI compatível exigir nomes convencionais diferentes:

```text
frontend/
  .gitignore
  .prettierrc.json
  .prettierignore
  README.md
  package.json
  package-lock.json
  angular.json
  tsconfig*.json
  playwright.config.ts
  e2e/demonstracao-inicial.spec.ts
  src/
    main.ts
    index.html
    styles.scss
    app/
      app.ts
      app.html
      app.scss
      app.config.ts
      app.routes.ts              (somente se necessário)
      app.spec.ts
```

Testes unitários adicionais podem ficar junto ao componente, sem fabricar utilitários de
negócio apenas para ampliar cobertura. Não gerar pastas de domínio nesta fase.

### Dependências verificadas antes da instalação definitiva

TDD/PEN-015 é uma checagem explícita da execução, não licença para escolher qualquer versão.
Consultar metadados oficiais e documentação do patch selecionado; conferir engines, peers,
disponibilidade estável e licenças diretas de Angular/CLI/build, TypeScript, RxJS quando
exigido, Bootstrap 5.3.x, Sass, Vitest, jsdom, Playwright e Prettier. Registrar tabela de
versões resolvidas, npm utilizado, fontes e limitações em `frontend/README.md`.

Gerar lockfile pela ferramenta, sem edição manual; fixar dependências diretas nas versões
resolvidas e registrar a versão de npm no manifesto. Se não existir combinação compatível,
parar antes de criar manifesto definitivo ou instalar com `--force`/`--legacy-peer-deps`.
Não contornar engines nem substituir Angular 22, TypeScript 6 ou Bootstrap 5.3 por outra linha.
Alternativa de “latest” irrestrito é rejeitada por tornar o plano não reproduzível.

### Página mínima e Sass, sem antecipar direção visual

O componente raiz apresenta `h1` com a identidade, explicação da base técnica e aviso
especificado. Documento com `lang="pt-BR"`; sem ativos remotos, dados pessoais ou gravações.
Incluir Bootstrap uma única vez pelo pipeline global SCSS e usar um contêiner/utilitário
estático na página para permitir verificar aplicação real dos estilos, sem plugins JS,
Popper, bibliotecas de componentes Angular ou controle de tema. Não implementar tokens de
marca nem alternância. O estilo padrão da base não concilia PRD/PEN-006.

Registrar warnings Sass de terceiros e sua origem; não esconder falhas de compilação ou
substituir a verificação Sass por CSS pré-compilado sem revisão do desenho. Alternativas:
CDN (rejeitada por dependência remota); plugins Bootstrap (rejeitados por controle concorrente
de interação); design completo (adiado à FASE-003).

### Automações mínimas proporcionais — DEC-008/014

Scripts propostos em `frontend/package.json`, indisponíveis até implementação:

| Script | Responsabilidade | Verificação futura no Windows |
| --- | --- | --- |
| `start` | Servidor Angular local | `npm.cmd start` |
| `build` | Build de produção com checagem estrita | `npm.cmd run build` |
| `test` | Runner Vitest integrado à CLI, com TestBed/jsdom | `npm.cmd test -- --watch=false` |
| `test:e2e` | Playwright Test | `npm.cmd run test:e2e` |
| `format` | Prettier em arquivos do frontend | `npm.cmd run format` |
| `format:check` | Checagem Prettier, sem escrita | `npm.cmd run format:check` |

Prettier usa dois espaços, aspas simples e largura 100; ignora dependências, lockfile,
caches, saídas, relatórios e resultados de teste. Não formatar documentação da raiz
incidentalmente. Sem script de lint ou promessa de análise que não exista.

Vitest testa renderização do componente e uma atualização de signal em fixture zoneless,
usando um host de teste se a página estática não precisar de estado. Esperar estabilização
sem mascarar falhas reativas com detecção forçada. Acrescentar caso unitário independente
para o mesmo comportamento reativo sem criar regra comercial de teste.

Playwright usa `webServer` no topo da configuração e `baseURL` coincidentes em
`http://127.0.0.1:4200`, com servidor restrito ao loopback. Executar dois projetos Chromium,
1366 × 768 e 390 × 844; viewport pequeno não significa emulação de aparelho. Não reutilizar
servidor desconhecido para evitar falso positivo. A instalação do Chromium correspondente
ao runner será documentada e executada na fase de implementação, não neste planejamento.

E2E verifica todos os cenários da delta, recarga, título semântico, aviso, idioma, ausência
de corte horizontal, ausência de chamadas de dados/CDN, cookies e storage. A captura de rede
distingue recursos locais e canal da ferramenta de desenvolvimento de APIs de dados.
Monitorar `pageerror` e erros inesperados de console nos dois projetos. Não alegar teste de
pagamentos, diálogos, teclado de formulários ou persistência de mutações inexistentes.

### Rastreabilidade e bloqueios por fase

| Item | Fonte | Tratamento nesta mudança |
| --- | --- | --- |
| Identidade, aviso, pt-BR e isolamento | PRD/RF-011; RNF-001/004/010; delta `demonstracao-inicial` | Página técnica e testes; sem declarar CA-021 completo |
| Estrutura e tipos estritos | PRD/RNF-008; TDD/DEC-002/003/009 | Build e revisão de fonte/configuração |
| Testes e formatação | TDD/DEC-008/014; PEN-015/016 | Versões verificadas, configuração mínima e execuções registradas |
| Bootstrap | TDD/DEC-013 | Dependência, Sass e aplicação estática mínima, não identidade visual |
| Temas | PRD/PEN-006; TDD/PEN-006 e DEC-006 | Aberto, bloqueia FASE-003; nenhuma conciliação implícita |
| Regras comerciais e conteúdo | PRD/PEN-001 a PEN-005, PEN-007 a PEN-012 | Fora do recorte, bloqueiam apenas fases afetadas |
| Avaliação de produto | PRD/PEN-013/014 | Aberta; ambiente smoke não equivale a aceite pela ótica |

## Risks / Trade-offs

- [Combinação de versões incompatível] → Conferir metadados antes da instalação; bloquear
  a tarefa com evidências e pedir nova decisão, nunca reduzir major silenciosamente.
- [Pastas existentes interpretadas como descartáveis] → Comparação prévia por arquivo;
  preservar `.vscode/`, `public/`, `dist/` e `.angular/`; pedir orientação se houver colisão.
- [Smoke verde interpretado como MVP concluído] → Evidências limitadas à base e matriz
  explícita de critérios não atendidos; FASE-001 global permanece parcial.
- [Warnings Sass de dependências] → Registrar origem e impacto, distinguindo warning de erro;
  não ocultar incompatibilidade como se fosse build válido.
- [Disponibilidade do binário Chromium ou porta 4200] → Registrar o bloqueio real e não
  marcar E2E aprovado sem execução; não conectar a servidor alheio para contorná-lo.
- [Cobertura estreita] → Chromium em dois viewports valida só a página inicial; outros motores,
  compatibilidade de produto e regressão completa permanecem nas fases correspondentes.

## Migration Plan

Não há dados ou implantação de produção a migrar. Após novo pedido explícito de apply:
verificar novamente a branch/colisões e compatibilidade, criar a base isoladamente, integrar
os arquivos necessários, configurar verificações e executar instalação pelo lockfile,
build, formatação e testes. Registrar resultados reais em `frontend/README.md` e nas tarefas.

Em falha, interromper o avanço e preservar trabalho preexistente; correção ou remoção fica
restrita aos arquivos próprios da mudança e ao escopo autorizado. Não apagar saídas antigas
nem redefinir branches. PR futuro deve usar o template do repositório com referências ao
PRD/TDD/SDD, limitações e verificações não executadas. Publicação e merge exigem autorização
específica e não fazem parte deste planejamento.
