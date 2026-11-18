import { expect, Page, test } from '@playwright/test';

async function preencherCadastro(page: Page, nome: string) {
  await page.getByLabel('Nome', { exact: true }).fill(nome);
  await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
  await page.getByLabel('Telefone com DDD').fill('(00) 1234-5678');
  await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
  await page.getByLabel('Quantidade de parcelas').fill('3');
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (erro) => {
    throw erro;
  });
});

test('recebe parcela e lote antecipado, valida conferência e reconcilia quitação', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await preencherCadastro(page, 'Cliente DEMO E2E recebimento');
    const referencia = await page.getByLabel('Data da venda', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await page.getByRole('button', { name: /Receber parcelas da venda/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Receber parcelas' });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Quantidade de parcelas consecutivas')).toBeFocused();
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('');
    await expect(page.getByLabel('Forma do recebimento')).toHaveValue('');
    await expect(page.getByLabel('Data do recebimento')).toHaveValue(referencia);
    await page.getByLabel('Valor recebido (R$)').fill('33,35');
    await page.getByLabel('Data do recebimento').fill('0001-01-01');
    await page.getByRole('button', { name: 'Confirmar recebimento demonstrativo' }).click();
    await expect(page.locator('#erro-valor-recebimento')).toContainText('exatamente');
    await expect(page.locator('#erro-data-recebimento')).toContainText('anterior');
    await expect(page.locator('#erro-forma-recebimento')).toContainText('Selecione');
    await expect(dialog).toBeVisible();
    await page.getByLabel('Valor recebido (R$)').fill('33,34');
    await page.getByLabel('Data do recebimento').fill(referencia);
    await page.getByLabel('Forma do recebimento').selectOption('Pix');
    await page
      .getByRole('button', { name: 'Confirmar recebimento demonstrativo' })
      .evaluate((botao: HTMLButtonElement) => {
        botao.click();
        botao.click();
      });
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Receber parcelas da venda/ })).toBeFocused();
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
    await page.getByRole('button', { name: /Receber parcelas da venda/ }).click();
    await page.getByLabel('Quantidade de parcelas consecutivas').selectOption('2');
    await expect(dialog.getByRole('list', { name: 'Parcelas selecionadas' })).toContainText(
      'Parcela 2',
    );
    await expect(dialog.getByRole('list', { name: 'Parcelas selecionadas' })).toContainText(
      'Parcela 3',
    );
    await expect(dialog).toContainText('Soma exigida: R$ 66,66');
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('');
    await page.getByLabel('Valor recebido (R$)').fill('66,66');
    await page.getByLabel('Forma do recebimento').selectOption('Dinheiro');
    await page.getByLabel('Valor recebido (R$)').press('Enter');
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Parcelas', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: /Receber parcelas da venda/ })).toHaveCount(0);
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
    await page.getByRole('main').getByRole('link', { name: 'Quitadas', exact: true }).click();
    await page
      .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
      .fill('Cliente DEMO E2E recebimento');
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
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    const antes = await page.locator('section[aria-labelledby="dados-financeiros"]').innerText();
    const receber = page.getByRole('button', { name: /Receber parcelas da venda/ });
    await receber.click();
    const dialog = page.getByRole('dialog', { name: 'Receber parcelas' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((elemento) => elemento.matches(':modal'))).toBe(true);
    await expect(page.getByLabel('Quantidade de parcelas consecutivas')).toBeFocused();
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
    await page.getByLabel('Quantidade de parcelas consecutivas').selectOption('2');
    await page.getByLabel('Valor recebido (R$)').fill('66,67');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(receber).toBeFocused();
    expect(await page.locator('section[aria-labelledby="dados-financeiros"]').innerText()).toBe(
      antes,
    );
    await receber.click();
    await expect(page.getByLabel('Quantidade de parcelas consecutivas')).toHaveValue('1');
    await expect(page.getByLabel('Valor recebido (R$)')).toHaveValue('');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(receber).toBeFocused();
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
  await page.getByLabel('Há entrada').check();
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
  ).toContainText('0 de 4');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('link', { name: 'Voltar para Vendas', exact: true }).click();
  await page
    .getByLabel('Buscar por nome, CPF, telefone ou data da venda', { exact: true })
    .fill('Cliente DEMO E2E entrada');
  await expect(page.locator('tbody tr')).toHaveCount(1);
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
