import { randomInt, randomUUID } from 'node:crypto';
import { expect, test, type Page, type Route } from './local-stack';

interface DetalheApi {
  readonly resumo: {
    readonly id: string;
    readonly revisao: string;
    readonly statusAdministrativo: string;
    readonly quantidadePaga: number;
    readonly totalRecebidoCentavos: number;
  };
  readonly recebimentos: readonly {
    readonly id: string;
    readonly origem: string;
    readonly valorCentavos: number;
  }[];
}

interface ComandoStatusApi {
  readonly vendaId: string;
  readonly novoStatus: string;
  readonly revisaoEsperada: string;
}

test('duas abas preservam a revisão antiga no 409 e exigem nova decisão após leitura', async ({
  page,
  localStack,
}) => {
  const nome = `409 ${localStack.runId.slice(0, 8)} ${randomUUID().slice(0, 4)}`;
  const vendaId = await cadastrarVenda(page, nome, localStack.reference);
  const abaDesatualizada = await page.context().newPage();
  await abaDesatualizada.goto(`/vendas/${encodeURIComponent(vendaId)}`);
  await expect(abaDesatualizada.getByRole('heading', { name: nome, exact: true })).toBeVisible();
  const revisaoAntiga = (await detalheApi(localStack, vendaId, localStack.reference)).resumo
    .revisao;

  await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
  await abaCarregada(page, 'Editar dados do cliente');
  await page.getByLabel('Nome', { exact: true }).fill(`${nome} atualizado`);
  await page.getByRole('button', { name: 'Confirmar edição', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `${nome} atualizado`, exact: true }),
  ).toBeVisible();
  const revisaoNova = (await detalheApi(localStack, vendaId, localStack.reference)).resumo.revisao;
  expect(revisaoNova).not.toBe(revisaoAntiga);

  const revisoesEnviadas: string[] = [];
  abaDesatualizada.on('request', (request) => {
    if (request.url().includes('/api/v1/vendas/status') && request.method() === 'PUT') {
      const corpo = request.postDataJSON() as ComandoStatusApi;
      revisoesEnviadas.push(corpo.revisaoEsperada);
    }
  });
  await abaDesatualizada.getByRole('button', { name: 'Inativar venda', exact: true }).click();
  const dialog = abaDesatualizada.getByRole('dialog', { name: 'Confirmar mudança de status' });
  const confirmar = dialog.getByRole('button', { name: 'Confirmar mudança' });
  await expect(confirmar).toBeFocused();
  const respostaConflito = abaDesatualizada.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/vendas/status') &&
      response.request().method() === 'PUT' &&
      response.status() === 409,
  );
  await confirmar.click();
  expect((await respostaConflito).status()).toBe(409);
  await expect(dialog).toContainText('A venda mudou desde a consulta');
  await expect(revisoesEnviadas).toEqual([revisaoAntiga]);

  await dialog.getByRole('button', { name: 'Recarregar venda e revisar' }).click();
  await expect(dialog).toContainText('A venda foi recarregada.');
  await expect(confirmar).toBeEnabled();
  await expect(confirmar).toBeFocused();
  const respostaConfirmada = abaDesatualizada.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/vendas/status') &&
      response.request().method() === 'PUT' &&
      response.status() === 200,
  );
  await confirmar.click();
  expect((await respostaConfirmada).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(abaDesatualizada.locator('#titulo-status-administrativo')).toBeFocused();
  expect(revisoesEnviadas).toEqual([revisaoAntiga, revisaoNova]);

  const persistida = await detalheApi(localStack, vendaId, localStack.reference);
  expect(persistida.resumo.statusAdministrativo).toBe('Inativo');
  expect(BigInt(persistida.resumo.revisao)).toBe(BigInt(revisaoNova) + 1n);
  expect(persistida.resumo.quantidadePaga).toBe(0);
  await abaDesatualizada.close();
});

