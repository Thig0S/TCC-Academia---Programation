import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('preserva os indicadores e refina espaçamento dos três resumos', async ({ page }, info) => {
  await page.goto('/visao-geral');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const indicadores = page.locator('[aria-label="Indicadores financeiros globais"] article');
    await expect(indicadores).toHaveCount(4);
    await expect(indicadores.first().getByRole('heading')).toHaveCSS('font-weight', '600');
    await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCSS(
      'margin-bottom',
      '12px',
    );
    const resumos = ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas'];
    for (const nome of resumos) {
      const resumo = page.getByRole('region', { name: nome });
      await expect(resumo.getByRole('link')).toHaveCount(5);
      await expect(resumo.getByRole('heading')).toHaveCSS('margin-bottom', '12px');
    }
    await expect(page.locator('main div.grid').last()).toHaveCSS('row-gap', '16px');
    await expect(page.locator('main input, main button, main canvas')).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`visao-geral-refinada-${tema}.png`),
      fullPage: true,
    });
    await writeFile(
      info.outputPath(`visao-geral-refinada-${tema}.json`),
      JSON.stringify(
        {
          rota: '/visao-geral',
          tema,
          viewport: page.viewportSize(),
          cenário: 'quatro indicadores e três resumos preenchidos',
        },
        null,
        2,
      ),
    );
  }
});
