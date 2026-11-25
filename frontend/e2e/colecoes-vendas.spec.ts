import { expect, test } from '@playwright/test';

async function verificarSemOverflowHorizontal(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('navega por teclado entre coleções separadas e mantém controles responsivos', async ({
  page,
}) => {
  await page.goto('/vendas');
  const navegacaoPrincipal = page.getByRole('navigation', { name: 'Navegação principal' });
  const vendas = navegacaoPrincipal.getByRole('link', { name: 'Vendas', exact: true });
  await expect(vendas).toBeVisible();

  // A lista normal tem filtro financeiro e ordenação, mas não um seletor de status administrativo.
  await expect(page.getByLabel('Filtrar por situação')).toBeVisible();
  await expect(page.getByLabel('Ordenar por')).toBeVisible();
  await expect(page.getByLabel('Status administrativo')).toHaveCount(0);
  await expect(page.locator('#ordenacao-vendas option')).toHaveCount(4);

  await vendas.focus();
  await page.keyboard.press('Tab');
  await expect(
    navegacaoPrincipal.getByRole('link', { name: 'Quitadas', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const inativasPrincipal = navegacaoPrincipal.getByRole('link', { name: 'Inativas', exact: true });
  await expect(inativasPrincipal).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vendas\/inativas$/);
  await expect(page.getByText('Não há vendas inativas.')).toBeVisible();
  await verificarSemOverflowHorizontal(page);

  await expect(inativasPrincipal).toHaveAttribute('aria-current', 'page');
  const prejuizoPrincipal = navegacaoPrincipal.getByRole('link', {
    name: 'Prejuízo',
    exact: true,
  });
  await prejuizoPrincipal.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vendas\/prejuizo$/);
  await expect(page.getByText('Não há vendas em Prejuízo.')).toBeVisible();
  await expect(prejuizoPrincipal).toHaveAttribute('aria-current', 'page');
  await verificarSemOverflowHorizontal(page);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await expect(page).toHaveURL(/\/vendas$/);
  const ordenacao = page.getByLabel('Ordenar por');
  await ordenacao.focus();
  await page.keyboard.press('End');
  await expect(ordenacao).toHaveValue('vencimento');
  await page.keyboard.press('Home');
  await expect(ordenacao).toHaveValue('original');
  await verificarSemOverflowHorizontal(page);
});

test('empilha destinos administrativos em ordem nos dois temas', async ({ page }) => {
  await page.goto('/vendas');
  const raiz = page.locator('app-root');
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });

  for (const tema of ['dark', 'light'] as const) {
    if ((await raiz.getAttribute('data-tema')) !== tema) {
      await page.getByRole('button', { name: /Tema (escuro|claro)/ }).click();
    }
    await expect(raiz).toHaveAttribute('data-tema', tema);

    const rotulos = ['Quitadas', 'Inativas', 'Prejuízo'] as const;
    const links = rotulos.map((rotulo) =>
      navegacao.getByRole('link', { name: rotulo, exact: true }),
    );
    for (const [indice, link] of links.entries()) {
      const icone = link.locator('svg');
      await expect(icone).toHaveCount(1);
      await expect(icone).toHaveAttribute('aria-hidden', 'true');
      await expect(icone).toHaveAttribute('focusable', 'false');
      const caixaLink = await link.boundingBox();
      const caixaIcone = await icone.boundingBox();
      const caixaRotulo = await link.getByText(rotulos[indice], { exact: true }).boundingBox();
      expect(caixaLink).not.toBeNull();
      expect(caixaIcone).not.toBeNull();
      expect(caixaRotulo).not.toBeNull();
      expect(
        Math.abs(caixaIcone!.y + caixaIcone!.height / 2 - (caixaLink!.y + caixaLink!.height / 2)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(caixaRotulo!.y + caixaRotulo!.height / 2 - (caixaLink!.y + caixaLink!.height / 2)),
      ).toBeLessThanOrEqual(2);
    }
    const caixas = await Promise.all(links.map((link) => link.boundingBox()));
    expect(caixas.every((caixa) => caixa !== null)).toBe(true);
    const [quitadas, inativas, prejuizo] = caixas;
    expect(quitadas!.y).toBeLessThan(inativas!.y);
    expect(inativas!.y).toBeLessThan(prejuizo!.y);
    expect(inativas!.y - (quitadas!.y + quitadas!.height)).toBeGreaterThanOrEqual(7);
    expect(prejuizo!.y - (inativas!.y + inativas!.height)).toBeGreaterThanOrEqual(7);
    await verificarSemOverflowHorizontal(page);
  }
});
