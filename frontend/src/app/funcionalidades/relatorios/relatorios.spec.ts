import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { PagamentoDemonstrativo } from '../parcelas/pagamento.modelos';
import { ProjecaoVenda } from '../vendas/venda.calculos';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';

const referencia = '2027-03-31';

function parcela(
  id: string,
  numero: number,
  vencimento: string,
  situacao: ProjecaoParcela['situacao'],
  valorCentavos = 100,
): ProjecaoParcela {
  return {
    id,
    numero,
    vencimento,
    situacao,
    valorCentavos,
    dataPagamento: situacao === 'Paga' ? vencimento : null,
    formaPagamento: situacao === 'Paga' ? 'Pix' : null,
  };
}

function venda(
  id: string,
  dataVenda = '2027-03-01',
  options: {
    readonly cliente?: Partial<ProjecaoVenda['cliente']>;
    readonly entrada?: ProjecaoVenda['entrada'];
    readonly recebimentos?: readonly PagamentoDemonstrativo[];
    readonly parcelas?: readonly ProjecaoParcela[];
    readonly saldo?: number;
    readonly statusAdministrativo?: ProjecaoVenda['statusAdministrativo'];
    readonly situacao?: ProjecaoVenda['situacao'];
    readonly total?: number;
    readonly totalEfetivo?: number;
  } = {},
): ProjecaoVenda {
  return {
    id,
    statusAdministrativo: options.statusAdministrativo ?? 'Ativo',
    cliente: {
      nome: `Cliente ${id}`,
      cpf: '90000000175',
      telefone: '00900000001',
      descricao: null,
      ...options.cliente,
    },
    dataVenda,
    valorTotalCentavos: options.total ?? 1000,
    valorTotalEfetivoCentavos: options.totalEfetivo ?? options.total ?? 1000,
    entrada: options.entrada ?? null,
    recebimentos: options.recebimentos ?? [],
    parcelas: options.parcelas ?? [],
    totalPagoCentavos: 0,
    saldoCentavos: options.saldo ?? 1000,
    quantidadePaga: options.situacao === 'Quitada' ? 1 : 0,
    proximoVencimento: null,
    situacao: options.situacao ?? 'Em aberto',
  };
}

function pagamento(
  id: string,
  data: string,
  valorCentavos: number,
  parcelaId = `parcela/${id}`,
): PagamentoDemonstrativo {
  return {
    id,
    data,
    forma: 'Pix',
    valorCentavos,
    alocacoes: [{ parcelaId, valorCentavos }],
  };
}

function texto(elemento: Element): string {
  return (elemento.textContent ?? '').replaceAll('\u00a0', ' ');
}

