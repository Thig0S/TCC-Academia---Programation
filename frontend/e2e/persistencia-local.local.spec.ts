import { randomInt, randomUUID } from 'node:crypto';
import { expect, test, type LocalStack } from './local-stack';

interface DetalheApi {
  readonly resumo: {
    readonly id: string;
    readonly revisao: string;
    readonly statusAdministrativo: string;
    readonly quantidadePaga: number;
    readonly quantidadeParcelas: number;
    readonly totalRecebidoCentavos: number;
    readonly cliente: { readonly nome: string };
  };
  readonly recebimentos: readonly {
    readonly id: string;
    readonly origem: string;
    readonly valorCentavos: number;
    readonly data: string;
  }[];
}

test('cinco comandos reais, consultas e reinício preservam a venda e o recebimento', async ({
  page,
  localStack,
}) => {
  test.setTimeout(120_000);
  const prefixo = `E2E ${localStack.runId.slice(0, 8)}`;
  const nomeOriginal = `${prefixo} sem entrada`;
  const nomeEditado = `${prefixo} editada`;
  const referenciaInicial = localStack.reference;
  const mesAnterior = primeiroDiaMesAnterior(referenciaInicial);
  const dataVenda = `${mesAnterior.slice(0, 7)}-01`;

  const idVenda = await cadastrarPelaInterface(page, {
    nome: nomeOriginal,
    tema: 'dark',
    dataVenda,
    entrada: null,
    quantidadeParcelas: 2,
  });
  await expect(page.getByRole('heading', { name: nomeOriginal, exact: true })).toBeVisible();
  await expect(page.locator('section.entrada-detalhe')).toContainText('Sem entrada');

  const estadoFinanceiroAntes = await page
    .locator('section[aria-labelledby="dados-financeiros"]')
    .innerText();
  await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
  await expect(page.getByRole('heading', { name: 'Editar dados do cliente' })).toBeVisible();
  await page.getByLabel('Nome', { exact: true }).fill(nomeEditado);
  await page.getByLabel('Descrição (opcional)').fill('Descrição sintética editada');
  const botaoEdicao = page.getByRole('button', { name: 'Confirmar edição', exact: true });
  await botaoEdicao.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: nomeEditado, exact: true })).toBeVisible();
  expect(await page.locator('section[aria-labelledby="dados-financeiros"]').innerText()).toBe(
    estadoFinanceiroAntes,
  );

  const primeiraBaixa = page.locator('[data-acao-pagar]').first();
  await expect(primeiraBaixa).toBeVisible();
  await primeiraBaixa.focus();
  await page.keyboard.press('Enter');
  const dialogBaixa = page.getByRole('dialog', { name: 'Pagar parcela' });
  await expect(dialogBaixa).toBeVisible();
  await expect(page.getByLabel('Data do pagamento')).toBeFocused();
  await page.getByLabel('Valor recebido').fill('55,00');
  await page.getByLabel('Data do pagamento').fill(referenciaInicial);
  await page.getByLabel('Forma do pagamento').selectOption('Pix');
  await page.getByLabel(/Observação/).fill('E2E baixa');
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
  await expect(dialogBaixa).toBeHidden();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /Operação confirmada/i })
      .first(),
  ).toBeVisible();

  const botaoCorrecao = page.locator('[data-acao-corrigir]').first();
  await expect(botaoCorrecao).toBeVisible();
  const idRecebimentoOriginal = await idRecebimento(localStack, idVenda, referenciaInicial);
  await botaoCorrecao.click();
  const dialogCorrecao = page.getByRole('dialog', { name: 'Corrigir pagamento individual' });
  await expect(dialogCorrecao).toBeVisible();
  await expect(page.getByLabel('Data do pagamento')).toBeFocused();
  await page.getByLabel('Valor recebido').fill('53,00');
  await page.getByLabel('Data do pagamento').fill(`${mesAnterior.slice(0, 7)}-15`);
  await page.getByLabel('Forma do pagamento').selectOption('Dinheiro');
  await page.getByLabel(/Observação/).fill('E2E corrigido');
  await page.getByRole('button', { name: 'Confirmar correção' }).click();
  await expect(dialogCorrecao).toBeHidden();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /Operação confirmada/i })
      .first(),
  ).toBeVisible();
  expect(await idRecebimento(localStack, idVenda, referenciaInicial)).toBe(idRecebimentoOriginal);

  await mudarStatus(page, 'Marcar como Prejuízo');
  await expect(
    page.locator('section[aria-labelledby="titulo-status-administrativo"]'),
  ).toContainText('Prejuízo');
  await page.goto('/vendas/prejuizo');
  await pesquisarCliente(page, nomeEditado);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.locator('tbody tr th a').click();
  await mudarStatus(page, 'Reabrir venda');
  await expect(
    page.locator('section[aria-labelledby="titulo-status-administrativo"]'),
  ).toContainText('Ativo');

  await mudarStatus(page, 'Inativar venda');
  await page.goto('/vendas/inativas');
  await pesquisarCliente(page, nomeEditado);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.locator('tbody tr th a').click();
  await mudarStatus(page, 'Reativar venda');
  await expect(
    page.locator('section[aria-labelledby="titulo-status-administrativo"]'),
  ).toContainText('Ativo');

  const segundaBaixa = page.locator('[data-acao-pagar]').first();
  await segundaBaixa.click();
  await page.getByLabel('Data do pagamento').fill(referenciaInicial);
  await page.getByLabel('Forma do pagamento').selectOption('Pix');
  await page.getByLabel(/Observação/).fill('E2E segunda parcela');
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
  await expect(page.locator('[data-acao-pagar]')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="dados-financeiros"]')).toContainText(
    '2 de 2',
  );

  await page.goto('/vendas');
  await pesquisarCliente(page, nomeEditado);
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.goto('/vendas/quitadas');
  await pesquisarCliente(page, nomeEditado);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.goto('/visao-geral');
  await expect(page.locator('[aria-label="Indicadores financeiros globais"] article')).toHaveCount(
    4,
  );
  await expect(page.getByRole('main')).toContainText(nomeEditado);

  await page.goto('/relatorios');
  await selecionarMes(page, mesAnterior);
  const artigoMesAnterior = page
    .locator('[aria-label="Totais da movimentação do mês"] article')
    .filter({ hasText: 'Recebimentos no mês' });
  await expect(artigoMesAnterior).toContainText('53,00');
  await selecionarMes(page, referenciaInicial);
  const artigoMesAtual = page
    .locator('[aria-label="Totais da movimentação do mês"] article')
    .filter({ hasText: 'Recebimentos no mês' });
  await expect(artigoMesAtual).toContainText('50,00');

  const antesDoReinicio = await detalheApi(localStack, idVenda, referenciaInicial);
  const idsAntesDoReinicio = await idsColecoes(localStack, referenciaInicial);
  expect(antesDoReinicio.resumo.id).toBe(idVenda);
  expect(antesDoReinicio.resumo.statusAdministrativo).toBe('Ativo');
  expect(antesDoReinicio.resumo.quantidadePaga).toBe(2);
  expect(antesDoReinicio.resumo.quantidadeParcelas).toBe(2);
  expect(antesDoReinicio.resumo.totalRecebidoCentavos).toBe(10300);
  const recebimentoAntesDoReinicio = antesDoReinicio.recebimentos.find(
    (recebimento) => recebimento.origem === 'Individual',
  );
  expect(recebimentoAntesDoReinicio?.id).toBe(idRecebimentoOriginal);

  const novaReferencia = diaSeguinte(referenciaInicial);
  await page.goto(`/vendas/${encodeURIComponent(idVenda)}`);
  await expect(page.getByRole('heading', { name: nomeEditado, exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date(`${novaReferencia}T12:00:00`));
  await localStack.restartApi();
  const consultaAposReinicio = page.waitForRequest(
    (request) =>
      request.url().includes('/api/v1/vendas/detalhe') &&
      request.url().includes(`referencia=${novaReferencia}`),
  );
  await page.reload();
  await consultaAposReinicio;
  await expect(page.getByRole('heading', { name: nomeEditado, exact: true })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(formatarData(novaReferencia));
  await expect(page.locator('section[aria-labelledby="dados-financeiros"]')).toContainText(
    '2 de 2',
  );

  const aposReinicio = await detalheApi(localStack, idVenda, novaReferencia);
  expect(aposReinicio.resumo.id).toBe(idVenda);
  expect(aposReinicio.resumo.revisao).toBe(antesDoReinicio.resumo.revisao);
  expect(aposReinicio.resumo.totalRecebidoCentavos).toBe(10300);
  expect(
    aposReinicio.recebimentos.find((recebimento) => recebimento.origem === 'Individual')?.id,
  ).toBe(idRecebimentoOriginal);
  expect(await idsColecoes(localStack, novaReferencia)).toEqual(idsAntesDoReinicio);

  await cadastrarPelaInterface(page, {
    nome: `${prefixo} com entrada`,
    tema: 'light',
    dataVenda: referenciaInicial,
    entrada: 1000,
    quantidadeParcelas: 2,
  });
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'light');
  await expect(page.locator('section.entrada-detalhe')).toContainText('10,00');
  expect((await detalheApiAtual(localStack, page.url(), referenciaInicial)).recebimentos).toEqual(
    expect.arrayContaining([expect.objectContaining({ origem: 'Entrada', valorCentavos: 1000 })]),
  );
  expect(localStack.logsSemSegredo()).toBe(true);
});

