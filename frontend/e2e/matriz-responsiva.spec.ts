import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const rotas = [
  ['/visao-geral', 'Visão Geral'],
  ['/vendas', 'Vendas'],
  ['/vendas/quitadas', 'Vendas quitadas'],
  ['/vendas/nova', 'Nova venda'],
  ['/relatorios', 'Relatórios'],
  ['/configuracoes', 'Configurações'],
  ['/caminho-ausente', 'Página não encontrada'],
  ['/vendas/registro-ausente', 'Venda não encontrada'],
  ['/vendas/registro-ausente/editar', 'Venda não encontrada'],
];

test('matriz integrada sem overflow horizontal nos destinos e no modal', async ({ page }, info) => {
  test.setTimeout(120_000);
  const medidas = [];
  for (const largura of [390, 767, 768, 1024, 1366]) {
    const altura = largura === 1366 ? 768 : 844;
    await page.setViewportSize({ width: largura, height: altura });
    for (const tema of ['dark', 'light']) {
      for (const [rota, titulo] of rotas) {
        await page.goto(rota);
        if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
        await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
        const tituloVisivel =
          rota === '/vendas/quitadas'
            ? page.getByRole('heading', { level: 2, name: titulo, exact: true })
            : page.getByRole('heading', { level: 1, name: titulo, exact: true });
        await expect(tituloVisivel).toBeVisible();
        const larguraDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(larguraDocumento, `${rota}/${tema}/${largura}px`).toBeLessThanOrEqual(largura);
        medidas.push({
          rota,
          tema,
          viewport: { width: largura, height: altura },
          larguraDocumento,
        });
      }

      await page.goto('/vendas/seed%2Fvenda%2F1');
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await page.locator('[data-acao-pagar]').first().click();
      const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
      await expect(dialog).toBeVisible();
      const larguraDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(larguraDocumento, `modal/${tema}/${largura}px`).toBeLessThanOrEqual(largura);
      const caixa = await dialog.boundingBox();
      expect(caixa).not.toBeNull();
      expect(caixa!.width).toBeLessThanOrEqual(largura);
      await expect(page.getByLabel('Data do pagamento')).toBeFocused();
      medidas.push({
        rota: '/vendas/seed%2Fvenda%2F1 + modal',
        tema,
        viewport: { width: largura, height: altura },
        larguraDocumento,
        larguraModal: caixa!.width,
        alturaModal: caixa!.height,
      });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  }
  await writeFile(info.outputPath('matriz-responsiva.json'), JSON.stringify(medidas, null, 2));
});
