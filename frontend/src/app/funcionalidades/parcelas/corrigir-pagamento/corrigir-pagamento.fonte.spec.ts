import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { appConfig } from '../../../app.config';
import { routes } from '../../../app.routes';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { ComandoComRevisao, FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import {
  ColecaoVendas,
  ColecaoVendasLeitura,
  ParcelaLeitura,
  RelatorioMensalLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
  VisaoGeralLeitura,
} from '../../../nucleo/dados/modelos-leitura';
import { Resultado } from '../../vendas/venda.modelos';
import { ComandoCorrecaoPagamento } from '../pagamento.modelos';

const referencia = '2027-02-28';
const vendaId = 'loja/venda correção 7%';
const recebimentoId = 'rec/individual %/1';
const parcelaId = 'parcela/opaca/1';
const outroRecebimentoId = 'rec/historico/2';

function resumo(revisao: string | null = '17'): VendaResumoLeitura {
  return {
    id: vendaId,
    cliente: {
      nome: 'Cliente local sintético',
      cpf: '90000000175',
      telefone: '11900000001',
      descricao: null,
    },
    dataVenda: '2027-01-02',
    statusAdministrativo: 'Ativo',
    situacao: 'Quitada',
    valorTotalCentavos: 15000,
    acrescimosCentavos: 1000,
    valorTotalEfetivoCentavos: 16000,
    totalRecebidoCentavos: 16000,
    saldoCentavos: 0,
    quantidadePaga: 2,
    quantidadeParcelas: 2,
    proximoVencimento: null,
    revisao,
    referencia,
  };
}

function parcela(
  id: string,
  numero: number,
  valorBaseCentavos: number,
  valorRecebidoCentavos: number,
): ParcelaLeitura {
  return {
    id,
    numero,
    valorBaseCentavos,
    acrescimoCentavos: Math.max(0, valorRecebidoCentavos - valorBaseCentavos),
    valorEfetivoCentavos:
      valorBaseCentavos + Math.max(0, valorRecebidoCentavos - valorBaseCentavos),
    valorRecebidoCentavos,
    saldoCentavos: Math.max(0, valorBaseCentavos - valorRecebidoCentavos),
    vencimento: numero === 1 ? '2027-01-10' : '2027-02-10',
    situacao: 'Paga',
    dataPagamento: numero === 1 ? '2027-01-20' : '2027-01-25',
    formaPagamento: 'Pix',
  };
}

function detalhe(
  configuracao: {
    readonly revisao?: string | null;
    readonly pagamento?: {
      readonly valorCentavos?: number;
      readonly data?: string;
      readonly forma?: 'Dinheiro' | 'Pix' | 'Cartão de débito' | 'Cartão de crédito';
      readonly observacao?: string;
      readonly origem?: 'Entrada' | 'Lote' | 'Individual';
      readonly parcelaId?: string;
      readonly alocacoes?: readonly {
        readonly parcelaId: string;
        readonly valorCentavos: number;
      }[];
    };
    readonly semAlvo?: boolean;
  } = {},
): VendaDetalheLeitura {
  const valor = configuracao.pagamento?.valorCentavos ?? 11000;
  const alvo = configuracao.semAlvo
    ? []
    : [
        {
          id: recebimentoId,
          data: configuracao.pagamento?.data ?? '2027-01-20',
          forma: configuracao.pagamento?.forma ?? 'Pix',
          origem: configuracao.pagamento?.origem ?? 'Individual',
          valorCentavos: valor,
          acrescimoCentavos: Math.max(0, valor - 10000),
          observacao: configuracao.pagamento?.observacao ?? 'acerto anterior',
          alocacoes: configuracao.pagamento?.alocacoes ?? [
            { parcelaId: configuracao.pagamento?.parcelaId ?? parcelaId, valorCentavos: valor },
          ],
        } satisfies VendaDetalheLeitura['recebimentos'][number],
      ];
  return {
    resumo: resumo(configuracao.revisao === undefined ? '17' : configuracao.revisao),
    parcelas: [parcela(parcelaId, 1, 10000, valor), parcela('parcela/2', 2, 5000, 5000)],
    recebimentos: [
      ...alvo,
      {
        id: outroRecebimentoId,
        data: '2027-01-25',
        forma: 'Dinheiro',
        origem: 'Individual',
        valorCentavos: 5000,
        acrescimoCentavos: 0,
        observacao: 'inalterado',
        alocacoes: [{ parcelaId: 'parcela/2', valorCentavos: 5000 }],
      },
      {
        id: 'rec/entrada/1',
        data: '2027-01-02',
        forma: 'Dinheiro',
        origem: 'Entrada',
        valorCentavos: 1000,
        acrescimoCentavos: 0,
        observacao: '',
        alocacoes: [{ parcelaId, valorCentavos: 1000 }],
      },
      {
        id: 'rec/lote/1',
        data: '2027-01-03',
        forma: 'Dinheiro',
        origem: 'Lote',
        valorCentavos: 1000,
        acrescimoCentavos: 0,
        observacao: '',
        alocacoes: [
          { parcelaId, valorCentavos: 500 },
          { parcelaId: 'parcela/2', valorCentavos: 500 },
        ],
      },
    ],
  };
}

function sucesso(valor: VendaDetalheLeitura): Resultado<VendaDetalheLeitura> {
  return { tipo: 'sucesso', valor, mensagem: 'Correção confirmada.' };
}

function relatorioMensal(mes: string, detalheAtual: VendaDetalheLeitura): RelatorioMensalLeitura {
  const dias = 28;
  const recebimentos = detalheAtual.recebimentos
    .filter((item) => item.data.slice(0, 7) === mes.slice(0, 7))
    .map((item) => ({
      id: item.id,
      venda: detalheAtual.resumo,
      origem: item.origem,
      data: item.data,
      forma: item.forma,
      valorCentavos: item.valorCentavos,
    }));
  const porDia = new Map<string, number>();
  for (const recebimento of recebimentos) {
    porDia.set(recebimento.data, (porDia.get(recebimento.data) ?? 0) + recebimento.valorCentavos);
  }
  return {
    referencia,
    revisao: detalheAtual.resumo.revisao,
    inicioMes: mes,
    fimMes: `${mes.slice(0, 7)}-${String(dias).padStart(2, '0')}`,
    recebimentos,
    recebimentosDiarios: Array.from({ length: dias }, (_, indice) => {
      const data = `${mes.slice(0, 7)}-${String(indice + 1).padStart(2, '0')}`;
      return { data, totalCentavos: porDia.get(data) ?? 0 };
    }),
    vendasDoMes: [],
    saldos: [],
    parcelasAtrasadas: [],
    parcelasPrejuizo: [],
    totalRecebidoCentavos: recebimentos.reduce((total, item) => total + item.valorCentavos, 0),
    quantidadeVendasMes: 0,
    totalVendasMesCentavos: 0,
    totalEmAbertoCentavos: 0,
    totalAtrasadoCentavos: 0,
    totalPrejuizoCentavos: 0,
  };
}

function criarFonte(
  inicial: VendaDetalheLeitura,
  corrigirPagamento: FonteVendas['corrigirPagamento'],
) {
  let atual = inicial;
  const consultarVenda = vi.fn((id: string) =>
    of(
      id === vendaId
        ? sucesso(atual)
        : ({
            tipo: 'inexistencia',
            codigo: 'venda-inexistente',
            mensagem: 'Venda inexistente.',
          } as const),
    ),
  );
  const fonte: FonteVendas = {
    referencia,
    consultarColecao: vi.fn((colecao: ColecaoVendas) =>
      of({
        colecao,
        referencia,
        revisao: atual.resumo.revisao,
        vendas: [],
      } satisfies ColecaoVendasLeitura),
    ),
    consultarVenda,
    consultarVisaoGeral: vi.fn(() =>
      of({
        referencia,
        revisao: atual.resumo.revisao,
        indicadores: {
          totalEmAbertoCentavos: 0,
          valoresEmAtrasoCentavos: 0,
          recebidoNoMesCentavos: atual.resumo.totalRecebidoCentavos,
          vendasCadastradas: 1,
        },
        vendasRecentes: [atual.resumo],
        parcelasProximas: [],
        parcelasAtrasadas: [],
      } satisfies VisaoGeralLeitura),
    ),
    consultarRelatorioMensal: vi.fn((mes: string) => of(relatorioMensal(mes, atual))),
    cadastrarVenda: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    editarCliente: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    alterarStatus: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    registrarPagamento: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    corrigirPagamento: vi.fn(corrigirPagamento),
  };
  return {
    fonte,
    consultarVenda,
    corrigir: fonte.corrigirPagamento as ReturnType<typeof vi.fn>,
    atualizar(detalheNovo: VendaDetalheLeitura) {
      atual = detalheNovo;
    },
  };
}

function urlDetalhe(): string {
  const router = TestBed.inject(Router);
  return router.serializeUrl(router.createUrlTree(['/vendas', vendaId]));
}

describe('Correção individual pela fonte local', () => {
  const showOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...(appConfig.providers ?? []),
        provideRouter(routes),
        { provide: MODO_APLICACAO, useValue: 'local' },
      ],
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      }),
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    if (showOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showOriginal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  async function abrir(fonte: FonteVendas) {
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create(urlDetalhe());
    await harness.fixture.whenStable();
    return { harness, pagina: harness.routeNativeElement! };
  }

  async function atualizar(harness: RouterTestingHarness) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  async function preparar(pagina: HTMLElement, harness: RouterTestingHarness) {
    pagina.querySelector<HTMLButtonElement>(`[data-acao-corrigir="${recebimentoId}"]`)!.click();
    await atualizar(harness);
    const dialog = pagina.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('1 de 2');
    expect(dialog.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe('110,00');
    return dialog;
  }

  async function preencher(
    pagina: HTMLElement,
    harness: RouterTestingHarness,
    id: string,
    valor: string,
  ) {
    const campo = pagina.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    if (campo.tagName === 'SELECT') campo.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
  }

  function enviar(pagina: HTMLElement) {
    pagina
      .querySelector('dialog form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('oferece correção apenas a recebimento individual de uma parcela', async () => {
    const mock = criarFonte(
      detalhe({
        pagamento: {
          origem: 'Individual',
          alocacoes: [
            { parcelaId, valorCentavos: 6000 },
            { parcelaId: 'parcela/2', valorCentavos: 5000 },
          ],
        },
      }),
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { pagina } = await abrir(mock.fonte);

    expect(pagina.querySelectorAll('[data-acao-corrigir]')).toHaveLength(1);
    expect(pagina.querySelector(`[data-acao-corrigir="${recebimentoId}"]`)).toBeNull();
    expect(pagina.querySelector('[data-acao-corrigir="rec/historico/2"]')).not.toBeNull();
    expect(pagina.querySelector('[data-acao-corrigir="rec/entrada/1"]')).toBeNull();
    expect(pagina.querySelector('[data-acao-corrigir="rec/lote/1"]')).toBeNull();
    expect(mock.corrigir).not.toHaveBeenCalled();
  });

  it('corrige 11.000 para 10.500 em outro mês mantendo ID e alocação, com uma escrita', async () => {
    const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const inicial = detalhe();
    const corrigido = detalhe({
      revisao: '18',
      pagamento: {
        valorCentavos: 10500,
        data: '2027-02-03',
        forma: 'Cartão de débito',
        observacao: 'ajuste 💰',
      },
    });
    const mock = criarFonte(
      inicial,
      vi.fn(() => resposta.asObservable()),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await preparar(pagina, harness);
    await preencher(pagina, harness, 'valor-correcao', '105,00');
    await preencher(pagina, harness, 'data-correcao', '2027-02-03');
    await preencher(pagina, harness, 'forma-correcao', 'Cartão de débito');
    await preencher(pagina, harness, 'observacao-correcao', 'ajuste 💰');

    enviar(pagina);
    enviar(pagina);
    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(mock.corrigir.mock.calls[0]?.[0]).toEqual({
      comando: {
        vendaId,
        recebimentoId,
        valorCentavos: 10500,
        data: '2027-02-03',
        forma: 'Cartão de débito',
        observacao: 'ajuste 💰',
      },
      revisaoEsperada: '17',
    });
    expect(dialog.open).toBe(true);
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('enviando');
    expect(TestBed.inject(ControleConsultas).geracao()).toBe(0);

    mock.atualizar(corrigido);
    resposta.next(sucesso(corrigido));
    resposta.complete();
    await atualizar(harness);

    const recebimentoAtual = corrigido.recebimentos.find((item) => item.id === recebimentoId)!;
    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(recebimentoAtual.id).toBe(recebimentoId);
    expect(recebimentoAtual.alocacoes).toEqual([{ parcelaId, valorCentavos: 10500 }]);
    expect(corrigido.recebimentos).toHaveLength(inicial.recebimentos.length);
    expect(corrigido.recebimentos.find((item) => item.id === outroRecebimentoId)).toEqual(
      inicial.recebimentos.find((item) => item.id === outroRecebimentoId),
    );
    expect(TestBed.inject(ControleConsultas).geracao()).toBe(1);
    expect(mock.consultarVenda).toHaveBeenCalledTimes(2);
    expect(pagina.querySelector('dialog')).toBeNull();
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Correção confirmada');
    expect(document.activeElement).toBe(
      pagina.querySelector(`[data-acao-corrigir="${recebimentoId}"]`),
    );

    await harness.navigateByUrl('/relatorios');
    await atualizar(harness);
    expect(mock.fonte.consultarRelatorioMensal).toHaveBeenCalledWith('2027-02-01');
    expect(harness.routeNativeElement?.textContent).toContain('105,00');
    expect(harness.routeNativeElement?.textContent).toContain('03/02/2027');
    expect(mock.corrigir).toHaveBeenCalledTimes(1);
  });

  it('permite correção sem alteração sem duplicar o recebimento', async () => {
    const inicial = detalhe();
    const mock = criarFonte(
      inicial,
      vi.fn(() => of(sucesso(inicial))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    await preparar(pagina, harness);
    enviar(pagina);
    await atualizar(harness);

    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(mock.corrigir.mock.calls[0]?.[0].comando).toEqual({
      vendaId,
      recebimentoId,
      valorCentavos: 11000,
      data: '2027-01-20',
      forma: 'Pix',
      observacao: 'acerto anterior',
    });
    expect(inicial.recebimentos.filter((item) => item.id === recebimentoId)).toHaveLength(1);
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Correção confirmada');
  });

  it('valida o valor-base e mantém o rascunho após recusa identificável da API', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() =>
        of({
          tipo: 'validacao',
          codigo: 'dados-correcao-pagamento-invalidos',
          mensagem: 'A API recusou a correção.',
        } as const),
      ),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await preparar(pagina, harness);
    await preencher(pagina, harness, 'valor-correcao', '99,99');
    enviar(pagina);
    await atualizar(harness);

    expect(mock.corrigir).not.toHaveBeenCalled();
    expect(pagina.querySelector('#erro-valor-correcao')?.textContent).toContain(
      'igual ou superior ao valor-base',
    );
    expect(pagina.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe('99,99');

    await preencher(pagina, harness, 'valor-correcao', '105,00');
    enviar(pagina);
    await atualizar(harness);
    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('A API recusou a correção.');
    expect(pagina.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe('105,00');
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('disponivel');
    expect(pagina.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.disabled).toBe(
      false,
    );
  });

  it('preserva rascunho e alvo no conflito e só usa revisão após consulta explícita', async () => {
    let atual = detalhe();
    const atualizado = detalhe({
      revisao: '18',
      pagamento: {
        valorCentavos: 12000,
        data: '2027-01-21',
        forma: 'Dinheiro',
        observacao: 'alterado por outra pessoa',
      },
    });
    const mock = criarFonte(
      atual,
      vi.fn((entrada: ComandoComRevisao<ComandoCorrecaoPagamento>) => {
        if (entrada.revisaoEsperada === '17') {
          return of({
            tipo: 'falha',
            codigo: 'conflito-revisao',
            mensagem: 'Revisão obsoleta.',
          } as const);
        }
        atual = detalhe({
          revisao: '19',
          pagamento: {
            valorCentavos: entrada.comando.valorCentavos,
            data: entrada.comando.data,
            forma: entrada.comando.forma as 'Pix',
            observacao: entrada.comando.observacao,
          },
        });
        mock.atualizar(atual);
        return of(sucesso(atual));
      }),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await preparar(pagina, harness);
    await preencher(pagina, harness, 'valor-correcao', '105,00');
    await preencher(pagina, harness, 'observacao-correcao', 'rascunho preservado');
    enviar(pagina);
    await atualizar(harness);

    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(mock.consultarVenda).toHaveBeenCalledTimes(1);
    expect(dialog.textContent).toContain('A correção não foi aplicada');
    expect(pagina.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe('105,00');
    expect(pagina.querySelector<HTMLInputElement>('#observacao-correcao')!.value).toBe(
      'rascunho preservado',
    );

    atual = atualizado;
    mock.atualizar(atualizado);
    dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    await atualizar(harness);
    expect(mock.consultarVenda).toHaveBeenCalledTimes(2);
    expect(dialog.textContent).toContain('Venda recarregada. Revise os dados');
    expect(dialog.textContent).toContain('120,00');
    expect(dialog.textContent).toContain('alterado por outra pessoa');
    expect(pagina.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe('105,00');
    expect(pagina.querySelector<HTMLInputElement>('#observacao-correcao')!.value).toBe(
      'rascunho preservado',
    );
    expect(document.activeElement).toBe(dialog.querySelector('button[type="submit"]'));
    expect(mock.corrigir).toHaveBeenCalledTimes(1);

    enviar(pagina);
    await atualizar(harness);
    expect(mock.corrigir).toHaveBeenCalledTimes(2);
    expect(mock.corrigir.mock.calls.map(([entrada]) => entrada.revisaoEsperada)).toEqual([
      '17',
      '18',
    ]);
    expect(mock.corrigir.mock.calls.map(([entrada]) => entrada.comando.recebimentoId)).toEqual([
      recebimentoId,
      recebimentoId,
    ]);
    expect(pagina.querySelector('dialog')).toBeNull();
  });

  it('bloqueia nova tentativa quando a consulta de conflito perde o recebimento original', async () => {
    let atual = detalhe();
    const mock = criarFonte(
      atual,
      vi.fn(() =>
        of({ tipo: 'falha', codigo: 'conflito-revisao', mensagem: 'Conflito.' } as const),
      ),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await preparar(pagina, harness);
    enviar(pagina);
    await atualizar(harness);
    atual = detalhe({ revisao: '18', semAlvo: true });
    mock.atualizar(atual);

    dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    await atualizar(harness);

    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(dialog.textContent).toContain('não está mais elegível');
    expect(dialog.querySelector('dl')?.textContent).toContain('Não disponível');
    expect(dialog.querySelector('dl')?.textContent).not.toContain('110,00');
    expect(pagina.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.disabled).toBe(
      true,
    );
    expect(pagina.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe('110,00');
  });

  it('mantém o rascunho no coordenador quando a correção tem resultado incerto', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => throwError(() => new Error('transporte interrompido'))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await preparar(pagina, harness);
    await preencher(pagina, harness, 'valor-correcao', '105,00');
    await preencher(pagina, harness, 'observacao-correcao', 'rascunho em memória');
    enviar(pagina);
    await atualizar(harness);

    const estado = TestBed.inject(ControleConfirmacoes).estado();
    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(estado.tipo).toBe('incerto');
    if (estado.tipo !== 'incerto') throw new Error('O estado deveria permanecer incerto.');
    expect(
      (estado.contexto.rascunho as { readonly formulario: { observacao: string } }).formulario,
    ).toMatchObject({ observacao: 'rascunho em memória', valorRecebido: '105,00' });
    expect(dialog.open).toBe(false);
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'O resultado da correção está incerto',
    );
    expect(pagina.querySelector('[data-acao-corrigir]')).toBeNull();
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'feche e confira os dados',
    );
  });

  it('mantém correção confirmada distinta de falha no refresh e permite recarga sem novo comando', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    await preparar(pagina, harness);
    mock.consultarVenda.mockImplementationOnce(() =>
      throwError(() => new Error('Falha de transporte no refresh.')),
    );
    enviar(pagina);
    await atualizar(harness);

    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(mock.consultarVenda).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(ControleConfirmacoes).estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: { tipo: 'confirmado', resultado: { mensagem: 'Correção confirmada.' } },
    });
    expect(pagina.querySelector('h1')?.textContent).toContain('Não foi possível carregar a venda');
    const anuncio = pagina.querySelector<HTMLElement>('[role="alert"][aria-live="polite"]');
    expect(anuncio?.getAttribute('aria-live')).toBe('polite');
    expect(anuncio?.textContent).toContain('Correção confirmada.');
    expect(anuncio?.textContent).toContain('não foi possível atualizar o detalhe');
    expect(document.activeElement).toBe(pagina.querySelector('h1'));

    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await atualizar(harness);
    expect(mock.consultarVenda).toHaveBeenCalledTimes(3);
    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('h1')?.textContent).toContain('Detalhes da venda');
  });

  it('fecha para conferência quando a API retorna confirmação indeterminada', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() =>
        of({
          tipo: 'falha',
          codigo: 'confirmacao-indeterminada',
          mensagem: 'A confirmação não pôde ser determinada.',
        } as const),
      ),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    await preparar(pagina, harness);
    enviar(pagina);
    await atualizar(harness);

    expect(mock.corrigir).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('incerto');
    expect(pagina.querySelector('dialog')).toBeNull();
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'O resultado da correção está incerto',
    );
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'feche e confira os dados',
    );
  });

  it('cancelar antes do envio descarta o rascunho sem gravar e restaura o foco', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await preparar(pagina, harness);
    await preencher(pagina, harness, 'valor-correcao', '105,00');
    dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    await atualizar(harness);

    expect(mock.corrigir).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(
      pagina.querySelector(`[data-acao-corrigir="${recebimentoId}"]`),
    );
  });
});
