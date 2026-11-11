# Tasks

## 1. Base frontend e navegação

- [ ] 1.1 Criar a aplicação Angular standalone com TypeScript, HTML separado, roteamento, Signal Forms e CSS, sem sobrescrever documentos existentes; configurar verificação estrita de TypeScript e templates, UTF-8, dois espaços, aspas simples e largura de 100 caracteres, verificando instalação, inicialização e build com versões e lockfile registrados.
- [ ] 1.2 Implementar tokens visuais, barra lateral, cabeçalho, aviso de demonstração e seis rotas em português com Vendas como entrada e carregamento sob demanda quando adequado; testar navegação, indicação do item ativo e idioma pt-BR do documento.
- [ ] 1.3 Implementar componentes compartilhados de card, badge e modal com rótulos, foco e Escape; verificar por testes de componente e navegação somente por teclado.
- [ ] 1.4 Documentar a pasta do frontend, instalação, execução, testes, build, data de referência e ausência de persistência em um guia próprio; verificar os comandos na pasta com `package.json`, sem substituir o briefing do README ou presumir scripts não configurados.
- [ ] 1.5 Organizar arquivos próprios em português sob `nucleo`, `compartilhado/componentes` e `funcionalidades`, seguindo nomenclatura, injeção, visibilidade, signals e templates do `AGENTS.md`; verificar imports, seletores, rastreamento de coleções e ausência de camadas vazias mediante revisão e compilação.

## 2. Dados demonstrativos e cálculos

- [ ] 2.1 Modelar clientes, vendas, parcelas e pagamentos, preparar 12 vendas sintéticas com nomes semelhantes e situações variadas e centralizar o estado em memória; testar relações, restauração das fixtures e acesso compartilhado entre telas.
- [ ] 2.2 Implementar valores em centavos e geração mensal de parcelas; testar R$ 100,00 em três parcelas, virada de ano, fevereiro e preservação do dia 31 nos meses seguintes.
- [ ] 2.3 Implementar saldos, situações, próximo vencimento, clientes ativos e indicadores derivados; testar vencimento hoje, única parcela atrasada, quitação e recebido no mês usando referência fixa de 11/11/2026.
- [ ] 2.4 Documentar os dados sintéticos, fórmulas dos indicadores e fronteira da fonte demonstrativa no guia frontend; verificar que componentes não importam dados fictícios diretamente e que a documentação distingue cálculos simulados das futuras regras definitivas no ASP.NET Core, sem acesso direto do Angular ao SQLite.

## 3. Vendas e localização de clientes

- [ ] 3.1 Construir a tabela principal de Vendas com identificação por nome e CPF, colunas e cards previstos na spec; verificar renderização das 12 vendas e formatação pt-BR em testes de componente.
- [ ] 3.2 Implementar busca global por nome e CPF com painel agrupado e abertura dos detalhes, independente dos filtros; testar acentos, caixa, termo parcial, CPF pontuado, termo vazio e ausência de correspondências.
- [ ] 3.3 Implementar filtros locais por situação e intervalo inclusivo de datas, contagem e Limpar filtros; testar recuperação de uma venda escondida por filtro e rejeição de intervalo invertido com mensagem.
- [ ] 3.4 Implementar detalhes da venda e tabela de parcelas com dados de pagamento; testar isolamento entre vendas de clientes com nomes semelhantes e abertura pelo resultado global.
- [ ] 3.5 Acrescentar ao guia exemplos de busca e mensagens de recuperação; verificar que nenhum estado sem resultados afirma ausência de dívida ou cria cliente automaticamente.

## 4. Simulação de recebimentos

- [ ] 4.1 Implementar o modal com Signal Forms, conferência do cliente, CPF e parcela, valor integral, data e forma; testar obrigatoriedade, limites da data, validação também no envio por teclado e bloqueio de valores divergentes sem alterar estado.
- [ ] 4.2 Implementar confirmação única, cancelamento e atualização compartilhada do pagamento; testar acionamentos repetidos, pagamento duplicado, quitação da última parcela, transição Atrasada para Em dia e preservação de dados ao cancelar.
- [ ] 4.3 Tratar falha de recebimento sem alterações parciais, mantendo campos e liberando nova tentativa; verificar mensagem em português, ausência de falso sucesso e restauração de `estaSalvando` com falha induzida em teste, sem adicionar atraso ou rede artificiais à demonstração.
- [ ] 4.4 Documentar que recebimento parcial, juros, troco e estorno não são simulados; verificar que a interface informa os limites e não apresenta ações financeiras falsas como concluídas.

