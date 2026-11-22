import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('resumos preservam nome sem espaços e valores extensos sem overflow', async ({
  page,
}, info) => {
  const nome = `Cliente${'Sintetico'.repeat(35)}`;
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/nova');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await page.getByLabel('Nome', { exact: true }).fill(nome);
    await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
    await page.getByLabel('Telefone com DDD').fill('(00) 1234-5678');
    await page.getByLabel('Possui Entrada').selectOption('nao');
    await page.getByLabel('Valor total (R$)', { exact: true }).fill('1000000000000');
    await page.getByLabel('Quantidade de parcelas').fill('3');
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(
      page.getByRole('heading', { name: 'Detalhes da venda', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Visão Geral', exact: true }).click();
    const resumo = page.getByRole('region', { name: 'Vendas recentes' });
    await expect(resumo.getByRole('link', { name: nome, exact: true })).toHaveText(nome);
    for (const titulo of ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas']) {
      await expect(page.getByRole('region', { name: titulo })).toHaveCSS(
        'overflow-wrap',
        'anywhere',
      );
      await expect(page.getByRole('region', { name: titulo }).getByRole('link')).toHaveCount(5);
    }
    for (const largura of [390, 767, 768, 1024, 1366]) {
      await page.setViewportSize({ width: largura, height: 844 });
      await page.screenshot({
        path: info.outputPath(`resumo-extenso-${largura}-${tema}.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${largura}/${tema}`,
      ).toBeLessThanOrEqual(largura);
      const medidas = await page.locator('main article, main li').evaluateAll((elementos) =>
        elementos.map((elemento) => ({
          largura: elemento.clientWidth,
          conteudo: elemento.scrollWidth,
        })),
      );
      for (const medida of medidas) expect(medida.conteudo).toBeLessThanOrEqual(medida.largura);
      await expect(resumo.getByRole('link', { name: nome, exact: true })).toHaveText(nome);
    }
  }
});

test('mantém o indicador nativo de data no esquema do formulário', async ({ page }) => {
  await page.goto('/vendas/nova');
  await expect(page.locator('input[type="date"]')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: 'Tema escuro' }).click();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'light');
  await expect(page.locator('input[type="date"]')).not.toHaveCSS('color-scheme', 'dark');
});

test('mede contraste dos estados auxiliares sem novos controles', async ({ page }) => {
  for (const rota of [
    '/configuracoes',
    '/caminho-ausente',
    '/vendas/registro-ausente',
    '/vendas/registro-ausente/editar',
  ]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('main input, main select, main button')).toHaveCount(0);
      const contrastes = await page
        .locator('main h1, main h2, main p, main dt, main dd, main a')
        .evaluateAll((elementos) => {
          const rgb = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
          const fundo = (e: Element): number[] => {
            const cor = rgb(getComputedStyle(e).backgroundColor);
            return cor[3] === 0 && e.parentElement ? fundo(e.parentElement) : cor;
          };
          const luminancia = (cor: number[]) =>
            cor
              .slice(0, 3)
              .map((v) => {
                const s = v / 255;
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              })
              .reduce((soma, v, i) => soma + v * [0.2126, 0.7152, 0.0722][i], 0);
          return elementos.map((e) => {
            const [maior, menor] = [
              luminancia(rgb(getComputedStyle(e).color)),
              luminancia(fundo(e)),
            ].sort((a, b) => b - a);
            return { texto: e.textContent, razao: (maior + 0.05) / (menor + 0.05) };
          });
        });
      expect(contrastes.length).toBeGreaterThan(0);
      for (const contraste of contrastes)
        expect(contraste.razao, contraste.texto ?? '').toBeGreaterThanOrEqual(4.5);
      console.log(
        `Auxiliar ${rota}/${tema}: mínimo ${Math.min(...contrastes.map((c) => c.razao)).toFixed(2)}:1`,
      );
    }
  }
});

