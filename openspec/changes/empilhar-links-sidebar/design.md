# Design

## Context

Ver `proposal.md`. Em `BarraNavegacao`, o `<nav>` externo já usa coluna flexível, mas o contêiner de cada módulo não; os links administrativos são âncoras inline irmãs. O primeiro link principal continua sendo o alvo de `.modulo-ativo > .nav-link:first-child`, então o grupo novo deve permanecer abaixo desse link e dentro do mesmo contêiner com `routerLinkActive`.

## Goals / Non-Goals

**Goals:**
- Empilhar visualmente os três subdestinos com espaço consistente entre eles e ícones de reconhecimento próprios.
- Preservar foco/tabulação, links, `aria-current`, realce do módulo e os estilos atuais.

**Non-Goals:**
- Alterar rotas, comportamento de navegação, coleções, ícones dos módulos principais ou regras de negócio.
- Redesenhar a barra lateral ou adicionar dependências.

## Decisions

- Agrupar somente Quitadas, Inativas e Prejuízo em um contêiner `flex flex-col gap-2` no template. Cada âncora continua na ordem DOM atual e conserva destinos e comportamento de rota; o contêiner não altera o seletor do link principal ativo.
- Preferir o contêiner vertical a depender de `inline`/quebras de linha ou repetir `block` nas três âncoras: a direção fica explícita e a largura dos links é esticada pelo comportamento padrão do flex, mantendo alvos de interação consistentes.
- Usar SVG inline de 16 px para cada coleção: círculo com check para Quitadas, arquivo/pausa para Inativas e triângulo de alerta para Prejuízo. Todos são decorativos (`aria-hidden="true"`, `focusable="false"`), com rótulos textuais mantendo o nome acessível.
- Verificar bounding boxes, gap, ordem e ícones no E2E para as três coleções em duas larguras e dois temas; manter as verificações existentes de semântica de rota e teclado.

## Risks / Trade-offs

- **[Risco]** Espaçamento e ícones aumentam a altura do grupo. → Manter ícones compactos e conferir acesso ao perfil, overflow e ausência de corte nas larguras suportadas.
- **[Risco]** A nova caixa de layout poderia afetar regras de estado ativo ou hover. → Manter o primeiro link como filho direto do contêiner de módulo e validar foco/rota nos testes.

## Migration Plan

Sem migração de dados ou configuração; alteração de template reversível. Nenhuma rota ou URL muda.
