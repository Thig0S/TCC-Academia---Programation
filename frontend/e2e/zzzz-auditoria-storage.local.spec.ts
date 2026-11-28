import { expect, test } from './local-stack';

test('auditoria local confirma que consultas não usam storage comercial do browser', async ({
  page,
  localStack,
}) => {
  const requisicoesApi: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requisicoesApi.push(request.url());
  });

  for (const [rota, titulo] of [
    ['/visao-geral', 'Visão Geral'],
    ['/vendas', 'Vendas'],
    ['/relatorios', 'Relatórios'],
    ['/configuracoes', 'Configurações'],
  ]) {
    await page.goto(rota);
    await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeVisible();
    const armazenamento = await page.evaluate(async () => ({
      local: Object.keys(localStorage),
      sessao: Object.keys(sessionStorage),
      indexedDb: (await indexedDB.databases()).map((database) => database.name),
      caches: await caches.keys(),
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
      cookies: document.cookie,
    }));
    expect(armazenamento).toEqual({
      local: [],
      sessao: [],
      indexedDb: [],
      caches: [],
      serviceWorkers: 0,
      cookies: '',
    });
    expect(await page.context().cookies()).toEqual([]);
  }

  expect(requisicoesApi.some((url) => url.includes('/api/v1/'))).toBe(true);
  expect(localStack.dadosSemSegredo(requisicoesApi.join('\n'))).toBe(true);
});