test('destaca valores e preserva quatro indicadores e três resumos', async ({ page }, info) => {
  await page.goto('/visao-geral');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const indicadores = page.locator('[aria-label="Indicadores financeiros globais"] article');
    await expect(indicadores).toHaveCount(4);
    for (const indicador of await indicadores.all()) {
      await expect(indicador).toHaveCSS('border-radius', '12px');
      await expect(indicador.locator('p')).toHaveCSS('font-size', '30px');
      await expect(indicador.locator('h3')).toHaveCSS('font-size', '14px');
    }
    for (const nome of ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas']) {
      const resumo = page.getByRole('region', { name: nome });
      await expect(resumo).toHaveCSS('border-radius', '12px');
      await expect(resumo.getByRole('heading')).toHaveCSS('border-bottom-width', '1px');
      await expect(resumo.getByRole('link')).toHaveCount(5);
    }
    await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCSS(
      'margin-bottom',
      '12px',
    );
    const grades = page.locator('main div.grid').last();
    await expect(grades).toHaveCSS('row-gap', '16px');
    const primeiroResumo = page.getByRole('region', { name: 'Vendas recentes' });
    await expect(primeiroResumo.getByRole('heading')).toHaveCSS('margin-bottom', '12px');
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
    await expect(page.locator('main input, main button, main canvas')).toHaveCount(0);
  }
});

