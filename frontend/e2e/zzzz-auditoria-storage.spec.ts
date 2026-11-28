import { expect, test } from '@playwright/test';

test('demonstração mantém tema e consultas sem gravar dados ou preferências no browser', async ({
  page,
}) => {
  const requisicoes = new Set<string>();
  page.on('request', (request) => requisicoes.add(request.url()));

  const lerArmazenamento = () =>
    page.evaluate(async () => ({
      local: Object.keys(localStorage),
      sessao: Object.keys(sessionStorage),
      indexedDb: (await indexedDB.databases()).map((database) => database.name),
      caches: await caches.keys(),
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
      cookies: document.cookie,
    }));

  for (const [rota, titulo] of [
    ['/visao-geral', 'Visão Geral'],
    ['/vendas', 'Vendas'],
    ['/relatorios', 'Relatórios'],
    ['/configuracoes', 'Configurações'],
  ]) {
    await page.goto(rota);
    await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeVisible();
    expect(await lerArmazenamento()).toEqual({
      local: [],
      sessao: [],
      indexedDb: [],
      caches: [],
      serviceWorkers: 0,
      cookies: '',
    });
  }

  await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'light');
  expect(await lerArmazenamento()).toEqual({
    local: [],
    sessao: [],
    indexedDb: [],
    caches: [],
    serviceWorkers: 0,
    cookies: '',
  });
  await expect(page.context().cookies()).resolves.toEqual([]);

  await page.reload();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'dark');
  expect(await lerArmazenamento()).toEqual({
    local: [],
    sessao: [],
    indexedDb: [],
    caches: [],
    serviceWorkers: 0,
    cookies: '',
  });
  expect([...requisicoes].some((url) => /\/api\/v1(?:\/|\?|$)/.test(url))).toBe(false);
  expect([...requisicoes].every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(
    true,
  );
});
