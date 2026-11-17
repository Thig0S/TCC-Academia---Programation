import { expect, test } from '@playwright/test';

test('mede dez linhas e rodapé no viewport desktop nos dois temas', async ({ page }) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-bs-theme', tema);
    const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
    await expect(tabela.locator('tbody tr')).toHaveCount(10);
    await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText(
      '1–10 de 21 vendas',
    );
    const geometria = await page.evaluate(() => {
      const linhas = [...document.querySelectorAll('app-tabela-vendas tbody tr')];
      const rodape = document.querySelector('app-paginacao-vendas nav');
      return {
        alturaViewport: window.innerHeight,
        alturaDocumento: document.documentElement.scrollHeight,
        topoPrimeiraLinha: linhas[0]?.getBoundingClientRect().top ?? -1,
        baseDecimaLinha: linhas[9]?.getBoundingClientRect().bottom ?? -1,
        baseRodape: rodape?.getBoundingClientRect().bottom ?? -1,
      };
    });
    expect(geometria.topoPrimeiraLinha).toBeGreaterThanOrEqual(0);
    expect(geometria.baseDecimaLinha).toBeLessThanOrEqual(geometria.alturaViewport);
    expect(geometria.baseRodape).toBeLessThanOrEqual(geometria.alturaViewport);
    expect(geometria.alturaDocumento).toBeLessThanOrEqual(geometria.alturaViewport);
    console.log(`Geometria ${tema}: ${JSON.stringify(geometria)}`);
    await test.info().attach(`geometria-${tema}`, {
      body: JSON.stringify(geometria, null, 2),
      contentType: 'application/json',
    });
    await test.info().attach(`captura-${tema}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
});

test('percorre páginas por teclado mantendo o foco e anunciando a faixa', async ({ page }) => {
  await page.goto('/vendas');
  const proxima = page.getByRole('button', { name: 'Próxima página' });
  await proxima.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText('11–20 de 21 vendas');
  await expect(proxima).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Paginação de vendas' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Paginação de vendas' }).locator('[aria-current="page"]'),
  ).toHaveText('2');
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText('21–21 de 21 vendas');
  await expect(proxima).toHaveAttribute('aria-disabled', 'true');
  await expect(proxima).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText('21–21 de 21 vendas');
});

test('mostra dez parcelas e blocos de cliente/venda no primeiro viewport', async ({ page }) => {
  await page.goto('/vendas');
  await page.getByRole('link', { name: 'Quitadas', exact: true }).first().click();
  const busca = page.getByRole('searchbox');
  await busca.fill('Cliente Fixture Detalhe Dez');
  await expect(page.getByRole('status').first()).toContainText('1 venda encontrada');
  await page
    .getByRole('table', { name: 'Vendas quitadas' })
    .getByRole('link', { name: /Visualizar venda de Cliente Fixture Detalhe Dez/ })
    .click();
  const parcelas = page.getByRole('region', { name: 'Parcelas da venda' });
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(10);
  await expect(page.getByRole('main')).toContainText(
    'Descrição curta para o cenário de dez parcelas.',
  );
  await expect(page.getByRole('main')).toContainText('Entrada');
  const geometria = await page.evaluate(() => {
    const cliente = document.querySelector('#identificacao-venda')!.parentElement!;
    const financeiro = document.querySelector('#dados-financeiros')!.parentElement!;
    const ultimaParcela = document.querySelector('app-detalhes-venda tbody tr:last-child')!;
    const regiao = document.querySelector('[aria-label="Parcelas da venda"]')!;
    return {
      alturaDocumento: document.documentElement.scrollHeight,
      alturaViewport: window.innerHeight,
      topoCliente: cliente.getBoundingClientRect().top,
      topoFinanceiro: financeiro.getBoundingClientRect().top,
      baseUltimaParcela: ultimaParcela.getBoundingClientRect().bottom,
      baseTabela: regiao.getBoundingClientRect().bottom,
    };
  });
  expect(Math.abs(geometria.topoCliente - geometria.topoFinanceiro)).toBeLessThanOrEqual(1);
  expect(geometria.baseUltimaParcela).toBeLessThanOrEqual(geometria.alturaViewport);
  expect(geometria.baseTabela).toBeLessThanOrEqual(geometria.alturaViewport);
  expect(geometria.alturaDocumento).toBeLessThanOrEqual(geometria.alturaViewport);
  await expect(parcelas).toBeVisible();
  console.log(`Detalhe com dez parcelas: ${JSON.stringify(geometria)}`);
  await test.info().attach('detalhe-dez-parcelas', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('mantém parcelas excedentes em região rolável interna e operável por teclado', async ({
  page,
}) => {
  await page.goto('/vendas');
  await page.getByRole('link', { name: 'Quitadas', exact: true }).first().click();
  await page.getByRole('searchbox').fill('Cliente Fixture Detalhe Onze');
  await expect(page.getByRole('status').first()).toContainText('1 venda encontrada');
  await page
    .getByRole('table', { name: 'Vendas quitadas' })
    .getByRole('link', { name: /Visualizar venda de Cliente Fixture Detalhe Onze/ })
    .click();
  const regiao = page.getByRole('region', { name: 'Parcelas da venda' });
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(11);
  await expect(page.getByRole('main')).toContainText('Descrição extensa para rolagem interna.');
  await expect(regiao).toHaveClass(/parcelas-com-rolagem/);
  await regiao.focus();
  await page.keyboard.press('End');
  const rolagem = await regiao.evaluate((elemento) => ({
    topo: elemento.scrollTop,
    alturaInterna: elemento.scrollHeight,
    alturaVisivel: elemento.clientHeight,
    cabecalho: getComputedStyle(elemento.querySelector('thead th')!).position,
  }));
  expect(rolagem.topo).toBeGreaterThan(0);
  expect(rolagem.alturaInterna).toBeGreaterThan(rolagem.alturaVisivel);
  expect(rolagem.cabecalho).toBe('sticky');
  await expect(regiao).toBeFocused();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(11);
});