test('falha controlada antes do proxy e consulta falha mantêm bloqueio sem reenviar', async ({
  page,
  localStack,
}) => {
  const nome = `ANTES ${localStack.runId.slice(0, 8)} ${randomUUID().slice(0, 4)}`;
  const vendaId = await cadastrarVenda(page, nome, localStack.reference);
  const antes = await detalheApi(localStack, vendaId, localStack.reference);
  let tentativasPostNoBrowser = 0;
  const padraoPagamento = '**/api/v1/recebimentos';
  const abortarAntesDeEncaminhar = async (route: Route) => {
    tentativasPostNoBrowser += 1;
    await route.abort('connectionreset');
  };
  await page.route(padraoPagamento, abortarAntesDeEncaminhar);
  await iniciarBaixa(page, localStack.reference);

  const aviso = page.getByTestId('aviso-confirmacao-incerta');
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText('não reenvie a operação');
  expect(tentativasPostNoBrowser).toBe(1);
  const semCommit = await detalheApi(localStack, vendaId, localStack.reference);
  expect(semCommit.resumo.revisao).toBe(antes.resumo.revisao);
  expect(semCommit.resumo.totalRecebidoCentavos).toBe(0);
  expect(semCommit.recebimentos).toHaveLength(0);

  let consultasAbortadas = 0;
  const padraoDetalhe = '**/api/v1/vendas/detalhe**';
  const abortarConsulta = async (route: Route) => {
    consultasAbortadas += 1;
    await route.abort('connectionreset');
  };
  await page.route(padraoDetalhe, abortarConsulta);
  await aviso.getByTestId('consultar-conferencia').click();
  await expect(aviso.getByRole('status')).toContainText(
    'As confirmações continuam bloqueadas; tente consultar novamente.',
  );
  const reconhecer = aviso.getByTestId('reconhecer-conferencia');
  await expect(reconhecer).toBeDisabled();
  expect(consultasAbortadas).toBe(1);
  expect((await detalheApi(localStack, vendaId, localStack.reference)).resumo.revisao).toBe(
    antes.resumo.revisao,
  );

  await page.unroute(padraoDetalhe, abortarConsulta);
  await aviso.getByTestId('consultar-conferencia').click();
  await expect(aviso).toContainText('O detalhe do alvo original foi consultado');
  await expect(reconhecer).toBeEnabled();
  await reconhecer.click();
  await expect(aviso).toHaveCount(0);
  expect(tentativasPostNoBrowser).toBe(1);
  const aposReconhecer = await detalheApi(localStack, vendaId, localStack.reference);
  expect(aposReconhecer.resumo.revisao).toBe(antes.resumo.revisao);
  expect(aposReconhecer.recebimentos).toHaveLength(0);
});

test('resposta descartada depois do commit é conferida por outra leitura sem duplicar baixa', async ({
  page,
  localStack,
}) => {
  const nome = `DEPOIS ${localStack.runId.slice(0, 8)} ${randomUUID().slice(0, 4)}`;
  const vendaId = await cadastrarVenda(page, nome, localStack.reference);
  const antes = await detalheApi(localStack, vendaId, localStack.reference);
  let respostasReais: DetalheApi[] = [];
  let tentativasPostNoBrowser = 0;
  const padraoPagamento = '**/api/v1/recebimentos';
  const descartarRespostaReal = async (route: Route) => {
    tentativasPostNoBrowser += 1;
    const response = await encaminharComProvenienciaDaUi(route);
    expect(response.status()).toBe(200);
    respostasReais = [(await response.json()) as DetalheApi];
    await route.abort('connectionreset');
  };
  await page.route(padraoPagamento, descartarRespostaReal);
  await iniciarBaixa(page, localStack.reference);

  const aviso = page.getByTestId('aviso-confirmacao-incerta');
  await expect(aviso).toBeVisible();
  expect(tentativasPostNoBrowser).toBe(1);
  expect(respostasReais).toHaveLength(1);
  expect(respostasReais[0]!.resumo.totalRecebidoCentavos).toBe(5000);
  expect(respostasReais[0]!.resumo.quantidadePaga).toBe(1);

  const commitVerificadoIndependentemente = await detalheApi(
    localStack,
    vendaId,
    localStack.reference,
  );
  expect(BigInt(commitVerificadoIndependentemente.resumo.revisao)).toBe(
    BigInt(antes.resumo.revisao) + 1n,
  );
  expect(commitVerificadoIndependentemente.resumo.totalRecebidoCentavos).toBe(5000);
  expect(commitVerificadoIndependentemente.recebimentos).toHaveLength(1);
  const recebimentoId = commitVerificadoIndependentemente.recebimentos[0]!.id;

  await expect(aviso.getByTestId('reconhecer-conferencia')).toBeDisabled();
  await aviso.getByTestId('consultar-conferencia').click();
  await expect(aviso).toContainText('O detalhe do alvo original foi consultado');
  await expect(aviso.getByTestId('reconhecer-conferencia')).toBeEnabled();
  await aviso.getByTestId('reconhecer-conferencia').click();
  await expect(aviso).toHaveCount(0);

  expect(tentativasPostNoBrowser).toBe(1);
  const aposReconhecer = await detalheApi(localStack, vendaId, localStack.reference);
  expect(aposReconhecer.resumo.revisao).toBe(commitVerificadoIndependentemente.resumo.revisao);
  expect(aposReconhecer.resumo.totalRecebidoCentavos).toBe(5000);
  expect(aposReconhecer.recebimentos).toHaveLength(1);
  expect(aposReconhecer.recebimentos[0]!.id).toBe(recebimentoId);
});

