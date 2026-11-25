import { writeFile } from 'node:fs/promises';
import { expect, test as base } from '@playwright/test';

const produto = 'Mercadão dos Óculos - Vendas em Aberto';
const destinos = [
  ['/visao-geral', 'Visão Geral'],
  ['/vendas', 'Vendas'],
  ['/vendas/quitadas', 'Vendas quitadas'],
  ['/relatorios', 'Relatórios'],
  ['/configuracoes', 'Configurações'],
] as const;

const test = base.extend<{ monitoramento: void }>({
  monitoramento: [
    async ({ page }, use) => {
      const erros: string[] = [];
      page.on('pageerror', (erro) => erros.push(erro.message));
      page.on('console', (mensagem) => {
        if (mensagem.type() === 'error') erros.push(mensagem.text());
      });
      await use();
      expect(erros, 'Sem pageerror ou erros inesperados de console').toEqual([]);
    },
    { auto: true },
  ],
});

test('abre a estrutura e carrega a logo local sem distorção', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  await expect(page.getByText(produto, { exact: true })).toBeVisible();
  await expect(page.getByText('Indicadores financeiros globais')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vendas recentes' })).toBeVisible();
  await expect(page.locator('form, input')).toHaveCount(0);
  const logo = page.locator('.identidade img');
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((elemento: HTMLImageElement) => ({
      carregada: elemento.complete && elemento.naturalWidth > 0,
      proporcao:
        Math.abs(
          elemento.width / elemento.height - elemento.naturalWidth / elemento.naturalHeight,
        ) < 0.02,
    })),
  ).toEqual({ carregada: true, proporcao: true });
});

test('não exibe aviso global ao abrir ou recarregar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visão Geral');
  await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
});

test('Visão Geral e Relatórios apresentam as consultas financeiras definidas', async ({ page }) => {
  await page.goto('/visao-geral');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visão Geral');
  await expect(page.getByRole('main')).toContainText('Referência da demonstração:');
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Indicadores financeiros globais' }),
  ).toHaveCount(1);
  await expect(page.locator('[aria-label="Indicadores financeiros globais"] article')).toHaveCount(
    4,
  );
  for (const resumo of ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas']) {
    const secao = page.getByRole('region', { name: resumo });
    await expect(secao).toBeVisible();
    await expect(secao.getByRole('link')).toHaveCount(5);
    await expect(secao).toContainText('Até 5');
  }
  await expect(page.locator('form, input, select, textarea, table')).toHaveCount(0);
  await expect(page.getByRole('main').locator('button')).toHaveCount(0);

  await page.goto('/relatorios');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Relatórios');
  await expect(page.getByRole('main')).toContainText(
    /Mês civil de \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/,
  );
  for (const secao of [
    'Recebimentos no mês',
    'Vendas do mês',
    'Parcelas em aberto',
    'Parcelas vencidas',
  ]) {
    await expect(page.getByRole('heading', { name: secao })).toBeVisible();
  }
  await expect(page.locator('main table')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Exportar relatório' })).toBeVisible();
  await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCount(0);
  await expect(page.locator('form, input, select, textarea, canvas')).toHaveCount(0);
});

test('Exportar relatório anuncia indisponibilidade sem download, rede ou mutação', async ({
  page,
}) => {
  await page.goto('/relatorios');
  const tabelasAntes = await page.locator('main table').allInnerTexts();
  const requisicoes: string[] = [];
  const downloads: string[] = [];
  page.on('request', (requisicao) => {
    if (['fetch', 'xhr'].includes(requisicao.resourceType())) requisicoes.push(requisicao.url());
  });
  page.on('download', (download) => downloads.push(download.suggestedFilename()));

  const botao = page.getByRole('button', { name: 'Exportar relatório' });
  await expect(botao).toHaveAttribute('aria-describedby', 'indisponibilidade-exportacao');
  await expect(page.locator('#indisponibilidade-exportacao')).toHaveText(
    'Exportação não disponível no protótipo.',
  );
  await botao.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(
    'A exportação de relatórios não está disponível no protótipo.',
  );
  await expect(botao).toBeFocused();
  expect(await page.locator('main table').allInnerTexts()).toEqual(tabelasAntes);
  expect(requisicoes).toEqual([]);
  expect(downloads).toEqual([]);
});

