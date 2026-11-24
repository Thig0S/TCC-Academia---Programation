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

  const colecoes = page.getByRole('navigation', { name: 'Coleções de vendas' });
  const vendasAbertas = colecoes.getByRole('link', { name: 'Vendas em aberto', exact: true });
  await vendasAbertas.focus();
  await page.keyboard.press('Tab');
  await expect(colecoes.getByRole('link', { name: 'Quitadas', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(colecoes.getByRole('link', { name: 'Inativas', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const prejuizoColecoes = colecoes.getByRole('link', { name: 'Prejuízo', exact: true });
  await expect(prejuizoColecoes).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vendas\/prejuizo$/);
  await expect(page.getByText('Não há vendas em Prejuízo.')).toBeVisible();
  await expect(prejuizoColecoes).toHaveAttribute('aria-current', 'page');
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