test('falha no refresh após sucesso conhecido não transforma nem reenvia a baixa', async ({
  page,
  localStack,
}) => {
  const nome = `REFRESH ${localStack.runId.slice(0, 8)} ${randomUUID().slice(0, 4)}`;
  const vendaId = await cadastrarVenda(page, nome, localStack.reference);
  let respostasPagamento = 0;
  let consultasAbortadas = 0;
  const padraoPagamento = '**/api/v1/recebimentos';
  const encaminharPagamento = async (route: Route) => {
    respostasPagamento += 1;
    const response = await encaminharComProvenienciaDaUi(route);
    expect(response.status()).toBe(200);
    await route.fulfill({ response });
  };
  const abortarRefreshDetalhe = async (route: Route) => {
    consultasAbortadas += 1;
    await route.abort('connectionreset');
  };
  await page.route(padraoPagamento, encaminharPagamento);
  await page.route('**/api/v1/vendas/detalhe**', abortarRefreshDetalhe);
  await iniciarBaixa(page, localStack.reference);

  const statusDetalhe = page.locator('main [role="status"]');
  await expect(statusDetalhe.filter({ hasText: /Operação confirmada/i })).toBeVisible();
  await expect.poll(() => consultasAbortadas).toBe(1);
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar a venda', exact: true }),
  ).toBeVisible();
  await expect(statusDetalhe).toContainText(
    'A baixa foi confirmada, mas não foi possível atualizar o detalhe. Recarregue para consultar o resultado; não repita o pagamento.',
  );
  await expect(page.getByTestId('aviso-confirmacao-incerta')).toHaveCount(0);
  expect(respostasPagamento).toBe(1);
  expect(consultasAbortadas).toBe(1);
  const confirmada = await detalheApi(localStack, vendaId, localStack.reference);
  expect(confirmada.resumo.totalRecebidoCentavos).toBe(5000);
  expect(confirmada.recebimentos).toHaveLength(1);
  const revisaoConfirmada = confirmada.resumo.revisao;
  const recebimentoId = confirmada.recebimentos[0]!.id;

  await page.unroute('**/api/v1/vendas/detalhe**', abortarRefreshDetalhe);
  await page.getByRole('button', { name: 'Recarregar detalhe', exact: true }).click();
  await expect(page.getByRole('heading', { name: nome, exact: true })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Operação confirmada');
  expect(respostasPagamento).toBe(1);
  const recarregada = await detalheApi(localStack, vendaId, localStack.reference);
  expect(recarregada.resumo.revisao).toBe(revisaoConfirmada);
  expect(recarregada.resumo.totalRecebidoCentavos).toBe(5000);
  expect(recarregada.recebimentos).toHaveLength(1);
  expect(recarregada.recebimentos[0]!.id).toBe(recebimentoId);
});

async function cadastrarVenda(page: Page, nome: string, referencia: string): Promise<string> {
  await page.goto('/vendas/nova');
  await page.getByLabel('Nome', { exact: true }).fill(nome);
  await page.getByLabel('CPF', { exact: true }).fill(cpfSintetico(randomInt(0, 1_000_000_000)));
  await page.getByLabel('Telefone com DDD').fill('(11) 98765-4321');
  await page.getByLabel('Possui Entrada').selectOption('nao');
  await page.getByLabel('Data da venda', { exact: true }).fill(referencia);
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
  await page.getByLabel('Quantidade de parcelas').fill('2');
  await page.getByRole('button', { name: 'Confirmar cadastro', exact: true }).click();
  await expect(page.getByRole('heading', { name: nome, exact: true })).toBeVisible();
  const segmentoId = new URL(page.url()).pathname.split('/').at(-1);
  if (!segmentoId) throw new Error('A rota de detalhe não contém o ID confirmado.');
  return decodeURIComponent(segmentoId);
}

async function iniciarBaixa(page: Page, referencia: string): Promise<void> {
  await page.locator('[data-acao-pagar]').first().click();
  const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Valor recebido').fill('50,00');
  await page.getByLabel('Data do pagamento').fill(referencia);
  await page.getByLabel('Forma do pagamento').selectOption('Pix');
  await page.getByLabel(/Observação/).fill('E2E resposta incerta');
  await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click();
}

async function detalheApi(
  localStack: { apiRequest(path: string, init?: RequestInit): Promise<Response> },
  vendaId: string,
  referencia: string,
): Promise<DetalheApi> {
  const parametros = new URLSearchParams({ vendaId, referencia });
  const response = await localStack.apiRequest(`/api/v1/vendas/detalhe?${parametros}`);
  expect(response.status).toBe(200);
  return (await response.json()) as DetalheApi;
}

async function encaminharComProvenienciaDaUi(route: Route) {
  const headers = await route.request().allHeaders();
  const url = new URL(route.request().url());
  headers['host'] = url.host;
  headers['origin'] = url.origin;
  headers['sec-fetch-site'] = 'same-origin';
  return route.fetch({ headers });
}

async function abaCarregada(page: Page, titulo: string): Promise<void> {
  await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
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
