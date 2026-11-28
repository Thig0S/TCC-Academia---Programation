import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
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
import { ComandoPagamento } from '../pagamento.modelos';

const referencia = '2027-01-31';
const idVenda = 'loja/venda baixa 7%';
const ids = ['parcela/1', 'parcela/2', 'parcela/3'] as const;

function resumo(
  revisao: string | null = '17',
  statusAdministrativo: VendaResumoLeitura['statusAdministrativo'] = 'Ativo',
  totalRecebidoCentavos = 0,
  saldoCentavos = 10000,
): VendaResumoLeitura {
  return {
    id: idVenda,
    cliente: {
      nome: 'Cliente local sintético',
      cpf: '90000000175',
      telefone: '11900000001',
      descricao: null,
    },
    dataVenda: '2027-01-02',
    statusAdministrativo,
    situacao: saldoCentavos === 0 ? 'Quitada' : 'Atrasada',
    valorTotalCentavos: 10000,
    acrescimosCentavos: 0,
    valorTotalEfetivoCentavos: 10000,
    totalRecebidoCentavos,
    saldoCentavos,
    quantidadePaga: saldoCentavos === 0 ? 3 : totalRecebidoCentavos > 0 ? 1 : 0,
    quantidadeParcelas: 3,
    proximoVencimento: saldoCentavos === 0 ? null : '2027-02-02',
    revisao,
    referencia,
  };
}

function parcela(
  numero: number,
  situacao: ParcelaLeitura['situacao'] = 'Aberto',
  valorBaseCentavos = numero === 1 ? 3334 : 3333,
  valorRecebidoCentavos = situacao === 'Paga' ? valorBaseCentavos : 0,
): ParcelaLeitura {
  return {
    id: ids[numero - 1]!,
    numero,
    valorBaseCentavos,
    acrescimoCentavos: 0,
    valorEfetivoCentavos: valorBaseCentavos,
    valorRecebidoCentavos,
    saldoCentavos: Math.max(0, valorBaseCentavos - valorRecebidoCentavos),
    vencimento: `2027-01-${String(numero + 1).padStart(2, '0')}`,
    situacao: situacao === 'Aberto' ? 'Atrasado' : situacao,
    dataPagamento: situacao === 'Paga' ? '2027-01-02' : null,
    formaPagamento: situacao === 'Paga' ? 'Dinheiro' : null,
  };
}

