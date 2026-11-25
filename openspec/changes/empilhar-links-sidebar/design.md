# Design

## Context

Ver `proposal.md`. Em `BarraNavegacao`, o `<nav>` externo já usa coluna flexível, mas o contêiner de cada módulo não; os links administrativos são âncoras inline irmãs. O primeiro link principal continua sendo o alvo de `.modulo-ativo > .nav-link:first-child`, então o grupo novo deve permanecer abaixo desse link e dentro do mesmo contêiner com `routerLinkActive`.

## Goals / Non-Goals

**Goals:**
- Empilhar visualmente os três subdestinos com uma estrutura de layout local e verificável.
- Preservar foco/tabulação, links, `aria-current`, realce do módulo e os estilos atuais.

**Non-Goals:**
- Alterar rotas, comportamento de navegação, coleções, ícones dos módulos principais ou regras de negócio.
- Redesenhar a barra lateral ou adicionar dependências.

## Decisions

- Agrupar somente Quitadas, Inativas e Prejuízo em um contêiner `flex flex-col` no template. Cada âncora continua na ordem DOM atual e conserva classes, destinos e comportamento de rota; o contêiner não altera o seletor do link principal ativo.
- Preferir o contêiner vertical a depender de `inline`/quebras de linha ou repetir `block` nas três âncoras: a direção fica explícita e a largura dos links é esticada pelo comportamento padrão do flex, mantendo alvos de interação consistentes.
- Verificar o posicionamento por bounding boxes no E2E para os três destinos em duas larguras e dois temas; manter as verificações existentes de semântica de rota e teclado.

## Risks / Trade-offs

- **[Risco]** O grupo pode aumentar ligeiramente a altura da navegação. → Os links já têm `mt-1`; conferir acesso ao perfil e ausência de corte nas larguras suportadas.
- **[Risco]** A nova caixa de layout poderia afetar regras de estado ativo ou hover. → Manter o primeiro link como filho direto do contêiner de módulo e validar foco/rota nos testes.

## Migration Plan

Sem migração de dados ou configuração; alteração de template reversível. Nenhuma rota ou URL muda.