test('alinha valores das quatro tabelas de Relatórios sem mudar densidade', async ({
  page,
}, info) => {
  await page.goto('/relatorios');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const regioes = [
      'Recebimentos do mês',
      'Vendas do mês',
      'Posição em aberto',
      'Parcelas vencidas',
    ];
    const colunas: Record<string, string> = {
      'Recebimentos do mês': 'Valor',
      'Vendas do mês': 'Valor total',
      'Posição em aberto': 'Saldo',
      'Parcelas vencidas': 'Valor',
    };
    for (const nome of regioes) {
      const tabela = page.getByRole('region', { name: nome }).getByRole('table');
      await expect(tabela.locator('xpath=../..')).toHaveCSS('border-radius', '12px');
      const cabecalhoMonetario = tabela.getByRole('columnheader', { name: colunas[nome] });
      const celulaMonetaria = tabela
        .locator('tbody tr')
        .first()
        .locator('td')
        .nth(
          await cabecalhoMonetario.evaluate((elemento) =>
            [...elemento.parentElement!.children].indexOf(elemento),
          ),
        );
      await expect(cabecalhoMonetario).toHaveCSS('text-align', 'right');
      await expect(celulaMonetaria).toHaveCSS('text-align', 'right');
      await expect(celulaMonetaria).toHaveCSS('font-variant-numeric', /tabular-nums/);
      await expect(tabela).toHaveCSS('font-size', '18px');
      await expect(tabela).toHaveCSS('line-height', '20px');
      await expect(tabela.locator('thead th').first()).toHaveCSS('padding-top', '8px');
      await expect(tabela.locator('tbody td').first()).toHaveCSS('padding-top', '4px');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await expect(page.getByRole('button', { name: 'Exportar relatório' })).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`relatorios-refinados-${tema}.png`),
      fullPage: true,
    });
    await writeFile(
      info.outputPath(`relatorios-refinados-${tema}.json`),
      JSON.stringify(
        {
          rota: '/relatorios',
          tema,
          viewport: page.viewportSize(),
          cenário: 'quatro tabelas com alinhamento monetário refinado',
        },
        null,
        2,
      ),
    );
  }
});

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
      };
    });
    expect(estilos.canvas).toBe(tema === 'dark' ? 'rgb(17, 18, 23)' : 'rgb(245, 246, 249)');
    expect(estilos.cabecalho).toBe(tema === 'dark' ? 'rgb(29, 30, 36)' : 'rgb(255, 255, 255)');
    expect(estilos.lateral).toBe(tema === 'dark' ? 'rgb(133, 0, 32)' : 'rgb(206, 0, 38)');
    expect(estilos.fonteConteudo).toBe(estilos.fonteLateral);
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
    ['/vendas/registro-ausente/editar', 'edicao-ausente'],
  ]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${nome}-${tema}.png`), fullPage: true });
      await writeFile(
        info.outputPath(`${nome}-${tema}.json`),
        JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: nome }, null, 2),
      );
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
      if (nome === 'vendas' || nome === 'quitadas') {
        await page
          .getByRole('searchbox', { name: 'Buscar por nome, CPF, telefone ou data da venda' })
          .fill('Sem correspondência sintética');
        await expect(page.locator('app-tabela-vendas tbody tr')).toHaveCount(0);
        await page.screenshot({
          path: info.outputPath(`${nome}-sem-resultados-${tema}.png`),
          fullPage: true,
        });
        await writeFile(
          info.outputPath(`${nome}-sem-resultados-${tema}.json`),
          JSON.stringify(
            { rota, tema, viewport: page.viewportSize(), cenário: 'pesquisa sem resultados' },
            null,
            2,
          ),
        );
      }
    }
  }
});

test('registra baseline dos fluxos válidos, inválidos e do modal', async ({ page }, info) => {
  const abrirNoTema = async (rota: string, tema: 'dark' | 'light') => {
    await page.goto(rota);
    if (tema === 'light') {
      const alternar = page.getByRole('button', { name: 'Tema escuro' });
      if (await alternar.count()) await alternar.click();
    }
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
  };
  const capturar = async (nome: string, tema: 'dark' | 'light') => {
    const rota = new URL(page.url()).pathname;
    await page.screenshot({ path: info.outputPath(`${nome}-${tema}.png`), fullPage: true });
    await writeFile(
      info.outputPath(`${nome}-${tema}.json`),
      JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: nome }, null, 2),
    );
  };

  for (const tema of ['dark', 'light']) {
    await abrirNoTema('/vendas', tema);

    const detalheHref = await page
      .locator('a[href^="/vendas/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .find((href) => href && /^\/vendas\/seed%2Fvenda%2F\d+$/.test(href)),
      );
    expect(detalheHref, 'a lista deve expor uma venda sintética estável').toBeTruthy();

    await abrirNoTema(detalheHref!, tema);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await capturar('detalhe-valido', tema);

    const editarHref = detalheHref!.replace(/$/, '/editar');
    await abrirNoTema(editarHref, tema);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await capturar('edicao-valida', tema);

    await abrirNoTema(detalheHref!, tema);
    const pagar = page.locator('[data-acao-pagar]').first();
    await expect(pagar).toBeVisible();
    await pagar.click();
    const dialogo = page.getByRole('dialog', { name: 'Pagar parcela' });
    await expect(dialogo).toBeVisible();
    await capturar('recebimento-modal', tema);
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();

    await abrirNoTema('/vendas/nova', tema);
    await page.getByRole('button', { name: 'Confirmar cadastro demonstrativo' }).click();
    await expect(page.locator('form')).toBeVisible();
    await capturar('cadastro-invalido', tema);

    await page.getByLabel('Nome', { exact: true }).fill('Cliente baseline determinístico');
    await page.getByLabel('CPF', { exact: true }).fill('900.000.001-75');
    await page.getByLabel('Telefone com DDD').fill('(00) 1234-5678');
    await page.getByLabel('Possui Entrada').selectOption('nao');
    await page.getByLabel('Valor total (R$)', { exact: true }).fill('100');
    await page.getByLabel('Quantidade de parcelas').fill('3');
    await expect(page.getByRole('region', { name: 'Prévia completa das parcelas' })).toBeVisible();
    await capturar('cadastro-valido', tema);
  }
});

test('ação Nova venda mantém hierarquia, contraste e foco nos dois temas', async ({ page }) => {
  const contraste = (frente: number[], fundo: number[]) => {
    const luminancia = (cor: number[]) =>
      cor
        .map((canal) => {
          const normalizado = canal / 255;
          return normalizado <= 0.04045
            ? normalizado / 12.92
            : ((normalizado + 0.055) / 1.055) ** 2.4;
        })
        .reduce((soma, canal, indice) => soma + canal * [0.2126, 0.7152, 0.0722][indice], 0);
    const [maior, menor] = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a);
    return (maior + 0.05) / (menor + 0.05);
  };

  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const acao = page.getByRole('link', { name: 'Nova venda', exact: true });
    await expect(acao).toHaveCSS('background-color', 'rgb(215, 40, 72)');
    await expect(acao).toHaveCSS('color', 'rgb(255, 255, 255)');
    const ratioNormal = contraste([255, 255, 255], [215, 40, 72]);
    expect(ratioNormal).toBeGreaterThanOrEqual(4.5);

    await acao.hover();
    await expect(acao).toHaveCSS('background-color', 'rgb(181, 31, 61)');
    expect(contraste([255, 255, 255], [181, 31, 61])).toBeGreaterThanOrEqual(4.5);

    await page.keyboard.press('Escape');
    for (let indice = 0; indice < 12; indice += 1) {
      await page.keyboard.press('Tab');
      if (await acao.evaluate((elemento) => elemento.matches(':focus-visible'))) break;
    }
    await expect(acao).toBeFocused();
    await expect(acao).toHaveCSS('outline-style', 'solid');
    await expect(acao).toHaveCSS('outline-width', '3px');
  }
});

test('mantém ritmo do shell e separação do cabeçalho sem alterar a lateral', async ({ page }) => {
  for (const rota of ['/visao-geral', '/vendas', '/relatorios', '/configuracoes']) {
    for (const largura of [390, 1366]) {
      await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 768 });
      await page.goto(rota);
      const medidas = await page.evaluate(() => ({
        gutter: {
          vertical: getComputedStyle(document.querySelector('main')!.parentElement!).paddingTop,
          horizontal: getComputedStyle(document.querySelector('main')!.parentElement!).paddingLeft,
        },
        separacaoCabecalho: getComputedStyle(document.querySelector('app-cabecalho header')!)
          .marginBottom,
        barraSuperior: document.querySelector('.barra-superior')!.getBoundingClientRect().height,
        larguraLateral: document.querySelector('.barra-lateral')!.getBoundingClientRect().width,
      }));
      expect(medidas.gutter, `${rota}/${largura}`).toEqual({
        vertical: '12px',
        horizontal: largura >= 768 ? '16px' : '12px',
      });
      expect(medidas.separacaoCabecalho, `${rota}/${largura}`).toBe('8px');
      expect(medidas.barraSuperior, `${rota}/${largura}`).toBe(56);
      expect(medidas.larguraLateral, `${rota}/${largura}`).toBe(largura >= 768 ? 260 : 390);
    }
  }
});

test('identifica o painel de Vendas com resultados, vazio e pesquisa sem resultados', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/vendas');
  const titulo = page.getByRole('heading', { level: 2, name: 'Vendas cadastradas' });
  await expect(titulo).toBeVisible();
  await expect(page.locator('main input[type="search"]')).toHaveCount(1);
  await expect(page.getByText('Total em aberto', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Valores em atraso', { exact: true })).toHaveCount(0);

  const situacao = page.getByLabel('Filtrar por situação');
  await situacao.selectOption('Atrasada');
  await page.getByRole('button', { name: 'Limpar pesquisa' }).click();
  await expect(situacao).toHaveValue('Atrasada');
  await expect(titulo).toBeVisible();

  await page
    .getByRole('searchbox', { name: 'Buscar por nome, CPF, telefone ou data da venda' })
    .fill('termo-sem-correspondencia');
  await expect(
    page.getByText('Nenhuma venda corresponde à pesquisa e à situação selecionadas.'),
  ).toBeVisible();
  await expect(titulo).toBeVisible();
});

test('cabeçalhos e mensagens de sucesso preservam contraste e acabamento nos dois temas', async ({
  page,
}) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const assinatura = page.locator('app-cabecalho header > p');
    await expect(assinatura).toHaveCSS(
      'color',
      tema === 'dark' ? 'rgb(255, 154, 175)' : 'rgb(181, 31, 61)',
    );
    await expect(assinatura).toHaveCSS('font-weight', '500');

    await page.goto('/vendas/seed%2Fvenda%2F1');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await page.locator('[data-acao-pagar]').first().click();
    await page.getByLabel('Data do pagamento').fill('2026-11-22');
    await page.getByLabel('Forma do pagamento').selectOption('Pix');
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    const sucesso = page.locator('main [role="status"]').first();
    await expect(sucesso).toBeVisible();
    await expect(sucesso).toHaveCSS('border-top-left-radius', '8px');
  }
});

test('alinha valores monetários e recuos das consultas abertas e quitadas', async ({
  page,
}, info) => {
  for (const largura of [1366, 390]) {
    await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 768 });
    for (const tema of ['dark', 'light']) {
      for (const [nome, rota] of [
        ['vendas', '/vendas'],
        ['quitadas', '/vendas/quitadas'],
      ]) {
        await page.goto(rota);
        if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
        await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

        const contagem = page.locator('main p[role="status"]').first();
        await expect(contagem).toHaveCSS('margin-inline-start', '8px');
        const tabela = page.locator('app-tabela-vendas table');
        await expect(tabela).toBeVisible();
        expect(
          await tabela
            .locator('tbody app-selo-situacao span')
            .first()
            .evaluate((selo) => parseFloat(getComputedStyle(selo).borderTopLeftRadius)),
        ).toBeGreaterThan(100);
        await expect(tabela.locator('tbody app-selo-situacao span').first()).toHaveCSS(
          'font-size',
          '14px',
        );
        await expect(page.locator('app-tabela-vendas [role="region"]')).toHaveCSS(
          'border-radius',
          '8px',
        );
        for (const nomeColuna of ['Valor total', 'Saldo devedor']) {
          await expect(tabela.getByRole('columnheader', { name: nomeColuna })).toHaveCSS(
            'text-align',
            'right',
          );
        }
        const primeiraLinha = tabela.locator('tbody tr').first();
        for (const indice of [2, 4]) {
          const valor = primeiraLinha.locator('td').nth(indice - 1);
          await expect(valor).toHaveCSS('text-align', 'right');
          const estilos = await valor.evaluate((elemento) => {
            const estilo = getComputedStyle(elemento);
            return {
              fontSize: estilo.fontSize,
              lineHeight: estilo.lineHeight,
              paddingTop: estilo.paddingTop,
              paddingLeft: estilo.paddingLeft,
              fontVariantNumeric: estilo.fontVariantNumeric,
            };
          });
          expect(estilos).toMatchObject({
            fontSize: '18px',
            lineHeight: '20px',
            paddingTop: '4px',
            paddingLeft: '10px',
          });
          expect(estilos.fontVariantNumeric).toContain('tabular-nums');
        }
        await expect(page.locator('app-paginacao-vendas')).toHaveCSS('padding-top', '4px');
        await page.screenshot({
          path: info.outputPath(`${nome}-${largura}-${tema}.png`),
          fullPage: true,
        });
        await writeFile(
          info.outputPath(`${nome}-${largura}-${tema}.json`),
          JSON.stringify({ rota, tema, viewport: page.viewportSize(), cenário: nome }, null, 2),
        );
      }
    }
  }
});

test('detalhe destaca saldo, recebimento e valores das parcelas nos dois temas', async ({
  page,
}, info) => {
  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas/seed%2Fvenda%2F1');
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

    const saldo = page
      .locator('dt')
      .filter({ hasText: /^Saldo devedor$/ })
      .locator('+ dd');
    await expect(saldo).toHaveCSS('font-size', '20px');
    await expect(saldo).toHaveCSS('font-weight', '700');
    const pagar = page.locator('[data-acao-pagar]').first();
    await expect(pagar).toHaveCSS('background-color', 'rgb(215, 40, 72)');
    await expect(pagar).toHaveCSS('color', 'rgb(255, 255, 255)');
    for (let tentativa = 0; tentativa < 20; tentativa += 1) {
      if (await pagar.evaluate((elemento) => elemento.matches(':focus-visible'))) break;
      await page.keyboard.press('Tab');
    }
    await expect(pagar).toBeFocused();
    await expect(pagar).toHaveCSS('outline-style', 'solid');
    await expect(pagar).toHaveCSS('outline-width', '3px');

    const tabela = page.getByRole('region', { name: 'Parcelas da venda' }).locator('table');
    await expect(page.locator('.detalhe-bloco').first()).toHaveCSS('padding', '8px');
    await expect(page.locator('.entrada-detalhe dl')).toHaveCSS('border-radius', '8px');
    await expect(page.locator('.parcelas-detalhe')).toHaveCSS('overflow', 'hidden');
    await expect(tabela.getByRole('columnheader', { name: 'Valor' })).toHaveCSS(
      'text-align',
      'right',
    );
    const valor = tabela.locator('tbody tr').first().locator('td').first();
    await expect(valor).toHaveCSS('text-align', 'right');
    await expect(valor).toHaveCSS('font-size', '18px');
    await expect(valor).toHaveCSS('line-height', '20px');
    await expect(valor).toHaveCSS('padding-top', '4px');
    await expect(valor).toHaveCSS('padding-left', '10px');
    await expect(valor).toHaveCSS('font-variant-numeric', /tabular-nums/);
    await page.screenshot({
      path: info.outputPath(`detalhe-hierarquia-${tema}.png`),
      fullPage: true,
    });
  }
});

test('estado de venda ausente mantém mensagem e retornos nos dois temas', async ({
  page,
}, info) => {
  for (const tema of ['dark', 'light']) {
    const rota = '/vendas/registro-ausente';
    await page.goto(rota);
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await expect(page.getByRole('heading', { name: 'Venda não encontrada' })).toBeVisible();
    await expect(page.getByText('Não existe uma venda com este identificador.')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Retornos de Vendas' })).toContainText(
      'Voltar para Vendas',
    );
    await expect(page.getByRole('navigation', { name: 'Retornos de Vendas' })).toContainText(
      'Ver Vendas quitadas',
    );
    await page.screenshot({
      path: info.outputPath(`detalhe-venda-ausente-${tema}.png`),
      fullPage: true,
    });
    await writeFile(
      info.outputPath(`detalhe-venda-ausente-${tema}.json`),
      JSON.stringify(
        { rota, tema, viewport: page.viewportSize(), cenário: 'venda ausente' },
        null,
        2,
      ),
    );
  }
});
