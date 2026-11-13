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

test('páginas comerciais explicam indisponibilidade sem consulta ou ações fictícias', async ({
  page,
}) => {
  for (const [rota, titulo] of destinos.filter(([rota]) => rota !== '/configuracoes')) {
    await page.goto(rota);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
    await expect(page.getByRole('main')).toContainText(/nenhuma consulta foi realizada/i);
    await expect(page.locator('form, input, select, textarea, table')).toHaveCount(0);
    await expect(page.getByRole('main').locator('button')).toHaveCount(0);
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(page.getByRole('main')).not.toContainText(/R\$|\bCPF\b|\d/);
  }
});

test('Configurações explica os quatro limites pelos dois acessos e temas', async ({ page }) => {
  await page.goto('/');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    for (const acesso of ['principal', 'atalho']) {
      const link =
        acesso === 'principal'
          ? page
              .getByRole('navigation', { name: 'Navegação principal' })
              .getByRole('link', { name: 'Configurações', exact: true })
          : page.getByRole('link', { name: 'Atalho para Configurações', exact: true });
      await link.click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Configurações');
      for (const texto of [
        'Dados fictícios',
        'Estado apenas em memória',
        'Descarte ao recarregar',
        'Sem uso operacional',
        'não controla cobranças reais',
      ]) {
        await expect(page.getByRole('main')).toContainText(texto);
      }
      await expect(
        page.getByRole('main').locator('form, input, select, textarea, button, a'),
      ).toHaveCount(0);
      await expect(page.locator('app-root')).toHaveAttribute('data-bs-theme', tema);
      await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('link', { name: 'Visão Geral', exact: true })
        .click();
    }
  }
});

test('alterna tema com Enter e Espaço sem mudar foco ou rota', async ({ page }) => {
  await page.goto('/vendas');
  const botao = page.getByRole('button', { name: 'Tema escuro', exact: true });
  await expect(botao).toHaveAttribute('aria-pressed', 'true');
  await botao.focus();
  for (const [tecla, tema, texto] of [
    ['Enter', 'light', 'Claro'],
    ['Space', 'dark', 'Escuro'],
  ]) {
    await page.keyboard.press(tecla);
    await expect(page.locator('app-root')).toHaveAttribute('data-bs-theme', tema);
    await expect(botao).toHaveText(`Tema ativo: ${texto}`);
    await expect(botao).toHaveAttribute('aria-pressed', tema === 'dark' ? 'true' : 'false');
    await expect(botao).toBeFocused();
    await expect(page).toHaveURL(/\/vendas$/);
    await expect(page.getByTestId('aviso-demonstracao')).toHaveText(aviso);
  }
});

for (const preferencia of ['light', 'dark'] as const) {
  test(`inicia escuro com sistema ${preferencia} e restaura em nova sessão`, async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ colorScheme: preferencia });
    const novaPagina = await contexto.newPage();
    const erros: string[] = [];
    novaPagina.on('pageerror', (erro) => erros.push(erro.message));
    novaPagina.on('console', (mensagem) => {
      if (mensagem.type() === 'error') erros.push(mensagem.text());
    });
    await novaPagina.goto('http://127.0.0.1:4200/configuracoes');
    await expect(novaPagina.locator('app-root')).toHaveAttribute('data-bs-theme', 'dark');
    await novaPagina.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(novaPagina.locator('app-root')).toHaveAttribute('data-bs-theme', 'light');
    await novaPagina.reload();
    await expect(novaPagina.locator('app-root')).toHaveAttribute('data-bs-theme', 'dark');
    expect(erros).toEqual([]);
    await contexto.close();
    const outraSessao = await browser.newContext({ colorScheme: preferencia });
    const outraPagina = await outraSessao.newPage();
    await outraPagina.goto('http://127.0.0.1:4200/');
    await expect(outraPagina.locator('app-root')).toHaveAttribute('data-bs-theme', 'dark');
    await outraSessao.close();
  });
}