## 5. Cadastro e revisão de crediários

- [ ] 5.1 Implementar formulário de cliente com Signal Forms, valores iniciais centralizados, nome, CPF e telefone opcional; testar campos obrigatórios, CPF de 11 dígitos, duplicidade com pontuação diferente e disponibilidade do cliente cadastrado em Nova venda.
- [ ] 5.2 Implementar Nova venda com Signal Forms, seleção de cliente, campos previstos e revisão das parcelas; testar valor positivo, quantidade inteira de 1–24, primeiro vencimento válido e atualização das listagens e totais após confirmar.
- [ ] 5.3 Implementar edição de venda sem pagamentos e bloquear edição financeira após recebimento; testar substituição das parcelas sem duplicar venda, preservação do histórico pago e cancelamento sem alterações.
- [ ] 5.4 Atualizar o guia com o fluxo de revisão e simplificações demonstrativas; verificar que os limites não são descritos como regras confirmadas da loja.
- [ ] 5.5 Proteger o envio de cadastro e edição contra dados inválidos e submissões duplicadas, inclusive por teclado; testar exibição de erros nos campos, preservação do preenchimento, falha sem alteração parcial e nova tentativa após liberação do estado de salvamento.

## 6. Módulos complementares

- [ ] 6.1 Implementar Clientes com consulta, saldos e detalhes das vendas associadas; testar cliente com múltiplas vendas e atualização do saldo após pagamento.
- [ ] 6.2 Implementar Parcelas com filtros e acesso ao mesmo modal de pagamento; testar Todas, Pendentes, Vencidas e Pagas e coerência com os detalhes da venda.
- [ ] 6.3 Implementar Visão Geral com indicadores, vendas recentes e vencimentos; testar resultados contra a mesma fonte e atualização após cadastro e recebimento.
- [ ] 6.4 Implementar Relatórios e Configurações demonstrativos, com exportação explicitamente indisponível; verificar navegação, ausência de geração de arquivos e identificação das limitações no guia.

## 7. Integração e preparação da validação

- [ ] 7.1 Executar testes integrados no navegador para busca, revisão de venda, pagamento, cancelamento, troca de módulo e restauração ao recarregar; verificar ausência de divergências entre saldos e indicadores.
- [ ] 7.2 Revisar a aplicação em 1440px, 1024px e 390px e com teclado; verificar foco de modais, textos de situação, nomes acessíveis de botões de ícone, atributos de estado e ausência de sobreposição fora dos contêineres roláveis de tabelas.
- [ ] 7.3 Preparar roteiro de validação com cliente não encontrado, CPF alternativo, filtros ativos, nomes semelhantes, nova venda e conferência de pagamento; entregar roteiro e modelo de registro de sucesso, ajuda e hesitação, sem apresentar resultados ainda não coletados.
- [ ] 7.4 Executar build e suíte completa e revisar os avisos de demonstração; registrar evidências, conferir conformidade com o `AGENTS.md` e confirmar que não foram adicionados Tauri, backend .NET, SQLite, persistência, dados reais ou integrações externas.

## Workflow follow-up

- Apresentar o protótipo à equipe e registrar feedback real; não tratar preparação do roteiro como validação concluída.
- Rever hipóteses das entrevistas reconstruídas e abrir mudanças específicas para ajustes identificados.
- Planejar em mudança posterior a janela Tauri para Windows, o backend C# / ASP.NET Core e o SQLite local, incluindo comunicação entre camadas, gerenciamento do processo .NET, regras reais e migração de dados; avaliar autenticação conforme os requisitos dessa etapa, sem usar o protótipo como sistema operacional da loja.
