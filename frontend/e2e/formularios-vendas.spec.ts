import { expect, Locator, Page, test } from '@playwright/test';

async function preencherCadastro(page: Page, nome: string) {
  await page.getByLabel('Nome', { exact: true }).fill(nome);
  await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
  await page.getByLabel('Telefone com DDD').fill('(00) 1234-5678');
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
  await page.getByLabel('Quantidade de parcelas').fill('3');
}

async function valorEmCentavos(elemento: Locator): Promise<number> {
  const texto = await elemento.innerText();
  const valor = texto.match(/R\$\s*([\d.]+,\d{2})/)?.[1];
  if (!valor) throw new Error(`Valor BRL ausente em: ${texto}`);
  return Math.round(Number(valor.replaceAll('.', '').replace(',', '.')) * 100);
}

async function indicadoresVisaoGeral(page: Page): Promise<string[]> {
  return page.locator('[aria-label="Indicadores financeiros globais"] article').allInnerTexts();
}

function indicador(page: Page, nome: string): Locator {
  return page
    .locator('[aria-label="Indicadores financeiros globais"] article')
    .filter({ hasText: nome })
    .locator('p');
}

const errosPorPagina = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const erros: string[] = [];
  errosPorPagina.set(page, erros);
  page.on('pageerror', (erro) => erros.push(erro.message));
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(errosPorPagina.get(page), 'Console/pageerror inesperado nos fluxos').toEqual([]);
});

