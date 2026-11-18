import { expect, Page, test, TestInfo } from '@playwright/test';

const errosPorPagina = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const erros: string[] = [];
  errosPorPagina.set(page, erros);
  page.on('pageerror', (erro) => erros.push(erro.message));
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(errosPorPagina.get(page), 'Console/pageerror inesperado nas medições').toEqual([]);
});

async function medir(page: Page, area: string, info: TestInfo, escopo = 'main') {
  const valores = await page
    .locator(
      `${escopo} label, ${escopo} p, ${escopo} input, ${escopo} select, ${escopo} textarea, ${escopo} button, ${escopo} th, ${escopo} td`,
    )
    .evaluateAll((elementos) => {
      const rgb = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
      const compor = (frente: number[], fundo: number[]) =>
        frente
          .slice(0, 3)
          .map((canal, i) => canal * (frente[3] ?? 1) + fundo[i] * (1 - (frente[3] ?? 1)));
      const fundo = (el: Element | null): number[] => {
        if (!el) return [255, 255, 255];
        const cor = rgb(getComputedStyle(el).backgroundColor);
        return (cor[3] ?? 1) === 1 ? cor : compor(cor, fundo(el.parentElement));
      };
      const lum = (cor: number[]) =>
        cor
          .slice(0, 3)
          .map((c) => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const razao = (a: number[], b: number[]) =>
        (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      return elementos
        .filter((el) => el.getClientRects().length && !el.matches(':disabled'))
        .map((el) => {
          const estilo = getComputedStyle(el);
          const plano = fundo(el);
          const controle = el.matches('input, select, textarea, button');
          return {
            texto: (el.textContent ?? el.tagName).trim().slice(0, 80),
            focoContraste:
              controle && el.matches(':focus-visible')
                ? razao(
                    compor(rgb(estilo.outlineColor), fundo(el.parentElement)),
                    fundo(el.parentElement),
                  )
                : null,
            textoContraste: razao(compor(rgb(estilo.color), plano), plano),
            bordaContraste: controle
              ? razao(
                  compor(rgb(estilo.borderTopColor), fundo(el.parentElement)),
                  fundo(el.parentElement),
                )
              : null,
          };
        });
    });
  for (const valor of valores) {
    if (valor.focoContraste !== null)
      expect(valor.focoContraste, `${area}/foco`).toBeGreaterThanOrEqual(3);
    expect(valor.textoContraste, `${area}: ${valor.texto}`).toBeGreaterThanOrEqual(4.5);
    if (valor.bordaContraste !== null)
      expect(valor.bordaContraste, `${area}/borda: ${valor.texto}`).toBeGreaterThanOrEqual(3);
  }
  const geometria = await page.evaluate(() => ({
    largura: innerWidth,
    documento: document.documentElement.scrollWidth,
    altura: document.documentElement.scrollHeight,
  }));
  expect(geometria.documento).toBeLessThanOrEqual(geometria.largura);
  console.log(
    `${area}: ${JSON.stringify({ minimoTexto: Math.min(...valores.map((v) => v.textoContraste)), minimoBorda: Math.min(...valores.flatMap((v) => (v.bordaContraste === null ? [] : [v.bordaContraste]))), geometria })}`,
  );
  await info.attach(`${area}.png`, {
    body: await page.screenshot({ path: info.outputPath(`${area}.png`), fullPage: true }),
    contentType: 'image/png',
  });
}

test('mede formulários, erros, prévia extensa e modal rolável nos dois temas', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toBeFocused();
    await medir(page, `${tema}-cadastro-erros`, info);
    const foco = await page.getByLabel('Nome', { exact: true }).evaluate((el) => ({
      largura: getComputedStyle(el).outlineWidth,
      estilo: getComputedStyle(el).outlineStyle,
    }));
    expect(foco).toEqual({ largura: '3px', estilo: 'solid' });
    await page.getByLabel('Nome', { exact: true }).fill('Cliente DEMO texto extenso '.repeat(8));
    await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
    await page.getByLabel('Telefone com DDD').fill('(00) 91234-5678');
    await page.getByLabel('Descrição (opcional)').fill('Descrição sintética extensa. '.repeat(50));
    await page.getByLabel('Valor total (R$)', { exact: true }).fill('1000');
    await page.getByLabel('Quantidade de parcelas').fill('24');
    const previa = page.getByRole('region', { name: 'Prévia completa das parcelas' });
    await expect(previa.locator('tbody tr')).toHaveCount(24);
    expect(await previa.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await previa.focus();
    await page.keyboard.press('End');
    expect(await previa.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await medir(page, `${tema}-cadastro-previa`, info);
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await medir(page, `${tema}-edicao-erros`, info);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: /Receber parcelas da venda/ }).click();
    await page.getByLabel('Quantidade de parcelas consecutivas').selectOption('24');
    await page.getByRole('button', { name: 'Confirmar recebimento demonstrativo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Receber parcelas' });
    await expect(dialog).toBeVisible();
    const lista = dialog.getByRole('list', { name: 'Parcelas selecionadas' });
    expect(await lista.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await lista.focus();
    await page.keyboard.press('End');
    expect(await lista.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await medir(page, `${tema}-recebimento-erros`, info, 'dialog');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
});
