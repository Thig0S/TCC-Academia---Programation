import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('mantém o indicador nativo de data no esquema do formulário', async ({ page }) => {
  await page.goto('/vendas/nova');
  await expect(page.locator('input[type="date"]')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: 'Tema escuro' }).click();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'light');
  await expect(page.locator('input[type="date"]')).not.toHaveCSS('color-scheme', 'dark');
});

test('mede contraste dos estados auxiliares sem novos controles', async ({ page }) => {
  for (const rota of [
    '/configuracoes',
    '/caminho-ausente',
    '/vendas/registro-ausente',
    '/vendas/registro-ausente/editar',
  ]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('main input, main select, main button')).toHaveCount(0);
      const contrastes = await page
        .locator('main h1, main h2, main p, main dt, main dd, main a')
        .evaluateAll((elementos) => {
          const rgb = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
          const fundo = (e: Element): number[] => {
            const cor = rgb(getComputedStyle(e).backgroundColor);
            return cor[3] === 0 && e.parentElement ? fundo(e.parentElement) : cor;
          };
          const luminancia = (cor: number[]) =>
            cor
              .slice(0, 3)
              .map((v) => {
                const s = v / 255;
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              })
              .reduce((soma, v, i) => soma + v * [0.2126, 0.7152, 0.0722][i], 0);
          return elementos.map((e) => {
            const [maior, menor] = [
              luminancia(rgb(getComputedStyle(e).color)),
              luminancia(fundo(e)),
            ].sort((a, b) => b - a);
            return { texto: e.textContent, razao: (maior + 0.05) / (menor + 0.05) };
          });
        });
      expect(contrastes.length).toBeGreaterThan(0);
      for (const contraste of contrastes)
        expect(contraste.razao, contraste.texto ?? '').toBeGreaterThanOrEqual(4.5);
      console.log(
        `Auxiliar ${rota}/${tema}: mínimo ${Math.min(...contrastes.map((c) => c.razao)).toFixed(2)}:1`,
      );
    }
  }
});

test('destaca valores e preserva quatro indicadores e três resumos', async ({ page }) => {
  await page.goto('/visao-geral');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const indicadores = page.locator('[aria-label="Indicadores financeiros globais"] article');
    await expect(indicadores).toHaveCount(4);
    for (const indicador of await indicadores.all()) {
      await expect(indicador).toHaveCSS('border-radius', '12px');
      await expect(indicador.locator('p')).toHaveCSS('font-size', '30px');
      await expect(indicador.locator('h3')).toHaveCSS('font-size', '14px');
    }
    for (const nome of ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas']) {
      const resumo = page.getByRole('region', { name: nome });
      await expect(resumo).toHaveCSS('border-radius', '12px');
      await expect(resumo.getByRole('heading')).toHaveCSS('border-bottom-width', '1px');
      await expect(resumo.getByRole('link')).toHaveCount(5);
    }
    await expect(page.locator('main input, main button, main canvas')).toHaveCount(0);
  }
});

test('aplica a paleta do conteúdo sem alterar os tokens próprios da lateral', async ({ page }) => {
  await page.goto('/vendas');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const estilos = await page.evaluate(() => {
      const raiz = getComputedStyle(document.querySelector('app-root')!);
      const cabecalho = getComputedStyle(document.querySelector('.barra-superior')!);
      const lateral = getComputedStyle(document.querySelector('.barra-lateral')!);
      return {
        canvas: raiz.backgroundColor,
        cabecalho: cabecalho.backgroundColor,
        lateral: lateral.backgroundColor,
        fonteLateral: lateral.fontFamily,
        fonteConteudo: getComputedStyle(document.querySelector('main')!).fontFamily,
      };
    });
    expect(estilos.canvas).toBe(tema === 'dark' ? 'rgb(17, 18, 23)' : 'rgb(245, 246, 249)');
    expect(estilos.cabecalho).toBe(tema === 'dark' ? 'rgb(29, 30, 36)' : 'rgb(255, 255, 255)');
    expect(estilos.lateral).toBe(tema === 'dark' ? 'rgb(133, 0, 32)' : 'rgb(206, 0, 38)');
    expect(estilos.fonteConteudo).toBe(estilos.fonteLateral);
  }
  await page.reload();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'dark');
});

