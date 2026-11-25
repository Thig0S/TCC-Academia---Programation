# Planilha de vendas da loja

## Finalidade e proteção dos dados

Fonte local: `00 - VENDAS LIBERAÇÃO LUIGHI CORRETO.xlsx`, fornecida pelo solicitante.
Inspeção estrutural em **25/11/2026**, sem modificar o arquivo ou importar dados.
Rastreabilidade: [PRD/FON-034](../prd/vendas-em-aberto.md) e
[TDD — estudo estrutural](../tdd/tdd.md).

O XLSX contém dados reais e permanece **fora do versionamento**, conforme a regra
atual de `.gitignore`. Esta documentação pode ser compartilhada sem o arquivo.
Não publicar a planilha, nomes, dados de contato, valores por cliente, capturas ou
transcrições de registros. Testes futuros devem usar dados sintéticos. A regra de
ignore não equivale a criptografia, controle de acesso ou backup.

## Inventário observado

| Aba | Dimensão declarada | Linhas XML presentes | Observações estruturais |
| --- | --- | --- | --- |
| CONTROLE POR FORA | A1:U580 | 580 | Conteúdo não vazio observado em A:G; dimensão inclui área adicional |
| PREJUIZOS PARA LANÇAR 2026 | A1:J7 | 7 | Conteúdo auxiliar em H; mesclagem I1:J1 |
| PREJUIZOS JÁ LANÇADOS | A1:K67 | 62 | Cabeçalhos nas linhas 1 e 23; mesclagens e conteúdo auxiliar em H:I |
| JÁ ENCERRADOS | A1:J614 | 614 | Mesclagem G301:J301; campos ausentes e tipos heterogêneos |

Dimensões podem incluir formatação e células vazias. Linhas XML incluem cabeçalhos,
anotações e outros elementos; **não representam quantidade de vendas, parcelas ou
clientes**. Nenhuma fórmula de célula foi encontrada nas quatro abas inspecionadas.
Isso não comprova ausência de cálculos manuais ou consistência financeira.

## Colunas principais e mapeamento preliminar

Os sete cabeçalhos abaixo aparecem na primeira linha das quatro abas. O destino é
uma hipótese para discussão, não um schema aprovado nem uma regra de conversão.

| Coluna | Cabeçalho | Destino candidato | Limites da evidência |
| --- | --- | --- | --- |
| A | DATA VENDA | Data civil da venda | Predominam números; também há texto e ausências. Interpretar serial Excel conforme metadados, sem conversão cega de fuso |
| B | CLIENTE | Identificação textual do cliente na venda | Não é chave única de pessoa ou contrato; nomes repetidos não autorizam agrupamento |
| C | PC | Número/identificação da parcela, a confirmar | Predominam números, com exceções textuais; significado, reinício e relação com entrada precisam de confirmação |
| D | VALOR | Valor-base de parcela ou informação de entrada, a confirmar | Mistura números e textos com entrada/forma de pagamento; não assumir total da venda nem extrair o primeiro número automaticamente |
| E | VENCIMENTO | Vencimento histórico de parcela | Números e textos; preservar datas comprovadas, sem recalcular calendário histórico |
| F | STATUS | Evidência para situação e recebimento | Texto livre mistura indicação de pagamento, forma, montante e acréscimos; há também células numéricas e vazias |
| G | DATA PAGTO | Data civil do recebimento, quando comprovada | Números, textos e ausências; indicação de pagamento sem data não autoriza inventar data |

Não há cabeçalhos principais próprios para **CPF, telefone, descrição do cliente,
ID estável de contrato ou total contratual**. Não se afirma que essas informações
estejam ausentes de todas as anotações; sua recuperação e confiabilidade não foram
validadas. Conteúdo fora de A:G não deve ser ignorado nem tratado automaticamente
como registro financeiro.

## Diferenças em relação ao modelo atual

