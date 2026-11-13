import { expect, test as base } from '@playwright/test';

const produto = 'Mercadão dos Óculos - Vendas em Aberto';
const aviso = 'Demonstração com dados fictícios. As alterações são perdidas ao recarregar.';
const destinos = [
  ['/visao-geral', 'Visão Geral'],
  ['/vendas', 'Vendas'],
  ['/vendas/quitadas', 'Vendas quitadas'],
  ['/relatorios', 'Relatórios'],
  ['/configuracoes', 'Configurações'],
] as const;

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

test('abre a estrutura e carrega a logo local sem distorção', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  await expect(page.getByText(produto, { exact: true })).toBeVisible();
  await expect(
    page.getByText('Os fluxos comerciais ainda não estão disponíveis nesta demonstração.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('form, input')).toHaveCount(0);
  const logo = page.locator('.identidade img');
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((elemento: HTMLImageElement) => ({
      carregada: elemento.complete && elemento.naturalWidth > 0,
      proporcao:
        Math.abs(
          elemento.width / elemento.height - elemento.naturalWidth / elemento.naturalHeight,
        ) < 0.02,
    })),
  ).toEqual({ carregada: true, proporcao: true });
});

test('mantém o aviso completo ao abrir e recarregar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
  await expect(page.getByTestId('aviso-demonstracao')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visão Geral');
  await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
  await expect(page.getByTestId('aviso-demonstracao')).toBeVisible();
});

test('abre e recarrega cada destino com identidade, aviso e localização', async ({ page }) => {
  for (const [rota, titulo] of destinos) {
    await page.goto(rota);
    for (const recarregar of [false, true]) {
      if (recarregar) await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
      await expect(page).toHaveTitle(`${titulo} | ${produto}`);
      await expect(page.getByText(produto, { exact: true })).toBeVisible();
      await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
      await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  }
});

test('orienta foco por teclado, atalho, histórico e retorno de caminho desconhecido', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  for (const [nome, titulo] of [
    ['Vendas', 'Vendas'],
    ['Quitadas', 'Vendas quitadas'],
    ['Relatórios', 'Relatórios'],
    ['Configurações', 'Configurações'],
    ['Visão Geral', 'Visão Geral'],
  ]) {
    const link = nav.getByRole('link', { name: nome, exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeFocused();
  }
  const ativo = nav.getByRole('link', { name: 'Visão Geral', exact: true });
  await ativo.focus();
  await page.keyboard.press('Enter');
  await expect(ativo).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeFocused();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeFocused();
  await page.goto('/caminho-desconhecido');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
  await page.getByRole('link', { name: 'Voltar para Visão Geral' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // Cliques rápidos não devem focar um título obsoleto de página lazy.
  await nav.getByRole('link', { name: 'Vendas', exact: true }).click();
  await nav.getByRole('link', { name: 'Relatórios', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeFocused();
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
      bootstrapAplicado:
        getComputedStyle(document.querySelector('.alert')!).borderRadius !== '0px' &&
        getComputedStyle(document.querySelector('.barra-lateral')!).display === 'flex',
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visão Geral');
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