test('registra conteúdo e lateral para comparação visual nos dois temas', async ({
  page,
}, info) => {
  for (const [rota, nome] of [
    ['/visao-geral', 'visao-geral'],
    ['/vendas', 'vendas'],
    ['/vendas/quitadas', 'quitadas'],
    ['/vendas/nova', 'cadastro'],
    ['/relatorios', 'relatorios'],
    ['/configuracoes', 'configuracoes'],
    ['/caminho-ausente', 'pagina-ausente'],
    ['/vendas/registro-ausente', 'registro-ausente'],
    ['/vendas/registro-ausente/editar', 'edicao-ausente'],
  ]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${nome}-${tema}.png`), fullPage: true });
      await writeFile(
        info.outputPath(`${nome}-${tema}.json`),
        JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: nome }, null, 2),
      );
      await page.locator('.barra-lateral').screenshot({
        path: info.outputPath(`${nome}-lateral-${tema}.png`),
      });
      const lateral = await page.locator('.barra-lateral').evaluate((elemento) =>
        [elemento, ...elemento.querySelectorAll('*')].map((item) => {
          const estilo = getComputedStyle(item);
          const retangulo = item.getBoundingClientRect();
          return {
            tag: item.tagName,
            texto: item.textContent,
            geometria: retangulo.toJSON(),
            estilos: Object.fromEntries(
              [
                'background-color',
                'background-image',
                'color',
                'border-color',
                'font-family',
                'font-size',
                'font-weight',
                'line-height',
                'padding',
                'gap',
                'border-radius',
              ].map((nome) => [nome, estilo.getPropertyValue(nome)]),
            ),
          };
        }),
      );
      await writeFile(
        info.outputPath(`${nome}-lateral-${tema}.json`),
        JSON.stringify(lateral, null, 2),
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      if (nome === 'vendas' || nome === 'quitadas') {
        await page
          .getByRole('searchbox', { name: 'Buscar por nome, CPF, telefone ou data da venda' })
          .fill('Sem correspondência sintética');
        await expect(page.locator('app-tabela-vendas tbody tr')).toHaveCount(0);
        await page.screenshot({
          path: info.outputPath(`${nome}-sem-resultados-${tema}.png`),
          fullPage: true,
        });
        await writeFile(
          info.outputPath(`${nome}-sem-resultados-${tema}.json`),
          JSON.stringify(
            { rota, tema, viewport: page.viewportSize(), cenário: 'pesquisa sem resultados' },
            null,
            2,
          ),
        );
      }
    }
  }
});

test('registra baseline dos fluxos válidos, inválidos e do modal', async ({ page }, info) => {
  const abrirNoTema = async (rota: string, tema: 'dark' | 'light') => {
    await page.goto(rota);
    if (tema === 'light') {
      const alternar = page.getByRole('button', { name: 'Tema escuro' });
      if (await alternar.count()) await alternar.click();
    }
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
  };
  const capturar = async (nome: string, tema: 'dark' | 'light') => {
    const rota = new URL(page.url()).pathname;
    await page.screenshot({ path: info.outputPath(`${nome}-${tema}.png`), fullPage: true });
    await writeFile(
      info.outputPath(`${nome}-${tema}.json`),
      JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: nome }, null, 2),
    );
  };

  for (const tema of ['dark', 'light']) {
    await abrirNoTema('/vendas', tema);

    const detalheHref = await page
      .locator('a[href^="/vendas/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .find((href) => href && /^\/vendas\/seed%2Fvenda%2F\d+$/.test(href)),
      );
    expect(detalheHref, 'a lista deve expor uma venda sintética estável').toBeTruthy();

    await abrirNoTema(detalheHref!, tema);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await capturar('detalhe-valido', tema);

    const editarHref = detalheHref!.replace(/$/, '/editar');
    await abrirNoTema(editarHref, tema);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await capturar('edicao-valida', tema);

    await abrirNoTema(detalheHref!, tema);
    const receber = page.getByRole('button', { name: /Receber parcelas da venda de/ });
    await expect(receber).toBeVisible();
    await receber.click();
    const dialogo = page.getByRole('dialog', { name: 'Receber parcelas' });
    await expect(dialogo).toBeVisible();
    await capturar('recebimento-modal', tema);
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();

    await abrirNoTema('/vendas/nova', tema);
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.locator('form')).toBeVisible();
    await capturar('cadastro-invalido', tema);

    await page.getByLabel('Nome', { exact: true }).fill('Cliente baseline determinístico');
    await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
    await page.getByLabel('Telefone com DDD').fill('(00) 1234-5678');
    await page.getByLabel('Possui Entrada').selectOption('nao');
    await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
    await page.getByLabel('Quantidade de parcelas').fill('3');
    await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toBeVisible();
    await capturar('cadastro-valido', tema);
  }
});

test('ação Nova venda mantém hierarquia, contraste e foco nos dois temas', async ({ page }) => {
  const contraste = (frente: number[], fundo: number[]) => {
    const luminancia = (cor: number[]) =>
      cor
        .map((canal) => {
          const normalizado = canal / 255;
          return normalizado <= 0.04045
            ? normalizado / 12.92
            : ((normalizado + 0.055) / 1.055) ** 2.4;
        })
        .reduce((soma, canal, indice) => soma + canal * [0.2126, 0.7152, 0.0722][indice], 0);
    const [maior, menor] = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a);
    return (maior + 0.05) / (menor + 0.05);
  };

  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const acao = page.getByRole('link', { name: 'Nova venda', exact: true });
    await expect(acao).toHaveCSS('background-color', 'rgb(215, 40, 72)');
    await expect(acao).toHaveCSS('color', 'rgb(255, 255, 255)');
    const ratioNormal = contraste([255, 255, 255], [215, 40, 72]);
    expect(ratioNormal).toBeGreaterThanOrEqual(4.5);

    await acao.hover();
    await expect(acao).toHaveCSS('background-color', 'rgb(181, 31, 61)');
    expect(contraste([255, 255, 255], [181, 31, 61])).toBeGreaterThanOrEqual(4.5);

    await page.keyboard.press('Escape');
    for (let indice = 0; indice < 12; indice += 1) {
      await page.keyboard.press('Tab');
      if (await acao.evaluate((elemento) => elemento.matches(':focus-visible'))) break;
    }
    await expect(acao).toBeFocused();
    await expect(acao).toHaveCSS('outline-style', 'solid');
    await expect(acao).toHaveCSS('outline-width', '3px');
  }
});

test('mantém gutter e separação do cabeçalho consistentes entre páginas', async ({ page }) => {
  for (const rota of ['/visao-geral', '/vendas', '/relatorios', '/configuracoes']) {
    await page.goto(rota);
    const medidas = await page.evaluate(() => ({
      gutter: getComputedStyle(document.querySelector('main')!.parentElement!).padding,
      separacaoCabecalho: getComputedStyle(document.querySelector('app-cabecalho header')!)
        .marginBottom,
    }));
    expect(medidas.gutter, rota).toBe('12px');
    expect(medidas.separacaoCabecalho, rota).toBe('8px');
  }
});

test('alinha valores monetários e recuos das consultas abertas e quitadas', async ({
  page,
}, info) => {
  for (const largura of [1366, 390]) {
    await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 768 });
    for (const tema of ['dark', 'light']) {
      for (const [nome, rota] of [
        ['vendas', '/vendas'],
        ['quitadas', '/vendas/quitadas'],
      ]) {
        await page.goto(rota);
        if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
        await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

        const contagem = page.locator('main p[role="status"]').first();
        await expect(contagem).toHaveCSS('margin-inline-start', '8px');
        const tabela = page.locator('app-tabela-vendas table');
        await expect(tabela).toBeVisible();
        for (const nomeColuna of ['Valor total', 'Saldo devedor']) {
          await expect(tabela.getByRole('columnheader', { name: nomeColuna })).toHaveCSS(
            'text-align',
            'right',
          );
        }
        const primeiraLinha = tabela.locator('tbody tr').first();
        for (const indice of [2, 4]) {
          const valor = primeiraLinha.locator('td').nth(indice - 1);
          await expect(valor).toHaveCSS('text-align', 'right');
          const estilos = await valor.evaluate((elemento) => {
            const estilo = getComputedStyle(elemento);
            return {
              fontSize: estilo.fontSize,
              lineHeight: estilo.lineHeight,
              paddingTop: estilo.paddingTop,
              paddingLeft: estilo.paddingLeft,
              fontVariantNumeric: estilo.fontVariantNumeric,
            };
          });
          expect(estilos).toMatchObject({
            fontSize: '18px',
            lineHeight: '20px',
            paddingTop: '4px',
            paddingLeft: '10px',
          });
          expect(estilos.fontVariantNumeric).toContain('tabular-nums');
        }
        await expect(page.locator('app-paginacao-vendas')).toHaveCSS('padding-top', '4px');
        await page.screenshot({
          path: info.outputPath(`${nome}-${largura}-${tema}.png`),
          fullPage: true,
        });
        await writeFile(
          info.outputPath(`${nome}-${largura}-${tema}.json`),
          JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: nome }, null, 2),
        );
      }
    }
  }
});

test('detalhe destaca saldo, recebimento e valores das parcelas nos dois temas', async ({
  page,
}, info) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/seed%2Fvenda%2F1');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

    const saldo = page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd');
    await expect(saldo).toHaveCSS('font-size', '20px');
    await expect(saldo).toHaveCSS('font-weight', '700');
    const receber = page.getByRole('button', { name: /Receber parcelas da venda de/ });
    await expect(receber).toHaveCSS('background-color', 'rgb(215, 40, 72)');
    await expect(receber).toHaveCSS('color', 'rgb(255, 255, 255)');
    for (let tentativa = 0; tentativa < 20; tentativa += 1) {
      if (await receber.evaluate((elemento) => elemento.matches(':focus-visible'))) break;
      await page.keyboard.press('Tab');
    }
    await expect(receber).toBeFocused();
    await expect(receber).toHaveCSS('outline-style', 'solid');
    await expect(receber).toHaveCSS('outline-width', '3px');

    const tabela = page.getByRole('region', { name: 'Parcelas da venda' }).locator('table');
    await expect(tabela.getByRole('columnheader', { name: 'Valor' })).toHaveCSS(
      'text-align',
      'right',
    );
    const valor = tabela.locator('tbody tr').first().locator('td').first();
    await expect(valor).toHaveCSS('text-align', 'right');
    await expect(valor).toHaveCSS('font-size', '18px');
    await expect(valor).toHaveCSS('line-height', '20px');
    await expect(valor).toHaveCSS('padding-top', '4px');
    await expect(valor).toHaveCSS('padding-left', '10px');
    await expect(valor).toHaveCSS('font-variant-numeric', /tabular-nums/);
    await page.screenshot({
      path: info.outputPath(`detalhe-hierarquia-${tema}.png`),
      fullPage: true,
    });
  }
});

test('estado de venda ausente mantém mensagem e retornos nos dois temas', async ({
  page,
}, info) => {
  for (const tema of ['dark', 'light']) {
    const rota = '/vendas/registro-ausente';
    await page.goto(rota);
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await expect(page.getByRole('heading', { name: 'Venda não encontrada' })).toBeVisible();
    await expect(page.getByText('Não existe uma venda com este identificador.')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Retornos de Vendas' })).toContainText(
      'Voltar para Vendas',
    );
    await expect(page.getByRole('navigation', { name: 'Retornos de Vendas' })).toContainText(
      'Ver Vendas quitadas',
    );
    await page.screenshot({
      path: info.outputPath(`detalhe-venda-ausente-${tema}.png`),
      fullPage: true,
    });
    await writeFile(
      info.outputPath(`detalhe-venda-ausente-${tema}.json`),
      JSON.stringify(
        { rota, tema, viewport: page.viewportSize(), cenário: 'venda ausente' },
        null,
        2,
      ),
    );
  }
});
