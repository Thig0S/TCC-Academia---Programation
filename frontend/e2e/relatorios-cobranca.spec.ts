import { expect, test, Page } from '@playwright/test';

async function selecionarTema(page: Page, tema: 'dark' | 'light') {
  const raiz = page.locator('app-root');
  if ((await raiz.getAttribute('data-tema')) !== tema) {
    await page.getByRole('button', { name: /Tema (escuro|claro)/ }).click();
  }
  await expect(raiz).toHaveAttribute('data-tema', tema);
}

async function marcarComoPrejuizo(page: Page, cliente: string, id: string) {
  await page.getByRole('link', { name: `Abrir detalhes da venda de ${cliente}, ID ${id}` }).click();
  await page.getByRole('button', { name: 'Marcar como Prejuízo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Confirmar mudança de status' });
  await dialogo.getByRole('button', { name: 'Confirmar mudança' }).click();
  await expect(dialogo).toBeHidden();
  await page.getByRole('link', { name: 'Voltar para Prejuízo' }).click();
}

function paraCentavos(valor: string): number {
  const numero = valor.match(/R\$\s*([\d.]+,\d{2})/)?.[1];
  if (!numero) throw new Error(`Valor BRL ausente em: ${valor}`);
  return Math.round(Number(numero.replaceAll('.', '').replace(',', '.')) * 100);
}

function dataISO(data: string): string {
  const [dia, mes, ano] = data.split('/');
  return `${ano}-${mes}-${dia}`;
}

test('detalhes independentes abrem por Enter e Espaço e permanecem abertos ao aplicar mês', async ({
  page,
}) => {
  await page.goto('/relatorios');
  const detalhes = page.locator('main details');
  await expect(detalhes).toHaveCount(5);
  for (let indice = 0; indice < 5; indice++) {
    await expect(detalhes.nth(indice)).toHaveJSProperty('open', false);
  }

  const resumoRecebimentos = detalhes.nth(0).locator('summary');
  const resumoVendas = detalhes.nth(1).locator('summary');
  await resumoRecebimentos.focus();
  await page.keyboard.press('Enter');
  await expect(detalhes.nth(0)).toHaveJSProperty('open', true);
  await expect(resumoRecebimentos).toBeFocused();

  await resumoVendas.focus();
  await page.keyboard.press('Space');
  await expect(detalhes.nth(1)).toHaveJSProperty('open', true);
  await expect(detalhes.nth(0)).toHaveJSProperty('open', true);
  await expect(resumoVendas).toBeFocused();

  await page.locator('#mes-relatorio').selectOption('6');
  await page.locator('#ano-relatorio').fill('2027');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByText('01/06/2027 a 30/06/2027')).toBeVisible();
  await expect(detalhes.nth(0)).toHaveJSProperty('open', true);
  await expect(detalhes.nth(1)).toHaveJSProperty('open', true);
  await expect(page.getByRole('button', { name: 'Aplicar' })).toBeFocused();
});

