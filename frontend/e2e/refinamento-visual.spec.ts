import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

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
