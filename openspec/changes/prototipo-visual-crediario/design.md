# Design

## Context

Ver `proposal.md` para motivação e escopo. O projeto ainda não possui código frontend, manifesto de dependências ou testes de implementação. Angular + TypeScript foi confirmado pelo usuário, assim como a evolução futura para aplicativo Windows com Tauri, backend C# / ASP.NET Core e SQLite local. O `AGENTS.md` estabelece os padrões do projeto; sua organização recomendada ainda não foi implementada.

As entrevistas descrevem uma planilha auxiliar a sistemas da franquia. O protótipo não substitui esses sistemas e não resolve a dupla digitação por integração. A conversa confirmou o objetivo visual e a ocorrência de clientes não localizados, mas não a causa desses episódios. Não há planilha nem capturas de referência disponíveis no repositório.

## Goals / Non-Goals

**Goals:**
- Permitir uma apresentação reproduzível, com os fluxos principais completos e dados consistentes entre telas.
- Manter uma fronteira simples entre a interface, o estado demonstrativo e cálculos testáveis para posterior evolução.
- Entregar primeiro a base visual e a busca, depois os formulários e módulos secundários.

**Non-Goals:**
- Implementar Tauri, ASP.NET Core ou SQLite, ou definir contratos HTTP, autorização, auditoria operacional e detalhes de execução do backend futuro.
- Criar uma plataforma genérica de tabelas ou antecipar todas as regras reais de crediário.

## Decisions

### 1. Aplicação Angular standalone e TypeScript

Adotar Angular standalone com templates HTML separados, roteamento do próprio framework, signals para estado local, Signal Forms nos formulários e estilos CSS com tokens compartilhados. A documentação oficial consultada via Context7 confirma bootstrap standalone, rotas, estado derivado com computed e validação de Signal Forms no envio. Usar uma versão estável compatível com essas APIs e com Node, registrar versões e lockfile e habilitar verificação estrita de TypeScript e templates na implementação.

Motivo: atende à stack confirmada e fornece componentes, formulários e navegação sem bibliotecas extras de estado. Uma alternativa com outro framework foi descartada por divergir da arquitetura definida. Não adicionar SSR, Tailwind ou um framework visual grande: CSS é suficiente para este recorte e evita ampliar dependências.

### 2. Organização por funcionalidades

Organizar a aplicação em `src/app/nucleo/demonstracao`, `nucleo/configuracao`, `compartilhado/componentes` e `funcionalidades/{vendas,clientes,parcelas,visao-geral,relatorios,configuracoes}`, criando somente pastas utilizadas. Manter modelos e cálculos de cada domínio junto da funcionalidade; a fonte de dados demonstrativa compartilhada fica no núcleo. Compartilhar somente componentes realmente repetidos: cabeçalho, indicadores, selos de situação, filtros e modal acessível. Preferir tabelas semânticas específicas em vez de um motor genérico configurável.

Usar arquivos e pastas próprios em português e kebab-case, classes em PascalCase, membros em camelCase, constantes em UPPER_SNAKE_CASE e seletores `app-` em kebab-case. Exemplos: `listar-vendas.ts`, `cliente.modelos.ts`, `ServicoDemonstracao`, `clienteSelecionado` e `app-registrar-pagamento`. Preservar APIs de dependências e arquivos convencionais como `main.ts` e `app.routes.ts`. Manter UTF-8, dois espaços, aspas simples e largura de formatação de 100 caracteres.

Componentes usarão imports explícitos, `inject()`, dependências `private readonly`, membros de template `protected` e referências a signals `readonly`. Usar `@if`, `@for` e rastreamento por identificadores estáveis; `computed` deriva valores sem cópias por `effect`. As rotas serão em português, com páginas carregadas por `loadComponent` quando adequado. Não criar camadas vazias nem acrescentar gerenciamento de estado externo.

```text
Telas e formularios
        |
        v
Estado demonstrativo compartilhado
        |
        +--> dados ficticios separados
        +--> calculos de parcelas, saldos e situacoes
```

Um serviço de demonstração com operações tipadas de consulta, cadastro, edição e recebimento mantém o estado em memória. Componentes não importam dados fictícios diretamente. Uma futura integração poderá substituir essa fonte, sem prometer compatibilidade automática com contratos ainda não definidos. Não criar endpoints fictícios nem camada genérica de repositórios.

### 2.1. Fronteiras para a evolução desktop

```text
Tauri: janela Windows
        |
Angular + TypeScript: apresentacao
        |
ASP.NET Core / C#: regras e validacoes definitivas
        |
SQLite: persistencia local
```

No MVP, os cálculos e validações em TypeScript apenas simulam o comportamento necessário à apresentação. Na evolução, a autoridade sobre regras financeiras, consistência e persistência pertencerá ao backend. Angular não acessará SQLite diretamente; Tauri hospedará a interface, sem assumir regras de negócio. Não adicionar SDK Tauri, projeto .NET, driver SQLite ou acesso nativo nesta mudança.

A alternativa de persistir diretamente pelo frontend foi descartada por contrariar a separação definida. Comunicação entre as camadas, inicialização e encerramento do processo .NET, empacotamento e atualização do aplicativo serão decisões de uma mudança posterior; não são requisitos para validar o visual no navegador agora.

### 3. Dados normalizados e cálculos únicos

Clientes possuem identificador, nome, CPF e telefone; vendas referenciam o cliente e guardam data, total e observações; parcelas referenciam a venda e guardam número, valor, vencimento e pagamento opcional com data e forma. Usar identificadores estáveis, valores em centavos inteiros e datas civis no formato interno AAAA-MM-DD, sem conversão UTC que altere o dia exibido.

