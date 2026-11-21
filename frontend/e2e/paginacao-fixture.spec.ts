import { expect, test } from '@playwright/test';

test('mede dez linhas, critérios e rodapé nos temas e viewports suportados', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
    await expect(tabela.locator('tbody tr')).toHaveCount(10);
    await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText(
      '1–10 de 21 vendas',
    );
    const geometria = await page.evaluate(() => {
      const linhas = [...document.querySelectorAll('app-tabela-vendas tbody tr')];
      const rodape = document.querySelector('app-paginacao-vendas nav');
      const controles = [...document.querySelectorAll('.consulta-controles > div')];
      const basesControles = controles.map((controle) => controle.getBoundingClientRect().bottom);
      const tabela = document.querySelector('app-tabela-vendas table')!;
      const cabecalho = tabela.querySelector('thead th')!;
      const celula = tabela.querySelector('tbody th')!;
      return {
        alturaViewport: window.innerHeight,
        alturaDocumento: document.documentElement.scrollHeight,
        larguraDocumento: document.documentElement.scrollWidth,
        larguraViewport: document.documentElement.clientWidth,
        diferencaBaseControles: Math.max(...basesControles) - Math.min(...basesControles),
        topoPrimeiraLinha: linhas[0]?.getBoundingClientRect().top ?? -1,
        baseDecimaLinha: linhas[9]?.getBoundingClientRect().bottom ?? -1,
        baseRodape: rodape?.getBoundingClientRect().bottom ?? -1,
        estiloTabela: getComputedStyle(tabela).borderCollapse,
        bordaCabecalho: getComputedStyle(cabecalho).borderBottomWidth,
        espacamentoCelula: getComputedStyle(celula).paddingTop,
      };
    });
    expect(geometria.estiloTabela).toBe('collapse');
    expect(geometria.bordaCabecalho).toBe('1px');
    expect(geometria.espacamentoCelula).toBe('4px');
    expect(geometria.larguraDocumento).toBeLessThanOrEqual(geometria.larguraViewport);
    if (page.viewportSize()!.width >= 1200) {
      expect(geometria.topoPrimeiraLinha).toBeGreaterThanOrEqual(0);
      expect(geometria.baseDecimaLinha).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.baseRodape).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.alturaDocumento).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.diferencaBaseControles).toBeLessThanOrEqual(1);
    } else {
      const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
      await tabela.locator('tbody tr').last().scrollIntoViewIfNeeded();
      await page.getByRole('navigation', { name: 'Paginação de vendas' }).scrollIntoViewIfNeeded();
    }
    console.log(`Geometria ${tema}: ${JSON.stringify(geometria)}`);
    await test.info().attach(`geometria-${tema}`, {
      body: JSON.stringify(geometria, null, 2),
      contentType: 'application/json',
    });
    const captura = await page.screenshot({ fullPage: true });
    await page.screenshot({ path: testInfo.outputPath(`lista-${tema}.png`), fullPage: true });
    await test.info().attach(`captura-${tema}`, {
      body: captura,
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

test('mostra dez parcelas e blocos de cliente/venda em ambos os temas e viewports', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await page.getByRole('link', { name: 'Quitadas', exact: true }).first().click();
    const busca = page.locator('#busca-vendas-quitadas');
    await busca.fill('Cliente Fixture Detalhe Dez');
    await expect(page.getByRole('status').first()).toContainText('1 venda encontrada');
    await page
      .getByRole('table', { name: 'Vendas quitadas' })
      .getByRole('link', { name: /Visualizar venda de Cliente Fixture Detalhe Dez/ })
      .click();
    const parcelas = page.getByRole('region', { name: 'Parcelas da venda' });
    const tabela = page.getByRole('table', {
      name: /Parcelas da venda de Cliente Fixture Detalhe Dez/,
    });
    await expect(tabela.locator('tbody tr')).toHaveCount(10);
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
        larguraDocumento: document.documentElement.scrollWidth,
        larguraViewport: document.documentElement.clientWidth,
        topoCliente: cliente.getBoundingClientRect().top,
        topoFinanceiro: financeiro.getBoundingClientRect().top,
        baseUltimaParcela: ultimaParcela.getBoundingClientRect().bottom,
        baseTabela: regiao.getBoundingClientRect().bottom,
      };
    });
    expect(geometria.larguraDocumento).toBeLessThanOrEqual(geometria.larguraViewport);
    await expect(parcelas).toBeVisible();
    if (page.viewportSize()!.width >= 1200) {
      expect(Math.abs(geometria.topoCliente - geometria.topoFinanceiro)).toBeLessThanOrEqual(1);
      expect(geometria.baseUltimaParcela).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.baseTabela).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.alturaDocumento).toBeLessThanOrEqual(geometria.alturaViewport);
    } else {
      await tabela.locator('tbody tr').last().scrollIntoViewIfNeeded();
      expect(await page.getByRole('heading', { name: 'Detalhes da venda' }).isVisible()).toBe(true);
      await expect(page.getByRole('main')).toContainText('Cliente Fixture Detalhe Dez');
    }
    console.log(`Detalhe com dez parcelas ${tema}: ${JSON.stringify(geometria)}`);
    const captura = await page.screenshot({ fullPage: true });
    await page.screenshot({ path: testInfo.outputPath(`detalhe-dez-${tema}.png`), fullPage: true });
    await test.info().attach(`detalhe-dez-parcelas-${tema}`, {
      body: captura,
      contentType: 'image/png',
    });
  }
});

test('mantém parcelas excedentes em região rolável interna e operável por teclado', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await page.getByRole('link', { name: 'Quitadas', exact: true }).first().click();
    await page.locator('#busca-vendas-quitadas').fill('Cliente Fixture Detalhe Onze');
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
  }
});