function detalhe(
  configuracao: {
    readonly revisao?: string | null;
    readonly status?: VendaResumoLeitura['statusAdministrativo'];
    readonly comEntrada?: boolean;
    readonly pagamento?: {
      readonly parcelaId: string;
      readonly valorCentavos: number;
      readonly observacao?: string;
      readonly data?: string;
      readonly forma?: 'Dinheiro' | 'Pix' | 'Cartão de débito' | 'Cartão de crédito';
    };
    readonly ultimaQuitada?: boolean;
  } = {},
): VendaDetalheLeitura {
  const comEntrada = configuracao.comEntrada ?? false;
  const pagamento = configuracao.pagamento;
  const primeiraPaga = comEntrada || pagamento?.parcelaId === ids[0] || configuracao.ultimaQuitada;
  const segundaPaga = pagamento?.parcelaId === ids[1] || configuracao.ultimaQuitada;
  const terceiraPaga = pagamento?.parcelaId === ids[2] || configuracao.ultimaQuitada;
  const parcelas = [
    parcela(
      1,
      primeiraPaga ? 'Paga' : 'Aberto',
      comEntrada ? 2000 : 3334,
      pagamento?.parcelaId === ids[0] ? pagamento.valorCentavos : undefined,
    ),
    parcela(
      2,
      segundaPaga ? 'Paga' : 'Aberto',
      comEntrada ? 5000 : 3333,
      pagamento?.parcelaId === ids[1] ? pagamento.valorCentavos : undefined,
    ),
    parcela(
      3,
      terceiraPaga ? 'Paga' : 'Aberto',
      comEntrada ? 5000 : 3333,
      pagamento?.parcelaId === ids[2] ? pagamento.valorCentavos : undefined,
    ),
  ];
  const recebimentos: VendaDetalheLeitura['recebimentos'][number][] = [];
  if (comEntrada) {
    recebimentos.push({
      id: 'recebimento/entrada',
      data: '2027-01-02',
      forma: 'Dinheiro',
      origem: 'Entrada',
      valorCentavos: 2000,
      acrescimoCentavos: 0,
      observacao: '',
      alocacoes: [{ parcelaId: ids[0], valorCentavos: 2000 }],
    });
  }
  if (pagamento) {
    recebimentos.push({
      id: 'recebimento/individual',
      data: pagamento.data ?? referencia,
      forma: pagamento.forma ?? 'Pix',
      origem: 'Individual',
      valorCentavos: pagamento.valorCentavos,
      acrescimoCentavos: Math.max(
        0,
        pagamento.valorCentavos -
          parcelas.find((item) => item.id === pagamento.parcelaId)!.valorBaseCentavos,
      ),
      observacao: pagamento.observacao ?? '',
      alocacoes: [{ parcelaId: pagamento.parcelaId, valorCentavos: pagamento.valorCentavos }],
    });
  }
  const totalRecebidoCentavos = (comEntrada ? 2000 : 0) + (pagamento?.valorCentavos ?? 0);
  const saldoCentavos = configuracao.ultimaQuitada ? 0 : Math.max(0, 10000 - totalRecebidoCentavos);
  return {
    resumo: {
      ...resumo(
        configuracao.revisao === undefined ? '17' : configuracao.revisao,
        configuracao.status ?? 'Ativo',
        totalRecebidoCentavos,
        saldoCentavos,
      ),
      valorTotalEfetivoCentavos: 10000 + (pagamento?.valorCentavos ?? 0) - (pagamento ? 3334 : 0),
    },
    parcelas,
    recebimentos,
  };
}

function sucesso(valor: VendaDetalheLeitura): Resultado<VendaDetalheLeitura> {
  return { tipo: 'sucesso', valor, mensagem: 'Pagamento confirmado.' };
}

function urlDetalhe(): string {
  const router = TestBed.inject(Router);
  return router.serializeUrl(router.createUrlTree(['/vendas', idVenda]));
}

function criarFonte(
  inicial: VendaDetalheLeitura,
  registrarPagamento: FonteVendas['registrarPagamento'],
  consultarVenda?: FonteVendas['consultarVenda'],
) {
  let atual = inicial;
  const consultar = vi.fn(
    consultarVenda ??
      ((id: string) =>
        of(
          id === idVenda
            ? sucesso(atual)
            : ({
                tipo: 'inexistencia',
                codigo: 'venda-inexistente',
                mensagem: 'Venda inexistente.',
              } as const),
        )),
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
    consultarVenda: consultar,
    consultarVisaoGeral: vi.fn(() =>
      of({
        referencia,
        revisao: atual.resumo.revisao,
        indicadores: {
          totalEmAbertoCentavos: atual.resumo.saldoCentavos,
          valoresEmAtrasoCentavos: 0,
          recebidoNoMesCentavos: atual.resumo.totalRecebidoCentavos,
          vendasCadastradas: 1,
        },
        vendasRecentes: [atual.resumo],
        parcelasProximas: [],
        parcelasAtrasadas: [],
      } satisfies VisaoGeralLeitura),
    ),
    consultarRelatorioMensal: vi.fn(() => of({} as RelatorioMensalLeitura)),
    cadastrarVenda: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    editarCliente: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    alterarStatus: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
    registrarPagamento: vi.fn(registrarPagamento),
    corrigirPagamento: vi.fn(() => {
      throw new Error('Comando inesperado.');
    }),
  };
  return {
    fonte,
    consultar,
    pagamento: fonte.registrarPagamento as ReturnType<typeof vi.fn>,
    atualizar(detalheNovo: VendaDetalheLeitura) {
      atual = detalheNovo;
    },
  };
}