Saldo, situação, quantidade paga e indicadores são derivados da mesma coleção de parcelas; não armazenar cópias independentes desses totais. Distribuir o resto da divisão na última parcela. Vencimentos mensais preservam o dia original e limitam ao último dia quando necessário, evitando que fevereiro faça março herdar dia 28.

### 4. Demonstração reproduzível

Usar uma data de referência fixa e visível, inicialmente 11/11/2026, para atraso, mês dos recebimentos e data sugerida de pagamento. Fixtures devem conter 12 vendas, homônimos ou nomes semelhantes, cliente com múltiplas vendas, situações distintas e pagamentos anteriores. Usar exclusivamente dados sintéticos; não copiar dados pessoais reais da loja.

Alternativa rejeitada: usar datas dependentes do relógio real, que faria os exemplos de atraso e os testes envelhecerem. Recarregar restaura as fixtures; não usar localStorage ou banco. Mostrar aviso permanente de demonstração e perda de alterações ao recarregar.

### 5. Busca global separada dos filtros

O campo do cabeçalho abre um painel de resultados agrupados em Clientes e Vendas, independentemente da tela ou filtros ativos. Normalizar nome removendo acentos e caixa, aparando e consolidando espaços; comparar CPF usando somente dígitos, sem executar busca numérica vazia contra todos os CPFs. Busca vazia fecha o painel; selecionar resultado abre seu detalhe. Não implementar busca aproximada ou correção de nomes nesta fase.

Filtros locais de Vendas têm período e situação visíveis com Limpar filtros e contagem. Clientes tem busca local; Parcelas tem filtro de situação. Compartilhar a lógica de normalização, não os estados dos filtros. Separar essas buscas evita que um filtro de atraso esconda um resultado global e reproduza a dor relatada. Telefone e identificação da venda podem ser acrescentados após validação, sem presumir sua prioridade agora.

### 6. Fluxos e limites intencionais

```text
Vendas --> Detalhes --> Parcela --> Conferir pagamento --> Confirmacao
   |
   +--> Nova venda --> Cliente --> Previa de parcelas --> Confirmacao
```

Detalhes podem ser apresentados em painel lateral acessível, com navegação para vendas relacionadas nos detalhes do cliente. Formulários usam Signal Forms, valores iniciais centralizados e validação tanto na interação quanto no caminho de envio; ao tentar confirmar dados inválidos, revelar erros junto aos campos e preservar o preenchimento. A proteção contra envio duplicado não depende apenas do botão desabilitado. O estado `estaSalvando` deve ser restaurado em sucesso ou falha; não introduzir RxJS para operações locais síncronas. Cancelamentos e falhas não podem deixar alterações parciais ou exibir sucesso. CPF tem validação estrutural de 11 dígitos e duplicidade, sem alegar verificação de identidade; telefone é opcional. Não bloquear busca por CPF incompleto.

Restringir a 1–24 parcelas, pagamento integral e edição financeira somente antes de qualquer recebimento são simplificações propostas para a demonstração, não regras confirmadas da loja. Confirmar pagamento altera o estado uma vez e fecha o modal; fechar sem confirmar não altera dados. Nenhuma exclusão ou estorno será apresentado como funcional.

### 7. Linguagem visual e validação

Seguir a direção do README: tema claro, azul ou índigo, tipografia legível, tabelas espaçosas e situações com texto e cor. Usar `lang="pt-BR"`, nomes acessíveis nos botões e atributos de estado aplicáveis. Otimizar a composição desktop e permitir rolagem dentro de tabelas em telas menores, sem esconder ações importantes. Modais gerenciam foco, Escape, rótulos e retorno ao acionador. Diferenciar ausência de registros, ausência de resultados e falha; não criar carregamento artificial para simular rede.

Testar funções de domínio isoladamente, componentes e fluxos integrados no navegador. Validar com equipe: localizar cliente por nome parcial, tentar CPF após busca sem sucesso, recuperar venda oculta por filtros, distinguir nomes semelhantes, revisar cadastro e confirmar/cancelar pagamento. Registrar sucesso, necessidade de ajuda, hesitações e identificação correta; não inventar metas de tempo antes de medir a rotina atual. A eficácia na loja só poderá ser afirmada após essas sessões.

## Risks / Trade-offs

- [Causa de falhas de localização desconhecida] --> Testar busca e recuperação com cenários; não alegar que a interface evita ausência de cadastro.
- [Respostas reconstruídas nas entrevistas] --> Validar hipóteses com a equipe antes de tratá-las como conclusões do TCC.
- [Protótipo confundido com sistema real] --> Aviso de demonstração, dados sintéticos e operações financeiras apenas locais.
- [Reutilização futura exigir mudanças] --> Separar componentes e fonte de dados, mantendo regras definitivas no futuro ASP.NET Core e sem antecipar contratos ou controles de produção.
- [Escopo visual amplo prejudicar o fluxo principal] --> Entregar Vendas, busca, detalhes e pagamento antes de Visão Geral e placeholders.
- [Regras simplificadas não corresponderem à loja] --> Identificar limitações na interface e registrar feedback sobre edição, parcial e vencimentos.

## Migration Plan

Não há aplicação ou dados para migrar. A implementação deve adicionar a base sem sobrescrever README, entrevistas, `AGENTS.md` ou configurações existentes, documentar a pasta que contém o `package.json` e os comandos reais de instalação, execução, testes e build, e produzir um frontend estático. Para desfazer a entrega, remover apenas os arquivos daquela implementação ou reverter seu commit, sem afetar documentos anteriores. Uma futura mudança independente tratará Tauri no Windows, backend ASP.NET Core, banco SQLite, migração da planilha e requisitos de produção.
