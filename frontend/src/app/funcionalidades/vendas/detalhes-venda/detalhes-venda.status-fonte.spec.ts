import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of } from 'rxjs';
import { appConfig } from '../../../app.config';
import { routes } from '../../../app.routes';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import {
  ContextoConfirmacao,
  ControleConfirmacoes,
  ErroConfirmacaoBloqueada,
} from '../../../nucleo/dados/controle-confirmacoes';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import {
  ColecaoVendas,
  VendaDetalheLeitura,
  VendaResumoLeitura,
  VisaoGeralLeitura,
} from '../../../nucleo/dados/modelos-leitura';
import { Resultado, StatusAdministrativoVenda } from '../venda.modelos';

const referencia = '2027-01-31';
const idVenda = 'loja/contrato 7%';

function resumo(
  id: string,
  statusAdministrativo: StatusAdministrativoVenda,
  revisao: string | null = '17',
  saldoCentavos = 7000,
): VendaResumoLeitura {
  return {
    id,
    cliente: {
      nome: `Cliente ${id}`,
      cpf: '90000000175',
      telefone: '11900000001',
      descricao: null,
    },
    dataVenda: '2027-01-02',
    statusAdministrativo,
    situacao: saldoCentavos === 0 ? 'Quitada' : 'Em aberto',
    valorTotalCentavos: 10000,
    acrescimosCentavos: 0,
    valorTotalEfetivoCentavos: 10000,
    totalRecebidoCentavos: 10000 - saldoCentavos,
    saldoCentavos,
    quantidadePaga: saldoCentavos === 0 ? 1 : 0,
    quantidadeParcelas: 1,
    proximoVencimento: saldoCentavos === 0 ? null : '2027-02-02',
    revisao,
    referencia,
  };
}

function detalhe(
  id = idVenda,
  status: StatusAdministrativoVenda = 'Ativo',
  revisao: string | null = '17',
  saldo = 7000,
): VendaDetalheLeitura {
  return { resumo: resumo(id, status, revisao, saldo), parcelas: [], recebimentos: [] };
}

function sucesso(valor: VendaDetalheLeitura): Resultado<VendaDetalheLeitura> {
  return { tipo: 'sucesso', valor, mensagem: 'Status atualizado.' };
}

function urlDetalhe(id = idVenda): string {
  const router = TestBed.inject(Router);
  return router.serializeUrl(router.createUrlTree(['/vendas', id]));
}

function criarFonte(
  consultarVenda: FonteVendas['consultarVenda'],
  alterarStatus: FonteVendas['alterarStatus'],
): FonteVendas {
  const consultarColecao = vi.fn((colecao: ColecaoVendas) => {
    const status = registroAtual.resumo.statusAdministrativo;
    const resultado =
      (colecao === 'inativas' && status === 'Inativo') ||
      (colecao === 'prejuizos' && status === 'Prejuízo') ||
      (colecao === 'abertas' && status === 'Ativo' && registroAtual.resumo.saldoCentavos > 0) ||
      (colecao === 'quitadas' && status === 'Ativo' && registroAtual.resumo.saldoCentavos === 0)
        ? [registroAtual.resumo]
        : [];
    return of({ colecao, referencia, revisao: registroAtual.resumo.revisao, vendas: resultado });
  });
  const consultarVisaoGeral = vi.fn(() => {
    const vendasRecentes =
      registroAtual.resumo.statusAdministrativo === 'Ativo' ? [registroAtual.resumo] : [];
    const resultado: VisaoGeralLeitura = {
      referencia,
      revisao: registroAtual.resumo.revisao,
      indicadores: {
        totalEmAbertoCentavos:
          registroAtual.resumo.statusAdministrativo === 'Ativo'
            ? registroAtual.resumo.saldoCentavos
            : 0,
        valoresEmAtrasoCentavos: 0,
        recebidoNoMesCentavos: 0,
        vendasCadastradas: vendasRecentes.length,
      },
      vendasRecentes,
      parcelasProximas: [],
      parcelasAtrasadas: [],
    };
    return of(resultado);
  });
  return {
    referencia,
    consultarColecao,
    consultarVenda: vi.fn(consultarVenda),
    consultarVisaoGeral,
    consultarRelatorioMensal: vi.fn(() => {
      throw new Error('Consulta não usada no cenário.');
    }),
    cadastrarVenda: vi.fn(() => {
      throw new Error('Comando não usado no cenário.');
    }),
    editarCliente: vi.fn(() => {
      throw new Error('Comando não usado no cenário.');
    }),
    alterarStatus: vi.fn(alterarStatus),
    registrarPagamento: vi.fn(() => {
      throw new Error('Comando não usado no cenário.');
    }),
    corrigirPagamento: vi.fn(() => {
      throw new Error('Comando não usado no cenário.');
    }),
  };
}

