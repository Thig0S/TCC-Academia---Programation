import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

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
    }
  }
});