test('Relatórios mantém quatro tabelas completas nos dois temas e viewports', async ({ page }) => {
  await page.goto('/relatorios');
  const secoes = [
    'Recebimentos no mês',
    'Vendas do mês',
    'Parcelas em aberto',
    'Parcelas vencidas',
  ];
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await expect(page.locator('main table')).toHaveCount(4);
    for (const nome of secoes) {
      const nomeTabela =
        {
          'Recebimentos no mês': 'Tabela de recebimentos no mês',
          'Vendas do mês': 'Tabela de vendas do mês',
          'Parcelas em aberto': 'Tabela de parcelas em aberto',
          'Parcelas vencidas': 'Tabela de parcelas vencidas',
        }[nome] ?? nome;
      const regiao = page.locator(`[role="region"][aria-label="${nomeTabela}"]`);
      await expect(regiao).toHaveAttribute('tabindex', '0');
      await expect(regiao.getByRole('table')).toBeVisible();
      await expect(regiao.getByRole('rowgroup').nth(1).getByRole('row').first()).toBeVisible();
      const tabela = regiao.getByRole('table');
      const estilos = await tabela.evaluate((elemento) => {
        const cabecalho = getComputedStyle(elemento.querySelector('thead th')!);
        const celula = getComputedStyle(elemento.querySelector('tbody td')!);
        const indiceMonetario = [...elemento.querySelectorAll('thead th')].findIndex(
          (th) =>
            th.textContent?.trim() ===
            {
              'Tabela de recebimentos no mês': 'Valor',
              'Tabela de vendas do mês': 'Valor total efetivo',
              'Tabela de parcelas em aberto': 'Saldo',
              'Tabela de parcelas vencidas': 'Valor',
            }[elemento.closest('[aria-label]')!.getAttribute('aria-label')!],
        );
        const thMonetario = getComputedStyle(
          elemento.querySelectorAll('thead th')[indiceMonetario],
        );
        const tdMonetario = getComputedStyle(
          elemento.querySelectorAll('tbody tr:first-child td')[indiceMonetario],
        );
        return {
          fonte: getComputedStyle(elemento).fontSize,
          lineHeight: getComputedStyle(elemento).lineHeight,
          paddingCabecalhoVertical: cabecalho.paddingTop,
          paddingCabecalhoHorizontal: cabecalho.paddingLeft,
          paddingCelulaVertical: celula.paddingTop,
          paddingCelulaHorizontal: celula.paddingLeft,
          alinhamentoMonetario: thMonetario.textAlign,
          alinhamentoValor: tdMonetario.textAlign,
          algarismos: tdMonetario.fontVariantNumeric,
        };
      });
      expect(estilos).toEqual({
        fonte: '18px',
        lineHeight: '20px',
        paddingCabecalhoVertical: '8px',
        paddingCabecalhoHorizontal: '10px',
        paddingCelulaVertical: '4px',
        paddingCelulaHorizontal: '10px',
        alinhamentoMonetario: 'right',
        alinhamentoValor: 'right',
        algarismos: 'tabular-nums',
      });
      expect(await regiao.evaluate((elemento) => getComputedStyle(elemento).overflowX)).toBe(
        'auto',
      );
    }
    await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('confere contraste de textos das páginas novas nos dois temas e viewports', async ({
  page,
}) => {
  await page.goto('/visao-geral');
  const medir = async () =>
    page
      .locator(
        'main h1, main h2, main h3, main p, main dt, main dd, main a, main button, main th, main td, main caption',
      )
      .evaluateAll((elementos) => {
        const canais = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
        const compor = (frente: number[], fundo: number[]) =>
          frente
            .slice(0, 3)
            .map(
              (canal, indice) => canal * (frente[3] ?? 1) + fundo[indice] * (1 - (frente[3] ?? 1)),
            );
        const fundo = (elemento: Element | null): number[] => {
          if (!elemento) return [255, 255, 255];
          const cor = canais(getComputedStyle(elemento).backgroundColor);
          return (cor[3] ?? 1) === 1 ? cor : compor(cor, fundo(elemento.parentElement));
        };
        const luminancia = (cor: number[]) =>
          cor
            .slice(0, 3)
            .map((canal) => canal / 255)
            .map((canal) => (canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4))
            .reduce((soma, canal, indice) => soma + canal * [0.2126, 0.7152, 0.0722][indice], 0);
        return elementos
          .filter((elemento) => (elemento.textContent ?? '').trim())
          .map((elemento) => {
            const plano = fundo(elemento);
            const texto = compor(canais(getComputedStyle(elemento).color), plano);
            const [maior, menor] = [luminancia(texto), luminancia(plano)].sort((a, b) => b - a);
            return {
              texto: (elemento.textContent ?? '').trim().slice(0, 60),
              razao: (maior + 0.05) / (menor + 0.05),
            };
          });
      });

  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    for (const rota of ['Visão Geral', 'Relatórios', 'Configurações', 'Nova venda']) {
      if (rota === 'Relatórios') {
        await page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Relatórios', exact: true })
          .click();
        await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
      } else if (rota === 'Configurações') {
        await page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Configurações', exact: true })
          .click();
        await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
      } else if (rota === 'Nova venda') {
        await page.goto('/vendas/nova');
        await expect(page.getByRole('heading', { level: 1, name: 'Nova venda' })).toBeVisible();
      }
      const valores = await medir();
      expect(valores.length, `${tema}/${rota}: textos examinados`).toBeGreaterThan(
        rota === 'Nova venda' ? 8 : 10,
      );
      for (const valor of valores)
        expect(valor.razao, `${tema}/${rota}: ${valor.texto}`).toBeGreaterThanOrEqual(4.5);
      console.log(
        `Contraste ${tema}/${rota}: mínimo ${Math.min(...valores.map((valor) => valor.razao)).toFixed(2)}:1 (${valores.length} textos)`,
      );
      if (rota === 'Relatórios') {
        const exportar = page.getByRole('button', { name: 'Exportar relatório' });
        const linkRelatorios = page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Relatórios', exact: true });
        await linkRelatorios.focus();
        let exportacaoFocada = false;
        for (let passo = 0; passo < 12 && !exportacaoFocada; passo++) {
          await page.keyboard.press('Tab');
          exportacaoFocada = await exportar.evaluate(
            (elemento) => document.activeElement === elemento,
          );
        }
        expect(exportacaoFocada, `${tema}/Relatórios: botão alcançável por Tab`).toBe(true);
        await expect(exportar).toBeFocused();
        const controle = await exportar.evaluate((elemento) => {
          const canais = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
          const compor = (frente: number[], fundo: number[]) =>
            frente
              .slice(0, 3)
              .map(
                (canal, indice) =>
                  canal * (frente[3] ?? 1) + fundo[indice] * (1 - (frente[3] ?? 1)),
              );
          const fundo = (elemento: Element | null): number[] => {
            if (!elemento) return [255, 255, 255];
            const cor = canais(getComputedStyle(elemento).backgroundColor);
            return (cor[3] ?? 1) === 1 ? cor : compor(cor, fundo(elemento.parentElement));
          };
          const luminancia = (cor: number[]) =>
            cor
              .slice(0, 3)
              .map((canal) => canal / 255)
              .map((canal) => (canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4))
              .reduce((soma, canal, indice) => soma + canal * [0.2126, 0.7152, 0.0722][indice], 0);
          const razao = (frente: number[], plano: number[]) => {
            const [maior, menor] = [luminancia(frente), luminancia(plano)].sort((a, b) => b - a);
            return (maior + 0.05) / (menor + 0.05);
          };
          const estilo = getComputedStyle(elemento);
          const superficie = fundo(elemento.parentElement);
          return {
            borda: razao(compor(canais(estilo.borderTopColor), superficie), superficie),
            foco: razao(compor(canais(estilo.outlineColor), superficie), superficie),
            outlineWidth: estilo.outlineWidth,
            outlineStyle: estilo.outlineStyle,
          };
        });
        expect(controle.borda, `${tema}/Relatórios: borda Exportar`).toBeGreaterThanOrEqual(3);
        expect(controle.foco, `${tema}/Relatórios: foco Exportar`).toBeGreaterThanOrEqual(3);
        expect(controle.outlineWidth).toBe('3px');
        expect(controle.outlineStyle).toBe('solid');
      }
      if (rota === 'Relatórios' && tema === 'dark') {
        await page
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('link', { name: 'Visão Geral', exact: true })
          .click();
        await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
      }
    }
    const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });
    await navegacao.getByRole('link', { name: 'Vendas', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Vendas' })).toBeVisible();
    await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCount(0);
    await navegacao.getByRole('link', { name: 'Quitadas', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Vendas quitadas' })).toBeVisible();
    await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCount(0);
    await navegacao.getByRole('link', { name: 'Relatórios', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();
    await expect(page.locator('[aria-label="Indicadores financeiros globais"]')).toHaveCount(0);
    await navegacao.getByRole('link', { name: 'Configurações', exact: true }).click();
    for (const limite of [
      'Dados fictícios',
      'Estado apenas em memória',
      'Descarte ao recarregar',
      'Sem uso operacional',
    ]) {
      await expect(page.getByRole('main')).toContainText(limite);
    }
    await navegacao.getByRole('link', { name: 'Visão Geral', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeVisible();
  }
});

test('abre cada resumo por teclado com ID opaco e orienta foco ao título do detalhe', async ({
  page,
}) => {
  await page.goto('/configuracoes');
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Visão Geral', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeFocused();

  for (const nome of ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas']) {
    const secao = page.getByRole('region', { name: nome });
    const link = secao.getByRole('link').first();
    const href = await link.getAttribute('href');
    const cliente = await link.innerText();
    expect(href).toMatch(/^\/vendas\/seed%2Fvenda%2F\d+$/i);
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/vendas\/seed%2Fvenda%2F\d+$/i);
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes da venda' })).toBeFocused();
    await expect(page.getByRole('main')).toContainText(cliente);

    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Visão Geral', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeFocused();
  }
});

test('navegar pelas abas não contorna títulos, mas preserva foco visível nos controles', async ({
  page,
}) => {
  await page.goto('/configuracoes');
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });

  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

    for (const [rota, rotulo] of [
      ['/visao-geral', 'Visão Geral'],
      ['/vendas', 'Vendas'],
      ['/vendas/quitadas', 'Quitadas'],
      ['/relatorios', 'Relatórios'],
      ['/configuracoes', 'Configurações'],
    ]) {
      await navegacao.getByRole('link', { name: rotulo, exact: true }).click();
      const titulo = page.getByRole('heading', { level: 1 });
      await expect(titulo).toBeFocused();
      await expect(titulo).toHaveCSS('outline-style', 'none');
      await expect(page.getByRole('main')).toHaveCSS('outline-style', 'none');
      expect(new URL(page.url()).pathname).toBe(rota);
    }
  }

  const controle = page.getByRole('button', { name: 'Tema escuro' });
  await controle.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(controle).toBeFocused();
  await expect(controle).toHaveCSS('outline-style', 'solid');
  await expect(controle).toHaveCSS('outline-width', '3px');
});

test('Visão Geral preserva os indicadores e os três resumos nos dois temas sem corte horizontal', async ({
  page,
}) => {
  await page.goto('/visao-geral');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await expect(
      page.locator('[aria-label="Indicadores financeiros globais"] article'),
    ).toHaveCount(4);
    for (const nome of ['Vendas recentes', 'Parcelas próximas', 'Parcelas atrasadas']) {
      const secao = page.getByRole('region', { name: nome });
      await expect(secao.getByRole('link')).toHaveCount(5);
      await expect(secao).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('anexa capturas sintéticas da Visão Geral, Relatórios e Configurações', async ({
  page,
}, testInfo) => {
  for (const [rota, nome] of [
    ['/visao-geral', 'visao-geral'],
    ['/relatorios', 'relatorios'],
    ['/configuracoes', 'configuracoes'],
  ]) {
    for (const tema of ['dark', 'light']) {
      await page.goto(rota);
      if (tema === 'light') await page.getByRole('button', { name: 'Tema escuro' }).click();
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      if (rota === '/configuracoes') {
        await expect(page.getByRole('heading', { name: 'Limites da demonstração' })).toHaveCSS(
          'border-bottom-width',
          '1px',
        );
        await expect(page.locator('main dt')).toHaveCount(4);
      }
      const captura = await page.screenshot({ fullPage: true });
      await testInfo.attach(`${nome}-${tema}`, { body: captura, contentType: 'image/png' });
    }
  }
});

test('consulta listas, combina critérios e abre a venda correta pelos dois acessos', async ({
  page,
}) => {
  await page.goto('/vendas');
  const busca = page.getByRole('searchbox', { name: /Buscar por nome/ });
  const situacao = page.getByLabel('Filtrar por situação');
  const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
  const quantidadeAbertas = await tabela.locator('tbody tr').count();
  await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText(
    `1–${quantidadeAbertas} de ${quantidadeAbertas} vendas`,
  );
  await expect(page.getByRole('navigation', { name: 'Paginação de vendas' })).toHaveCount(0);
  const primeiraLinha = tabela.locator('tbody tr').first();
  const nome = (await primeiraLinha.locator('th').innerText()).trim();
  const data = (await primeiraLinha.locator('td').nth(0).innerText()).trim();
  const situacaoLinha = (await primeiraLinha.locator('td').nth(5).innerText()).trim();
  await expect(page.getByRole('main')).toContainText('Referência da demonstração:');
  for (const termo of [nome.slice(-5), '900.000.001-75', '(00) 90000-0001', '00000175', data]) {
    await busca.fill(termo);
    await expect(tabela.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);
    await expect(tabela.locator('tbody')).toContainText(nome);
    await busca.fill('');
  }

  await situacao.selectOption(situacaoLinha);
  await busca.fill(nome.slice(-5));
  await expect(tabela.locator('tbody tr').filter({ hasText: nome })).toHaveCount(1);
  await expect(tabela.locator('tbody')).toContainText(situacaoLinha);
  await page.getByRole('button', { name: 'Limpar pesquisa' }).click();
  await expect(situacao).toHaveValue(situacaoLinha);
  await expect(busca).toBeFocused();
  await busca.fill('sem-correspondencia');
  await situacao.selectOption('Todas');
  await busca.fill('');
  await expect(situacao).toHaveValue('Todas');
  await expect(busca).toBeFocused();

  await primeiraLinha
    .getByRole('link', { name: new RegExp(`Abrir detalhes da venda de ${nome}`) })
    .click();
  await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(nome);
  await page.goto('/vendas');
  await page
    .getByRole('table', { name: 'Vendas em aberto' })
    .locator('tbody tr')
    .first()
    .getByRole('link', { name: new RegExp(`Visualizar venda de ${nome}`) })
    .click();
  await expect(page.getByRole('main')).toContainText(nome);

  await page.goto('/vendas/quitadas');
  const tabelaQuitadas = page.getByRole('table', { name: 'Vendas quitadas' });
  const quantidadeQuitadas = await tabelaQuitadas.locator('tbody tr').count();
  await expect(page.locator('[aria-label="Faixa de resultados"]')).toHaveText(
    `1–${quantidadeQuitadas} de ${quantidadeQuitadas} vendas`,
  );
  await expect(page.getByRole('navigation', { name: 'Paginação de vendas' })).toHaveCount(0);
  await expect(page.getByLabel(/Buscar por nome/)).toBeVisible();
  await expect(page.getByLabel(/Filtrar por situação/)).toHaveCount(0);
  const linhaQuitada = tabelaQuitadas.locator('tbody tr').first();
  const nomeQuitado = (await linhaQuitada.locator('th').innerText()).trim();
  const dataQuitada = (await linhaQuitada.locator('td').nth(0).innerText()).trim();
  const buscaQuitadas = page.getByRole('searchbox', { name: /Buscar por nome/ });
  await linhaQuitada
    .getByRole('link', { name: new RegExp(`Abrir detalhes da venda de ${nomeQuitado}`) })
    .click();
  const cpfQuitado = (
    await page.locator('dt').filter({ hasText: /^CPF$/ }).locator('+ dd').innerText()
  ).trim();
  const telefoneQuitado = (
    await page
      .locator('dt')
      .filter({ hasText: /^Telefone$/ })
      .locator('+ dd')
      .innerText()
  ).trim();
  await page.goto('/vendas/quitadas');
  for (const termo of [nomeQuitado.slice(-5), cpfQuitado, telefoneQuitado, dataQuitada]) {
    await buscaQuitadas.fill(termo);
    await expect(tabelaQuitadas.locator('tbody tr').filter({ hasText: nomeQuitado })).toHaveCount(
      1,
    );
    await expect(tabelaQuitadas.locator('tbody')).toContainText(nomeQuitado);
    await buscaQuitadas.fill('');
  }
  await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText(/cadastrar|pagar|exportar/i);
  await expect(page.getByRole('link', { name: /Editar dados do cliente da venda/ })).toHaveCount(
    await tabelaQuitadas.locator('tbody tr').count(),
  );
});

test('abre detalhes por URL opaca, recarrega e oferece retornos explícitos no contexto de Vendas', async ({
  page,
}) => {
  const detalhe = '/vendas/seed%2Fvenda%2F1';
  await page.goto(detalhe);
  await expect(page).toHaveURL(/\/vendas\/seed%2Fvenda%2F1$/i);
  await expect(page.getByRole('heading', { level: 1, name: 'Detalhes da venda' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Pedro Farias');
  await expect(page.getByRole('main')).toContainText('90000000175');
  await expect(page.getByRole('main')).toContainText('Referência da demonstração:');
  await expect(page.getByRole('main').getByRole('table')).toBeVisible();
  await expect(page.getByRole('main').locator('form')).toHaveCount(0);
  await expect(page.locator('[data-acao-pagar]')).toHaveCount(1);
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navegacao.locator('div.modulo-ativo')).toContainText('Vendas');
  await expect(navegacao.getByRole('link', { name: 'Vendas', exact: true })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Detalhes da venda' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Pedro Farias');

  await page
    .getByRole('navigation', { name: 'Retornos de Vendas' })
    .getByRole('link', { name: 'Voltar para Vendas' })
    .click();
  await expect(page).toHaveURL(/\/vendas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Vendas' })).toBeFocused();

  await page.goto(detalhe);
  await page
    .getByRole('navigation', { name: 'Retornos de Vendas' })
    .getByRole('link', { name: 'Ver Vendas quitadas' })
    .click();
  await expect(page).toHaveURL(/\/vendas\/quitadas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Vendas quitadas' })).toBeFocused();
});

test('Configurações explica os quatro limites pelos dois acessos e temas', async ({
  page,
}, info) => {
  await page.goto('/');
  for (const tema of ['dark', 'light']) {
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    for (const acesso of ['principal', 'atalho']) {
      const link =
        acesso === 'principal'
          ? page
              .getByRole('navigation', { name: 'Navegação principal' })
              .getByRole('link', { name: 'Configurações', exact: true })
          : page.getByRole('link', { name: 'Atalho para Configurações', exact: true });
      await link.click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Configurações');
      for (const texto of [
        'Dados fictícios',
        'Estado apenas em memória',
        'Descarte ao recarregar',
        'Sem uso operacional',
        'não controla cobranças reais',
      ]) {
        await expect(page.getByRole('main')).toContainText(texto);
      }
      await expect(
        page.getByRole('main').locator('form, input, select, textarea, button, a'),
      ).toHaveCount(0);
      await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
      const itens = page.getByRole('main').locator('dl > div');
      await expect(itens).toHaveCount(4);
      for (const item of await itens.all()) {
        await expect(item).toHaveCSS('row-gap', '4px');
        await expect(item.locator('dd')).not.toHaveCSS('margin-left', '40px');
      }
      if (acesso === 'principal') {
        await page.screenshot({
          path: info.outputPath(`configuracoes-refinadas-${tema}.png`),
          fullPage: true,
        });
        await writeFile(
          info.outputPath(`configuracoes-refinadas-${tema}.json`),
          JSON.stringify(
            {
              rota: '/configuracoes',
              tema,
              viewport: page.viewportSize(),
              cenário: 'quatro limites demonstrativos',
            },
            null,
            2,
          ),
        );
      }
      await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('link', { name: 'Visão Geral', exact: true })
        .click();
    }
  }
});

test('alterna tema com Enter e Espaço sem mudar foco ou rota', async ({ page }) => {
  await page.goto('/vendas');
  const botao = page.getByRole('button', { name: 'Tema escuro', exact: true });
  await expect(botao).toHaveAttribute('aria-pressed', 'true');
  await botao.focus();
  for (const [tecla, tema, texto] of [
    ['Enter', 'light', 'Claro'],
    ['Space', 'dark', 'Escuro'],
  ]) {
    await page.keyboard.press(tecla);
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await expect(botao).toHaveText(`Tema ativo: ${texto}`);
    await expect(botao).toHaveAttribute('aria-pressed', tema === 'dark' ? 'true' : 'false');
    await expect(botao).toBeFocused();
    await expect(page).toHaveURL(/\/vendas$/);
    await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
  }
});

for (const preferencia of ['light', 'dark'] as const) {
  test(`inicia escuro com sistema ${preferencia} e restaura em nova sessão`, async ({
    browser,
    baseURL,
  }) => {
    const contexto = await browser.newContext({ colorScheme: preferencia });
    const novaPagina = await contexto.newPage();
    const erros: string[] = [];
    novaPagina.on('pageerror', (erro) => erros.push(erro.message));
    novaPagina.on('console', (mensagem) => {
      if (mensagem.type() === 'error') erros.push(mensagem.text());
    });
    await novaPagina.goto(`${baseURL}/configuracoes`);
    await expect(novaPagina.locator('app-root')).toHaveAttribute('data-tema', 'dark');
    await novaPagina.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(novaPagina.locator('app-root')).toHaveAttribute('data-tema', 'light');
    await novaPagina.reload();
    await expect(novaPagina.locator('app-root')).toHaveAttribute('data-tema', 'dark');
    expect(erros).toEqual([]);
    await contexto.close();
    const outraSessao = await browser.newContext({ colorScheme: preferencia });
    const outraPagina = await outraSessao.newPage();
    await outraPagina.goto(`${baseURL}/`);
    await expect(outraPagina.locator('app-root')).toHaveAttribute('data-tema', 'dark');
    await outraSessao.close();
  });
}

test('confere contraste efetivo, foco e superfícies com movimento reduzido', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/vendas/quitadas');
  const medicoes = [];
  for (const tema of ['dark', 'light']) {
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await page.getByRole('button', { name: 'Tema escuro', exact: true }).focus();
    const valores = await page.evaluate(() => {
      const cor = (valor: string): number[] => (valor.match(/[\d.]+/g) ?? []).map(Number);
      const mesclar = (frente: number[], fundo: number[]): number[] => {
        const alfa = frente[3] ?? 1;
        return frente.slice(0, 3).map((v, i) => v * alfa + fundo[i] * (1 - alfa));
      };
      const fundo = (elemento: Element | null): number[] => {
        if (!elemento) return [255, 255, 255];
        const estilo = getComputedStyle(elemento);
        const paradas = estilo.backgroundImage.match(/rgba?\([^)]+\)/g);
        if (paradas?.length === 2) {
          const inicio = cor(paradas[0]);
          const fim = cor(paradas[1]);
          // Amostra central; o teste específico da lateral cobre os extremos e estados.
          return inicio.slice(0, 3).map((v, i) => (v + fim[i]) / 2);
        }
        const atual = cor(estilo.backgroundColor);
        if ((atual[3] ?? 1) === 1) return atual;
        return mesclar(atual, fundo(elemento.parentElement));
      };
      const luminancia = (rgb: number[]): number =>
        rgb
          .slice(0, 3)
          .map((v) => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((soma, v, i) => soma + v * [0.2126, 0.7152, 0.0722][i], 0);
      const razao = (a: number[], b: number[]): number => {
        const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
        return Number(((maior + 0.05) / (menor + 0.05)).toFixed(2));
      };
      const textos = Array.from(
        document.querySelectorAll(
          'h1, h2, p, nav a, .perfil a, main a, .barra-superior span, button',
        ),
      ).map((e) => ({
        elemento: `${e.tagName} ${(e.textContent ?? '').trim().slice(0, 35)}`,
        razao: razao(mesclar(cor(getComputedStyle(e).color), fundo(e)), fundo(e)),
        minimo: e.tagName === 'H1' ? 3 : 4.5,
      }));
      const botao = document.querySelector('button')!;
      const estilo = getComputedStyle(botao);
      const superficie = fundo(botao.parentElement);
      return {
        textos,
        borda: razao(cor(estilo.borderTopColor), superficie),
        foco: razao(cor(estilo.outlineColor), superficie),
        larguraFoco: estilo.outlineWidth,
        superficieRaiz: getComputedStyle(document.querySelector('app-root')!).backgroundColor,
        altura: document.querySelector('app-root')!.getBoundingClientRect().height >= innerHeight,
        semCorte: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        semMovimento: estilo.transitionDuration === '0s',
      };
    });
    for (const texto of valores.textos)
      expect(texto.razao, texto.elemento).toBeGreaterThanOrEqual(texto.minimo);
    expect(valores.borda).toBeGreaterThanOrEqual(3);
    expect(valores.foco).toBeGreaterThanOrEqual(3);
    expect(valores.larguraFoco).toBe('3px');
    expect(valores.altura && valores.semCorte && valores.semMovimento).toBe(true);
    console.log(
      `Contraste ${tema}: texto mínimo ${Math.min(...valores.textos.map((t) => t.razao))}:1; borda ${valores.borda}:1; foco ${valores.foco}:1; fundo ${valores.superficieRaiz}`,
    );
    medicoes.push({ tema, ...valores });
  }
  await testInfo.attach('contraste-efetivo', {
    body: JSON.stringify(medicoes, null, 2),
    contentType: 'application/json',
  });
});

test('confere semântica e contraste de tabelas, situações e controles de consulta nos dois temas', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const medirContraste = async (seletor: string) =>
    page.locator(seletor).evaluateAll((elementos) => {
      const rgb = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
      const luminancia = (cor: number[]) =>
        cor
          .slice(0, 3)
          .map((canal) => {
            const s = canal / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((soma, canal, indice) => soma + canal * [0.2126, 0.7152, 0.0722][indice], 0);
      const compositar = (frente: number[], fundo: number[]) =>
        frente
          .slice(0, 3)
          .map(
            (canal, indice) => canal * (frente[3] ?? 1) + fundo[indice] * (1 - (frente[3] ?? 1)),
          );
      const fundo = (elemento: Element | null): number[] => {
        if (!elemento) return [255, 255, 255];
        const estilo = getComputedStyle(elemento);
        const cor = rgb(estilo.backgroundColor);
        if ((cor[3] ?? 1) === 1) return cor;
        return compositar(cor, fundo(elemento.parentElement));
      };
      return elementos.map((elemento) => {
        const texto = compositar(rgb(getComputedStyle(elemento).color), fundo(elemento));
        const plano = fundo(elemento);
        const [maior, menor] = [luminancia(texto), luminancia(plano)].sort((a, b) => b - a);
        return {
          texto: (elemento.textContent ?? '').trim(),
          razao: (maior + 0.05) / (menor + 0.05),
        };
      });
    });
  const verificarContraste = async (tema: string, area: string) => {
    const valores = await medirContraste('th, td, caption, app-selo-situacao span, button, label');
    for (const valor of valores)
      expect(valor.razao, `${tema}/${area}: ${valor.texto}`).toBeGreaterThanOrEqual(4.5);
    console.log(
      `Contraste ${tema}/${area}: mínimo ${Math.min(...valores.map((valor) => valor.razao)).toFixed(2)}:1`,
    );
  };
  const verificarFaixaDesktop = async (esperados: number) => {
    if (page.viewportSize()!.width < 1200) return;
    const bases = await page
      .locator('.consulta-controles > *')
      .evaluateAll((colunas) => colunas.map((coluna) => coluna.getBoundingClientRect().bottom));
    expect(bases).toHaveLength(esperados);
    expect(Math.max(...bases) - Math.min(...bases)).toBeLessThanOrEqual(1);
  };

  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    await page.mouse.move(
      await page.evaluate(() => innerWidth - 1),
      await page.evaluate(() => innerHeight - 1),
    );
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
    await expect(tabela.getByRole('caption')).toHaveText('Vendas em aberto');
    await expect(tabela.getByRole('columnheader')).toHaveCount(8);
    await expect(page.getByRole('region', { name: 'Vendas em aberto' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: /Buscar por nome/ })).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Limpar pesquisa' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nova venda', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Limpar critérios' })).toHaveCount(0);
    await verificarFaixaDesktop(5);
    await expect(page.locator('main [role="status"]:not([aria-label])')).toContainText(
      'vendas encontradas',
    );
    for (const estado of ['Em aberto', 'Próximos dias', 'Atrasada'])
      await expect(
        tabela.locator('app-selo-situacao').filter({ hasText: estado }).first(),
      ).toBeVisible();
    await verificarContraste(tema, 'Vendas');
    await page.getByRole('button', { name: 'Limpar pesquisa' }).hover();
    await verificarContraste(tema, 'Vendas/hover');
    await page.mouse.move(0, 0);

    await page.goto('/vendas/quitadas');
    const quitadas = page.getByRole('table', { name: 'Vendas quitadas' });
    await expect(quitadas.getByRole('caption')).toHaveText('Vendas quitadas');
    await expect(page.getByLabel(/Buscar por nome/)).toBeVisible();
    await expect(page.getByLabel(/Filtrar por situação/)).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Limpar pesquisa' })).toBeVisible();
    await verificarFaixaDesktop(2);
    await expect(quitadas.getByText('Quitada', { exact: true }).first()).toBeVisible();
    await verificarContraste(tema, 'Quitadas');
    await page.getByRole('button', { name: 'Limpar pesquisa' }).hover();
    await verificarContraste(tema, 'Quitadas/hover');
    await page.mouse.move(0, 0);

    const linkDetalhe = quitadas.getByRole('link', { name: /Abrir detalhes da venda/ }).first();
    await linkDetalhe.click();
    await expect(page.getByRole('region', { name: 'Parcelas da venda' })).toBeVisible();
    await expect(page.getByRole('table').getByRole('caption')).toContainText('Parcelas da venda');
    await verificarContraste(tema, 'Parcelas quitadas');
    await expect(
      page.getByRole('table').locator('app-selo-situacao').filter({ hasText: 'Paga' }).first(),
    ).toBeVisible();

    await page.goto('/vendas');
    await page
      .getByRole('table', { name: 'Vendas em aberto' })
      .getByRole('link', { name: /Abrir detalhes da venda/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes da venda' })).toBeVisible();
    const parcelasAbertas = page.getByRole('region', { name: 'Parcelas da venda' });
    await expect(parcelasAbertas).toBeVisible();
    await expect(
      parcelasAbertas.locator('app-selo-situacao').filter({ hasText: 'Aberto' }).first(),
    ).toBeVisible();
    await verificarContraste(tema, 'Parcelas abertas');
  }
});

test('mantém o overflow contido e permite alcançar tabela, ações e detalhe por teclado', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/vendas');
  const largura = page.viewportSize()!.width;
  const tabela = page.getByRole('table', { name: 'Vendas em aberto' });
  const regiao = page.getByRole('region', { name: 'Vendas em aberto' });
  await expect(regiao).toHaveAttribute('tabindex', '0');
  await expect(tabela.getByRole('columnheader', { name: 'Ações' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await regiao.focus();
  await expect(regiao).toBeFocused();
  const links = await tabela.getByRole('link').count();
  await page.keyboard.press('Tab');
  for (let indice = 1; indice < links; indice++) await page.keyboard.press('Tab');
  await expect(
    tabela.getByRole('link', { name: /Editar dados do cliente da venda/ }).last(),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(tabela.getByRole('link', { name: /Visualizar venda/ }).last()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (largura <= 390) {
    const overflow = await regiao.evaluate((elemento) => ({
      tabelaMaior: elemento.scrollWidth > elemento.clientWidth,
      paginaSemOverflow:
        document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    }));
    expect(overflow).toEqual({ tabelaMaior: true, paginaSemOverflow: true });
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Detalhes da venda' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Parcelas da venda' })).toHaveAttribute(
    'tabindex',
    '0',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  for (const rota of ['/visao-geral', '/relatorios']) {
    await page.goto(rota);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (rota === '/relatorios') {
      await expect(page.getByRole('main')).toContainText('Recebimentos no mês');
      await expect(page.getByRole('main')).toContainText('Parcelas em aberto');
      await expect(page.locator('main table')).toHaveCount(4);
    } else {
      await expect(page.getByRole('main')).toContainText('Total em aberto');
      await expect(page.getByRole('main')).toContainText('Até 5');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('lateral segue a marca e mantém contraste no degradê, hover, ativo e foco', async ({
  page,
}, testInfo) => {
  await page.goto('/vendas/quitadas');
  const lateral = page.locator('.barra-lateral');
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  for (const tema of ['dark', 'light']) {
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);
    await expect(lateral).toHaveCSS(
      'background-color',
      tema === 'dark' ? 'rgb(133, 0, 32)' : 'rgb(206, 0, 38)',
    );
    const imagem = await lateral.evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(imagem.includes('linear-gradient')).toBe(tema === 'dark');
    if (tema === 'dark') {
      expect(imagem).toContain('rgb(133, 0, 32)');
      expect(imagem).toContain('rgb(48, 0, 16)');
    }
    const minimoTexto: number[] = [];
    const minimoFoco: number[] = [];
    for (const nome of ['Vendas', 'Quitadas', 'Relatórios', 'Configurações']) {
      const link = nav.getByRole('link', { name: nome, exact: true });
      for (const estado of ['normal', 'hover', 'foco']) {
        await page.mouse.move(0, 0);
        if (estado === 'hover') await link.hover();
        if (estado === 'foco') {
          await link.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          await expect(link).toBeFocused();
        }
        const medidas = await page.evaluate(() => {
          const rgba = (texto: string): number[] => (texto.match(/[\d.]+/g) ?? []).map(Number);
          const luminancia = (rgb: number[]): number =>
            rgb
              .slice(0, 3)
              .map((v) => {
                const s = v / 255;
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              })
              .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
          const contraste = (a: number[], b: number[]): number => {
            const x = luminancia(a),
              y = luminancia(b);
            return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
          };
          const fundo = (e: Element, posicao: number): number[] => {
            const estilo = getComputedStyle(e);
            const paradas = estilo.backgroundImage.match(/rgba?\([^)]+\)/g);
            if (paradas?.length === 2) {
              const a = rgba(paradas[0]),
                b = rgba(paradas[1]);
              return a.slice(0, 3).map((v, i) => v + (b[i] - v) * posicao);
            }
            const cor = rgba(estilo.backgroundColor);
            if ((cor[3] ?? 1) === 1) return cor;
            const ancestral = e.parentElement ? fundo(e.parentElement, posicao) : [255, 255, 255];
            return cor
              .slice(0, 3)
              .map((v, i) => v * (cor[3] ?? 1) + ancestral[i] * (1 - (cor[3] ?? 1)));
          };
          const alvos = Array.from(
            document.querySelectorAll('.barra-lateral p, .barra-lateral a, .barra-lateral svg'),
          );
          const textos = alvos.flatMap((e) =>
            [0, 0.5, 1].map((posicao) => ({
              alvo: e.textContent?.trim() || 'ícone',
              razao: contraste(rgba(getComputedStyle(e).color), fundo(e, posicao)),
            })),
          );
          const focado = document.activeElement;
          const focos =
            focado?.closest('.barra-lateral') && getComputedStyle(focado).outlineStyle !== 'none'
              ? [0, 0.5, 1].map((p) =>
                  contraste(
                    rgba(getComputedStyle(focado).outlineColor),
                    fundo(focado.parentElement!, p),
                  ),
                )
              : [];
          return { textos, focos };
        });
        for (const medida of medidas.textos)
          expect(medida.razao, `${tema}/${estado}: ${medida.alvo}`).toBeGreaterThanOrEqual(4.5);
        for (const razao of medidas.focos) expect(razao).toBeGreaterThanOrEqual(3);
        if (estado === 'foco') expect(medidas.focos).toHaveLength(3);
        minimoTexto.push(...medidas.textos.map((m) => m.razao));
        minimoFoco.push(...medidas.focos);
      }
    }
    console.log(
      `Lateral ${tema}: texto/ícones mínimo ${Math.min(...minimoTexto).toFixed(2)}:1; foco mínimo ${Math.min(...minimoFoco).toFixed(2)}:1 (topo/meio/base, normal/hover/ativo/foco)`,
    );
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await testInfo.attach(`estrutura-${tema}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
});

test('links afetados integram-se aos temas sem sublinhado permanente e mantêm contraste', async ({
  page,
}, testInfo) => {
  await page.goto('/vendas');
  const medirContraste = async (elemento: import('@playwright/test').Locator) =>
    elemento.evaluate((alvo) => {
      const rgb = (valor: string) => (valor.match(/[\d.]+/g) ?? []).map(Number);
      const fundo = (elemento: Element | null): number[] => {
        if (!elemento) return [255, 255, 255];
        const estilo = getComputedStyle(elemento);
        const cor = rgb(estilo.backgroundColor);
        if ((cor[3] ?? 1) === 1) return cor;
        const base = fundo(elemento.parentElement);
        return cor
          .slice(0, 3)
          .map((canal, indice) => canal * (cor[3] ?? 1) + base[indice] * (1 - (cor[3] ?? 1)));
      };
      const luminancia = (cor: number[]) =>
        cor
          .slice(0, 3)
          .map((canal) => {
            const s = canal / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          })
          .reduce((soma, canal, indice) => soma + canal * [0.2126, 0.7152, 0.0722][indice], 0);
      const texto = rgb(getComputedStyle(alvo).color);
      const plano = fundo(alvo);
      const [maior, menor] = [luminancia(texto), luminancia(plano)].sort((a, b) => b - a);
      const corFoco = rgb(getComputedStyle(alvo).outlineColor);
      const [maiorFoco, menorFoco] = [luminancia(corFoco), luminancia(plano)].sort((a, b) => b - a);
      return {
        razao: (maior + 0.05) / (menor + 0.05),
        razaoFoco: (maiorFoco + 0.05) / (menorFoco + 0.05),
        larguraFoco: getComputedStyle(alvo).outlineWidth,
        decoracao: getComputedStyle(alvo).textDecorationLine,
      };
    });

  for (const tema of ['dark', 'light']) {
    await page.goto('/vendas');
    if (tema === 'light')
      await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', tema);

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    const links = [
      nav.getByRole('link', { name: 'Visão Geral', exact: true }),
      nav.getByRole('link', { name: 'Vendas', exact: true }),
      nav.getByRole('link', { name: 'Quitadas', exact: true }),
      nav.getByRole('link', { name: 'Relatórios', exact: true }),
      nav.getByRole('link', { name: 'Configurações', exact: true }),
      page.getByRole('link', { name: 'Atalho para Configurações', exact: true }),
      page
        .getByRole('table')
        .getByRole('link', { name: /Abrir detalhes da venda/ })
        .first(),
      page
        .getByRole('table')
        .getByRole('link', { name: /Visualizar venda/ })
        .first(),
    ];
    for (const link of links) {
      const normal = await medirContraste(link);
      expect(normal.razao).toBeGreaterThanOrEqual(4.5);
      expect(normal.decoracao).toBe('none');
      await link.hover();
      expect((await medirContraste(link)).decoracao).toContain('underline');
      await page.mouse.move(
        await page.evaluate(() => innerWidth - 1),
        await page.evaluate(() => innerHeight - 1),
      );
      await link.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(link).toBeFocused();
      const foco = await medirContraste(link);
      expect(foco.razao).toBeGreaterThanOrEqual(4.5);
      expect(foco.larguraFoco).toBe('3px');
      if (!(await link.evaluate((elemento) => elemento.closest('.barra-lateral'))))
        expect(foco.razaoFoco).toBeGreaterThanOrEqual(3);
      expect(foco.decoracao).toContain('underline');
    }

    const ativo = page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Vendas', exact: true });
    await expect(ativo).toHaveAttribute('aria-current', 'page');
    expect((await medirContraste(ativo)).razao).toBeGreaterThanOrEqual(4.5);
    expect((await medirContraste(ativo)).decoracao).toBe('none');
    const lateral = page.locator('.barra-lateral');
    const perfil = page.locator('.perfil');
    const cliente = page
      .getByRole('table')
      .getByRole('link', { name: /Abrir detalhes da venda/ })
      .first();
    const visualizar = page
      .getByRole('table')
      .getByRole('link', { name: /Visualizar venda/ })
      .first();
    const destinos = [
      { nome: 'menu', elemento: nav.getByRole('link', { name: 'Vendas', exact: true }) },
      {
        nome: 'perfil',
        elemento: page.getByRole('link', { name: 'Atalho para Configurações', exact: true }),
      },
      { nome: 'cliente', elemento: cliente },
      { nome: 'Visualizar', elemento: visualizar },
    ];
    const capturas = [];
    for (const destino of destinos) {
      const medida = await medirContraste(destino.elemento);
      capturas.push({ link: destino.nome, razaoContraste: Number(medida.razao.toFixed(2)) });
    }
    await page
      .screenshot({ fullPage: true, animations: 'disabled' })
      .then((imagem) =>
        testInfo.attach(`consulta-${tema}-links`, { body: imagem, contentType: 'image/png' }),
      );
    console.log(`Links ${tema}: ${JSON.stringify(capturas)}`);

    await page.goto('/vendas/quitadas');
    const quitadasAtiva = page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Quitadas', exact: true });
    await expect(quitadasAtiva).toHaveAttribute('aria-current', 'page');
    const estiloQuitadas = await quitadasAtiva.evaluate((elemento) => ({
      peso: getComputedStyle(elemento).fontWeight,
      decoracao: getComputedStyle(elemento).textDecorationLine,
      fundo: getComputedStyle(elemento).backgroundColor,
    }));
    expect(estiloQuitadas.peso).toBe('700');
    expect(estiloQuitadas.decoracao).toBe('none');
    expect(estiloQuitadas.fundo).not.toBe('rgba(0, 0, 0, 0)');
    expect((await medirContraste(quitadasAtiva)).razao).toBeGreaterThanOrEqual(4.5);

    await page.goto('/vendas/seed%2Fvenda%2F1');
    const retornos = page.getByRole('navigation', { name: 'Retornos de Vendas' }).getByRole('link');
    for (let indice = 0; indice < (await retornos.count()); indice++) {
      const retorno = retornos.nth(indice);
      const medida = await medirContraste(retorno);
      expect(medida.razao).toBeGreaterThanOrEqual(4.5);
      expect(medida.decoracao).toBe('none');
      await retorno.hover();
      expect((await medirContraste(retorno)).decoracao).toContain('underline');
      await page.mouse.move(0, 0);
      await retorno.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(retorno).toBeFocused();
      const focoRetorno = await medirContraste(retorno);
      expect(focoRetorno.razao).toBeGreaterThanOrEqual(4.5);
      expect(focoRetorno.razaoFoco).toBeGreaterThanOrEqual(3);
      expect(focoRetorno.decoracao).toContain('underline');
    }
    expect(await lateral.count()).toBe(1);
    expect(await perfil.count()).toBe(1);
  }
});

test('abre e recarrega cada destino sem aviso global e com localização', async ({ page }) => {
  for (const [rota, titulo] of destinos) {
    await page.goto(rota);
    for (const recarregar of [false, true]) {
      if (recarregar) await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
      await expect(page).toHaveTitle(`${titulo} | ${produto}`);
      await expect(page.getByText(produto, { exact: true })).toBeVisible();
      await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
      await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  }
});

test('orienta foco por teclado, atalho, histórico e retorno de caminho desconhecido', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  for (const [nome, titulo] of [
    ['Vendas', 'Vendas'],
    ['Quitadas', 'Vendas quitadas'],
    ['Relatórios', 'Relatórios'],
    ['Configurações', 'Configurações'],
    ['Visão Geral', 'Visão Geral'],
  ]) {
    const link = nav.getByRole('link', { name: nome, exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeFocused();
  }
  const ativo = nav.getByRole('link', { name: 'Visão Geral', exact: true });
  await ativo.focus();
  await page.keyboard.press('Enter');
  await expect(ativo).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeFocused();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão Geral' })).toBeFocused();
  await page.goto('/caminho-desconhecido');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
  await page.getByRole('link', { name: 'Voltar para Visão Geral' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // Cliques rápidos não devem focar um título obsoleto de página lazy.
  await nav.getByRole('link', { name: 'Vendas', exact: true }).click();
  await nav.getByRole('link', { name: 'Relatórios', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeFocused();
});

test('declara pt-BR e permite ler o título sem corte horizontal', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);

  const leitura = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const elementos = Array.from(document.querySelectorAll('h1'));
    return {
      semRolagemHorizontal: document.documentElement.scrollWidth <= largura,
      textosDentroDaTela: elementos.every((elemento) => {
        const faixa = document.createRange();
        faixa.selectNodeContents(elemento);
        return Array.from(faixa.getClientRects()).every(
          (retangulo) => retangulo.left >= 0 && retangulo.right <= largura,
        );
      }),
      estilosAplicados:
        getComputedStyle(document.querySelector('.barra-lateral')!).display === 'flex',
    };
  });
  expect(leitura).toEqual({
    semRolagemHorizontal: true,
    textosDentroDaTela: true,
    estilosAplicados: true,
  });
});

test('abre e recarrega em contexto limpo sem dados externos ou persistência', async ({
  page,
  context,
  baseURL,
}) => {
  const origemLocal = new URL(baseURL!).origin;
  const redeIndevida: string[] = [];
  page.on('request', (requisicao) => {
    const url = new URL(requisicao.url());
    if (
      url.origin !== origemLocal ||
      requisicao.method() !== 'GET' ||
      ['fetch', 'xhr', 'eventsource'].includes(requisicao.resourceType())
    ) {
      redeIndevida.push(`${requisicao.resourceType()} ${requisicao.method()} ${url.href}`);
    }
  });
  page.on('websocket', (conexao) => {
    const url = new URL(conexao.url());
    const servidor = new URL(origemLocal);
    // Única exceção: canal WebSocket local do servidor de desenvolvimento Vite.
    if (url.protocol !== 'ws:' || url.host !== servidor.host || url.pathname !== '/') {
      redeIndevida.push(`websocket ${url.href}`);
    }
  });

  expect(await context.cookies()).toEqual([]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
  for (const [rota, titulo] of [...destinos, ['/desconhecida', 'Página não encontrada']]) {
    if (rota === '/desconhecida') {
      // Caminho não oferecido pelo menu: evento de histórico sem recarregar a aplicação.
      await page.evaluate((url) => {
        history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, rota);
    } else {
      await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .locator(`a[href="${rota}"]`)
        .click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
    await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'light');
    await expect(page.getByTestId('aviso-demonstracao')).toHaveCount(0);
    await page.waitForLoadState('networkidle');

    expect(await context.cookies()).toEqual([]);
    const armazenamento = await page.evaluate(async () => ({
      local: localStorage.length,
      sessao: sessionStorage.length,
      bancos: await indexedDB.databases(),
      caches: await caches.keys(),
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
    }));
    expect(armazenamento).toEqual({
      local: 0,
      sessao: 0,
      bancos: [],
      caches: [],
      serviceWorkers: 0,
    });
  }
  await page.reload();
  await expect(page.locator('app-root')).toHaveAttribute('data-tema', 'dark');
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(redeIndevida, 'Somente recursos locais e canal de desenvolvimento').toEqual([]);
});
