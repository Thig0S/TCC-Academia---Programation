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
