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
        raioAviso: getComputedStyle(document.querySelector('[data-testid="aviso-demonstracao"]')!)
          .borderRadius,
      };
    });
    expect(estilos.canvas).toBe(tema === 'dark' ? 'rgb(17, 18, 23)' : 'rgb(245, 246, 249)');
    expect(estilos.cabecalho).toBe(tema === 'dark' ? 'rgb(29, 30, 36)' : 'rgb(255, 255, 255)');
    expect(estilos.lateral).toBe(tema === 'dark' ? 'rgb(133, 0, 32)' : 'rgb(206, 0, 38)');
    expect(estilos.fonteConteudo).toBe(estilos.fonteLateral);
    expect(estilos.raioAviso).toBe('8px');
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
      }
    }
  }
});