test('busca, ordenação e paginação local cobrem 11 registros reais nos dois temas', async ({
  page,
  localStack,
}) => {
  const prefixo = `PAG ${localStack.runId.slice(0, 8)} ${randomUUID().slice(0, 4)}`;
  await criarOnzeVendasApi(localStack, prefixo);

  await page.goto('/vendas');
  for (const tema of ['dark', 'light'] as const) {
    await selecionarTema(page, tema);
    const busca = page.getByLabel('Buscar por nome, CPF, telefone ou data da venda', {
      exact: true,
    });
    await busca.fill(prefixo);
    await expect(page.getByRole('status', { name: 'Faixa de resultados' })).toContainText(
      '11 vendas',
    );
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByRole('table', { name: 'Vendas em aberto' })).toBeVisible();

    const proxima = page.getByRole('button', { name: 'Próxima página' });
    await proxima.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByRole('status', { name: 'Faixa de resultados' })).toContainText(
      '11–11 de 11 vendas',
    );

    await page.getByRole('button', { name: 'Página anterior' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await page.getByLabel('Ordenar por').selectOption('cliente');
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await busca.fill(`${prefixo} ausente`);
    await expect(page.getByRole('main')).toContainText(
      'Nenhuma venda corresponde à pesquisa e à situação selecionadas.',
    );
    await page.getByRole('button', { name: 'Limpar pesquisa' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(10);
  }
});

async function cadastrarPelaInterface(
  page: import('@playwright/test').Page,
  options: {
    readonly nome: string;
    readonly tema: 'dark' | 'light';
    readonly dataVenda: string;
    readonly entrada: number | null;
    readonly quantidadeParcelas: number;
  },
): Promise<string> {
  await page.goto('/vendas');
  await selecionarTema(page, options.tema);
  const linkNovaVenda = page.getByRole('main').getByRole('link', {
    name: 'Nova venda',
    exact: true,
  });
  await linkNovaVenda.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Nova venda', exact: true })).toBeFocused();

  await page.getByLabel('Nome', { exact: true }).fill(options.nome);
  await page.getByLabel('CPF', { exact: true }).fill(cpfSintetico(randomInt(0, 1_000_000_000)));
  await page.getByLabel('Telefone com DDD').fill('(11) 98765-4321');
  await page.getByLabel('Possui Entrada').selectOption(options.entrada === null ? 'nao' : 'sim');
  await page.getByLabel('Data da venda', { exact: true }).fill(options.dataVenda);
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
  await page.getByLabel('Quantidade de parcelas').fill(String(options.quantidadeParcelas));
  if (options.entrada !== null) {
    await page
      .getByLabel('Valor da entrada (R$)')
      .fill((options.entrada / 100).toFixed(2).replace('.', ','));
    await page.getByLabel('Forma da entrada').selectOption('Pix');
  }

  const confirmar = page.getByRole('button', { name: 'Confirmar cadastro', exact: true });
  await expect(confirmar).toBeEnabled();
  await confirmar.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
  const segmentoId = new URL(page.url()).pathname.split('/').at(-1);
  if (!segmentoId) throw new Error('A rota de detalhe não contém o ID confirmado.');
  return decodeURIComponent(segmentoId);
}

async function mudarStatus(
  page: import('@playwright/test').Page,
  acao: 'Marcar como Prejuízo' | 'Reabrir venda' | 'Inativar venda' | 'Reativar venda',
): Promise<void> {
  await page.getByRole('button', { name: acao, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar mudança de status' });
  await expect(dialog).toBeVisible();
  const confirmar = dialog.getByRole('button', { name: 'Confirmar mudança' });
  await expect(confirmar).toBeEnabled();
  await expect(confirmar).toBeFocused();
  await confirmar.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#titulo-status-administrativo')).toBeFocused();
}

async function pesquisarCliente(
  page: import('@playwright/test').Page,
  nome: string,
): Promise<void> {
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill(nome);
}

async function selecionarTema(
  page: import('@playwright/test').Page,
  tema: 'dark' | 'light',
): Promise<void> {
  const raiz = page.locator('app-root');
  if ((await raiz.getAttribute('data-tema')) !== tema) {
    await page.getByRole('button', { name: /Tema (escuro|claro)/ }).click();
  }
  await expect(raiz).toHaveAttribute('data-tema', tema);
}

async function selecionarMes(page: import('@playwright/test').Page, data: string): Promise<void> {
  const [ano, mes] = data.split('-');
  await page.getByRole('combobox', { name: 'Mês' }).selectOption(String(Number(mes)));
  await page.getByLabel('Ano', { exact: true }).fill(ano!);
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('[aria-labelledby="periodo-relatorio"]')).toContainText(
    formatarData(`${data.slice(0, 7)}-01`),
  );
}

async function detalheApi(
  localStack: LocalStack,
  vendaId: string,
  referencia: string,
): Promise<DetalheApi> {
  const parametros = new URLSearchParams({ vendaId, referencia });
  const response = await localStack.apiRequest(`/api/v1/vendas/detalhe?${parametros}`);
  expect(response.status).toBe(200);
  return (await response.json()) as DetalheApi;
}

async function detalheApiAtual(
  localStack: LocalStack,
  url: string,
  referencia: string,
): Promise<DetalheApi> {
  const vendaId = decodeURIComponent(new URL(url).pathname.split('/').at(-1)!);
  return detalheApi(localStack, vendaId, referencia);
}

async function idRecebimento(
  localStack: LocalStack,
  vendaId: string,
  referencia: string,
): Promise<string | undefined> {
  const detalhe = await detalheApi(localStack, vendaId, referencia);
  return detalhe.recebimentos.find((recebimento) => recebimento.origem === 'Individual')?.id;
}

async function idsColecoes(localStack: LocalStack, referencia: string): Promise<string[]> {
  const ids: string[] = [];
  for (const colecao of ['Abertas', 'Quitadas', 'Inativas', 'Prejuizo']) {
    const parametros = new URLSearchParams({ colecao, referencia });
    const response = await localStack.apiRequest(`/api/v1/vendas?${parametros}`);
    expect(response.status).toBe(200);
    const envelope = (await response.json()) as {
      readonly vendas: readonly { readonly id: string }[];
    };
    ids.push(...envelope.vendas.map((venda) => venda.id));
  }
  return ids.sort();
}

async function criarOnzeVendasApi(localStack: LocalStack, prefixo: string): Promise<void> {
  const parametros = new URLSearchParams({ colecao: 'Abertas', referencia: localStack.reference });
  const leitura = await localStack.apiRequest(`/api/v1/vendas?${parametros}`);
  expect(leitura.status).toBe(200);
  const envelope = (await leitura.json()) as { readonly revisao: string };
  let revisao = envelope.revisao;

  for (let indice = 0; indice < 11; indice += 1) {
    const response = await localStack.apiRequest('/api/v1/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: `${prefixo} ${String(indice + 1).padStart(2, '0')}`,
        cpf: cpfSintetico(randomInt(0, 1_000_000_000)),
        telefone: '11987654321',
        descricao: null,
        dataVenda: localStack.reference,
        valorTotalCentavos: 10000,
        quantidadeParcelas: 1,
        referencia: localStack.reference,
        revisaoEsperada: revisao,
        entrada: null,
      }),
    });
    expect(response.status).toBe(201);
    const criada = (await response.json()) as { readonly resumo: { readonly revisao: string } };
    revisao = criada.resumo.revisao;
  }
}

function cpfSintetico(numero: number): string {
  const base = String(numero).padStart(9, '0').slice(-9).split('').map(Number);
  const digito = (valores: readonly number[], pesoInicial: number): number => {
    const resto =
      valores.reduce((soma, valor, indice) => soma + valor * (pesoInicial - indice), 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(base, 10);
  const segundo = digito([...base, primeiro], 11);
  return [...base, primeiro, segundo].join('');
}

function primeiroDiaMesAnterior(data: string): string {
  const [ano, mes] = data.split('-').map(Number);
  const dataAnterior = new Date(Date.UTC(ano!, mes! - 2, 1));
  return `${String(dataAnterior.getUTCFullYear()).padStart(4, '0')}-${String(dataAnterior.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function diaSeguinte(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const seguinte = new Date(Date.UTC(ano!, mes! - 1, dia! + 1));
  return `${String(seguinte.getUTCFullYear()).padStart(4, '0')}-${String(seguinte.getUTCMonth() + 1).padStart(2, '0')}-${String(seguinte.getUTCDate()).padStart(2, '0')}`;
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}
