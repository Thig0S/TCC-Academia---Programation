# Orientações para o Vendas em Aberto

Este documento se aplica a todo o repositório. Instruções específicas em diretórios descendentes podem complementar estes padrões. Preserve o README, as entrevistas e os artefatos OpenSpec; diferencie sempre decisões planejadas de funcionalidades implementadas.

## Estado atual e limite do MVP

- O projeto está em planejamento: ainda não há aplicação Angular, manifesto de dependências ou testes de implementação.
- A etapa atual é um MVP visual para validação com a equipe da ótica, usando somente dados sintéticos e estado em memória.
- O frontend será Angular + TypeScript. Não adicione backend, banco, autenticação, integrações ou persistência nesta etapa sem uma nova solicitação explícita.
- Mostre que se trata de uma demonstração e que alterações são perdidas ao recarregar.
- A estrutura abaixo é uma direção para implementação, não uma descrição de arquivos já existentes.

## Arquitetura futura

```text
Tauri: janela nativa do aplicativo Windows
                    |
Angular + TypeScript: interface
                    |
C# / ASP.NET Core: regras e validacoes
                    |
SQLite: banco local
```

- Tauri hospedará a interface desktop; não é o responsável pelas regras financeiras.
- Angular cuidará de telas, formulários, listagens, filtros e navegação.
- ASP.NET Core será responsável pelas regras de negócio, validações definitivas e gerenciamento dos crediários.
- SQLite armazenará clientes, vendas, parcelas e pagamentos localmente, com acesso mediado pelo backend.
- Não implemente essas camadas futuras no MVP visual. A forma de comunicação e o gerenciamento do processo .NET pelo aplicativo desktop serão definidos em uma mudança posterior.
- Mantenha dados demonstrativos e cálculos simulados fora dos componentes. Eles não substituem as futuras validações do backend nem justificam acesso direto ao banco pela interface.

## Idioma obrigatório

- Escreva identificadores próprios, comentários, documentação, validações, textos de interface e acessibilidade em português brasileiro.
- Use identificadores sem acentos ou cedilha: `descricao`, `clienteSelecionado`, `estaSalvando`. Textos e comentários devem ter acentuação normal e codificação UTF-8.
- Preserve nomes impostos por Angular, TypeScript, RxJS, navegador e dependências, como `Component`, `signal`, `computed`, `inject`, `HttpClient`, `Router`, `Observable`, `ngOnInit`, `templateUrl` e `providedIn`.
- Preserve propriedades de contratos externos quando existirem; se necessário, converta-as para modelos internos em português na fronteira da aplicação. Não invente contratos para o backend futuro.
- Não traduza propriedades CSS, atributos HTML, APIs de acessibilidade, comandos npm, classes de bibliotecas ou nomes convencionais de configuração e entrada.
- Preserve a identidade Vendas em Aberto. Não faça substituições textuais indiscriminadas.
- Preserve os títulos estruturais e palavras normativas exigidos pelo esquema OpenSpec, como `Requirement`, `Scenario`, `SHALL` e `MUST`.

## Organização recomendada

Agrupe componentes, contratos e serviços por funcionalidade. A árvore é relativa à pasta `src/app` do frontend que será criado; não pressupõe uma pasta de aplicação já existente.

```text
src/app/
  nucleo/
    configuracao/
    demonstracao/
  compartilhado/
    componentes/
      barra-navegacao/
      cabecalho/
      indicador-resumo/
      selo-situacao/
      modal/
  funcionalidades/
    clientes/
      listar-clientes/
      cadastrar-cliente/
      detalhes-cliente/
      cliente.modelos.ts
    vendas/
      listar-vendas/
      cadastrar-venda/
      editar-venda/
      detalhes-venda/
      venda.modelos.ts
    parcelas/
      listar-parcelas/
      registrar-pagamento/
      parcela.modelos.ts
    visao-geral/
    relatorios/
    configuracoes/
```

- Crie somente diretórios e componentes necessários; não gere camadas vazias, um repositório abstrato ou uma plataforma genérica de tabelas.
- A fonte demonstrativa compartilhada pode ficar em `nucleo/demonstracao`; utilitários de um domínio ficam junto da funcionalidade correspondente.
- Não duplique modelos equivalentes. Compartilhe tipos somente quando semântica e nulabilidade forem iguais.
- `app.config.ts`, `app.routes.ts`, `main.ts` e demais arquivos convencionais podem manter seus nomes.
- Não altere manualmente `node_modules`, `.angular`, `dist` ou arquivos de saída e cache.

## Nomenclatura

| Elemento | Convenção | Exemplos |
| --- | --- | --- |
| Arquivos e pastas próprios | kebab-case | `listar-vendas/`, `listar-vendas.ts`, `listar-vendas.html`, `cliente.modelos.ts` |
| Classes, interfaces e tipos | PascalCase | `ListarVendas`, `ServicoDemonstracao`, `Cliente`, `Pagamento` |
| Variáveis, parâmetros, métodos e funções | camelCase | `clienteSelecionado`, `parcelasFiltradas`, `obterPorId`, `registrarPagamento` |
| Estados booleanos | Intenção explícita | `estaSalvando`, `formularioValido`, `possuiParcelasVencidas` |
| Constantes de módulo e tokens | UPPER_SNAKE_CASE | `DATA_REFERENCIA`, `FORMAS_PAGAMENTO` |
| Seletores próprios | `app-` e kebab-case | `app-listar-vendas`, `app-registrar-pagamento` |