test('confere contraste efetivo, foco e superfícies com movimento reduzido', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/vendas/quitadas');
  const medicoes = [];
  for (const tema of ['dark', 'light']) {
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-bs-theme', tema);
    await page.getByRole('button', { name: 'Tema escuro', exact: true }).focus();
    const valores = await page.evaluate(() => {
      const cor = (valor: string): number[] => (valor.match(/[\d.]+/g) ?? []).map(Number);
      const mesclar = (frente: number[], fundo: number[]): number[] => {
        const alfa = frente[3] ?? 1;
        return frente.slice(0, 3).map((v, i) => v * alfa + fundo[i] * (1 - alfa));
      };
      const fundo = (elemento: Element | null): number[] => {
        if (!elemento) return [255, 255, 255];
        const atual = cor(getComputedStyle(elemento).backgroundColor);
        if ((atual[3] ?? 1) === 1) return atual;
        return mesclar(atual, fundo(elemento.parentElement));
      };
      const luminancia = (rgb: number[]): number =>
        rgb
          .slice(0, 3)
          .map((v) => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((soma, v, i) => soma + v * [0.2126, 0.7152, 0.0722][i], 0);
      const razao = (a: number[], b: number[]): number => {
        const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
        return Number(((maior + 0.05) / (menor + 0.05)).toFixed(2));
      };
      const textos = Array.from(
        document.querySelectorAll(
          'h1, h2, p, nav a, .perfil a, main a, .barra-superior span, button',
        ),
      ).map((e) => ({
        elemento: `${e.tagName} ${(e.textContent ?? '').trim().slice(0, 35)}`,
        razao: razao(mesclar(cor(getComputedStyle(e).color), fundo(e)), fundo(e)),
        minimo: e.tagName === 'H1' ? 3 : 4.5,
      }));
      const botao = document.querySelector('button')!;
      const estilo = getComputedStyle(botao);
      const superficie = fundo(botao.parentElement);
      return {
        textos,
        borda: razao(cor(estilo.borderTopColor), superficie),
        foco: razao(cor(estilo.outlineColor), superficie),
        larguraFoco: estilo.outlineWidth,
        superficieRaiz: getComputedStyle(document.querySelector('app-root')!).backgroundColor,
        altura: document.querySelector('app-root')!.getBoundingClientRect().height >= innerHeight,
        semCorte: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        semMovimento: estilo.transitionDuration === '0s',
      };
    });
    for (const texto of valores.textos)
      expect(texto.razao, texto.elemento).toBeGreaterThanOrEqual(texto.minimo);
    expect(valores.borda).toBeGreaterThanOrEqual(3);
    expect(valores.foco).toBeGreaterThanOrEqual(3);
    expect(valores.larguraFoco).toBe('3px');
    expect(valores.altura && valores.semCorte && valores.semMovimento).toBe(true);
    console.log(
      `Contraste ${tema}: texto mínimo ${Math.min(...valores.textos.map((t) => t.razao))}:1; borda ${valores.borda}:1; foco ${valores.foco}:1; fundo ${valores.superficieRaiz}`,
    );
    medicoes.push({ tema, ...valores });
  }
  await testInfo.attach('contraste-efetivo', {
    body: JSON.stringify(medicoes, null, 2),
    contentType: 'application/json',
  });
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
  await page.goto('/');
  await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
  for (const [rota, titulo] of [...destinos, ['/desconhecida', 'Página não encontrada']]) {
    if (rota === '/desconhecida') {
      // Caminho não oferecido pelo menu: evento de histórico sem recarregar a aplicação.
      await page.evaluate((url) => {
        history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, rota);
    } else {
      await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .locator(`a[href="${rota}"]`)
        .click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
    await expect(page.locator('app-root')).toHaveAttribute('data-bs-theme', 'light');
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
  await page.reload();
  await expect(page.locator('app-root')).toHaveAttribute('data-bs-theme', 'dark');
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(redeIndevida, 'Somente recursos locais e canal de desenvolvimento').toEqual([]);
});