let registroAtual = detalhe();

describe('Mudança de status pela fonte assíncrona', () => {
  const showOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(() => {
    registroAtual = detalhe();
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

  async function abrirDetalhe(fonte: FonteVendas, id = idVenda) {
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create(urlDetalhe(id));
    await harness.fixture.whenStable();
    return { harness, pagina: harness.routeNativeElement! };
  }

  async function prepararStatus(
    pagina: HTMLElement,
    harness: RouterTestingHarness,
    status: StatusAdministrativoVenda,
  ) {
    const acionador = pagina.querySelector<HTMLButtonElement>(`[data-acao-status="${status}"]`);
    expect(acionador).not.toBeNull();
    acionador!.click();
    await harness.fixture.whenStable();
    const dialog = pagina.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('[data-foco-inicial]'));
    return dialog;
  }

  async function confirmar(dialog: HTMLDialogElement, harness: RouterTestingHarness) {
    dialog.querySelector<HTMLButtonElement>('[data-foco-inicial]')!.click();
    await harness.fixture.whenStable();
  }

  async function atualizar(harness: RouterTestingHarness) {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  it('apresenta somente as transições permitidas para os estados e a elegibilidade atuais', async () => {
    const consultar = vi.fn((id: string) => {
      const dados: Record<string, VendaDetalheLeitura> = {
        ativa: detalhe('ativa', 'Ativo', '1', 1000),
        quitada: detalhe('quitada', 'Ativo', '2', 0),
        inativa: detalhe('inativa', 'Inativo', '3', 1000),
        'prejuizo-caso': detalhe('prejuizo-caso', 'Prejuízo', '4', 1000),
      };
      return of(sucesso(dados[id]!));
    });
    const fonte = criarFonte(
      consultar,
      vi.fn(() => of(sucesso(detalhe()))),
    );
    const { harness, pagina } = await abrirDetalhe(fonte, 'ativa');

    expect(
      [...pagina.querySelectorAll<HTMLButtonElement>('[data-acao-status]')].map(
        (b) => b.dataset['acaoStatus'],
      ),
    ).toEqual(['Inativo', 'Prejuízo']);
    await harness.navigateByUrl(urlDetalhe('quitada'));
    await atualizar(harness);
    expect(
      [
        ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[data-acao-status]'),
      ].map((b) => b.dataset['acaoStatus']),
    ).toEqual(['Inativo']);
    await harness.navigateByUrl(urlDetalhe('inativa'));
    await atualizar(harness);
    expect(
      [
        ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[data-acao-status]'),
      ].map((b) => b.dataset['acaoStatus']),
    ).toEqual(['Ativo']);
    await harness.navigateByUrl(urlDetalhe('prejuizo-caso'));
    await atualizar(harness);
    expect(
      [
        ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[data-acao-status]'),
      ].map((b) => b.dataset['acaoStatus']),
    ).toEqual(['Ativo']);
  });

  it('captura ID/revisão do detalhe, não publica antes da resposta e só atualiza após sucesso', async () => {
    const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const consultar = vi.fn(() => of(sucesso(registroAtual)));
    const alterarStatus = vi.fn((_entrada: Parameters<FonteVendas['alterarStatus']>[0]) =>
      resposta.asObservable(),
    );
    const fonte = criarFonte(consultar, alterarStatus);
    const { harness, pagina } = await abrirDetalhe(fonte);
    const geracao = TestBed.inject(ControleConsultas);
    const dialog = await prepararStatus(pagina, harness, 'Inativo');

    expect(alterarStatus).not.toHaveBeenCalled();
    await confirmar(dialog, harness);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(alterarStatus.mock.calls[0]?.[0]).toEqual({
      comando: { vendaId: idVenda, status: 'Inativo' },
      revisaoEsperada: '17',
    });
    expect(
      pagina.querySelector('#titulo-status-administrativo')?.nextElementSibling?.textContent,
    ).toContain('Ativo');
    expect(geracao.geracao()).toBe(0);
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('enviando');

    registroAtual = detalhe(idVenda, 'Inativo', '18', 7000);
    resposta.next(sucesso(registroAtual));
    resposta.complete();
    await atualizar(harness);

    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(geracao.geracao()).toBe(1);
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(
      pagina.querySelector('#titulo-status-administrativo')?.nextElementSibling?.textContent,
    ).toContain('Inativo');
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Status atualizado');
  });

  it('em conflito mantém alvo/revisão originais e só adota revisão nova após leitura explícita', async () => {
    let leituras = 0;
    const consultar = vi.fn(() => {
      leituras++;
      if (leituras === 1) return of(sucesso(detalhe(idVenda, 'Ativo', '17')));
      if (leituras === 2) return of(sucesso(detalhe(idVenda, 'Ativo', '18')));
      return of(sucesso(registroAtual));
    });
    const alterarStatus = vi.fn((entrada: Parameters<FonteVendas['alterarStatus']>[0]) => {
      if (entrada.revisaoEsperada === '17') {
        return of({
          tipo: 'falha',
          codigo: 'conflito-revisao',
          mensagem: 'Revisão obsoleta.',
        } as const);
      }
      registroAtual = detalhe(idVenda, 'Inativo', '19', 7000);
      return of(sucesso(registroAtual));
    });
    const fonte = criarFonte(consultar, alterarStatus);
    const { harness, pagina } = await abrirDetalhe(fonte);
    const dialog = await prepararStatus(pagina, harness, 'Inativo');

    await confirmar(dialog, harness);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(alterarStatus.mock.calls[0]?.[0].revisaoEsperada).toBe('17');
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('mudou desde a consulta');
    expect(document.activeElement).toBe(pagina.querySelector('dialog [role="alert"]'));

    dialog.querySelector<HTMLButtonElement>('button:not([data-foco-inicial])')!.click();
    await atualizar(harness);
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('dialog [role="status"]')?.textContent).toContain(
      'O status atual é Ativo',
    );
    expect(document.activeElement).toBe(pagina.querySelector('dialog [data-foco-inicial]'));

    const confirmacaoAtualizada = pagina.querySelector<HTMLButtonElement>(
      'dialog [data-foco-inicial]',
    )!;
    confirmacaoAtualizada.click();
    await atualizar(harness);
    expect(alterarStatus).toHaveBeenCalledTimes(2);
    expect(alterarStatus.mock.calls.map(([entrada]) => entrada.revisaoEsperada)).toEqual([
      '17',
      '18',
    ]);
    expect(alterarStatus.mock.calls.map(([entrada]) => entrada.comando.vendaId)).toEqual([
      idVenda,
      idVenda,
    ]);
    expect(
      pagina.querySelector('#titulo-status-administrativo')?.nextElementSibling?.textContent,
    ).toContain('Inativo');
  });

  it('rejeita detalhe de outra venda durante a recarga de conflito sem trocar ID ou revisão', async () => {
    let leituras = 0;
    const outroId = 'loja/outro contrato';
    const consultar = vi.fn((id: string) => {
      leituras++;
      return of(
        sucesso(leituras === 1 ? detalhe(id, 'Ativo', '17') : detalhe(outroId, 'Ativo', '999')),
      );
    });
    const alterarStatus = vi.fn((entrada: Parameters<FonteVendas['alterarStatus']>[0]) =>
      of({
        tipo: 'falha',
        codigo: 'conflito-revisao',
        mensagem: 'Revisão obsoleta.',
      } as const),
    );
    const fonte = criarFonte(consultar, alterarStatus);
    const { harness, pagina } = await abrirDetalhe(fonte);
    const dialog = await prepararStatus(pagina, harness, 'Inativo');

    await confirmar(dialog, harness);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(alterarStatus.mock.calls[0]?.[0]).toEqual({
      comando: { vendaId: idVenda, status: 'Inativo' },
      revisaoEsperada: '17',
    });

    dialog.querySelector<HTMLButtonElement>('button:not([data-foco-inicial])')!.click();
    await atualizar(harness);
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(consultar.mock.calls[1]?.[0]).toBe(idVenda);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(pagina.textContent).toContain('Nenhuma nova mudança foi enviada');
    expect(document.activeElement).toBe(pagina.querySelector('[role="alert"][tabindex="-1"]'));
  });

  it('continua enviando após navegar, atualiza coleções/painel no sucesso e nunca repete o comando', async () => {
    const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const alterarStatus = vi.fn((_entrada: Parameters<FonteVendas['alterarStatus']>[0]) =>
      resposta.asObservable(),
    );
    const fonte = criarFonte(() => of(sucesso(registroAtual)), alterarStatus);
    const { harness, pagina } = await abrirDetalhe(fonte);
    const dialog = await prepararStatus(pagina, harness, 'Inativo');
    await confirmar(dialog, harness);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('enviando');

    await harness.navigateByUrl('/vendas/inativas');
    await atualizar(harness);
    expect(TestBed.inject(Router).url).toBe('/vendas/inativas');
    expect(fonte.consultarColecao).toHaveBeenCalledTimes(1);
    expect(harness.routeNativeElement?.textContent).not.toContain(`Cliente ${idVenda}`);
    expect(alterarStatus).toHaveBeenCalledTimes(1);

    const contextoConcorrente: ContextoConfirmacao = {
      operacao: 'cadastro',
      alvo: { tipo: 'colecao', colecao: 'abertas' },
      referencia,
      revisaoEsperada: '17',
      rascunho: { cliente: { nome: 'Cadastro não enviado' } },
    };
    const cadastrarConcorrente = vi.fn(() => of(sucesso(detalhe('cadastro-concorrente'))));
    expect(() =>
      TestBed.inject(ControleConfirmacoes).confirmar(contextoConcorrente, cadastrarConcorrente),
    ).toThrow(ErroConfirmacaoBloqueada);
    expect(cadastrarConcorrente).not.toHaveBeenCalled();

    registroAtual = detalhe(idVenda, 'Inativo', '18', 7000);
    resposta.next(sucesso(registroAtual));
    resposta.complete();
    await atualizar(harness);
    expect(fonte.consultarColecao).toHaveBeenCalledTimes(2);
    expect(harness.routeNativeElement?.textContent).toContain(`Cliente ${idVenda}`);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ControleConfirmacoes).estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: { tipo: 'confirmado' },
    });

    await harness.navigateByUrl('/visao-geral');
    await atualizar(harness);
    expect(fonte.consultarVisaoGeral).toHaveBeenCalledTimes(1);
    expect(harness.routeNativeElement?.textContent).not.toContain(`Cliente ${idVenda}`);
    expect(alterarStatus).toHaveBeenCalledTimes(1);
  });

  it('restaura foco ao cancelar antes do envio e não publica status', async () => {
    const alterarStatus = vi.fn((_entrada: Parameters<FonteVendas['alterarStatus']>[0]) =>
      of(sucesso(detalhe(idVenda, 'Inativo', '18'))),
    );
    const fonte = criarFonte(() => of(sucesso(registroAtual)), alterarStatus);
    const { harness, pagina } = await abrirDetalhe(fonte);
    const dialog = await prepararStatus(pagina, harness, 'Inativo');
    dialog.querySelector<HTMLButtonElement>('button:not([data-foco-inicial])')!.click();
    await harness.fixture.whenStable();

    expect(document.activeElement).toMatchObject({ dataset: { acaoStatus: 'Inativo' } });
    expect(alterarStatus).not.toHaveBeenCalled();
    expect(registroAtual.resumo.statusAdministrativo).toBe('Ativo');
  });
});
