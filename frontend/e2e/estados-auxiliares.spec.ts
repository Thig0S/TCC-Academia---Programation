import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('preserva significado e retornos dos estados auxiliares nos dois temas', async ({
  page,
}, info) => {
  const estados = [
    [
      '/caminho-ausente',
      'Página não encontrada',
      'Este caminho não está disponível na demonstração.',
    ],
    [
      '/vendas/registro-ausente',
      'Venda não encontrada',
      'Não existe uma venda com este identificador.',
    ],
    [
      '/vendas/registro-ausente/editar',
      'Venda não encontrada',
      'Não existe uma venda com este identificador para editar.',
    ],
  ];
  for (const [rota, titulo, mensagem] of estados) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      const heading = page.getByRole('heading', { level: 1, name: titulo, exact: true });
      await expect(heading).toBeVisible();
      await expect(page.getByText(mensagem, { exact: true })).toBeVisible();
      const linkRetorno =
        rota === '/caminho-ausente'
          ? page.getByRole('link', { name: 'Voltar para Visão Geral' })
          : page.getByRole('link', { name: 'Voltar para Vendas', exact: true });
      await page.getByRole('link', { name: 'Atalho para Configurações', exact: true }).focus();
      let retornoAlcançado = false;
      for (let passo = 0; passo < 20 && !retornoAlcançado; passo++) {
        await page.keyboard.press('Tab');
        retornoAlcançado = await linkRetorno.evaluate(
          (elemento) => document.activeElement === elemento,
        );
      }
      expect(retornoAlcançado, `${rota}/${tema}: link de retorno alcançável por teclado`).toBe(
        true,
      );
      if (rota === '/caminho-ausente') {
        await expect(linkRetorno).toBeVisible();
      } else {
        const retornos = page.getByRole('navigation', { name: 'Retornos de Vendas' });
        await expect(linkRetorno).toBeVisible();
        await expect(retornos.getByRole('link', { name: 'Ver Vendas quitadas' })).toBeVisible();
      }
      await expect(page.locator('main')).toContainText(mensagem);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      const nomeCaptura = `estado-${rota.replaceAll('/', '-')}-${tema}`;
      await page.screenshot({ path: info.outputPath(`${nomeCaptura}.png`), fullPage: true });
      await writeFile(
        info.outputPath(`${nomeCaptura}.json`),
        JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: titulo }, null, 2),
      );
    }
  }

  for (const [rota, label, mensagem] of [
    [
      '/vendas',
      'Buscar por nome, CPF, telefone ou data da venda',
      'Nenhuma venda corresponde à pesquisa e à situação selecionadas.',
    ],
    [
      '/vendas/quitadas',
      'Buscar por nome, CPF, telefone ou data da venda',
      'Nenhuma venda corresponde à pesquisa.',
    ],
  ]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await page
        .getByLabel(label, { exact: true })
        .fill('cliente sem correspondência 987xyz '.repeat(8));
      await expect(page.getByRole('status').first()).toContainText('0');
      await expect(page.getByText(mensagem, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Limpar pesquisa' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      const nomeCaptura = `busca-vazia-${rota.endsWith('quitadas') ? 'quitadas' : 'vendas'}-${tema}`;
      await page.screenshot({ path: info.outputPath(`${nomeCaptura}.png`), fullPage: true });
      await writeFile(
        info.outputPath(`${nomeCaptura}.json`),
        JSON.stringify(
          { rota, tema, viewport: page.viewportSize(), cenário: 'pesquisa sem resultados' },
          null,
          2,
        ),
      );
    }
  }
});
