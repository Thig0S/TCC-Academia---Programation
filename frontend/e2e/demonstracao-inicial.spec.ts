import { expect, test as base } from '@playwright/test';

const produto = 'Mercadão dos Óculos - Vendas em Aberto';
const aviso = 'Demonstração com dados fictícios. As alterações são perdidas ao recarregar.';

const test = base.extend<{ monitoramento: void }>({
  monitoramento: [
    async ({ page }, use) => {
      const erros: string[] = [];
      page.on('pageerror', (erro) => erros.push(erro.message));
      page.on('console', (mensagem) => {
        if (mensagem.type() === 'error') erros.push(mensagem.text());
      });
      await use();
      expect(erros, 'Sem pageerror ou erros inesperados de console').toEqual([]);
    },
    { auto: true },
  ],
});

test('abre a página técnica', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: produto })).toBeVisible();
  await expect(
    page.getByText('Esta é uma base técnica. Os fluxos comerciais ainda não estão disponíveis.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('form, input, button')).toHaveCount(0);
});

test('mantém o aviso completo ao abrir e recarregar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
  await expect(page.getByTestId('aviso-demonstracao')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(produto);
  await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
  await expect(page.getByTestId('aviso-demonstracao')).toBeVisible();
});

test('declara pt-BR e permite ler título e aviso sem corte horizontal', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('aviso-demonstracao')).toBeVisible();

  const leitura = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const elementos = Array.from(
      document.querySelectorAll('h1, [data-testid="aviso-demonstracao"]'),
    );
    return {
      semRolagemHorizontal: document.documentElement.scrollWidth <= largura,
      textosDentroDaTela: elementos.every((elemento) => {
        const faixa = document.createRange();
        faixa.selectNodeContents(elemento);
        return Array.from(faixa.getClientRects()).every(
          (retangulo) => retangulo.left >= 0 && retangulo.right <= largura,
        );
      }),
      bootstrapAplicado: getComputedStyle(document.querySelector('main')!).paddingTop === '48px',
    };
  });
  expect(leitura).toEqual({
    semRolagemHorizontal: true,
    textosDentroDaTela: true,
    bootstrapAplicado: true,
  });
});

test('abre e recarrega em contexto limpo sem dados externos ou persistência', async ({
  page,
  context,
  baseURL,
}) => {
  const origemLocal = new URL(baseURL!).origin;
  const redeIndevida: string[] = [];
  page.on('request', (requisicao) => {
    const url = new URL(requisicao.url());
    if (
      url.origin !== origemLocal ||
      requisicao.method() !== 'GET' ||
      ['fetch', 'xhr', 'eventsource'].includes(requisicao.resourceType())
    ) {
      redeIndevida.push(`${requisicao.resourceType()} ${requisicao.method()} ${url.href}`);
    }
  });
  page.on('websocket', (conexao) => {
    const url = new URL(conexao.url());
    const servidor = new URL(origemLocal);
    // Única exceção: canal WebSocket local do servidor de desenvolvimento Vite.
    if (url.protocol !== 'ws:' || url.host !== servidor.host || url.pathname !== '/') {
      redeIndevida.push(`websocket ${url.href}`);
    }
  });

  expect(await context.cookies()).toEqual([]);
  for (const recarregar of [false, true]) {
    if (recarregar) await page.reload();
    else await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(produto);
    await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
    await page.waitForLoadState('networkidle');

    expect(await context.cookies()).toEqual([]);
    const armazenamento = await page.evaluate(async () => ({
      local: localStorage.length,
      sessao: sessionStorage.length,
      bancos: await indexedDB.databases(),
      caches: await caches.keys(),
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
    }));
    expect(armazenamento).toEqual({
      local: 0,
      sessao: 0,
      bancos: [],
      caches: [],
      serviceWorkers: 0,
    });
  }
  expect(redeIndevida, 'Somente recursos locais e canal de desenvolvimento').toEqual([]);
});