describe('Relatórios', () => {
  const vendas = signal<readonly ProjecaoVenda[]>([]);

  beforeEach(() => {
    vendas.set([]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ServicoDemonstracao, useValue: { referencia, vendas } },
      ],
    });
  });

  it('identifica mês e posição na referência, com totais zero e estados vazios por seção', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const conteudo = texto(pagina);

    expect(conteudo).toContain('01/03/2027 a 31/03/2027');
    expect(conteudo).toContain('Referência: 31/03/2027');
    expect(conteudo).toContain('Nenhum recebimento neste mês.');
    expect(conteudo).toContain('Nenhuma venda cadastrada neste mês.');
    expect(conteudo).toContain('Nenhuma parcela em aberto nesta referência.');
    expect(conteudo).toContain('Nenhuma parcela vencida nesta referência.');
    expect(conteudo).toContain('Nenhuma parcela pendente em contratos em Prejuízo.');
    expect(conteudo).toContain('Recebimentos no mês');
    expect(conteudo).toContain('Parcelas em aberto');
    expect(conteudo).toContain('R$ 0,00');
    expect(pagina.querySelectorAll('table')).toHaveLength(0);
    expect(pagina.querySelectorAll('[aria-label="Indicadores financeiros globais"]')).toHaveLength(
      0,
    );
    expect(pagina.querySelectorAll('select')).toHaveLength(1);
    expect(pagina.querySelectorAll('input[type="number"]')).toHaveLength(1);
    expect(pagina.querySelectorAll('canvas')).toHaveLength(0);
  });

  it('aplica mês localmente, preserva posições e mantém foco e resultado em seleção inválida', async () => {
    const ativa = venda('movimento', '2027-03-01', {
      recebimentos: [pagamento('marco', '2027-03-20', 350)],
      parcelas: [parcela('pendente', 1, '2027-02-01', 'Atrasado', 650)],
      saldo: 650,
    });
    vendas.set([ativa]);
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const seletorMes = pagina.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    const campoAno = pagina.querySelector<HTMLInputElement>('#ano-relatorio')!;
    const aplicar = pagina.querySelector<HTMLButtonElement>('button')!;
    const posicaoAntes = pagina.querySelector(
      '[aria-label="Tabela de parcelas vencidas"]',
    )!.textContent;
    const urlAntes = TestBed.inject(Router).url;
    const armazenamentoAntes = [localStorage.length, sessionStorage.length];

    seletorMes.value = '6';
    seletorMes.dispatchEvent(new Event('change'));
    campoAno.value = '2027';
    campoAno.dispatchEvent(new Event('input'));
    aplicar.focus();
    aplicar.click();
    harness.detectChanges();

    expect(texto(pagina)).toContain('01/06/2027 a 30/06/2027');
    expect(texto(pagina)).toContain('Nenhum recebimento neste mês.');
    expect(texto(pagina)).toContain('Nenhuma venda cadastrada neste mês.');
    expect(pagina.querySelector('[aria-label="Tabela de parcelas vencidas"]')!.textContent).toBe(
      posicaoAntes,
    );
    expect(aplicar).toBe(document.activeElement);
    expect(TestBed.inject(Router).url).toBe(urlAntes);
    expect([localStorage.length, sessionStorage.length]).toEqual(armazenamentoAntes);

    for (const ano of ['', '0', '10000', '2027.5']) {
      campoAno.value = ano;
      campoAno.dispatchEvent(new Event('input'));
      aplicar.focus();
      aplicar.click();
      harness.detectChanges();
      expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
        'Informe um mês e um ano inteiro entre 1 e 9999.',
      );
      expect(texto(pagina)).toContain('01/06/2027 a 30/06/2027');
      expect(aplicar).toBe(document.activeElement);
    }

    seletorMes.value = '';
    seletorMes.dispatchEvent(new Event('change'));
    aplicar.focus();
    aplicar.click();
    harness.detectChanges();
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Informe um mês e um ano inteiro entre 1 e 9999.',
    );
    expect(texto(pagina)).toContain('01/06/2027 a 30/06/2027');
  });

  it('reinicia a seleção mensal ao recriar a página sem persistir preferência', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const seletor = () =>
      harness.routeNativeElement!.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    const ano = () =>
      harness.routeNativeElement!.querySelector<HTMLInputElement>('#ano-relatorio')!;
    const aplicar = () => harness.routeNativeElement!.querySelector<HTMLButtonElement>('button')!;
    expect(seletor().value).toBe('3');

    seletor().value = '12';
    seletor().dispatchEvent(new Event('change'));
    ano().value = '2028';
    ano().dispatchEvent(new Event('input'));
    aplicar().click();
    harness.detectChanges();
    expect(texto(harness.routeNativeElement!)).toContain('01/12/2028 a 31/12/2028');

    await harness.navigateByUrl('/configuracoes');
    await harness.navigateByUrl('/relatorios');
    expect(seletor().value).toBe('3');
    expect(ano().value).toBe('2027');
    expect(texto(harness.routeNativeElement!)).toContain('01/03/2027 a 31/03/2027');
  });

  it('apresenta todas as linhas, preserva IDs opacos e distingue movimentos mensais da posição', async () => {
    const id = 'venda/com/barras';
    const primeira = venda(id, '2027-02-28', {
      entrada: { data: '2027-02-28', forma: 'Dinheiro', valorCentavos: 200 },
      recebimentos: [
        pagamento('entrada', '2027-02-28', 200, 'parcela/entrada'),
        pagamento('lote/marco', '2027-03-31', 300),
      ],
      parcelas: [
        parcela('parcela/entrada', 1, '2027-02-28', 'Paga', 200),
        parcela('atrasada', 2, '2027-03-30', 'Atrasado', 300),
      ],
      saldo: 500,
    });
    const vendasDoMes = Array.from({ length: 6 }, (_, indice) =>
      venda(`mes/${indice}`, `2027-03-${String(indice + 1).padStart(2, '0')}`, {
        entrada: {
          data: `2027-03-${String(indice + 1).padStart(2, '0')}`,
          forma: 'Pix',
          valorCentavos: 10,
        },
        recebimentos: [
          pagamento(
            `entrada/${indice}`,
            `2027-03-${String(indice + 1).padStart(2, '0')}`,
            10,
            `parcela/entrada/${indice}`,
          ),
        ],
        parcelas: [
          parcela(
            `parcela/entrada/${indice}`,
            1,
            `2027-03-${String(indice + 1).padStart(2, '0')}`,
            'Paga',
            10,
          ),
        ],
        saldo: 100,
      }),
    );
    vendas.set([primeira, ...vendasDoMes]);
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;

    const recebimentos = pagina.querySelector(
      '[aria-label="Tabela de recebimentos no mês"] table',
    )!;
    const tabelaVendas = pagina.querySelector('[aria-label="Tabela de vendas do mês"] table')!;
    const saldos = pagina.querySelector('[aria-label="Tabela de parcelas em aberto"] table')!;
    const atrasadas = pagina.querySelector('[aria-label="Tabela de parcelas vencidas"] table')!;
    expect(recebimentos.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(tabelaVendas.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(saldos.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(atrasadas.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(recebimentos.textContent).toContain('Lote');
    expect(recebimentos.textContent).toContain('Cliente venda/com/barras');
    expect(tabelaVendas.textContent).not.toContain('Cliente venda/com/barras');
    expect(saldos.textContent).toContain('Cliente venda/com/barras');
    expect(atrasadas.textContent).toContain('Cliente venda/com/barras');
    expect(saldos.textContent).toContain('90000000175');
    expect(saldos.textContent).toContain('00900000001');
    expect(saldos.textContent).toContain('30/03/2027');
    expect(saldos.querySelectorAll('thead th')).toHaveLength(6);
    expect(atrasadas.querySelectorAll('thead th')).toHaveLength(6);
    expect(texto(pagina)).toContain('6 vendas');

    const link = recebimentos.querySelector<HTMLAnchorElement>('tbody a')!;
    const router = TestBed.inject(Router);
    expect(link.getAttribute('href')).toBe(
      router.serializeUrl(router.createUrlTree(['/vendas', id])),
    );
  });

  it('apresenta identificação, vencimentos ordenados e Prejuízo com exclusões explícitas do total', async () => {
    const ativaProxima = venda('ativa-proxima', '2027-03-01', {
      cliente: { nome: 'Cliente Alfa', cpf: '111.111.111-11', telefone: '(11) 90000-0001' },
      parcelas: [parcela('proxima-atrasada', 1, '2027-03-10', 'Atrasado', 1000)],
      saldo: 1000,
    });
    const ativaEmpatada = venda('ativa-empatada', '2027-03-02', {
      cliente: { nome: 'Cliente Beta', cpf: '222.222.222-22', telefone: '(22) 90000-0002' },
      parcelas: [parcela('empatada-atrasada', 1, '2027-03-10', 'Atrasado', 1000)],
      saldo: 1000,
    });
    const ativaMaisDistante = venda('ativa-distante', '2027-03-03', {
      cliente: { nome: 'Cliente Gama', cpf: '333.333.333-33', telefone: '(33) 90000-0003' },
      recebimentos: [pagamento('pagamento-individual', '2027-03-15', 300, 'paga-base')],
      parcelas: [
        parcela('paga-base', 1, '2027-03-03', 'Paga', 200),
        parcela('atrasada-distante', 2, '2027-03-20', 'Atrasado', 300),
        parcela('pendente-distante', 3, '2027-04-10', 'Aberto', 500),
      ],
      saldo: 800,
      total: 1000,
      totalEfetivo: 1100,
    });
    const prejuizoSemPagamento = venda('prejuizo-sem-pagamento', '2027-02-01', {
      statusAdministrativo: 'Prejuízo',
      cliente: { nome: 'Cliente Delta', cpf: '444.444.444-44', telefone: '(44) 90000-0004' },
      parcelas: [
        parcela('prejuizo-base-1', 1, '2027-02-01', 'Atrasado', 400),
        parcela('prejuizo-base-2', 2, '2027-03-01', 'Atrasado', 600),
      ],
      saldo: 1000,
    });
    const prejuizoComEntrada = venda('prejuizo-com-entrada', '2027-02-02', {
      statusAdministrativo: 'Prejuízo',
      cliente: { nome: 'Cliente Épsilon', cpf: '555.555.555-55', telefone: '(55) 90000-0005' },
      entrada: { data: '2027-02-02', forma: 'Pix', valorCentavos: 200 },
      recebimentos: [pagamento('entrada-prejuizo', '2027-02-02', 200, 'entrada-paga')],
      parcelas: [
        parcela('entrada-paga', 1, '2027-02-02', 'Paga', 200),
        parcela('pendente-entrada', 2, '2027-03-02', 'Atrasado', 800),
      ],
      saldo: 800,
    });
    vendas.set([
      ativaMaisDistante,
      ativaProxima,
      ativaEmpatada,
      prejuizoSemPagamento,
      prejuizoComEntrada,
    ]);

    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const tabela = (nome: string) => pagina.querySelector(`[aria-label="${nome}"] table`)!;
    const linhasPorTexto = (seletor: string) => [
      ...pagina.querySelectorAll<HTMLTableRowElement>(`${seletor} tbody tr`),
    ];
    const linhasSaldo = linhasPorTexto('[aria-label="Tabela de parcelas em aberto"]');

    expect(linhasSaldo.map((linha) => linha.cells[1].textContent?.trim())).toEqual([
      'Cliente Alfa',
      'Cliente Beta',
      'Cliente Gama',
    ]);
    expect(linhasSaldo.map((linha) => linha.cells[4].textContent?.trim())).toEqual([
      '10/03/2027',
      '10/03/2027',
      '20/03/2027',
    ]);
    expect(linhasSaldo[0].textContent).toContain('111.111.111-11');
    expect(linhasSaldo[0].textContent).toContain('(11) 90000-0001');
    const router = TestBed.inject(Router);
    expect(linhasSaldo[0].querySelector('a')?.getAttribute('href')).toBe(
      router.serializeUrl(router.createUrlTree(['/vendas', 'ativa-proxima'])),
    );
    expect(linhasSaldo[0].querySelector('a')?.getAttribute('aria-label')).toContain(
      'ativa-proxima',
    );

    const linhasAtrasadas = linhasPorTexto('[aria-label="Tabela de parcelas vencidas"]');
    expect(linhasAtrasadas.map((linha) => linha.cells[4].textContent?.trim())).toEqual([
      '10/03/2027',
      '10/03/2027',
      '20/03/2027',
    ]);
    expect(linhasAtrasadas.every((linha) => linha.cells.length === 6)).toBe(true);

    const secaoPrejuizo = pagina.querySelector('[aria-labelledby="prejuizo-relatorio"]')!;
    const tabelaPrejuizo = pagina.querySelector(
      '[aria-label="Tabela de parcelas em Prejuízo"] table',
    )!;
    const linhasPrejuizo = [...tabelaPrejuizo.querySelectorAll<HTMLTableRowElement>('tbody tr')];
    expect(linhasPrejuizo).toHaveLength(3);
    expect(linhasPrejuizo[0].cells[7].textContent).toContain('Incluída no total');
    expect(linhasPrejuizo[1].cells[7].textContent).toContain('Incluída no total');
    expect(linhasPrejuizo[2].cells[7].textContent).toContain('Fora do total: recebimento anterior');
    expect(texto(secaoPrejuizo.querySelector('strong')!)).toContain('R$ 10,00');
    expect(linhasPrejuizo[2].querySelector('a')?.getAttribute('href')).toBe(
      router.serializeUrl(router.createUrlTree(['/vendas', 'prejuizo-com-entrada'])),
    );

    const regiao = pagina.querySelector('[aria-label="Tabela de parcelas em aberto"]')!;
    expect(regiao.getAttribute('tabindex')).toBe('0');
    expect(regiao.getAttribute('aria-describedby')).toBe('orientacao-saldos-relatorio');
    expect(pagina.querySelector('#orientacao-saldos-relatorio')?.textContent).toContain(
      'setas do teclado',
    );
    expect(tabela('Tabela de vendas do mês').querySelector('thead')?.textContent).toContain(
      'Valor total efetivo',
    );
    const vendaComAcrescimo = [
      ...tabela('Tabela de vendas do mês').querySelectorAll('tbody tr'),
    ].find((linha) => linha.textContent?.includes('Cliente Gama'));
    expect(texto(vendaComAcrescimo!)).toContain('R$ 11,00');
  });

  it('recalcula após publicação recebida e edição, sem mudar valores ao apenas consultar', async () => {
    const vendaInicial = venda('sessao/1', '2027-03-01', {
      recebimentos: [pagamento('lote/1', '2027-03-15', 200)],
      parcelas: [parcela('p1', 1, '2027-03-30', 'Atrasado', 200)],
      saldo: 800,
    });
    vendas.set([vendaInicial]);
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    expect(texto(pagina)).toContain('R$ 2,00');
    const original = vendas();

    // Consulta e navegação são somente leitura; uma publicação rejeitada não substitui a fonte.
    harness.detectChanges();
    expect(vendas()).toBe(original);
    expect(texto(pagina)).toContain('R$ 2,00');

    // Publicação aceita de novo lote e edição do rótulo atualizam projeção sem trocar referência.
    const atualizada = venda('sessao/1', '2027-03-01', {
      recebimentos: [
        pagamento('lote/1', '2027-03-15', 200),
        pagamento('lote/2', '2027-03-31', 300),
      ],
      parcelas: [parcela('p1', 1, '2027-03-30', 'Paga', 200)],
      saldo: 500,
    });
    vendas.set([{ ...atualizada, cliente: { ...atualizada.cliente, nome: 'Cliente editado' } }]);
    harness.detectChanges();
    expect(texto(pagina)).toContain('R$ 5,00');
    expect(texto(pagina)).toContain('Cliente editado');
    expect(texto(pagina)).toContain('Nenhuma parcela vencida nesta referência.');
    expect(texto(pagina)).toContain('Referência: 31/03/2027');
  });

  it('recalcula as coleções após inativar, reativar e marcar Prejuízo sem duplicar recebimentos', async () => {
    const inativa = venda('status/financeiro', '2027-03-01', {
      statusAdministrativo: 'Inativo',
      recebimentos: [pagamento('recibo-unico', '2027-03-15', 200, 'parcela-paga')],
      parcelas: [
        parcela('parcela-paga', 1, '2027-03-01', 'Paga', 200),
        parcela('parcela-pendente', 2, '2027-04-01', 'Aberto', 800),
      ],
      saldo: 800,
    });
    vendas.set([inativa]);
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = () => harness.routeNativeElement!;
    const tabela = (nome: string) => pagina().querySelector(`[aria-label="${nome}"] table`);

    expect(tabela('Tabela de recebimentos no mês')?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(tabela('Tabela de vendas do mês')).toBeNull();
    expect(tabela('Tabela de parcelas em aberto')).toBeNull();
    expect(texto(pagina())).toContain('Nenhuma venda cadastrada neste mês.');

    vendas.set([{ ...inativa, statusAdministrativo: 'Ativo' }]);
    harness.detectChanges();
    expect(tabela('Tabela de recebimentos no mês')?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(tabela('Tabela de vendas do mês')?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(tabela('Tabela de parcelas em aberto')?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(texto(pagina())).toContain('R$ 2,00');

    vendas.set([{ ...inativa, statusAdministrativo: 'Prejuízo' }]);
    harness.detectChanges();
    expect(tabela('Tabela de recebimentos no mês')?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(tabela('Tabela de vendas do mês')).toBeNull();
    expect(tabela('Tabela de parcelas em aberto')).toBeNull();
    expect(texto(pagina())).toContain('Nenhuma venda cadastrada neste mês.');
    expect(texto(pagina())).toContain('R$ 2,00');
  });

  it('explica a exportação indisponível e anuncia a ação sem gerar arquivo', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const botao = pagina.querySelector<HTMLButtonElement>(
      'button[aria-describedby="indisponibilidade-exportacao"]',
    )!;
    expect(botao.textContent).toContain('Exportar relatório');
    expect(botao.getAttribute('aria-describedby')).toBe('indisponibilidade-exportacao');
    expect(pagina.querySelector('#indisponibilidade-exportacao')?.textContent).toContain(
      'Exportação não disponível no protótipo.',
    );
    expect(pagina.querySelector('[role="status"]')).toBeNull();

    botao.click();
    harness.detectChanges();
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain(
      'A exportação de relatórios não está disponível no protótipo.',
    );
    expect(pagina.querySelectorAll('a[download]')).toHaveLength(0);
  });
});
