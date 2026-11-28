import { expect, test } from './local-stack';

test('modo local explica persistência, renova ao recarregar e não recorre ao demo', async ({
  page,
  localStack,
}) => {
  expect(localStack.baseURL).toBe('http://127.0.0.1:4200');
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: '{"code":"indisponivel"}',
    }),
  );

  await page.goto('/configuracoes');
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Limites do modo local' })).toBeVisible();
  await expect(page.locator('.barra-superior')).toContainText('Modo local persistido');
  await expect(page.getByRole('main')).toContainText('Negócios persistidos localmente');
  await expect(page.getByRole('main')).toContainText('referência');
  await expect(page.getByRole('main')).toContainText('SQLite local');
  await expect(page.getByRole('main')).toContainText('conferência explícita');
  await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
  await expect(page.locator('input[type="password"], form')).toHaveCount(0);
  await expect(
    page.getByRole('main').locator('form, input, select, textarea, button, a'),
  ).toHaveCount(0);
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'dark');

  await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'light');
  await page.reload();
  await expect(page).toHaveURL(/\/configuracoes$/);
  await expect(page.getByRole('heading', { name: 'Limites do modo local' })).toBeVisible();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'dark');

  const destinos: [string, string, 1 | 2][] = [
    ['/', 'Visão Geral', 1],
    ['/visao-geral', 'Visão Geral', 1],
    ['/vendas', 'Vendas', 1],
    ['/vendas/quitadas', 'Vendas quitadas', 2],
    ['/vendas/inativas', 'Vendas inativas', 2],
    ['/vendas/prejuizo', 'Vendas em Prejuízo', 2],
    ['/relatorios', 'Relatórios', 1],
    ['/configuracoes', 'Configurações', 1],
  ];
  for (const [rota, titulo, nivel] of destinos) {
    for (const recarregar of [false, true]) {
      await page.goto(rota);
      if (recarregar) await page.reload();
      await expect(page.getByRole('heading', { level: nivel, name: titulo })).toBeVisible();
      if (rota === '/vendas') {
        await expect(page.getByRole('main').getByRole('alert')).toContainText(
          'Não foi possível carregar vendas em aberto',
        );
      }
    }
  }
});
