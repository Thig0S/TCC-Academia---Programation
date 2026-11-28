import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { ControleConsultas } from '../../nucleo/dados/controle-consultas';
import { FONTE_VENDAS, FonteVendas } from '../../nucleo/dados/fonte-vendas';
import {
  ParcelaLeitura,
  RelatorioMensalLeitura,
  VendaResumoLeitura,
} from '../../nucleo/dados/modelos-leitura';

const referencia = '2027-03-31';

function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) {
    const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
    return bissexto ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

function dataDoMes(mes: string, dia: number): string {
  const [ano, numeroMes] = mes.split('-').map(Number);
  return `${String(ano).padStart(4, '0')}-${String(numeroMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function vendaResumo(
  id: string,
  nome: string,
  substituicoes: Partial<VendaResumoLeitura> = {},
): VendaResumoLeitura {
  return {
    id,
    cliente: {
      nome,
      cpf: '90000000175',
      telefone: '00900000001',
      descricao: null,
    },
    dataVenda: '2027-03-05',
    statusAdministrativo: 'Ativo',
    situacao: 'Em aberto',
    valorTotalCentavos: 10000,
    acrescimosCentavos: 500,
    valorTotalEfetivoCentavos: 10500,
    totalRecebidoCentavos: 2000,
    saldoCentavos: 8500,
    quantidadePaga: 1,
    quantidadeParcelas: 3,
    proximoVencimento: null,
    revisao: '9007199254740993',
    referencia,
    ...substituicoes,
  };
}

function parcelaLeitura(
  id: string,
  vencimento: string,
  situacao: ParcelaLeitura['situacao'],
  valorBaseCentavos = 321,
): ParcelaLeitura {
  return {
    id,
    numero: 2,
    valorBaseCentavos,
    acrescimoCentavos: 79,
    valorEfetivoCentavos: valorBaseCentavos + 79,
    valorRecebidoCentavos: 0,
    saldoCentavos: valorBaseCentavos + 79,
    vencimento,
    situacao,
    dataPagamento: null,
    formaPagamento: null,
  };
}

function relatorioMensal(
  mes = '2027-03-01',
  opcoes: { readonly vazioMensal?: boolean; readonly referencia?: string } = {},
): RelatorioMensalLeitura {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const fimMes = dataDoMes(mes, diasNoMes(ano, numeroMes));
  const resumo = vendaResumo('venda/com/barras', 'Cliente literal', {
    dataVenda: mes,
    referencia: opcoes.referencia ?? referencia,
  });
  const mensalVazio = opcoes.vazioMensal ?? false;

  return {
    referencia: opcoes.referencia ?? referencia,
    revisao: '9223372036854775807',
    inicioMes: mes,
    fimMes,
    recebimentos: mensalVazio
      ? []
      : [
          {
            id: 'entrada/1',
            venda: resumo,
            origem: 'Entrada',
            data: dataDoMes(mes, 1),
            forma: 'Dinheiro',
            valorCentavos: 100,
          },
          {
            id: 'lote/2',
            venda: resumo,
            origem: 'Lote',
            data: dataDoMes(mes, Math.min(10, diasNoMes(ano, numeroMes))),
            forma: 'Cartão de débito',
            valorCentavos: 200,
          },
          {
            id: 'individual/3',
            venda: resumo,
            origem: 'Individual',
            data: fimMes,
            forma: 'Pix',
            valorCentavos: 300,
          },
        ],
    recebimentosDiarios: Array.from({ length: diasNoMes(ano, numeroMes) }, (_, indice) => ({
      data: dataDoMes(mes, indice + 1),
      totalCentavos: mensalVazio ? 0 : indice === 0 ? 125 : indice === 9 ? 250 : 0,
    })),
    vendasDoMes: mensalVazio ? [] : [resumo],
    saldos: [
      {
        venda: resumo,
        saldoCentavos: 456,
        primeiroVencimentoPendente: null,
      },
      {
        venda: vendaResumo('venda/vencimento', 'Cliente vencimento', {
          referencia: opcoes.referencia ?? referencia,
        }),
        saldoCentavos: 123,
        primeiroVencimentoPendente: '2027-03-30',
      },
    ],
    parcelasAtrasadas: [
      {
        venda: resumo,
        parcela: parcelaLeitura('atrasada/1', '2027-03-01', 'Atrasado', 321),
      },
    ],
    parcelasPrejuizo: [
      {
        venda: vendaResumo('venda/prejuizo', 'Cliente Prejuízo', {
          statusAdministrativo: 'Prejuízo',
          referencia: opcoes.referencia ?? referencia,
        }),
        parcela: parcelaLeitura('prejuizo/1', '2027-02-01', 'Atrasado', 654),
        incluirNoTotal: true,
      },
      {
        venda: vendaResumo('venda/prejuizo-com-recebimento', 'Cliente com recebimento', {
          statusAdministrativo: 'Prejuízo',
          referencia: opcoes.referencia ?? referencia,
        }),
        parcela: parcelaLeitura('prejuizo/2', '2027-02-02', 'Atrasado', 987),
        incluirNoTotal: false,
      },
    ],
    // Totais da resposta são deliberadamente independentes das linhas da fixture:
    // a tela deve apresentá-los, não recalculá-los no browser.
    totalRecebidoCentavos: mensalVazio ? 0 : 9999,
    quantidadeVendasMes: mensalVazio ? 0 : 7,
    totalVendasMesCentavos: mensalVazio ? 0 : 8888,
    totalEmAbertoCentavos: 7777,
    totalAtrasadoCentavos: 6666,
    totalPrejuizoCentavos: 5555,
  };
}

function criarFonte(
  consultarRelatorioMensal: (mes: string) => Observable<RelatorioMensalLeitura>,
): FonteVendas {
  return {
    referencia,
    consultarColecao: vi.fn(),
    consultarVenda: vi.fn(),
    consultarVisaoGeral: vi.fn(),
    consultarRelatorioMensal: vi.fn(consultarRelatorioMensal),
    cadastrarVenda: vi.fn(),
    editarCliente: vi.fn(),
    alterarStatus: vi.fn(),
    registrarPagamento: vi.fn(),
    corrigirPagamento: vi.fn(),
  } as unknown as FonteVendas;
}

function texto(elemento: Element): string {
  return (elemento.textContent ?? '').replaceAll('\u00a0', ' ');
}

function linksDaTabela(pagina: Element, nome: string): HTMLAnchorElement[] {
  return [...pagina.querySelectorAll<HTMLAnchorElement>(`[aria-label="${nome}"] tbody a`)];
}

describe('Relatórios integrados à fonte mensal', () => {
  let fonte: FonteVendas;

  beforeEach(() => {
    fonte = criarFonte((mes) => of(relatorioMensal(mes)));
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: FONTE_VENDAS, useFactory: () => fonte }],
    });
  });

  it('renderiza os cinco painéis, totais wire, origens, IDs opacos e posição literal', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const conteudo = texto(pagina);

    expect(fonte.consultarRelatorioMensal).toHaveBeenCalledTimes(1);
    expect(fonte.consultarRelatorioMensal).toHaveBeenCalledWith('2027-03-01');
    expect(fonte.consultarColecao).not.toHaveBeenCalled();
    expect(fonte.consultarVenda).not.toHaveBeenCalled();
    expect(conteudo).toContain('01/03/2027 a 31/03/2027');
    expect(conteudo).toContain('Referência fixa: 31/03/2027');
    expect(conteudo).toContain('R$ 99,99');
    expect(conteudo).toContain('7 vendas Ativas');
    expect(conteudo).toContain('R$ 88,88');
    expect(conteudo).toContain('R$ 77,77');
    expect(conteudo).toContain('R$ 66,66');
    expect(conteudo).toContain('R$ 55,55');
    expect(conteudo).toContain('R$ 4,56');
    expect(conteudo).toContain('R$ 1,23');
    expect(conteudo).toContain('R$ 3,21');
    expect(conteudo).toContain('R$ 6,54');
    expect(conteudo).toContain('Fora do total: recebimento anterior');
    expect(conteudo).toContain('Não informado');
    expect(
      pagina.querySelectorAll('[aria-label="Totais da movimentação do mês"] article'),
    ).toHaveLength(2);
    expect(pagina.querySelectorAll('[aria-label="Totais da posição atual"] article')).toHaveLength(
      3,
    );

    const detalhes = [...pagina.querySelectorAll<HTMLDetailsElement>('details')];
    expect(detalhes).toHaveLength(5);
    expect(detalhes.every((detalhe) => !detalhe.open)).toBe(true);
    expect(detalhes.map((detalhe) => texto(detalhe.querySelector('summary')!))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Recebimentos no mês'),
        expect.stringContaining('Vendas do mês'),
        expect.stringContaining('Parcelas em aberto'),
        expect.stringContaining('Parcelas vencidas'),
        expect.stringContaining('Prejuízo'),
      ]),
    );

    const recebimentos = pagina.querySelector(
      '[aria-label="Tabela de recebimentos no mês"] table',
    )!;
    expect(recebimentos.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(texto(recebimentos)).toContain('Entrada');
    expect(texto(recebimentos)).toContain('Lote');
    expect(texto(recebimentos)).toContain('Individual');
    expect(recebimentos.textContent).toContain('Cliente literal');
    expect(linksDaTabela(pagina, 'Tabela de recebimentos no mês')[0].getAttribute('href')).toBe(
      TestBed.inject(Router).serializeUrl(
        TestBed.inject(Router).createUrlTree(['/vendas', 'venda/com/barras']),
      ),
    );
    expect(texto(pagina.querySelector('[aria-label="Tabela de parcelas vencidas"]')!)).toContain(
      'R$ 3,21',
    );
    expect(texto(pagina.querySelector('[aria-label="Tabela de parcelas em Prejuízo"]')!)).toContain(
      'R$ 9,87',
    );
  });

  it('preserva todos os dias e a tabela equivalente sem recalcular totais da resposta', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const diaria = pagina.querySelector(
      '[aria-label="Tabela diária equivalente de recebimentos"]',
    )!;
    const linhas = [...diaria.querySelectorAll<HTMLTableRowElement>('tbody tr')];
    const totaisDiarios = linhas.map((linha) => texto(linha.cells[2]));

    expect(linhas).toHaveLength(31);
    expect(linhas[0].cells[1].textContent?.trim()).toBe('01/03/2027');
    expect(linhas[9].cells[1].textContent?.trim()).toBe('10/03/2027');
    expect(linhas[30].cells[1].textContent?.trim()).toBe('31/03/2027');
    expect(totaisDiarios[0]).toContain('R$ 1,25');
    expect(totaisDiarios[9]).toContain('R$ 2,50');
    expect(
      totaisDiarios.reduce(
        (soma, item) => soma + Number(item.match(/R\$\s*([\d,]+)/)?.[1].replace(',', '.') ?? 0),
        0,
      ),
    ).toBe(3.75);
    expect(texto(pagina.querySelector('[aria-label="Totais da movimentação do mês"]')!)).toContain(
      'R$ 99,99',
    );
    expect(pagina.querySelectorAll('svg rect')).toHaveLength(31);
    expect(pagina.querySelector('svg')?.getAttribute('aria-describedby')).toBe(
      'grafico-recebimentos-descricao',
    );
    expect(diaria.getAttribute('tabindex')).toBe('0');
    expect(diaria.querySelector('caption')?.textContent).toContain('valores em BRL');
  });

  it('mantém mês aplicado anterior, painéis abertos e foco durante troca; descarta resposta invertida', async () => {
    const respostas = new Map<string, Subject<RelatorioMensalLeitura>>();
    fonte = criarFonte((mes) => {
      const resposta = new Subject<RelatorioMensalLeitura>();
      respostas.set(mes, resposta);
      return resposta;
    });
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const primeiraResposta = respostas.get('2027-03-01')!;
    const detalhes = [...pagina.querySelectorAll<HTMLDetailsElement>('details')];
    detalhes[0].open = true;
    detalhes[1].open = true;
    const aplicar = pagina.querySelector<HTMLButtonElement>('button')!;
    aplicar.focus();
    expect(primeiraResposta.observed).toBe(true);

    const mes = pagina.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    mes.value = '4';
    mes.dispatchEvent(new Event('change'));
    const ano = pagina.querySelector<HTMLInputElement>('#ano-relatorio')!;
    ano.value = '2027';
    ano.dispatchEvent(new Event('input'));
    aplicar.click();
    await harness.fixture.whenStable();

    expect(fonte.consultarRelatorioMensal).toHaveBeenCalledTimes(2);
    expect(fonte.consultarRelatorioMensal).toHaveBeenLastCalledWith('2027-04-01');
    expect(texto(pagina)).toContain('Carregando o relatório do mês selecionado');
    expect(pagina.querySelector('[aria-label="Totais da movimentação do mês"]')).toBeNull();
    expect(pagina.querySelector('[aria-label="Tabela de recebimentos no mês"] table')).toBeNull();
    expect(texto(pagina)).not.toContain('R$ 99,99');
    expect(detalhes[0].open).toBe(true);
    expect(detalhes[1].open).toBe(true);
    expect(document.activeElement).toBe(aplicar);

    primeiraResposta.next(relatorioMensal('2027-03-01'));
    harness.detectChanges();
    expect(texto(pagina)).not.toContain('R$ 99,99');
    expect(texto(pagina)).toContain('Carregando o relatório do mês selecionado');

    respostas.get('2027-04-01')!.next(relatorioMensal('2027-04-01'));
    await harness.fixture.whenStable();
    expect(texto(pagina)).toContain('01/04/2027 a 30/04/2027');
    expect(texto(pagina)).toContain('R$ 99,99');
    expect(detalhes[0].open).toBe(true);
    expect(detalhes[1].open).toBe(true);
    expect(document.activeElement).toBe(aplicar);
  });

  it('mostra vazio mensal sem substituir posições atuais não vazias', async () => {
    fonte = criarFonte((mes) => of(relatorioMensal(mes, { vazioMensal: mes === '2027-06-01' })));
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const mes = pagina.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    mes.value = '6';
    mes.dispatchEvent(new Event('change'));
    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();

    expect(fonte.consultarRelatorioMensal).toHaveBeenLastCalledWith('2027-06-01');
    expect(texto(pagina)).toContain('01/06/2027 a 30/06/2027');
    expect(texto(pagina)).toContain('Nenhum recebimento neste mês.');
    expect(texto(pagina)).toContain('Nenhuma venda cadastrada neste mês.');
    expect(texto(pagina.querySelector('[aria-label="Totais da posição atual"]')!)).toContain(
      'R$ 77,77',
    );
    expect(
      pagina.querySelector('[aria-label="Tabela de parcelas em aberto"] tbody tr'),
    ).not.toBeNull();
    expect(
      pagina.querySelector('[aria-label="Tabela de parcelas vencidas"] tbody tr'),
    ).not.toBeNull();
    expect(
      pagina.querySelector('[aria-label="Tabela de parcelas em Prejuízo"] tbody tr'),
    ).not.toBeNull();
    expect(texto(pagina)).toContain('Referência fixa: 31/03/2027');
  });

  it.each([
    ['0001', '1', '0001-01-01', '0001-01-31'],
    ['9999', '12', '9999-12-01', '9999-12-31'],
  ])('consulta e renderiza período civil extremo %s', async (ano, mes, inicio, fim) => {
    const chamadas: string[] = [];
    fonte = criarFonte((selecionado) => {
      chamadas.push(selecionado);
      return of(relatorioMensal(selecionado, { referencia }));
    });
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const campoAno = pagina.querySelector<HTMLInputElement>('#ano-relatorio')!;
    campoAno.value = ano;
    campoAno.dispatchEvent(new Event('input'));
    const seletorMes = pagina.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    seletorMes.value = mes;
    seletorMes.dispatchEvent(new Event('change'));
    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();

    expect(chamadas.at(-1)).toBe(inicio);
    expect(texto(pagina)).toContain(`${inicio.slice(8, 10)}/${inicio.slice(5, 7)}/${ano}`);
    expect(
      pagina.querySelector(
        '[aria-label="Tabela diária equivalente de recebimentos"] tbody tr:last-child td:nth-child(2)',
      )?.textContent,
    ).toContain(fim.slice(8, 10));
    expect(
      pagina.querySelectorAll('[aria-label="Tabela diária equivalente de recebimentos"] tbody tr'),
    ).toHaveLength(diasNoMes(Number(ano), Number(mes)));
    expect(texto(pagina)).toContain('Referência fixa: 31/03/2027');
  });

  it('separa falha e vazio, não reapresenta mês anterior e permite repetir por ação explícita', async () => {
    let abrilTentativas = 0;
    fonte = criarFonte((mes) => {
      if (mes === '2027-03-01') return of(relatorioMensal(mes));
      abrilTentativas += 1;
      return abrilTentativas === 1
        ? throwError(() => new Error('API indisponível'))
        : of(relatorioMensal(mes));
    });
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const seletorMes = pagina.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    seletorMes.value = '4';
    seletorMes.dispatchEvent(new Event('change'));
    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();

    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar o relatório do mês selecionado',
    );
    expect(pagina.querySelector('[aria-label="Totais da movimentação do mês"]')).toBeNull();
    expect(pagina.querySelector('[aria-label="Totais da posição atual"]')).toBeNull();
    expect(pagina.querySelector('[aria-label="Tabela de recebimentos no mês"] table')).toBeNull();
    expect(texto(pagina)).not.toContain('R$ 99,99');
    expect(texto(pagina)).not.toContain('Nenhum recebimento neste mês.');
    expect(texto(pagina)).toContain('Aguardando o relatório do mês selecionado.');

    pagina.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await harness.fixture.whenStable();
    expect(fonte.consultarRelatorioMensal).toHaveBeenCalledTimes(3);
    expect(texto(pagina)).toContain('01/04/2027 a 30/04/2027');
    expect(texto(pagina)).toContain('R$ 99,99');
  });

  it('preserva relatório e mês válido ao rejeitar seleção inválida sem nova consulta', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const campoAno = pagina.querySelector<HTMLInputElement>('#ano-relatorio')!;
    const aplicar = pagina.querySelector<HTMLButtonElement>('button')!;
    campoAno.value = '10000';
    campoAno.dispatchEvent(new Event('input'));
    aplicar.focus();
    aplicar.click();
    harness.detectChanges();

    expect(fonte.consultarRelatorioMensal).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Informe um mês e um ano inteiro entre 1 e 9999.',
    );
    expect(texto(pagina)).toContain('01/03/2027 a 31/03/2027');
    expect(texto(pagina)).toContain('R$ 99,99');
    expect(document.activeElement).toBe(aplicar);
  });

  it('preserva exportação indisponível e mantém os painéis após mudança de mês', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const exportar = pagina.querySelector<HTMLButtonElement>(
      'button[aria-describedby="indisponibilidade-exportacao"]',
    )!;
    expect(exportar.textContent).toContain('Exportar relatório');
    expect(pagina.querySelector('#indisponibilidade-exportacao')?.textContent).toContain(
      'Exportação não disponível no protótipo.',
    );
    expect(pagina.querySelectorAll('a[download]')).toHaveLength(0);
    exportar.click();
    harness.detectChanges();
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain(
      'A exportação de relatórios não está disponível no protótipo.',
    );
    expect(pagina.querySelectorAll('details')).toHaveLength(5);
  });

  it('refaz consulta após invalidação mantendo a referência fixa e não aciona outras leituras', async () => {
    const respostas: Subject<RelatorioMensalLeitura>[] = [];
    fonte = criarFonte(() => {
      const resposta = new Subject<RelatorioMensalLeitura>();
      respostas.push(resposta);
      return resposta;
    });
    const harness = await RouterTestingHarness.create('/relatorios');
    TestBed.inject(ControleConsultas).invalidarTodas();
    await harness.fixture.whenStable();

    expect(fonte.referencia).toBe(referencia);
    expect(fonte.consultarRelatorioMensal).toHaveBeenCalledTimes(2);
    respostas[0].next(relatorioMensal('2027-03-01'));
    harness.detectChanges();
    expect(texto(harness.routeNativeElement!)).not.toContain('R$ 99,99');
    respostas[1].next(relatorioMensal('2027-03-01'));
    await harness.fixture.whenStable();
    expect(texto(harness.routeNativeElement!)).toContain('R$ 99,99');
    expect(fonte.consultarColecao).not.toHaveBeenCalled();
    expect(fonte.consultarVenda).not.toHaveBeenCalled();
    expect(fonte.consultarVisaoGeral).not.toHaveBeenCalled();
    expect(fonte.referencia).toBe(referencia);
  });

  it('mantém o URL e não grava seleção mensal em storage do browser', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const urlAntes = TestBed.inject(Router).url;
    const armazenamentoAntes = [localStorage.length, sessionStorage.length];
    const mes = pagina.querySelector<HTMLSelectElement>('#mes-relatorio')!;
    mes.value = '6';
    mes.dispatchEvent(new Event('change'));
    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe(urlAntes);
    expect([localStorage.length, sessionStorage.length]).toEqual(armazenamentoAntes);
    expect(pagina.querySelectorAll('a[download]')).toHaveLength(0);
  });
});