for (const tema of ['dark', 'light'] as const) {
  test(`Relatórios separa Prejuízo, identifica linhas e rola localmente em ${tema}`, async ({
    page,
  }, testInfo) => {
    await page.goto('/vendas');
    await selecionarTema(page, tema);

    await marcarComoPrejuizo(page, 'Lucas Santos', 'seed/venda/2');
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Vendas', exact: true })
      .click();
    await marcarComoPrejuizo(page, 'Marina Costa', 'seed/venda/3');
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Relatórios', exact: true })
      .click();

    const detalhes = page.locator('main details');
    for (let indice = 0; indice < 5; indice++) {
      await detalhes.nth(indice).locator('summary').click();
    }

    for (const titulo of [
      'Recebimentos no mês',
      'Vendas do mês',
      'Parcelas em aberto',
      'Parcelas vencidas',
      'Prejuízo',
    ]) {
      await expect(page.locator('details > summary').filter({ hasText: titulo })).toBeVisible();
    }

    const abertas = page.getByRole('region', { name: 'Tabela de parcelas em aberto' });
    const vencidas = page.getByRole('region', { name: 'Tabela de parcelas vencidas' });
    const prejuizo = page.getByRole('region', { name: 'Tabela de parcelas em Prejuízo' });
    const linhaPrejuizoSemPagamento = prejuizo.getByRole('row').filter({ hasText: 'Lucas Santos' });
    const linhaPrejuizoComEntrada = prejuizo.getByRole('row').filter({ hasText: 'Marina Costa' });
    await expect(linhaPrejuizoSemPagamento).not.toHaveCount(0);
    await expect(linhaPrejuizoComEntrada).not.toHaveCount(0);
    await expect(linhaPrejuizoSemPagamento.first()).toContainText('Incluída no total');
    await expect(linhaPrejuizoComEntrada.first()).toContainText(
      'Fora do total: recebimento anterior',
    );
    await expect(linhaPrejuizoSemPagamento.first().getByRole('link')).toHaveAttribute(
      'href',
      '/vendas/seed%2Fvenda%2F2',
    );
    await expect(linhaPrejuizoComEntrada.first().getByRole('link')).toHaveAttribute(
      'href',
      '/vendas/seed%2Fvenda%2F3',
    );
    await expect(prejuizo.getByRole('columnheader', { name: 'CPF' })).toBeVisible();
    await expect(prejuizo.getByRole('columnheader', { name: 'Telefone' })).toBeVisible();

    const vendasMensais = page.locator('details[aria-labelledby="vendas-mensais"]');
    await expect(vendasMensais).not.toContainText('Lucas Santos');
    await expect(vendasMensais).not.toContainText('Marina Costa');
    await expect(abertas).not.toContainText('Lucas Santos');
    await expect(abertas).not.toContainText('Marina Costa');
    await expect(vencidas).not.toContainText('Lucas Santos');
    await expect(vencidas).not.toContainText('Marina Costa');

    const incluidoEmCentavos = await linhaPrejuizoSemPagamento
      .locator('td:nth-child(7)')
      .allInnerTexts();
    const somaIncluida = incluidoEmCentavos.reduce((soma, valor) => soma + paraCentavos(valor), 0);
    const totalPrejuizo = await paraCentavos(
      await page
        .locator('details[aria-labelledby="prejuizo-relatorio"] summary')
        .locator('strong')
        .innerText(),
    );
    expect(totalPrejuizo).toBe(somaIncluida);
    expect(totalPrejuizo).toBeGreaterThan(0);

    await expect(abertas.getByRole('columnheader', { name: 'CPF' })).toBeVisible();
    await expect(abertas.getByRole('columnheader', { name: 'Telefone' })).toBeVisible();
    await expect(
      abertas.getByRole('columnheader', { name: 'Primeiro vencimento pendente' }),
    ).toBeVisible();
    const datasAbertas = await abertas.locator('tbody tr td:nth-child(5)').allInnerTexts();
    expect(datasAbertas.map(dataISO)).toEqual([...datasAbertas.map(dataISO)].sort());
    const datasVencidas = await vencidas.locator('tbody tr td:nth-child(5)').allInnerTexts();
    expect(datasVencidas.map(dataISO)).toEqual([...datasVencidas.map(dataISO)].sort());

    for (const regiao of [abertas, vencidas, prejuizo]) {
      await expect(regiao).toHaveAttribute('tabindex', '0');
      await expect(regiao).toHaveAttribute('aria-describedby', /orientacao/);
      await expect(regiao).toHaveCSS('overflow-x', 'auto');
      await regiao.focus();
      await expect(regiao).toBeFocused();
    }
    const medidasPrejuizo = await prejuizo.evaluate((elemento) => ({
      larguraVisivel: elemento.clientWidth,
      larguraConteudo: elemento.scrollWidth,
      rolagemX: elemento.scrollLeft,
    }));
    if ((page.viewportSize()?.width ?? 0) <= 400) {
      expect(medidasPrejuizo.larguraConteudo).toBeGreaterThan(medidasPrejuizo.larguraVisivel);
      await prejuizo.evaluate((elemento) => {
        elemento.scrollLeft = elemento.scrollWidth;
      });
      expect(await prejuizo.evaluate((elemento) => elemento.scrollLeft)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    const captura = await page.screenshot({ fullPage: true, animations: 'disabled' });
    await testInfo.attach(`relatorios-prejuizo-${tema}`, {
      body: captura,
      contentType: 'image/png',
    });
  });
}