Prefira termos do domínio, como `cliente`, `venda` e `parcela`, a nomes vagos como `item`, `data` ou `model`. `id`, HTTP e API são termos técnicos aceitos.

## Componentes, estado e templates

- Use componentes standalone, HTML separado e imports explícitos das dependências do template.
- Prefira `inject()`; use `private readonly` para dependências internas, `protected` para membros de template e `readonly` para referências a signals que não serão reatribuídas.
- Use `signal` para estado mutável e `computed` para valores derivados. Reserve `effect` para efeitos necessários; não copie estado derivável entre signals.
- Use `@if` e `@for`, com identificadores estáveis em `track`, como `track parcela.id`.
- Carregue páginas sob demanda com `loadComponent` quando adequado. Rotas próprias devem usar português e kebab-case, como `vendas/cadastrar` e `vendas/editar/:id`.
- Se parâmetros de rota forem vinculados a inputs, mantenha o nome `id` coerente com a rota e habilite a configuração correspondente do roteador.
- Diferencie coleção vazia, ausência de resultados de filtros e falha. Apresente carregamento apenas quando houver operação que o justifique; não simule rede desnecessariamente.
- Use `lang="pt-BR"`, moeda BRL e datas DD/MM/AAAA na apresentação.
- Associe rótulos aos campos, nomeie botões de ícone e preserve `aria-expanded`, `aria-pressed` e demais atributos aplicáveis.
- Situações devem ter texto além da cor. Modais devem gerenciar foco, Escape e retorno ao acionador.
- Siga o tema claro do README e reutilize tokens visuais; não adicione dependências visuais grandes sem necessidade.

## Formulários e operações

- Use Signal Forms em novos formulários, com API compatível com a versão Angular adotada. Centralize valores iniciais e valide também no caminho de envio, mesmo com botão desabilitado.
- Mostre validações em português junto aos campos e revele os erros de campos inválidos ao tentar confirmar, preservando os valores preenchidos.
- Impeça submissões duplicadas e restaure o estado de salvamento tanto no sucesso quanto na falha. Para operações locais síncronas, não introduza RxJS apenas para controlar esse estado.
- Declare tipos públicos de retorno e mantenha cadastro, edição e recebimento na fonte demonstrativa, não nos componentes de apresentação.
- Cancelar não deve alterar os registros; uma falha não deve ser apresentada como sucesso nem deixar alterações parciais.
- Use valores monetários em centavos inteiros e datas civis sem deslocamento indevido de fuso. Centralize os cálculos simulados e teste arredondamento, vencimentos e saldos.
- Não utilize dados pessoais reais. Restrições demonstrativas não devem ser apresentadas como regras confirmadas da loja.

## Orientações para integração futura

- Quando autorizada, mantenha comunicação HTTP em serviços e centralize configuração da API, sem segredos no frontend.
- Não acesse SQLite diretamente pelo Angular. As validações financeiras definitivas e a persistência caberão ao backend.
- Não presuma endpoints, campos HTTP, autenticação, portas, mecanismo de inicialização do backend ou estratégia de empacotamento antes do planejamento dessa etapa.
- Em futuros fluxos RxJS, trate erros antes de converter consultas para signals, use `switchMap` quando a consulta depender de parâmetros e `takeUntilDestroyed` em assinaturas duradouras vinculadas ao componente.
- Em futuras mutações HTTP, restaure o estado de envio também no erro, usando `finalize` quando aplicável. Diferencie corpo nulo, texto e falha de rede ao extrair mensagens de erro.

## Comandos e verificação

- Ainda não existe pasta de aplicação ou scripts npm neste repositório. Após criar o frontend, execute seus comandos na pasta que contém `package.json` e documente esse caminho.
- Confira scripts e configurações antes de executar. Com scripts correspondentes e lockfile presentes, os comandos esperados no Windows são:

```powershell
npm.cmd ci
npm.cmd start
npm.cmd run build
npm.cmd test -- --watch=false
```

- Ao criar a base, configure versões compatíveis, lockfile, UTF-8, indentação de dois espaços, aspas simples e largura de formatação de 100 caracteres. Habilite verificação estrita de TypeScript e templates no projeto novo.
- Não alegue cobertura, lint ou testes inexistentes. Scripts disponíveis não comprovam que foram executados com sucesso.
- Para alterações de código, execute build e testes pertinentes. Priorize busca, filtros, validações, envios duplicados, parcelas e consistência dos pagamentos simulados.
- Para mudanças de interface, confira navegação, estados vazios, erros aplicáveis, envio inválido, cancelamento e acessibilidade das telas afetadas.
- Para mudanças apenas em documentação e planejamento, revise coerência, caminhos e exemplos e valide o OpenSpec quando aplicável; não é necessário compilar uma aplicação inexistente.
- Informe o que foi alterado, verificado e não executado. Não apresente planos como funcionalidades implementadas.
