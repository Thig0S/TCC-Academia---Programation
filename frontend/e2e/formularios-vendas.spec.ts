import { writeFile } from 'node:fs/promises';
import { expect, Locator, Page, test } from '@playwright/test';

async function preencherCadastro(page: Page, nome: string) {
  await page.getByLabel('Nome', { exact: true }).fill(nome);
  await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
  await page.getByLabel('Telefone com DDD').fill('(00) 1234-5678');
  await page.getByLabel('Possui Entrada').selectOption('nao');
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
  await page.getByLabel('Quantidade de parcelas').fill('3');
}

async function valorEmCentavos(elemento: Locator): Promise<number> {
  const texto = await elemento.innerText();
  const valor = texto.match(/R\$\s*([\d.]+,\d{2})/)?.[1];
  if (!valor) throw new Error(`Valor BRL ausente em: ${texto}`);
  return Math.round(Number(valor.replaceAll('.', '').replace(',', '.')) * 100);
}

test('detalhe reorganiza campos conforme a largura útil sem perder conteúdo', async ({ page }) => {
  for (const largura of [800, 640, 390]) {
    await page.setViewportSize({ width: largura, height: 844 });
    for (const tema of ['dark', 'light']) {
      await page.goto('/vendas/seed%2Fvenda%2F1');
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

      const resumo = page.locator('.detalhe-resumo');
      const larguraResumo = await resumo.evaluate((elemento) => elemento.clientWidth);
      const colunasResumo = await resumo.evaluate(
        (elemento) => getComputedStyle(elemento).gridTemplateColumns,
      );
      if (larguraResumo <= 832) expect(colunasResumo.split(' ').length).toBe(1);
      for (const campo of ['CPF', 'Telefone', 'Descrição']) {
        const rotulo = page
          .locator('.detalhe-campos dt')
          .filter({ hasText: new RegExp(`^${campo}$`) });
        await expect(rotulo).toBeVisible();
        const valor = rotulo.locator('+ dd');
        await expect(valor).toBeVisible();
        const dimensoes = await valor.evaluate((elemento) => ({
          largura: elemento.clientWidth,
          conteudo: elemento.scrollWidth,
        }));
        expect(dimensoes.conteudo).toBeLessThanOrEqual(dimensoes.largura);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});

test('Nova venda mantém formulário e prévia responsivos sem overflow nos dois temas', async ({
  page,
}, testInfo) => {
  for (const largura of [1366, 1024, 768, 767, 390]) {
    await page.setViewportSize({ width: largura, height: largura === 1366 ? 768 : 844 });
    for (const tema of ['dark', 'light']) {
      await page.goto('/vendas/nova');
      if (tema === 'light')
        await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

      const formulario = page.locator('form');
      await expect(formulario.getByRole('alert')).toHaveCount(0);
      const grupos = formulario.locator(':scope > div').first();
      const previa = formulario.locator(':scope > section[aria-labelledby="titulo-previa"]');
      const caixaFormulario = await grupos.boundingBox();
      const caixaPrevia = await previa.boundingBox();
      expect(caixaFormulario).not.toBeNull();
      expect(caixaPrevia).not.toBeNull();
      if (largura >= 768) {
        expect(caixaFormulario!.x).toBeLessThan(caixaPrevia!.x);
        expect(Math.abs(caixaFormulario!.y - caixaPrevia!.y)).toBeLessThanOrEqual(1);
      } else {
        expect(caixaFormulario!.y + caixaFormulario!.height).toBeLessThanOrEqual(caixaPrevia!.y);
      }

      await preencherCadastro(page, `Cliente responsivo ${largura}`);
      await page.getByLabel('Descrição (opcional)').fill('Descrição ampla de teste');
      await expect(previa.locator('tbody tr')).toHaveCount(3);
      await expect(page.locator('app-identificacao-cliente label').first()).toHaveCSS(
        'font-weight',
        '600',
      );
      await expect(page.getByLabel('Valor total (R$)', { exact: true })).toHaveCSS(
        'font-variant-numeric',
        /tabular-nums/,
      );
      await expect(previa.getByRole('region', { name: 'Prévia completa das parcelas' })).toHaveCSS(
        'border-radius',
        '8px',
      );
      await expect(previa.locator('p').first()).toHaveCSS('border-radius', '8px');
      await expect(previa.getByRole('columnheader', { name: 'Valor' })).toHaveCSS(
        'text-align',
        'right',
      );
      const celulaValor = previa.locator('tbody tr').first().locator('td').first();
      await expect(celulaValor).toHaveCSS('text-align', 'right');
      await expect(celulaValor).toHaveCSS('font-variant-numeric', /tabular-nums/);
      await expect(celulaValor).toHaveCSS('font-size', '14px');
      const espacamento = await page.evaluate(() => {
        const grupos = document.querySelector('app-identificacao-cliente')!.parentElement!;
        const secaoPrevia = document.querySelector(
          'form section[aria-labelledby="titulo-previa"]',
        )!;
        const acoes = document.querySelector('form > div:last-child')!;
        return {
          intervaloEntreGrupos: getComputedStyle(grupos).rowGap,
          previaAcoes:
            acoes.getBoundingClientRect().top - secaoPrevia.getBoundingClientRect().bottom,
        };
      });
      expect(espacamento.intervaloEntreGrupos).toBe('12px');
      expect(espacamento.previaAcoes).toBeGreaterThanOrEqual(12);
      await expect(previa.getByRole('region', { name: 'Prévia completa das parcelas' })).toHaveCSS(
        'overflow-x',
        'auto',
      );
      await expect(page.getByLabel('Nome', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Valor total (R$)', { exact: true })).toHaveValue('100');
      const semOverflowGlobal = await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      expect(semOverflowGlobal, `overflow horizontal global em ${largura}px/${tema}`).toBe(true);

      const larguraNome = await page
        .getByLabel('Nome', { exact: true })
        .evaluate((elemento) => elemento.getBoundingClientRect().width);
      const larguraValor = await page
        .getByLabel('Valor total (R$)', { exact: true })
        .evaluate((elemento) => elemento.getBoundingClientRect().width);
      if (largura >= 1024) {
        expect(larguraNome).toBeGreaterThan(larguraValor);
      }
      if (tema === 'dark')
        console.log(
          `Nova venda ${largura}px: formulário ${Math.round(caixaFormulario!.width)}px, prévia ${Math.round(caixaPrevia!.width)}px, nome ${Math.round(larguraNome)}px, valor ${Math.round(larguraValor)}px, overflow global=${!semOverflowGlobal}`,
        );

      if ([1366, 390].includes(largura)) {
        const nomeCaptura = `nova-venda-${tema}-${largura}px`;
        const captura = await page.screenshot({
          path: testInfo.outputPath(`${nomeCaptura}.png`),
          fullPage: true,
        });
        await testInfo.attach(`nova-venda-${tema}-${largura}px`, {
          body: captura,
          contentType: 'image/png',
        });
        await writeFile(
          testInfo.outputPath(`${nomeCaptura}.json`),
          JSON.stringify(
            {
              rota: '/vendas/nova',
              tema,
              viewport: page.viewportSize(),
              cenário: 'cadastro válido e prévia de três parcelas',
              medidas: {
                larguraFormulario: caixaFormulario!.width,
                larguraPrevia: caixaPrevia!.width,
                larguraNome,
                larguraValor,
                overflowGlobal: !semOverflowGlobal,
              },
            },
            null,
            2,
          ),
        );
      }
    }
  }
});

async function indicadoresVisaoGeral(page: Page): Promise<string[]> {
  return page.locator('[aria-label="Indicadores financeiros globais"] article').allInnerTexts();
}

function indicador(page: Page, nome: string): Locator {
  return page
    .locator('[aria-label="Indicadores financeiros globais"] article')
    .filter({ hasText: nome })
    .locator('p');
}

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
  expect(errosPorPagina.get(page), 'Console/pageerror inesperado nos fluxos').toEqual([]);
});

test('registra capturas sintéticas de cadastro, edição e recebimento nos dois temas', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await preencherCadastro(page, 'Cliente Sintético Captura');
    await expect(page.getByRole('heading', { name: 'Prévia das parcelas' })).toBeVisible();
    const cadastro = await page.screenshot({
      path: testInfo.outputPath(`cadastro-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`cadastro-${tema}`, { body: cadastro, contentType: 'image/png' });

    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await page
      .getByRole('link', { name: /Editar dados do cliente da venda de/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Editar dados do cliente' })).toBeVisible();
    const edicao = await page.screenshot({
      path: testInfo.outputPath(`edicao-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`edicao-${tema}`, { body: edicao, contentType: 'image/png' });

    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await page
      .getByRole('table', { name: 'Vendas em aberto' })
      .getByRole('link', { name: /Visualizar venda de/ })
      .first()
      .click();
    const detalhe = await page.screenshot({
      path: testInfo.outputPath(`detalhe-pagamento-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`detalhe-pagamento-${tema}`, {
      body: detalhe,
      contentType: 'image/png',
    });
    await page.locator('[data-acao-pagar]').first().click();
    await expect(page.getByRole('dialog', { name: 'Pagar parcela' })).toBeVisible();
    const recebimento = await page.screenshot({
      path: testInfo.outputPath(`recebimento-${tema}.png`),
      fullPage: true,
    });
    await testInfo.attach(`recebimento-${tema}`, { body: recebimento, contentType: 'image/png' });
    await writeFile(
      testInfo.outputPath(`recebimento-${tema}.json`),
      JSON.stringify(
        {
          rota: new URL(page.url()).pathname,
          tema,
          viewport: page.viewportSize(),
          cenário: 'modal de pagamento individual com conferência e campos iniciais',
        },
        null,
        2,
      ),
    );
  }
});

test('paga parcelas individualmente e reconcilia quitação', async ({ page }) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await preencherCadastro(page, 'Cliente DEMO E2E recebimento');
    await page.getByLabel('Data da venda', { exact: true }).fill('0001-01-01');
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    const referenciaTexto = await page
      .getByRole('main')
      .locator('p')
      .filter({ hasText: 'Referência da demonstração:' })
      .innerText();
    const [, dia, mes, ano] = referenciaTexto.match(/(\d{2})\/(\d{2})\/(\d{4})/)!;
    const referencia = `${ano}-${mes}-${dia}`;
    await page.locator('[data-acao-pagar]').first().click();
    const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('dl')).toHaveCSS('border-radius', '8px');
    await expect(dialog.locator('label[for="data-recebimento"]')).toHaveCSS('font-weight', '600');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(page.getByLabel('Data do pagamento')).toBeFocused();
    await expect(page.getByLabel('Forma do pagamento')).toHaveValue('');
    await expect(page.getByLabel('Data do pagamento')).toHaveValue(referencia);
    await expect(dialog).toContainText('33,34');
    await expect(page.locator('#valor-recebimento')).toHaveCount(0);
    await expect(page.locator('#quantidade-recebimento')).toHaveCount(0);
    await page.getByLabel('Data do pagamento').fill('9999-12-31');
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(page.locator('#erro-data-recebimento')).toContainText('futura');
    await expect(page.locator('#erro-forma-recebimento')).toContainText('Selecione');
    await expect(dialog).toBeVisible();
    await page.getByLabel('Data do pagamento').fill('0001-01-01');
    await page.getByLabel('Forma do pagamento').selectOption('Pix');
    await page
      .getByRole('button', { name: 'Confirmar pagamento' })
      .evaluate((botao: HTMLButtonElement) => {
        botao.click();
        botao.click();
      });
    await expect(dialog).toHaveCount(0);
    const sucessoRecebimento = page
      .locator('main p[role="status"]')
      .filter({ hasText: /recebimento/i });
    await expect(sucessoRecebimento).toHaveClass(/bg-success-badge/);
    await expect(sucessoRecebimento).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-acao-pagar]').first()).toBeFocused();
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Total pago$/ })
        .locator('+ dd'),
    ).toContainText('33,34');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Saldo devedor$/ })
        .locator('+ dd'),
    ).toContainText('66,66');
    await expect(page.locator('tbody tr').first()).toContainText('Paga');
    await expect(page.locator('tbody tr').first()).toContainText('Pix');
    await page.locator('[data-acao-pagar]').first().click();
    await page.getByLabel('Data do pagamento').fill(referencia);
    await page.getByLabel('Forma do pagamento').selectOption('Dinheiro');
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(dialog).toHaveCount(0);
    await page.locator('[data-acao-pagar]').first().click();
    await page.getByLabel('Forma do pagamento').selectOption('Pix');
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Parcelas', exact: true })).toBeFocused();
    await expect(page.locator('[data-acao-pagar]')).toHaveCount(0);
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Saldo devedor$/ })
        .locator('+ dd'),
    ).toContainText('0,00');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Parcelas pagas$/ })
        .locator('+ dd'),
    ).toContainText('3 de 3');
    await expect(page.getByRole('main')).toContainText('Não há parcelas pendentes');
    const id = page.url();
    await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
    await page
      .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
      .fill('Cliente DEMO E2E recebimento');
    await expect(page.locator('tbody tr')).toHaveCount(0);
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Quitadas', exact: true })
      .click();
    await page.locator('#busca-vendas-quitadas').fill('Cliente DEMO E2E recebimento');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page
      .getByRole('link', { name: /Visualizar venda de Cliente DEMO E2E recebimento/ })
      .click();
    await expect(page).toHaveURL(id);
  }
});

test('dialog nativo contém foco, cancela por botão/Escape e reabre limpo nos dois temas', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await preencherCadastro(page, 'Cliente DEMO E2E cancelamento modal');
    const referencia = await page.getByLabel('Data da venda', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    const antes = await page.locator('section[aria-labelledby="dados-financeiros"]').innerText();
    const pagar = page.locator('[data-acao-pagar]').first();
    await pagar.click();
    const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((elemento) => elemento.matches(':modal'))).toBe(true);
    const caixa = await dialog.boundingBox();
    expect(caixa).not.toBeNull();
    expect(
      Math.abs(caixa!.x + caixa!.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThanOrEqual(1);
    expect(caixa!.y).toBeGreaterThanOrEqual(0);
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(page.getByLabel('Data do pagamento')).toBeFocused();
    await pagar.evaluate((acionador) => (acionador as HTMLElement).focus());
    await expect(page.getByLabel('Data do pagamento')).toBeFocused();
    for (const tecla of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(tecla);
        const foco = await page.evaluate(() => ({
          dentro: !!document.activeElement?.closest('dialog'),
          elemento: document.activeElement?.tagName,
          id: document.activeElement?.id,
          texto: document.activeElement?.textContent?.trim().slice(0, 80),
        }));
        expect(foco.dentro, JSON.stringify({ tecla, indice: i, foco })).toBe(true);
      }
    }
    await page.getByLabel('Forma do pagamento').selectOption('Pix');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(pagar).toBeFocused();
    expect(await page.locator('section[aria-labelledby="dados-financeiros"]').innerText()).toBe(
      antes,
    );
    await page.locator('[data-acao-pagar]').first().click();
    await expect(page.getByLabel('Data do pagamento')).toHaveValue(referencia);
    await expect(page.getByLabel('Forma do pagamento')).toHaveValue('');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-acao-pagar]').first()).toBeFocused();
    expect(await page.locator('section[aria-labelledby="dados-financeiros"]').innerText()).toBe(
      antes,
    );
  }
});

for (const origem of ['/vendas', '/vendas/quitadas']) {
  test(`edita cliente em ${origem}, preserva finanças e restaura foco ao cancelar`, async ({
    page,
  }) => {
    await page.goto(origem);
    await page
      .getByRole('link', { name: /Visualizar venda de/ })
      .first()
      .click();
    const dados = page.locator('section[aria-labelledby="dados-financeiros"]');
    const antes = await dados.innerText();
    const detalhe = page.url();
    await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Editar dados do cliente', exact: true }),
    ).toBeFocused();
    await expect(page.locator('form')).toHaveCSS('border-radius', '12px');
    await expect(page.locator('form input, form textarea')).toHaveCount(4);
    await page.getByLabel('Nome', { exact: true }).fill('DEMO alteração cancelada');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(detalhe);
    await expect(
      page.getByRole('link', { name: /Editar dados do cliente da venda/ }),
    ).toBeFocused();
    expect(await dados.innerText()).toBe(antes);
    await page
      .getByRole('link', {
        name: origem === '/vendas' ? 'Voltar para Vendas' : 'Ver Vendas quitadas',
        exact: true,
      })
      .click();
    await page
      .getByRole('link', { name: /Editar dados do cliente da venda/ })
      .first()
      .click();
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await expect(page.getByLabel('CPF', { exact: true })).toBeFocused();
    await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
    await page.getByLabel('Telefone com DDD').fill('(00) 91234-5678');
    await page.getByLabel('Nome', { exact: true }).fill('Cliente DEMO E2E editado');
    await page.getByLabel('Descrição (opcional)').fill('');
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await expect(page).toHaveURL(detalhe);
    await expect(page.getByRole('main')).toContainText('Cliente DEMO E2E editado');
    expect(await dados.innerText()).toBe(antes);
    await page
      .getByRole('link', {
        name: origem === '/vendas' ? 'Voltar para Vendas' : 'Ver Vendas quitadas',
        exact: true,
      })
      .click();
    await page
      .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
      .fill('E2E editado');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${origem}$`));
    await expect(
      page.getByRole('link', { name: /Editar dados do cliente da venda.*E2E editado/ }),
    ).toBeFocused();
  });
}

test('edita nome e descrição extensos, anuncia erro e preserva finanças nos dois temas', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/seed%2Fvenda%2F1');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const secaoFinanceira = page.locator('section[aria-labelledby="dados-financeiros"]');
    const finançasAntes = await secaoFinanceira.innerText();
    await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
    const cpfOriginal = await page.getByLabel('CPF', { exact: true }).inputValue();
    const nome = `Cliente DEMO edição extensa ${'nome integral preservado '.repeat(5)}`;
    const descricao = 'Descrição longa de edição, preservada integralmente. '.repeat(12);
    await page.getByLabel('Nome', { exact: true }).fill(nome);
    await page.getByLabel('Descrição (opcional)').fill(descricao);
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await expect(page.locator('#erro-cpf')).toContainText('verificadores');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(nome);
    await expect(page.getByLabel('Descrição (opcional)')).toHaveValue(descricao);
    await page.screenshot({
      path: testInfo.outputPath(`edicao-erro-textos-extensos-${tema}.png`),
      fullPage: true,
    });
    await writeFile(
      testInfo.outputPath(`edicao-erro-textos-extensos-${tema}.json`),
      JSON.stringify(
        {
          rota: new URL(page.url()).pathname,
          tema,
          viewport: page.viewportSize(),
          cenário: 'erro de CPF mantém rascunho com nome e descrição extensos',
        },
        null,
        2,
      ),
    );
    await page.getByLabel('CPF', { exact: true }).fill(cpfOriginal);
    await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
    await expect(page.getByRole('heading', { name: nome, exact: true })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(descricao);
    expect(await secaoFinanceira.innerText()).toBe(finançasAntes);
  }
});

test('edição e recebimento mantêm textos, erros e rolagem na matriz de viewports', async ({
  page,
}, testInfo) => {
  for (const largura of [390, 767, 768, 1024, 1366]) {
    const altura = largura === 1366 ? 768 : 844;
    await page.setViewportSize({ width: largura, height: altura });
    for (const tema of ['dark', 'light']) {
      await page.goto('/vendas/nova');
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      const nome = `Cliente DEMO ${largura} ${tema} ${'nome extenso '.repeat(8)}`;
      const descricao = `Descrição integral ${largura} ${tema}. `.repeat(30);
      await preencherCadastro(page, nome);
      await page.getByLabel('Valor total (R$)', { exact: true }).fill('2400');
      await page.getByLabel('Quantidade de parcelas').fill('24');
      await page.getByLabel('Descrição (opcional)').fill(descricao);
      await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
      await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
      const dadosFinanceiros = page.locator('section[aria-labelledby="dados-financeiros"]');
      const finançasAntes = await dadosFinanceiros.innerText();
      await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
      const cpfOriginal = await page.getByLabel('CPF', { exact: true }).inputValue();
      await page.getByLabel('Nome', { exact: true }).fill(nome);
      await page.getByLabel('Descrição (opcional)').fill(descricao);
      await page.getByLabel('CPF', { exact: true }).fill('11111111111');
      await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
      await expect(page.locator('#erro-cpf')).toContainText('verificadores');
      await expect(page.getByLabel('CPF', { exact: true })).toBeFocused();
      const contrasteCpf = await page.locator('#erro-cpf').evaluate((elemento) => {
        const texto = getComputedStyle(elemento.querySelector('p')!)
          .color.match(/[\d.]+/g)!
          .map(Number);
        let plano: Element | null = elemento.querySelector('p');
        let corFundo = '';
        while (plano && (corFundo === '' || corFundo.endsWith(', 0)'))) {
          corFundo = getComputedStyle(plano).backgroundColor;
          if (corFundo.endsWith(', 0)')) plano = plano.parentElement;
        }
        const fundo = corFundo.match(/[\d.]+/g)!.map(Number);
        const luminancia = (cor: number[]) =>
          cor
            .slice(0, 3)
            .map((valor) => {
              const s = valor / 255;
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            })
            .reduce((soma, valor, indice) => soma + valor * [0.2126, 0.7152, 0.0722][indice], 0);
        const [maior, menor] = [luminancia(texto), luminancia(fundo)].sort((a, b) => b - a);
        return (maior + 0.05) / (menor + 0.05);
      });
      expect(contrasteCpf).toBeGreaterThanOrEqual(4.5);
      await page
        .getByRole('button', { name: 'Confirmar edição demonstrativa' })
        .scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        largura,
      );
      await page.getByLabel('CPF', { exact: true }).fill(cpfOriginal);
      await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
      await expect(page.getByRole('heading', { name: nome, exact: true })).toBeVisible();
      await expect(page.getByRole('main')).toContainText(descricao);
      expect(await dadosFinanceiros.innerText()).toBe(finançasAntes);

      await page.locator('[data-acao-pagar]').first().click();
      const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(nome);
      const medidasAntesErro = await dialog.evaluate((elemento) => {
        return {
          largura: elemento.getBoundingClientRect().width,
          altura: elemento.getBoundingClientRect().height,
          alturaConteudo: elemento.scrollHeight,
          alturaVisivel: elemento.clientHeight,
        };
      });
      await page.getByLabel('Data do pagamento').fill('0000-01-01');
      await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
      await expect(page.locator('#erro-data-recebimento')).toContainText('existente');
      const contrasteRecebimento = await page
        .locator('#erro-data-recebimento p')
        .evaluate((elemento) => {
          const texto = getComputedStyle(elemento)
            .color.match(/[\d.]+/g)!
            .map(Number);
          let plano: Element | null = elemento;
          let corFundo = '';
          while (plano && (corFundo === '' || corFundo.endsWith(', 0)'))) {
            corFundo = getComputedStyle(plano).backgroundColor;
            if (corFundo.endsWith(', 0)')) plano = plano.parentElement;
          }
          const fundo = corFundo.match(/[\d.]+/g)!.map(Number);
          const luminancia = (cor: number[]) =>
            cor
              .slice(0, 3)
              .map((valor) => {
                const s = valor / 255;
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              })
              .reduce((soma, valor, indice) => soma + valor * [0.2126, 0.7152, 0.0722][indice], 0);
          const [maior, menor] = [luminancia(texto), luminancia(fundo)].sort((a, b) => b - a);
          return (maior + 0.05) / (menor + 0.05);
        });
      expect(contrasteRecebimento).toBeGreaterThanOrEqual(4.5);
      const campoData = page.getByLabel('Data do pagamento');
      let dataAlcancada = false;
      for (let passo = 0; passo < 12 && !dataAlcancada; passo++) {
        await page.keyboard.press('Tab');
        dataAlcancada = await campoData.evaluate((elemento) => document.activeElement === elemento);
      }
      expect(dataAlcancada, `campo de data alcançável por Tab em ${largura}/${tema}`).toBe(true);
      await campoData.scrollIntoViewIfNeeded();
      await expect(campoData).toBeVisible();
      await expect(campoData).toBeFocused();
      const confirmar = page.getByRole('button', { name: 'Confirmar pagamento' });
      await confirmar.evaluate((botao: HTMLButtonElement) => (botao.disabled = true));
      await expect(confirmar).toHaveCSS('cursor', 'not-allowed');
      await expect(confirmar).toHaveCSS('opacity', '0.6');
      await confirmar.evaluate((botao: HTMLButtonElement) => (botao.disabled = false));
      const larguraDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(larguraDocumento).toBeLessThanOrEqual(largura);
      const arquivo = `fluxos-edicao-recebimento-${largura}-${tema}`;
      await page.screenshot({ path: testInfo.outputPath(`${arquivo}.png`), fullPage: true });
      await writeFile(
        testInfo.outputPath(`${arquivo}.json`),
        JSON.stringify(
          {
            rota: new URL(page.url()).pathname,
            tema,
            viewport: page.viewportSize(),
            cenário: 'edição com erro e pagamento individual com erro de data',
            medidas: { ...medidasAntesErro, larguraDocumento },
          },
          null,
          2,
        ),
      );
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  }
});

test('cadastra sem entrada/descrição uma única vez com Enter repetido e descarta no reload', async ({
  page,
}) => {
  await page.goto('/vendas');
  await page.getByRole('link', { name: 'Nova venda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova venda', exact: true })).toBeFocused();
  await preencherCadastro(page, 'Cliente DEMO E2E sem entrada');
  await expect(
    page.getByRole('region', { name: 'Prévia completa das parcelas' }).locator('tbody tr'),
  ).toHaveCount(3);
  await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toContainText(
    '33,34',
  );
  await page.getByLabel('Quantidade de parcelas').press('Enter');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vendas\/sessao%2Fvenda%2F1$/i);
  await expect(page.getByRole('status')).toContainText('Venda demonstrativa cadastrada.');
  await expect(page.getByRole('main')).toContainText('Sem entrada');
  await expect(
    page
      .getByRole('main')
      .locator('dt')
      .filter({ hasText: /^Descrição$/ }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('Cliente DEMO E2E sem entrada');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page
    .getByRole('link', { name: /Abrir detalhes da venda de Cliente DEMO E2E sem entrada/ })
    .click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Venda não encontrada' })).toBeVisible();
});

test('cadastra com entrada e descrição pela UI e impede clique duplicado', async ({ page }) => {
  await page.goto('/vendas/nova');
  await preencherCadastro(page, 'Cliente DEMO E2E entrada');
  await page.getByLabel('Descrição (opcional)').fill('Descrição sintética de conferência.');
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('1000');
  await page.getByLabel('Quantidade de parcelas').fill('4');
  await page.getByLabel('Possui Entrada').selectOption('sim');
  await page.getByLabel('Valor da entrada (R$)').fill('200');
  await page.getByLabel('Forma da entrada').selectOption('Pix');
  const previa = page.getByRole('region', { name: 'Prévia completa das parcelas' });
  await expect(previa.locator('tbody tr')).toHaveCount(4);
  await expect(previa.locator('tbody tr').first()).toContainText('200,00');
  await page
    .getByRole('button', { name: 'Confirmar cadastro demonstrativo' })
    .evaluate((botao: HTMLButtonElement) => {
      botao.click();
      botao.click();
    });
  await expect(page).toHaveURL(/\/vendas\/sessao%2Fvenda%2F1$/i);
  await expect(page.getByRole('main')).toContainText('Descrição sintética de conferência.');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Total pago$/ })
      .locator('+ dd'),
  ).toContainText('200,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd'),
  ).toContainText('800,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Parcelas pagas$/ })
      .locator('+ dd'),
  ).toContainText('1 de 4');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('Cliente DEMO E2E entrada');
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('seleção por teclado, alternância preservada e entrada nas dez parcelas nos dois temas', async ({
  page,
}, testInfo) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const escolha = page.getByLabel('Possui Entrada');
    await expect(escolha).toHaveValue('');

    for (const [label, valor] of [
      ['Nome', `Cliente DEMO teclado ${tema}`],
      ['CPF', '900.000.001-75'],
      ['Telefone com DDD', '(00) 1234-5678'],
      ['Valor total (R$)', '2.000,00'],
      ['Quantidade de parcelas', '10'],
    ])
      await page.getByLabel(label, { exact: label !== 'Telefone com DDD' }).fill(valor);
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(escolha).toBeFocused();
    await expect(page.locator('#erro-tem-entrada')).toContainText(
      'Informe se a venda possui entrada ou não.',
    );
    await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toHaveCount(0);

    await page.keyboard.press('ArrowDown');
    await expect(escolha).toHaveValue('sim');
    await page.getByLabel('Valor da entrada (R$)').fill('500');
    await page.getByLabel('Forma da entrada').selectOption('Pix');
    const previa = page.getByRole('region', { name: 'Prévia completa das parcelas' });
    await expect(previa.locator('tbody tr')).toHaveCount(10);
    await expect(previa.locator('tbody tr').first()).toContainText('Entrada');
    await expect(previa.locator('tbody tr').first()).toContainText('Paga');
    await expect(previa.locator('tbody tr').first()).toContainText('500,00');
    await expect(page.locator('section[aria-labelledby="titulo-previa"]')).toContainText(
      '1.500,00',
    );
    await expect(escolha).toHaveAttribute('aria-describedby', 'erro-tem-entrada');

    await escolha.selectOption('nao');
    await expect(page.getByLabel('Valor da entrada (R$)')).toHaveCount(0);
    await expect(previa.locator('tbody tr')).toHaveCount(10);
    await expect(previa.locator('tbody tr').first()).not.toContainText('Entrada');
    await escolha.selectOption('sim');
    await expect(page.getByLabel('Valor da entrada (R$)')).toHaveValue('500');
    await expect(page.getByLabel('Forma da entrada')).toHaveValue('Pix');
    await expect(previa.locator('tbody tr')).toHaveCount(10);
    const captura = await page.screenshot({ fullPage: true });
    await testInfo.attach(`cadastro-entrada-10-${tema}`, {
      body: captura,
      contentType: 'image/png',
    });

    await page
      .getByRole('button', { name: 'Confirmar cadastro demonstrativo' })
      .evaluate((botao) => {
        (botao as HTMLButtonElement).click();
        (botao as HTMLButtonElement).click();
      });
    await expect(page.getByRole('main')).toContainText('1 de 10');
    await expect(page.getByRole('main')).toContainText('Entrada');
    await expect(page.getByRole('main')).toContainText('Paga');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Parcelas pagas$/ })
        .locator('+ dd'),
    ).toHaveText('1 de 10');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Total pago$/ })
        .locator('+ dd'),
    ).toContainText('500,00');
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Saldo devedor$/ })
        .locator('+ dd'),
    ).toContainText('1.500,00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    for (let pagamento = 0; pagamento < 9; pagamento++) {
      await page.locator('[data-acao-pagar]').first().click();
      const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
      await page.getByLabel('Forma do pagamento').selectOption('Pix');
      await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
      await expect(dialog).toHaveCount(0);
    }
    await expect(
      page
        .locator('dt')
        .filter({ hasText: /^Parcelas pagas$/ })
        .locator('+ dd'),
    ).toHaveText('10 de 10');
    await expect(page.locator('[data-acao-pagar]')).toHaveCount(0);
    await expect(page.getByRole('main')).toContainText('Quitada');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('reconcilia cadastro, entrada, quitação e edição entre listas, Visão Geral e Relatórios', async ({
  page,
}) => {
  const nome = 'Cliente DEMO FASE007 integrado';
  await page.goto('/visao-geral');
  const indicadoresIniciais = await indicadoresVisaoGeral(page);
  const valorInicialAberto = await valorEmCentavos(indicador(page, 'Total em aberto'));
  const recebimentosGlobaisIniciais = await valorEmCentavos(indicador(page, 'Recebimentos do mês'));
  const vendasCadastradasIniciais = Number(await indicador(page, 'Vendas cadastradas').innerText());
  const referencia = await page
    .getByRole('main')
    .locator('p')
    .filter({ hasText: 'Referência da demonstração:' })
    .innerText();
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  const vendasDoMes = page.locator('section[aria-labelledby="vendas-mensais"]');
  const recebimentosDoMes = page.locator('section[aria-labelledby="recebimentos-mensais"]');
  const posicaoEmAberto = page.locator('section[aria-labelledby="posicao-aberta"]');
  const parcelasVencidas = page.locator('section[aria-labelledby="parcelas-vencidas"]');
  const vendasIniciais = await vendasDoMes.locator(':scope > p').innerText();
  const quantidadeInicial = Number(vendasIniciais.match(/(\d+) vendas?/)?.[1]);
  const totalVendidoInicial = await valorEmCentavos(vendasDoMes.locator(':scope > p'));
  const recebimentoInicial = await valorEmCentavos(recebimentosDoMes.locator(':scope > p'));

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page.getByRole('link', { name: 'Nova venda' }).click();
  await preencherCadastro(page, nome);
  const dataVenda = await page.getByLabel('Data da venda', { exact: true }).inputValue();
  expect(referencia).toContain(dataVenda.split('-').reverse().join('/'));
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('1000');
  await page.getByLabel('Quantidade de parcelas').fill('4');
  await page.getByLabel('Possui Entrada').selectOption('sim');
  await page.getByLabel('Valor da entrada (R$)').fill('200');
  await page.getByLabel('Forma da entrada').selectOption('Pix');
  await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
  await expect(page).toHaveURL(/\/vendas\/sessao%2Fvenda%2F1$/i);
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Total pago$/ })
      .locator('+ dd'),
  ).toContainText('200,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd'),
  ).toContainText('800,00');
  await expect(page.locator('tbody tr').first()).toContainText('Entrada');
  await expect(page.locator('tbody tr').first().locator('[data-acao-pagar]')).toHaveCount(0);
  await expect(page.locator('[data-acao-pagar]')).toHaveCount(1);
  await expect(page.locator('[data-acao-pagar]').first()).toHaveAttribute(
    'aria-label',
    /parcela 2/,
  );

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  expect(await valorEmCentavos(indicador(page, 'Total em aberto'))).toBe(
    valorInicialAberto + 80000,
  );
  expect(await valorEmCentavos(indicador(page, 'Recebimentos do mês'))).toBe(
    recebimentosGlobaisIniciais + 20000,
  );
  expect(Number(await indicador(page, 'Vendas cadastradas').innerText())).toBe(
    vendasCadastradasIniciais + 1,
  );
  const indicadoresAposCadastro = await indicadoresVisaoGeral(page);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  expect(await valorEmCentavos(recebimentosDoMes.locator(':scope > p'))).toBe(
    recebimentoInicial + 20000,
  );
  expect(await valorEmCentavos(vendasDoMes.locator(':scope > p'))).toBe(
    totalVendidoInicial + 100000,
  );
  expect(
    Number((await vendasDoMes.locator(':scope > p').innerText()).match(/(\d+) vendas?/)?.[1]),
  ).toBe(quantidadeInicial + 1);
  await expect(recebimentosDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('sem-resultado');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  await expect(indicador(page, 'Total em aberto')).toContainText('R$');
  const aposFiltro = await indicadoresVisaoGeral(page);
  expect(aposFiltro).toEqual(indicadoresAposCadastro);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page.getByRole('link', { name: new RegExp(`Visualizar venda de ${nome}`) }).click();
  await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
  while ((await page.locator('[data-acao-pagar]').count()) > 0) {
    await page.locator('[data-acao-pagar]').first().click();
    const dialog = page.getByRole('dialog', { name: 'Pagar parcela' });
    await page.getByLabel('Forma do pagamento').selectOption('Dinheiro');
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(dialog).toHaveCount(0);
  }
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Total pago$/ })
      .locator('+ dd'),
  ).toContainText('1.000,00');
  await expect(
    page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd'),
  ).toContainText('0,00');

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  expect(await valorEmCentavos(indicador(page, 'Total em aberto'))).toBe(valorInicialAberto);
  expect(await valorEmCentavos(indicador(page, 'Recebimentos do mês'))).toBe(
    recebimentosGlobaisIniciais + 100000,
  );
  expect(Number(await indicador(page, 'Vendas cadastradas').innerText())).toBe(
    vendasCadastradasIniciais + 1,
  );

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
  expect(await valorEmCentavos(recebimentosDoMes.locator(':scope > p'))).toBe(
    recebimentoInicial + 100000,
  );
  await expect(recebimentosDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(4);
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);
  await expect(posicaoEmAberto.locator('tbody tr').filter({ hasText: nome })).toHaveCount(0);
  await expect(parcelasVencidas.locator('tbody tr').filter({ hasText: nome })).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Vendas', exact: true })
    .click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill(nome);
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Quitadas', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vendas quitadas' })).toBeVisible();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill(nome);
  const vendaQuitada = page.locator('tbody tr').filter({ hasText: nome });
  await expect(vendaQuitada).toHaveCount(1);
  await vendaQuitada
    .getByRole('link', { name: /Visualizar venda de Cliente DEMO FASE007 integrado/ })
    .click();
  const dadosFinanceiros = page.locator('section[aria-labelledby="dados-financeiros"]');
  const antesEdicao = await dadosFinanceiros.innerText();
  await page.getByRole('link', { name: /Editar dados do cliente da venda/ }).click();
  await page.getByLabel('Nome', { exact: true }).fill(`${nome} editado`);
  await page.getByRole('button', { name: 'Confirmar edição demonstrativa' }).click();
  await expect(page.getByRole('main')).toContainText(`${nome} editado`);
  expect(await dadosFinanceiros.innerText()).toBe(antesEdicao);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Relatórios', exact: true })
    .click();
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: `${nome} editado` })).toHaveCount(
    1,
  );

  await page.reload();
  await expect(vendasDoMes.locator('tbody tr').filter({ hasText: nome })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .click();
  expect(await indicadoresVisaoGeral(page)).toEqual(indicadoresIniciais);
});

test('revela erros por campo e foco, invalida prévia e cancela sem efeito nos dois temas', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    const linhas = await page.locator('tbody tr').count();
    await page.getByRole('link', { name: 'Nova venda', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toBeFocused();
    await expect(page.locator('#erro-nome')).toContainText('Informe o nome');
    await expect(page.locator('#erro-nome')).toHaveCSS('color', /rgb\(/);
    await preencherCadastro(page, 'Cliente DEMO cancelado');
    await page.getByLabel('CPF', { exact: true }).fill('11111111111');
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.getByLabel('CPF', { exact: true })).toBeFocused();
    await expect(page.locator('#erro-cpf')).toContainText('verificadores');
    await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(/\/vendas$/);
    await expect(page.getByRole('link', { name: 'Nova venda', exact: true })).toBeFocused();
    await expect(page.locator('tbody tr')).toHaveCount(linhas);
    await page.getByRole('link', { name: 'Nova venda', exact: true }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('');
  }
});
