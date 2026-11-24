import { expect, test } from '@playwright/test';

async function selecionarTema(page: import('@playwright/test').Page, tema: 'dark' | 'light') {
  const raiz = page.locator('app-root');
  if ((await raiz.getAttribute('data-tema')) !== tema) {
    await page.getByRole('button', { name: /Tema (escuro|claro)/ }).click();
  }
  await expect(raiz).toHaveAttribute('data-tema', tema);
}

async function confirmarStatus(page: import('@playwright/test').Page) {
  const dialog = page.getByRole('dialog', { name: 'Confirmar mudança de status' });
  const confirmar = dialog.getByRole('button', { name: 'Confirmar mudança' });
  await expect(confirmar).toBeFocused();
  await confirmar.click();
  await expect(dialog).toBeHidden();
}

for (const tema of ['dark', 'light'] as const) {
  test(`transições administrativas e retorno de venda aberta em ${tema}`, async ({ page }) => {
    await page.goto('/vendas/seed%2Fvenda%2F2');
    await selecionarTema(page, tema);
    const status = page.locator('section[aria-labelledby="titulo-status-administrativo"]');
    const inativar = page.getByRole('button', { name: 'Inativar venda' });
    await expect(status).toContainText('Ativo');

    await inativar.click();
    let dialog = page.getByRole('dialog', { name: 'Confirmar mudança de status' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Confirmar mudança' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(inativar).toBeFocused();

    await inativar.click();
    await confirmarStatus(page);
    await expect(status).toContainText('Inativo');
    await expect(page.getByRole('button', { name: 'Marcar como Prejuízo' })).toHaveCount(0);
    await expect(page.locator('[data-acao-pagar]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Voltar para Vendas inativas' })).toHaveAttribute(
      'href',
      '/vendas/inativas',
    );

    await page.getByRole('link', { name: 'Voltar para Vendas inativas' }).click();
    await expect(page).toHaveURL(/\/vendas\/inativas$/);
    const linha = page.locator('tbody tr').filter({ hasText: 'Lucas Santos' });
    await expect(linha).toHaveCount(1);
    await linha.locator('a').first().click();
    await expect(page).toHaveURL(/\/vendas\/seed%2Fvenda%2F2$/i);

    await page.getByRole('button', { name: 'Reativar venda' }).click();
    await confirmarStatus(page);
    await expect(status).toContainText('Ativo');
    await expect(
      page.getByRole('link', { name: 'Voltar para Vendas', exact: true }),
    ).toHaveAttribute('href', '/vendas');

    await page.getByRole('button', { name: 'Marcar como Prejuízo' }).click();
    await confirmarStatus(page);
    await expect(status).toContainText('Prejuízo');
    await expect(page.getByRole('button', { name: 'Inativar venda' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Voltar para Prejuízo' })).toHaveAttribute(
      'href',
      '/vendas/prejuizo',
    );
    await page.getByRole('link', { name: 'Voltar para Prejuízo' }).click();
    await expect(page).toHaveURL(/\/vendas\/prejuizo$/);
    const linhaPrejuizo = page.locator('tbody tr').filter({ hasText: 'Lucas Santos' });
    await expect(linhaPrejuizo).toHaveCount(1);
    await linhaPrejuizo.locator('a').first().click();
    await expect(page).toHaveURL(/\/vendas\/seed%2Fvenda%2F2$/i);

    await page.getByRole('button', { name: 'Reabrir venda' }).click();
    await confirmarStatus(page);
    await expect(status).toContainText('Ativo');
    await expect(
      page.getByRole('link', { name: 'Voltar para Vendas', exact: true }),
    ).toHaveAttribute('href', '/vendas');
  });

  test(`venda quitada reativada retorna à coleção Quitadas em ${tema}`, async ({ page }) => {
    await page.goto('/vendas/quitadas');
    await selecionarTema(page, tema);
    const linha = page.locator('tbody tr').first();
    const nome = (await linha.locator('th a').textContent())?.trim() ?? '';
    await linha.locator('a').first().click();
    await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
    const status = page.locator('section[aria-labelledby="titulo-status-administrativo"]');
    await expect(status).toContainText('Ativo');

    await page.getByRole('button', { name: 'Inativar venda' }).click();
    await confirmarStatus(page);
    await page.getByRole('button', { name: 'Reativar venda' }).click();
    await confirmarStatus(page);
    await expect(status).toContainText('Ativo');
    await expect(page.getByRole('link', { name: 'Voltar para Quitadas' })).toHaveAttribute(
      'href',
      '/vendas/quitadas',
    );
    await page.getByRole('link', { name: 'Voltar para Quitadas' }).click();
    await expect(page).toHaveURL(/\/vendas\/quitadas$/);
    await expect(page.locator('tbody')).toContainText(nome);
  });
}