- A aplicação exige CPF e telefone válidos em novos cadastros; a estrutura principal
  da planilha não oferece esses campos. Dados legados incompletos precisam de
  decisão de produto própria, sem identificações fictícias ou alterações silenciosas
  dos validadores.
- A aplicação guarda venda, parcelas e recebimentos com identidades e vínculos.
  A planilha exige descobrir e confirmar os limites de cada contrato; uma linha
  não deve virar uma venda automaticamente.
- A entrada atual é parcela 1 paga, com recebimento contado uma vez. As anotações
  de entrada da planilha não comprovam por si só como ela foi contada em PC ou no
  valor contratado.
- O status administrativo Ativo/Inativo/Prejuízo é distinto da situação financeira.
  Nomes de abas não são equivalência automática desses status. Em particular,
  “JÁ ENCERRADOS” não comprova saldo zero para cada contrato.
- RN-026 soma no total separado de Prejuízo apenas pendências de contratos sem
  recebimentos. A presença em aba de prejuízos não comprova essa elegibilidade.
- O histórico contém informações livres sobre pagamentos e acréscimos. Não aplicar
  novamente a sequência de pagamentos novos para reconstruí-lo nem converter falta
  de evidência em pagamento, estorno ou saldo presumido.

## Decisões pendentes antes da importação

1. Como identificar contratos distintos, inclusive de mesmo nome/data e entre abas?
2. O que PC representa e como a entrada participa da numeração e do total?
3. Qual é a semântica de VALOR em cada tipo de linha e como conferir o total-base?
4. Como tratar indicações de pagamento sem data, forma ou montante comprovados?
5. Qual é a relação das abas de prejuízos e encerrados com status, saldo e pagamentos
   externos? Como tratar possível repetição do mesmo contrato entre abas?
6. Como obter CPF/telefone faltantes ou representar legado incompleto, se autorizado?
7. Como interpretar conteúdo auxiliar, mesclagens e eventuais significados de cores?
   A semântica visual não foi validada com a loja.
8. Quem confere os totais, resolve pendências e autoriza o corte operacional?

Essas perguntas registram bloqueios, não solicitam nem presumem respostas nesta
mudança. O cenário informado para a evolução é um computador offline; banco,
empacotamento desktop e controles operacionais ainda dependem de desenho aprovado.

## Sequência sugerida para a migração futura

1. Preservar original e backup, com acesso restrito e identificação da versão usada.
2. Resolver as ambiguidades de produto e definir o mapeamento aprovado no PRD/TDD.
3. Especificar em OpenSpec a importação e seus critérios de aceite antes do código.
4. Ler para área temporária, preservando origem por lote/aba/linha sem publicar dados
   reais em logs ou relatórios públicos; separar erros de avisos.
5. Mostrar prévia de contratos, parcelas, recebimentos e pendências. Não gravar
   silenciosamente casos ambíguos nem fabricar histórico para fechar saldos.
6. Conciliar quantidades e valores-base, recebidos e pendentes por universo/status,
   sem somar entrada ou alocações duas vezes e sem duplicar contratos entre abas.
7. Validar reimportação segura, transação e recuperação em base isolada, incluindo
   restauração efetiva de backup.
8. Obter conferência responsável e executar carga definitiva apenas com autorização
   própria, registrando resultado do lote e pendências reais.

## Método e limites desta documentação

Foi feita leitura somente do pacote ZIP/XML do XLSX com bibliotecas padrão do
PowerShell/.NET: workbook, relacionamentos, strings compartilhadas e worksheets.
Foram conferidos nomes das abas, cabeçalhos, dimensões, linhas presentes, tipos
físicos, fórmulas e mesclagens. Nenhum arquivo auxiliar com dados foi criado.

Não houve recálculo em Excel, validação integral de datas, deduplicação, contagem
de contratos, conciliação monetária, homologação com a loja, implementação de
importador ou gravação em banco. A inspeção estrutural não constitui validação
contábil. Não foi criada nova Change OpenSpec porque esta entrega apenas cataloga
a fonte e referencia documentos existentes, sem alterar capacidades do sistema.
