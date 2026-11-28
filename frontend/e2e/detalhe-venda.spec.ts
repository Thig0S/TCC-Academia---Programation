import { expect, test } from '@playwright/test';

test('exibe dez parcelas sem corte e permite percorrer o excedente nos dois temas', async ({
  page,
}) => {
  await page.goto('/vendas/nova');
  await page.locator('#nome-cliente').fill('Cliente detalhe onze parcelas');
  await page.locator('#cpf-cliente').fill('90000000175');
  await page.locator('#telefone-cliente').fill('11900000001');
  await page.locator('#tem-entrada').selectOption('nao');
  await page.locator('#valor-total').fill('110');
  await page.locator('#quantidade-parcelas').fill('11');
  await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
  await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();

  const parcelaRows = page.locator('.tabela-parcelas-detalhe tbody tr');
  const regiao = page.getByRole('region', { name: 'Parcelas da venda' });
  await expect(parcelaRows).toHaveCount(11);
  await expect(regiao).toHaveAttribute('aria-describedby', 'orientacao-parcelas');

  const raiz = page.locator('app-root');
  for (const tema of ['dark', 'light'] as const) {
    if ((await raiz.getAttribute('data-tema')) !== tema) {
      await page.getByRole('button', { name: /Tema (escuro|claro)/ }).click();
    }
    await expect(raiz).toHaveAttribute('data-tema', tema);
    const dimensoes = await regiao.evaluate((element) => ({
      alturaVisivel: element.clientHeight,
      alturaConteudo: element.scrollHeight,
    }));
    expect(dimensoes.alturaConteudo).toBeGreaterThan(dimensoes.alturaVisivel);

    await regiao.focus();
    await expect(regiao).toBeFocused();
    await page.keyboard.press('End');
    await expect.poll(() => regiao.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(parcelaRows.nth(10)).toBeInViewport();
  }
});