describe('Baixa individual pela fonte local', () => {
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
    const pagina = harness.routeNativeElement!;
    return { harness, pagina };
  }

  async function atualizar(harness: RouterTestingHarness) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  async function prepararPagamento(
    pagina: HTMLElement,
    harness: RouterTestingHarness,
    parcelaId: string = ids[0],
  ) {
    pagina.querySelector<HTMLButtonElement>(`[data-acao-pagar="${parcelaId}"]`)!.click();
    await atualizar(harness);
    const dialog = pagina.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.open).toBe(true);
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

  it('usa primeira pendente após entrada, não permite saltos e avisa sobre atraso', async () => {
    const mock = criarFonte(
      detalhe({ comEntrada: true }),
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { harness, pagina } = await abrir(mock.fonte);

    expect(pagina.querySelector('[data-acao-pagar="parcela/1"]')).toBeNull();
    expect(pagina.querySelector('[data-acao-pagar="parcela/2"]')).not.toBeNull();
    expect(pagina.querySelector('[data-acao-pagar="parcela/3"]')).toBeNull();
    expect(pagina.textContent).toContain('Aguardando parcela anterior');

    const dialog = await prepararPagamento(pagina, harness, ids[1]);
    expect(dialog.textContent).toContain('Parcela');
    expect(dialog.textContent).toContain('2 de 3');
    expect(dialog.textContent).toContain('Checar juros do Crediloja!');
    expect(pagina.querySelector<HTMLInputElement>('#valor-recebimento')!.value).toBe('50,00');
    expect(mock.pagamento).not.toHaveBeenCalled();
  });

  it('envia uma baixa com ID/parcela/revisão capturados, valor explícito e nota Unicode', async () => {
    const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => resposta.asObservable()),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'valor-recebimento', '40,00');
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    await preencher(pagina, harness, 'observacao-recebimento', 'juros 💰');

    enviar(pagina);
    enviar(pagina);
    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(mock.pagamento.mock.calls[0]?.[0]).toEqual({
      comando: {
        vendaId: idVenda,
        parcelaId: ids[0],
        data: referencia,
        forma: 'Pix',
        valorCentavos: 4000,
        observacao: 'juros 💰',
      },
      revisaoEsperada: '17',
    });
    expect(dialog.open).toBe(true);
    expect(pagina.querySelector('#titulo-parcelas')?.textContent).toContain('Parcelas');
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('enviando');
    expect(TestBed.inject(ControleConsultas).geracao()).toBe(0);

    const detalheAtualizado = detalhe({
      revisao: '18',
      pagamento: { parcelaId: ids[0], valorCentavos: 4000, observacao: 'juros 💰' },
    });
    mock.atualizar(detalheAtualizado);
    resposta.next(sucesso(detalheAtualizado));
    resposta.complete();
    await atualizar(harness);

    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ControleConsultas).geracao()).toBe(1);
    expect(mock.consultar).toHaveBeenCalledTimes(2);
    expect(pagina.querySelector('[data-acao-pagar="parcela/2"]')).not.toBeNull();
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Pagamento confirmado');
    expect(document.activeElement).toBe(pagina.querySelector('[data-acao-pagar="parcela/2"]'));
  });

  it('valida o valor-base do snapshot e conta observação Unicode sem chamar a fonte', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    await prepararPagamento(pagina, harness);
    const notaLonga = '💰'.repeat(21);
    await preencher(pagina, harness, 'valor-recebimento', '33,33');
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    await preencher(pagina, harness, 'observacao-recebimento', notaLonga);
    enviar(pagina);
    await atualizar(harness);

    expect(pagina.querySelector('#erro-valor-recebimento')?.textContent).toContain(
      'igual ou superior',
    );
    expect(pagina.querySelector('#erro-observacao-recebimento')?.textContent).toContain(
      '20 caracteres',
    );
    expect(pagina.querySelector<HTMLInputElement>('#valor-recebimento')!.value).toBe('33,33');
    expect(pagina.querySelector<HTMLInputElement>('#observacao-recebimento')!.value).toBe(
      notaLonga,
    );
    expect(mock.pagamento).not.toHaveBeenCalled();
  });

  it('preserva o alvo e rascunho no conflito e só usa revisão nova após recarga explícita', async () => {
    let leituras = 0;
    const segundaLeitura = detalhe({ revisao: '18' });
    const consulta = vi.fn(() => {
      leituras++;
      return of(sucesso(leituras === 1 ? detalhe() : segundaLeitura));
    });
    const mock = criarFonte(
      detalhe(),
      vi.fn((entrada: ComandoComRevisao<ComandoPagamento>) =>
        entrada.revisaoEsperada === '17'
          ? of({
              tipo: 'falha',
              codigo: 'conflito-revisao',
              mensagem: 'Revisão obsoleta.',
            } as const)
          : of(
              sucesso(
                detalhe({
                  revisao: '19',
                  pagamento: {
                    parcelaId: ids[0],
                    valorCentavos: 3500,
                    observacao: 'manter rascunho',
                    data: '2027-01-30',
                    forma: 'Pix',
                  },
                }),
              ),
            ),
      ),
      consulta,
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'data-recebimento', '2027-01-30');
    await preencher(pagina, harness, 'valor-recebimento', '35,00');
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    await preencher(pagina, harness, 'observacao-recebimento', 'manter rascunho');
    enviar(pagina);
    await atualizar(harness);

    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(mock.pagamento.mock.calls[0]?.[0].revisaoEsperada).toBe('17');
    expect(mock.consultar).toHaveBeenCalledTimes(1);
    expect(dialog.textContent).toContain('O pagamento não foi enviado');
    expect(pagina.querySelector<HTMLInputElement>('#valor-recebimento')!.value).toBe('35,00');
    expect(pagina.querySelector<HTMLInputElement>('#observacao-recebimento')!.value).toBe(
      'manter rascunho',
    );

    dialog.querySelector<HTMLButtonElement>('button')!.click();
    await atualizar(harness);
    expect(mock.consultar).toHaveBeenCalledTimes(2);
    expect(dialog.textContent).toContain('continua sendo a primeira pendente');
    expect(pagina.querySelector<HTMLInputElement>('#data-recebimento')!.value).toBe('2027-01-30');
    expect(document.activeElement).toBe(dialog.querySelector('button[type="submit"]'));
    expect(mock.pagamento).toHaveBeenCalledTimes(1);

    enviar(pagina);
    await atualizar(harness);
    expect(mock.pagamento).toHaveBeenCalledTimes(2);
    expect(mock.pagamento.mock.calls.map(([entrada]) => entrada.revisaoEsperada)).toEqual([
      '17',
      '18',
    ]);
    expect(mock.pagamento.mock.calls.map(([entrada]) => entrada.comando.parcelaId)).toEqual([
      ids[0],
      ids[0],
    ]);
  });

  it('não avança para a próxima parcela quando a leitura explícita revela alvo já pago', async () => {
    let leituras = 0;
    const consulta = vi.fn(() => {
      leituras++;
      return of(
        sucesso(
          leituras === 1
            ? detalhe()
            : detalhe({ revisao: '18', pagamento: { parcelaId: ids[0], valorCentavos: 3334 } }),
        ),
      );
    });
    const mock = criarFonte(
      detalhe(),
      vi.fn(() =>
        of({ tipo: 'falha', codigo: 'conflito-revisao', mensagem: 'Conflito.' } as const),
      ),
      consulta,
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    enviar(pagina);
    await atualizar(harness);
    dialog.querySelector<HTMLButtonElement>('button')!.click();
    await atualizar(harness);

    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(dialog.textContent).toContain('não é mais a primeira pendente');
    expect(pagina.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!.disabled).toBe(
      true,
    );
    expect(mock.pagamento.mock.calls[0]?.[0].comando.parcelaId).toBe(ids[0]);
  });

  it('bloqueia replay após resposta perdida e mantém a orientação depois de fechar o modal', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => throwError(() => new Error('transporte interrompido'))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    enviar(pagina);
    await atualizar(harness);

    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('incerto');
    expect(pagina.querySelector('dialog')).toBeNull();
    expect(pagina.textContent).toContain('O resultado do pagamento está incerto');
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'O resultado do pagamento está incerto',
    );
    expect(pagina.querySelector('[data-acao-pagar]')).toBeNull();
    expect(TestBed.inject(ControleConsultas).geracao()).toBe(0);
  });

  it('cancelar antes do envio descarta o rascunho sem chamar a fonte', async () => {
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'valor-recebimento', '40,00');
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    await atualizar(harness);

    expect(mock.pagamento).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
    expect(TestBed.inject(ControleConsultas).geracao()).toBe(0);
    expect(document.activeElement).toBe(pagina.querySelector('[data-acao-pagar="parcela/1"]'));
  });

  it('fechar após envio não cancela; sucesso atualiza a próxima ação e quitação foca o título', async () => {
    const primeiraResposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => primeiraResposta.asObservable()),
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    enviar(pagina);
    await atualizar(harness);
    expect(dialog.querySelector('[role="status"]')?.textContent).toContain(
      'Fechar este diálogo não cancela',
    );
    dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    await atualizar(harness);
    expect(pagina.textContent).toContain('Fechar o diálogo não cancela');
    expect(mock.pagamento).toHaveBeenCalledTimes(1);

    const depoisPrimeira = detalhe({
      revisao: '18',
      pagamento: { parcelaId: ids[0], valorCentavos: 3334 },
    });
    mock.atualizar(depoisPrimeira);
    primeiraResposta.next(sucesso(depoisPrimeira));
    primeiraResposta.complete();
    await atualizar(harness);
    expect(pagina.querySelector('[data-acao-pagar="parcela/2"]')).not.toBeNull();
    expect(document.activeElement).toBe(pagina.querySelector('[data-acao-pagar="parcela/2"]'));

    const respostaFinal = new Subject<Resultado<VendaDetalheLeitura>>();
    mock.pagamento.mockImplementationOnce(() => respostaFinal.asObservable());
    await prepararPagamento(pagina, harness, ids[1]);
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    enviar(pagina);
    expect(mock.pagamento).toHaveBeenCalledTimes(2);
    const quitada = detalhe({
      revisao: '19',
      ultimaQuitada: true,
      pagamento: { parcelaId: ids[1], valorCentavos: 3333 },
    });
    mock.atualizar(quitada);
    respostaFinal.next(sucesso(quitada));
    respostaFinal.complete();
    await atualizar(harness);
    expect(pagina.querySelector('[data-acao-pagar]')).toBeNull();
    expect(document.activeElement).toBe(pagina.querySelector('#titulo-parcelas'));
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Pagamento confirmado');
  });

  it('distingue baixa confirmada de falha no refresh, recarrega por ação e foca a falha', async () => {
    const detalheConfirmado = detalhe({
      revisao: '18',
      pagamento: { parcelaId: ids[0], valorCentavos: 3334, forma: 'Pix' },
    });
    let leituras = 0;
    const consultar = vi.fn((_id: string) => {
      leituras++;
      if (leituras === 2) return throwError(() => new Error('Falha de transporte no refresh.'));
      return of(sucesso(leituras === 1 ? detalhe() : detalheConfirmado));
    });
    const mock = criarFonte(
      detalhe(),
      vi.fn(() => of(sucesso(detalheConfirmado))),
      consultar,
    );
    const { harness, pagina } = await abrir(mock.fonte);
    const dialog = await prepararPagamento(pagina, harness);
    await preencher(pagina, harness, 'forma-recebimento', 'Pix');
    enviar(pagina);
    await atualizar(harness);

    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(mock.consultar).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(ControleConfirmacoes).estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: {
        tipo: 'confirmado',
        resultado: { valor: { resumo: { revisao: '18' } } },
      },
    });
    const anuncio = pagina.querySelector<HTMLElement>('[role="status"]');
    expect(anuncio?.textContent).toContain('Pagamento confirmado.');
    expect(anuncio?.textContent).toContain('não foi possível atualizar o detalhe');
    expect(pagina.querySelector('h1')?.textContent).toContain('Não foi possível carregar a venda');
    expect(document.activeElement).toBe(pagina.querySelector('h1'));
    expect(pagina.textContent).toContain('não repita o pagamento');
    expect(dialog.open).toBe(false);

    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await atualizar(harness);
    expect(mock.consultar).toHaveBeenCalledTimes(3);
    expect(mock.pagamento).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('h1')?.textContent).toContain('Detalhes da venda');
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Pagamento confirmado.');
  });
});
