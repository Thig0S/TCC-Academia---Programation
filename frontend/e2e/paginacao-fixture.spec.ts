import { expect, test } from '@playwright/test';

test('mede coleções de 0, 1, 10, 11 e 21 vendas nos dois temas', async ({ page }, info) => {
  for (const quantidade of [0, 1, 10, 11, 21]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(`/?quantidade=${quantidade}`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Vendas', exact: true }),
      ).toBeVisible();
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await expect(page.locator('app-tabela-vendas tbody tr')).toHaveCount(
        Math.min(10, quantidade),
      );
      await expect(page.getByRole('navigation', { name: 'Paginação de vendas' })).toHaveCount(
        quantidade > 10 ? 1 : 0,
      );
      await expect(page.getByLabel('Faixa de resultados')).toHaveText(
        quantidade === 0 ? '0 resultados' : `1–${Math.min(10, quantidade)} de ${quantidade} vendas`,
      );
      if (quantidade === 0)
        await expect(page.getByText('Não há vendas em aberto.', { exact: true })).toBeVisible();
      const geometria = await page.evaluate(() => ({
        largura: innerWidth,
        documento: document.documentElement.scrollWidth,
        altura: innerHeight,
        documentoAltura: document.documentElement.scrollHeight,
        faixa: document.querySelector('[aria-label="Faixa de resultados"]')!.getBoundingClientRect()
          .bottom,
        paginacao: document.querySelector('app-paginacao-vendas')!.getBoundingClientRect().bottom,
      }));
      expect(geometria.documento).toBeLessThanOrEqual(geometria.largura);
      if (page.viewportSize()!.width >= 1200) {
        expect(geometria.documentoAltura).toBeLessThanOrEqual(geometria.altura);
        expect(geometria.faixa).toBeLessThanOrEqual(geometria.altura);
        expect(geometria.paginacao).toBeLessThanOrEqual(geometria.altura);
      }
      console.log(`Coleção ${quantidade}/${tema}: ${JSON.stringify(geometria)}`);
      await page.screenshot({
        path: info.outputPath(`colecao-${quantidade}-${tema}.png`),
        fullPage: true,
      });
      if (quantidade === 0) {
        await page.goto('/visao-geral?quantidade=0');
        await expect(
          page.getByRole('heading', { level: 1, name: 'Vendas', exact: true }),
        ).toBeVisible();
        await page.getByRole('link', { name: 'Visão Geral', exact: true }).click();
        if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
        await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
        await expect(
          page.getByRole('heading', { level: 1, name: 'Visão Geral', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('region', { name: 'Parcelas próximas' }).getByRole('link'),
        ).toHaveCount(0);
        await expect(
          page.getByRole('region', { name: 'Parcelas atrasadas' }).getByRole('link'),
        ).toHaveCount(0);
        await page.screenshot({
          path: info.outputPath(`resumos-vazios-${tema}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test('mede paginação normal, hover, foco, ativa e indisponível nos dois temas', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const navegacao = page.getByRole('navigation', { name: 'Paginação de vendas' });
    const botoes = navegacao.getByRole('button');
    const medidas = [];
    for (const botao of await botoes.all()) {
      for (const estado of ['normal', 'hover', 'foco']) {
        if (estado === 'hover') await botao.hover();
        if (estado === 'foco') {
          await botao.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          await expect(botao).toBeFocused();
          expect(await botao.evaluate((elemento) => elemento.matches(':focus-visible'))).toBe(true);
        }
        const medida = await botao.evaluate((elemento) => {
          const rgb = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
          const fundo = (item: Element): number[] => {
            const cor = rgb(getComputedStyle(item).backgroundColor);
            return cor[3] === 0 && item.parentElement ? fundo(item.parentElement) : cor;
          };
          const luminancia = (cor: number[]) =>
            cor
              .slice(0, 3)
              .map((v) => {
                const s = v / 255;
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              })
              .reduce((soma, v, i) => soma + v * [0.2126, 0.7152, 0.0722][i], 0);
          const razao = (a: number[], b: number[]) => {
            const [maior, menor] = [luminancia(a), luminancia(b)].sort((a, b) => b - a);
            return (maior + 0.05) / (menor + 0.05);
          };
          const estilo = getComputedStyle(elemento);
          return {
            nome: elemento.getAttribute('aria-label'),
            ativo: elemento.getAttribute('aria-current'),
            indisponivel: elemento.getAttribute('aria-disabled'),
            texto: razao(rgb(estilo.color), fundo(elemento)),
            borda: razao(rgb(estilo.borderTopColor), fundo(elemento.parentElement!)),
            foco: razao(rgb(estilo.outlineColor), fundo(elemento.parentElement!)),
            movimento: estilo.transitionDuration,
          };
        });
        expect(medida.texto).toBeGreaterThanOrEqual(4.5);
        expect(medida.borda).toBeGreaterThanOrEqual(3);
        if (estado === 'foco') expect(medida.foco).toBeGreaterThanOrEqual(3);
        expect(medida.movimento).toBe('0s');
        medidas.push({ tema, estado, ...medida });
        await page.screenshot({
          path: info.outputPath(`${tema}-${medida.nome?.replace(/\W/g, '-')}-${estado}.png`),
          fullPage: true,
        });
        await page.mouse.move(0, 0);
        await botao.evaluate((elemento: HTMLButtonElement) => elemento.blur());
      }
    }
    await expect(navegacao.locator('[aria-current="page"]')).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Página anterior' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    console.log(`Estados da paginação ${tema}: ${JSON.stringify(medidas)}`);
    await page.screenshot({ path: info.outputPath(`paginacao-${tema}.png`), fullPage: true });
  }
});

test('mede dez linhas, critérios e rodapé nos temas e viewports suportados', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
    await expect(tabela.locator('tbody tr')).toHaveCount(10);
    await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText(
      '1–10 de 21 vendas',
    );
    const geometria = await page.evaluate(() => {
      const linhas = [...document.querySelectorAll('app-tabela-vendas tbody tr')];
      const rodape = document.querySelector('app-paginacao-vendas nav');
      const controles = [...document.querySelectorAll('.consulta-controles > *')];
      const basesControles = controles.map((controle) => controle.getBoundingClientRect().bottom);
      const tabela = document.querySelector('app-tabela-vendas table')!;
      const cabecalho = tabela.querySelector('thead th')!;
      const celula = tabela.querySelector('tbody th')!;
      const estilosCabecalho = getComputedStyle(cabecalho);
      const estilosCelula = getComputedStyle(celula);
      return {
        alturaViewport: window.innerHeight,
        alturaDocumento: document.documentElement.scrollHeight,
        larguraDocumento: document.documentElement.scrollWidth,
        larguraViewport: document.documentElement.clientWidth,
        diferencaBaseControles: Math.max(...basesControles) - Math.min(...basesControles),
        topoPrimeiraLinha: linhas[0]?.getBoundingClientRect().top ?? -1,
        baseDecimaLinha: linhas[9]?.getBoundingClientRect().bottom ?? -1,
        baseRodape: rodape?.getBoundingClientRect().bottom ?? -1,
        estiloTabela: getComputedStyle(tabela).borderCollapse,
        bordaCabecalho: getComputedStyle(cabecalho).borderBottomWidth,
        espacamentoVerticalCelula: estilosCelula.paddingTop,
        espacamentoHorizontalCelula: estilosCelula.paddingLeft,
        espacamentoVerticalCabecalho: estilosCabecalho.paddingTop,
        espacamentoHorizontalCabecalho: estilosCabecalho.paddingLeft,
        tamanhoFonteTabela: getComputedStyle(tabela).fontSize,
      };
    });
    expect(geometria.estiloTabela).toBe('collapse');
    expect(geometria.bordaCabecalho).toBe('1px');
    expect(geometria.espacamentoVerticalCelula).toBe('4px');
    expect(geometria.espacamentoHorizontalCelula).toBe('10px');
    expect(geometria.espacamentoVerticalCabecalho).toBe('8px');
    expect(geometria.espacamentoHorizontalCabecalho).toBe('10px');
    expect(geometria.tamanhoFonteTabela).toBe('18px');
    expect(geometria.larguraDocumento).toBeLessThanOrEqual(geometria.larguraViewport);
    if (page.viewportSize()!.width >= 1200) {
      expect(geometria.topoPrimeiraLinha).toBeGreaterThanOrEqual(0);
      expect(geometria.baseDecimaLinha).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.baseRodape).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.alturaDocumento).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.diferencaBaseControles).toBeLessThanOrEqual(1);
    } else {
      const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
      await tabela.locator('tbody tr').last().scrollIntoViewIfNeeded();
      await page.getByRole('navigation', { name: 'Paginação de vendas' }).scrollIntoViewIfNeeded();
    }
    console.log(`Geometria ${tema}: ${JSON.stringify(geometria)}`);
    await test.info().attach(`geometria-${tema}`, {
      body: JSON.stringify(geometria, null, 2),
      contentType: 'application/json',
    });
    const captura = await page.screenshot({ fullPage: true });
    await page.screenshot({ path: testInfo.outputPath(`lista-${tema}.png`), fullPage: true });
    await test.info().attach(`captura-${tema}`, {
      body: captura,
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

test('mostra dez parcelas e blocos de cliente/venda em ambos os temas e viewports', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await page.getByRole('link', { name: 'Quitadas', exact: true }).first().click();
    const busca = page.locator('#busca-vendas-quitadas');
    await busca.fill('Cliente Fixture Detalhe Dez');
    await expect(page.getByRole('status').first()).toContainText('1 venda encontrada');
    await page
      .getByRole('table', { name: 'Vendas quitadas' })
      .getByRole('link', { name: /Visualizar venda de Cliente Fixture Detalhe Dez/ })
      .click();
    const parcelas = page.getByRole('region', { name: 'Parcelas da venda' });
    const tabela = page.getByRole('table', {
      name: /Parcelas da venda de Cliente Fixture Detalhe Dez/,
    });
    await expect(tabela.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByRole('main')).toContainText(
      'Descrição curta para o cenário de dez parcelas.',
    );
    await expect(page.getByRole('main')).toContainText('Entrada');
    const geometria = await page.evaluate(() => {
      const cliente = document.querySelector('#identificacao-venda')!.parentElement!;
      const financeiro = document.querySelector('#dados-financeiros')!.parentElement!;
      const ultimaParcela = document.querySelector('app-detalhes-venda tbody tr:last-child')!;
      const regiao = document.querySelector('[aria-label="Parcelas da venda"]')!;
      const tabelaParcelas = regiao.querySelector('table')!;
      const celulaParcela = tabelaParcelas.querySelector('tbody th')!;
      const cabecalhoParcela = tabelaParcelas.querySelector('thead th')!;
      return {
        alturaDocumento: document.documentElement.scrollHeight,
        alturaViewport: window.innerHeight,
        larguraDocumento: document.documentElement.scrollWidth,
        larguraViewport: document.documentElement.clientWidth,
        topoCliente: cliente.getBoundingClientRect().top,
        topoFinanceiro: financeiro.getBoundingClientRect().top,
        baseUltimaParcela: ultimaParcela.getBoundingClientRect().bottom,
        baseTabela: regiao.getBoundingClientRect().bottom,
        tamanhoFonteParcelas: getComputedStyle(tabelaParcelas).fontSize,
        paddingVerticalParcela: getComputedStyle(celulaParcela).paddingTop,
        paddingHorizontalParcela: getComputedStyle(celulaParcela).paddingLeft,
        paddingVerticalCabecalho: getComputedStyle(cabecalhoParcela).paddingTop,
        paddingHorizontalCabecalho: getComputedStyle(cabecalhoParcela).paddingLeft,
      };
    });
    expect(geometria.larguraDocumento).toBeLessThanOrEqual(geometria.larguraViewport);
    expect(geometria.tamanhoFonteParcelas).toBe('18px');
    expect(geometria.paddingVerticalParcela).toBe('4px');
    expect(geometria.paddingHorizontalParcela).toBe('10px');
    expect(geometria.paddingVerticalCabecalho).toBe('8px');
    expect(geometria.paddingHorizontalCabecalho).toBe('10px');
    await expect(parcelas).toBeVisible();
    if (page.viewportSize()!.width >= 1200) {
      expect(Math.abs(geometria.topoCliente - geometria.topoFinanceiro)).toBeLessThanOrEqual(1);
      expect(geometria.baseUltimaParcela).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.baseTabela).toBeLessThanOrEqual(geometria.alturaViewport);
      expect(geometria.alturaDocumento).toBeLessThanOrEqual(geometria.alturaViewport);
    } else {
      await tabela.locator('tbody tr').last().scrollIntoViewIfNeeded();
      expect(await page.getByRole('heading', { name: 'Detalhes da venda' }).isVisible()).toBe(true);
      await expect(page.getByRole('main')).toContainText('Cliente Fixture Detalhe Dez');
    }
    console.log(`Detalhe com dez parcelas ${tema}: ${JSON.stringify(geometria)}`);
    const captura = await page.screenshot({ fullPage: true });
    await page.screenshot({ path: testInfo.outputPath(`detalhe-dez-${tema}.png`), fullPage: true });
    await test.info().attach(`detalhe-dez-parcelas-${tema}`, {
      body: captura,
      contentType: 'image/png',
    });
  }
});

test('mantém parcelas excedentes em região rolável interna e operável por teclado', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await page.getByRole('link', { name: 'Quitadas', exact: true }).first().click();
    await page.locator('#busca-vendas-quitadas').fill('Cliente Fixture Detalhe Onze');
    await expect(page.getByRole('status').first()).toContainText('1 venda encontrada');
    await page
      .getByRole('table', { name: 'Vendas quitadas' })
      .getByRole('link', { name: /Visualizar venda de Cliente Fixture Detalhe Onze/ })
      .click();
    const regiao = page.getByRole('region', { name: 'Parcelas da venda' });
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(11);
    await expect(page.getByRole('main')).toContainText('Descrição extensa para rolagem interna.');
    await expect(regiao).toHaveClass(/parcelas-com-rolagem/);
    await regiao.focus();
    await page.keyboard.press('End');
    const rolagem = await regiao.evaluate((elemento) => ({
      topo: elemento.scrollTop,
      alturaInterna: elemento.scrollHeight,
      alturaVisivel: elemento.clientHeight,
      cabecalho: getComputedStyle(elemento.querySelector('thead th')!).position,
    }));
    expect(rolagem.topo).toBeGreaterThan(0);
    expect(rolagem.alturaInterna).toBeGreaterThan(rolagem.alturaVisivel);
    expect(rolagem.cabecalho).toBe('sticky');
    await expect(regiao).toBeFocused();
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(11);
  }
});