test('registra capturas sintéticas de cadastro, edição e recebimento nos dois temas', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await preencherCadastro(page, 'Cliente Sintético Captura');
    await expect(page.getByRole('heading', { name: 'Prévia das parcelas' })).toBeVisible();
    const cadastro = await page.screenshot({
      path: testInfo.outputPath(`cadastro-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`cadastro-${tema}`, { body: cadastro, contentType: 'image/png' });

    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await page
      .getByRole('link', { name: /Editar dados do cliente da venda de/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Editar dados do cliente' })).toBeVisible();
    const edicao = await page.screenshot({
      path: testInfo.outputPath(`edicao-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`edicao-${tema}`, { body: edicao, contentType: 'image/png' });

    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await page
      .getByRole('table', { name: 'Vendas em aberto' })
      .getByRole('link', { name: /Visualizar venda de/ })
      .first()
      .click();
    await page.getByRole('button', { name: /Receber parcelas da venda de/ }).click();
    await expect(page.getByRole('dialog', { name: 'Receber parcelas' })).toBeVisible();
    const recebimento = await page.screenshot({
      path: testInfo.outputPath(`recebimento-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`recebimento-${tema}`, { body: recebimento, contentType: 'image/png' });
  }
});

test('recebe parcela e lote antecipado, valida conferência e reconcilia quitação', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await preencherCadastro(page, 'Cliente DEMO E2E recebimento');
    const referencia = await page.getByLabel('Data da venda', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await page.getByRole('button', { name: /Receber parcelas da venda/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Receber parcelas' });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Quantidade de parcelas consecutivas')).toBeFocused();
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('');
    await expect(page.getByLabel('Forma do recebimento')).toHaveValue('');
    await expect(page.getByLabel('Data do recebimento')).toHaveValue(referencia);
    await page.getByLabel('Valor recebido (R$)').fill('33,35');
    await page.getByLabel('Data do recebimento').fill('0001-01-01');
    await page.getByRole('button', { name: 'Confirmar recebimento demonstrativo' }).click();
    await expect(page.locator('#erro-valor-recebimento')).toContainText('exatamente');
    await expect(page.locator('#erro-data-recebimento')).toContainText('anterior');
    await expect(page.locator('#erro-forma-recebimento')).toContainText('Selecione');
    await expect(dialog).toBeVisible();
    await page.getByLabel('Valor recebido (R$)').fill('33,34');
    await page.getByLabel('Data do recebimento').fill(referencia);
    await page.getByLabel('Forma do recebimento').selectOption('Pix');
    await page
      .getByRole('button', { name: 'Confirmar recebimento demonstrativo' })
      .evaluate((botao: HTMLButtonElement) => {
        botao.click();
        botao.click();
      });
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Receber parcelas da venda/ })).toBeFocused();
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Total pago$/ })
        .locator('+ dd'),
    ).toContainText('33,34');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Saldo devedor$/ })
        .locator('+ dd'),
    ).toContainText('66,66');
    await expect(page.locator('tbody tr').first()).toContainText('Paga');
    await expect(page.locator('tbody tr').first()).toContainText('Pix');
    await page.getByRole('button', { name: /Receber parcelas da venda/ }).click();
    await page.getByLabel('Quantidade de parcelas consecutivas').selectOption('2');
    await expect(dialog.getByRole('list', { name: 'Parcelas selecionadas' })).toContainText(
      'Parcela 2',
    );
    await expect(dialog.getByRole('list', { name: 'Parcelas selecionadas' })).toContainText(
      'Parcela 3',
    );
    await expect(dialog).toContainText('Soma exigida: R$ 66,66');
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('');
    await page.getByLabel('Valor recebido (R$)').fill('66,66');
    await page.getByLabel('Forma do recebimento').selectOption('Dinheiro');
    await page.getByLabel('Valor recebido (R$)').press('Enter');
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Parcelas', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: /Receber parcelas da venda/ })).toHaveCount(0);
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Saldo devedor$/ })
        .locator('+ dd'),
    ).toContainText('0,00');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Parcelas pagas$/ })
        .locator('+ dd'),
    ).toContainText('3 de 3');
    await expect(page.getByRole('main')).toContainText('Não há parcelas pendentes');
    const id = page.url();
    await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
    await page
      .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
      .fill('Cliente DEMO E2E recebimento');
    await expect(page.locator('tbody tr')).toHaveCount(0);
    await page.getByRole('main').getByRole('link', { name: 'Quitadas', exact: true }).click();
    await page.locator('#busca-vendas-quitadas').fill('Cliente DEMO E2E recebimento');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page
      .getByRole('link', { name: /Visualizar venda de Cliente DEMO E2E recebimento/ })
      .click();
    await expect(page).toHaveURL(id);
  }
});

test('dialog nativo contém foco, cancela por botão/Escape e reabre limpo nos dois temas', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await preencherCadastro(page, 'Cliente DEMO E2E cancelamento modal');
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    const antes = await page.locator('section[aria-labelledby="dados-financeiros"]').innerText();
    const receber = page.getByRole('button', { name: /Receber parcelas da venda/ });
    await receber.click();
    const dialog = page.getByRole('dialog', { name: 'Receber parcelas' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((elemento) => elemento.matches(':modal'))).toBe(true);
    const caixa = await dialog.boundingBox();
    expect(caixa).not.toBeNull();
    expect(
      Math.abs(caixa!.x + caixa!.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThanOrEqual(1);
    expect(caixa!.y).toBeGreaterThanOrEqual(0);
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(page.getByLabel('Quantidade de parcelas consecutivas')).toBeFocused();
    for (const tecla of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(tecla);
        const foco = await page.evaluate(() => ({
          dentro: !!document.activeElement?.closest('dialog'),
          elemento: document.activeElement?.tagName,
          id: document.activeElement?.id,
          texto: document.activeElement?.textContent?.trim().slice(0, 80),
        }));
        expect(foco.dentro, JSON.stringify({ tecla, indice: i, foco })).toBe(true);
      }
    }
    await page.getByLabel('Quantidade de parcelas consecutivas').selectOption('2');
    await page.getByLabel('Valor recebido (R$)').fill('66,67');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(receber).toBeFocused();
    expect(await page.locator('section[aria-labelledby="dados-financeiros"]').innerText()).toBe(
      antes,
    );
    await receber.click();
    await expect(page.getByLabel('Quantidade de parcelas consecutivas')).toHaveValue('1');
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(receber).toBeFocused();
    expect(await page.locator('section[aria-labelledby="dados-financeiros"]').innerText()).toBe(
      antes,
    );
  }
});

for (const origem of ['/vendas', '/vendas/quitadas']) {
  test(`edita cliente em ${origem}, preserva finanças e restaura foco ao cancelar`, async ({
    page,
  }) => {
    await page.goto(origem);
    await page
      .getByRole('link', { name: /Visualizar venda de/ })
      .first()
      .click();
    const dados = page.locator('section[aria-labelledby="dados-financeiros"]');
    const antes = await dados.innerText();
    const detalhe = page.url();
    await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Editar dados do cliente', exact: true }),
    ).toBeFocused();
    await expect(page.locator('form input, form textarea')).toHaveCount(4);
    await page.getByLabel('Nome', { exact: true }).fill('DEMO alteração cancelada');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(detalhe);
    await expect(
      page.getByRole('link', { name: /Editar dados do cliente da venda/ }),
    ).toBeFocused();
    expect(await dados.innerText()).toBe(antes);
    await page
      .getByRole('link', {
        name: origem === '/vendas' ? 'Voltar para Vendas' : 'Ver Vendas quitadas',
        exact: true,
      })
      .click();
    await page
      .getByRole('link', { name: /Editar dados do cliente da venda/ })
      .first()
      .click();
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await expect(page.getByLabel('CPF', { exact: true })).toBeFocused();
    await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
    await page.getByLabel('Telefone com DDD').fill('(00) 91234-5678');
    await page.getByLabel('Nome', { exact: true }).fill('Cliente DEMO E2E editado');
    await page.getByLabel('Descrição (opcional)').fill('');
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await expect(page).toHaveURL(detalhe);
    await expect(page.getByRole('main')).toContainText('Cliente DEMO E2E editado');
    expect(await dados.innerText()).toBe(antes);
    await page
      .getByRole('link', {
        name: origem === '/vendas' ? 'Voltar para Vendas' : 'Ver Vendas quitadas',
        exact: true,
      })
      .click();
    await page
      .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
      .fill('E2E editado');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${origem}$`));
    await expect(
      page.getByRole('link', { name: /Editar dados do cliente da venda.*E2E editado/ }),
    ).toBeFocused();
  });
}

test('cadastra sem entrada/descrição uma única vez com Enter repetido e descarta no reload', async ({
  page,
}) => {
  await page.goto('/vendas');
  await page.getByRole('link', { name: 'Nova venda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova venda', exact: true })).toBeFocused();
  await preencherCadastro(page, 'Cliente DEMO E2E sem entrada');
  await expect(
    page.getByRole('region', { name: 'Prévia completa das parcelas' }).locator('tbody tr'),
  ).toHaveCount(3);
  await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toContainText(
    '33,34',
  );
  await page.getByLabel('Quantidade de parcelas').press('Enter');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vendas\/sessao%2Fvenda%2F1$/i);
  await expect(page.getByRole('status')).toContainText('Venda demonstrativa cadastrada.');
  await expect(page.getByRole('main')).toContainText('Sem entrada');
  await expect(
    page
      .getByRole('main')
      .locator('dt')
      .filter({ hasText: /^Descrição$/ }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('Cliente DEMO E2E sem entrada');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page
    .getByRole('link', { name: /Abrir detalhes da venda de Cliente DEMO E2E sem entrada/ })
    .click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Venda não encontrada' })).toBeVisible();
});

test('cadastra com entrada e descrição pela UI e impede clique duplicado', async ({ page }) => {
  await page.goto('/vendas/nova');
  await preencherCadastro(page, 'Cliente DEMO E2E entrada');
  await page.getByLabel('Descrição (opcional)').fill('Descrição sintética de conferência.');
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('1000');
  await page.getByLabel('Quantidade de parcelas').fill('4');
  await page.getByLabel('Há entrada').check();
  await page.getByLabel('Valor da entrada (R$)').fill('200');
  await page.getByLabel('Forma da entrada').selectOption('Pix');
  const previa = page.getByRole('region', { name: 'Prévia completa das parcelas' });
  await expect(previa.locator('tbody tr')).toHaveCount(4);
  await expect(previa.locator('tbody tr').first()).toContainText('200,00');
  await page
    .getByRole('button', { name: 'Confirmar cadastro demonstrativo' })
    .evaluate((botao: HTMLButtonElement) => {
      botao.click();
      botao.click();
    });
  await expect(page).toHaveURL(/\/vendas\/sessao%2Fvenda%2F1$/i);
  await expect(page.getByRole('main')).toContainText('Descrição sintética de conferência.');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Total pago$/ })
      .locator('+ dd'),
  ).toContainText('200,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd'),
  ).toContainText('800,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Parcelas pagas$/ })
      .locator('+ dd'),
  ).toContainText('0 de 4');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('Cliente DEMO E2E entrada');
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('reconcilia cadastro, entrada, quitação e edição entre listas, Visão Geral e Relatórios', async ({
  page,
}) => {
  const nome = 'Cliente DEMO FASE007 integrado';
  await page.goto('/visao-geral');
  const indicadoresIniciais = await indicadoresVisaoGeral(page);
  const valorInicialAberto = await valorEmCentavos(indicador(page, 'Total em aberto'));
  const recebimentosGlobaisIniciais = await valorEmCentavos(indicador(page, 'Recebimentos do mês'));
  const vendasCadastradasIniciais = Number(await indicador(page, 'Vendas cadastradas').innerText());
  const referencia = await page
    .getByRole('main')
    .locator('p')
    .filter({ hasText: 'Referência da demonstração:' })
    .innerText();
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  const vendasDoMes = page.locator('section[aria-labelledby="vendas-mensais"]');
  const recebimentosDoMes = page.locator('section[aria-labelledby="recebimentos-mensais"]');
  const posicaoEmAberto = page.locator('section[aria-labelledby="posicao-aberta"]');
  const parcelasVencidas = page.locator('section[aria-labelledby="parcelas-vencidas"]');
  const vendasIniciais = await vendasDoMes.locator(':scope > p').innerText();
  const quantidadeInicial = Number(vendasIniciais.match(/(\d+) vendas?/)?.[1]);
  const totalVendidoInicial = await valorEmCentavos(vendasDoMes.locator(':scope > p'));
  const recebimentoInicial = await valorEmCentavos(recebimentosDoMes.locator(':scope > p'));

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page.getByRole('link', { name: 'Nova venda' }).click();
  await preencherCadastro(page, nome);
  const dataVenda = await page.getByLabel('Data da venda', { exact: true }).inputValue();
  expect(referencia).toContain(dataVenda.split('-').reverse().join('/'));
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('1000');
  await page.getByLabel('Quantidade de parcelas').fill('4');
  await page.getByLabel('Há entrada').check();
  await page.getByLabel('Valor da entrada (R$)').fill('200');
  await page.getByLabel('Forma da entrada').selectOption('Pix');
  await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
  await expect(page).toHaveURL(/\/vendas\/sessao%2Fvenda%2F1$/i);
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Total pago$/ })
      .locator('+ dd'),
  ).toContainText('200,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd'),
  ).toContainText('800,00');

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  expect(await valorEmCentavos(indicador(page, 'Total em aberto'))).toBe(
    valorInicialAberto + 80000,
  );
  expect(await valorEmCentavos(indicador(page, 'Recebimentos do mês'))).toBe(
    recebimentosGlobaisIniciais + 20000,
  );
  expect(Number(await indicador(page, 'Vendas cadastradas').innerText())).toBe(
    vendasCadastradasIniciais + 1,
  );
  const indicadoresAposCadastro = await indicadoresVisaoGeral(page);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  expect(await valorEmCentavos(recebimentosDoMes.locator(':scope > p'))).toBe(
    recebimentoInicial + 20000,
  );
  expect(await valorEmCentavos(vendasDoMes.locator(':scope > p'))).toBe(
    totalVendidoInicial + 100000,
  );
  expect(
    Number((await vendasDoMes.locator(':scope > p').innerText()).match(/(\d+) vendas?/)?.[1]),
  ).toBe(quantidadeInicial + 1);
  await expect(recebimentosDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('sem-resultado');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  await expect(indicador(page, 'Total em aberto')).toContainText('R$');
  const aposFiltro = await indicadoresVisaoGeral(page);
  expect(aposFiltro).toEqual(indicadoresAposCadastro);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page.getByRole('link', { name: new RegExp(`Visualizar venda de ${nome}`) }).click();
  await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
  await page.getByRole('button', { name: /Receber parcelas da venda/ }).click();
  await page.getByLabel('Quantidade de parcelas consecutivas').selectOption('4');
  await page.getByLabel('Valor recebido (R$)').fill('800');
  await page.getByLabel('Forma do recebimento').selectOption('Dinheiro');
  await page.getByRole('button', { name: 'Confirmar recebimento demonstrativo' }).click();
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Total pago$/ })
      .locator('+ dd'),
  ).toContainText('1.000,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd'),
  ).toContainText('0,00');

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  expect(await valorEmCentavos(indicador(page, 'Total em aberto'))).toBe(valorInicialAberto);
  expect(await valorEmCentavos(indicador(page, 'Recebimentos do mês'))).toBe(
    recebimentosGlobaisIniciais + 100000,
  );
  expect(Number(await indicador(page, 'Vendas cadastradas').innerText())).toBe(
    vendasCadastradasIniciais + 1,
  );

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  expect(await valorEmCentavos(recebimentosDoMes.locator(':scope > p'))).toBe(
    recebimentoInicial + 100000,
  );
  await expect(recebimentosDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(2);
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);
  await expect(posicaoEmAberto.locator('tbody tr').filter({ hasText: nome })).toHaveCount(0);
  await expect(parcelasVencidas.locator('tbody tr').filter({ hasText: nome })).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill(nome);
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Quitadas', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vendas quitadas' })).toBeVisible();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill(nome);
  const vendaQuitada = page.locator('tbody tr').filter({ hasText: nome });
  await expect(vendaQuitada).toHaveCount(1);
  await vendaQuitada
    .getByRole('link', { name: /Visualizar venda de Cliente DEMO FASE007 integrado/ })
    .click();
  const dadosFinanceiros = page.locator('section[aria-labelledby="dados-financeiros"]');
  const antesEdicao = await dadosFinanceiros.innerText();
  await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
  await page.getByLabel('Nome', { exact: true }).fill(`${nome} editado`);
  await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
  await expect(page.getByRole('main')).toContainText(`${nome} editado`);
  expect(await dadosFinanceiros.innerText()).toBe(antesEdicao);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: `${nome} editado` })).toHaveCount(
    1,
  );

  await page.reload();
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  expect(await indicadoresVisaoGeral(page)).toEqual(indicadoresIniciais);
});

test('revela erros por campo e foco, invalida prévia e cancela sem efeito nos dois temas', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    const linhas = await page.locator('tbody tr').count();
    await page.getByRole('link', { name: 'Nova venda', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toBeFocused();
    await expect(page.locator('#erro-nome')).toContainText('Informe o nome');
    await preencherCadastro(page, 'Cliente DEMO cancelado');
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.getByLabel('CPF', { exact: true })).toBeFocused();
    await expect(page.locator('#erro-cpf')).toContainText('verificadores');
    await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(/\/vendas$/);
    await expect(page.getByRole('link', { name: 'Nova venda', exact: true })).toBeFocused();
    await expect(page.locator('tbody tr')).toHaveCount(linhas);
    await page.getByRole('link', { name: 'Nova venda', exact: true }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('');
  }
});
