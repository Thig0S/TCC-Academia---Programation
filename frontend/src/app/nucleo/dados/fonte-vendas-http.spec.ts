import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ComandoCadastro, ComandoEdicaoCliente } from '../../funcionalidades/vendas/venda.modelos';
import {
  ComandoCorrecaoPagamento,
  ComandoPagamento,
} from '../../funcionalidades/parcelas/pagamento.modelos';
import { ComandoComRevisao } from './fonte-vendas';
import { ErroContratoApi } from './contratos-api';
import { FonteVendasHttp } from './fonte-vendas-http';
import { REFERENCIA_SESSAO } from './referencia-sessao';

const referencia = '9999-12-31';
const revisao = '9223372036854775807';
const vendaId = 'venda/externa %?&';

function resumoWire(substituicoes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: vendaId,
    cliente: {
      nome: 'Cliente sintético',
      cpf: '52998224725',
      telefone: '11987654321',
      descricao: null,
    },
    dataVenda: '0001-01-01',
    statusAdministrativo: 'Prejuizo',
    situacao: 'ProximosDias',
    valorTotalBaseCentavos: 9007199254740991,
    totalAcrescimosCentavos: 250,
    valorTotalEfetivoCentavos: 9007199254740991,
    totalRecebidoCentavos: 100,
    saldoCentavos: 9007199254740891,
    quantidadePaga: 0,
    quantidadeParcelas: 1,
    proximoVencimento: '9999-12-31',
    revisao,
    referencia,
    ...substituicoes,
  };
}

function parcelaWire(substituicoes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'parcela/externa %',
    numero: 1,
    valorBaseCentavos: 9007199254740991,
    acrescimoCentavos: 0,
    valorEfetivoCentavos: 9007199254740991,
    valorRecebidoCentavos: 0,
    saldoCentavos: 9007199254740991,
    vencimento: '9999-12-31',
    situacao: 'EmAberto',
    dataPagamento: null,
    formaPagamento: null,
    ...substituicoes,
  };
}

function detalheWire(): Record<string, unknown> {
  return {
    resumo: resumoWire(),
    parcelas: [parcelaWire()],
    recebimentos: [
      {
        id: 'recebimento-lote',
        data: '0001-01-01',
        forma: 'CartaoDebito',
        origem: 'HistoricoLote',
        valorCentavos: 100,
        acrescimoCentavos: 0,
        observacao: '',
        alocacoes: [{ parcelaId: 'parcela/externa %', valorCentavos: 100 }],
      },
    ],
  };
}

function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) {
    const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
    return bissexto ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

function relatorioWire(ano = 2024, mes = 2): Record<string, unknown> {
  const prefixo = `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}`;
  const ultimoDia = diasNoMes(ano, mes);
  return {
    referencia,
    inicioMes: `${prefixo}-01`,
    fimMes: `${prefixo}-${String(ultimoDia).padStart(2, '0')}`,
    revisao,
    recebimentos: [
      ...[
        ['entrada', 'Entrada', `${prefixo}-01`, 'Dinheiro', 100],
        [
          'lote',
          'HistoricoLote',
          `${prefixo}-${String(ultimoDia).padStart(2, '0')}`,
          'CartaoCredito',
          200,
        ],
        ['individual', 'Individual', `${prefixo}-02`, 'Pix', 300],
      ].map(([id, origem, data, forma, valorCentavos]) => ({
        id: `venda/externa %/recebimento/${id}`,
        venda: resumoWire(),
        origem,
        data,
        forma,
        valorCentavos,
      })),
    ],
    recebimentosDiarios: Array.from({ length: ultimoDia }, (_, indice) => ({
      data: `${prefixo}-${String(indice + 1).padStart(2, '0')}`,
      totalCentavos: indice === 0 ? 9007199254740991 : 0,
    })),
    vendasDoMes: [],
    saldos: [
      {
        venda: resumoWire({ proximoVencimento: null }),
        saldoCentavos: 0,
        primeiroVencimentoPendente: null,
      },
    ],
    parcelasAtrasadas: [{ venda: resumoWire(), parcela: parcelaWire() }],
    parcelasPrejuizo: [{ venda: resumoWire(), parcela: parcelaWire(), incluirNoTotal: false }],
    totalRecebidoCentavos: 9007199254740991,
    quantidadeVendasMes: 1,
    totalVendasMesCentavos: 9007199254740991,
    totalEmAbertoCentavos: 0,
    totalAtrasadoCentavos: 0,
    totalPrejuizoCentavos: 0,
  };
}

function cadastro(): ComandoCadastro {
  return {
    cliente: {
      nome: 'Cliente sintético',
      cpf: '52998224725',
      telefone: '11987654321',
      descricao: 'descrição',
    },
    dataVenda: '0001-01-01',
    valorTotalCentavos: 9007199254740991,
    quantidadeParcelas: 1,
    entrada: { valorCentavos: 100, data: '0001-01-01', forma: 'Cartão de débito' },
  };
}

function comandoEdicao(): ComandoEdicaoCliente {
  return {
    vendaId,
    cliente: { nome: 'Nome corrigido', cpf: '52998224725', telefone: '11987654321' },
  };
}

function comandoPagamento(): ComandoPagamento {
  return {
    vendaId,
    parcelaId: 'parcela/externa %',
    valorCentavos: 500,
    data: '9999-12-31',
    forma: 'Cartão de crédito',
    observacao: 'baixa sintética',
  };
}

function comandoCorrecao(): ComandoCorrecaoPagamento {
  return {
    vendaId,
    recebimentoId: 'recebimento/externo %',
    valorCentavos: 450,
    data: '9999-12-31',
    forma: 'Pix',
    observacao: 'correção sintética',
  };
}

describe('FonteVendasHttp', () => {
  let fonte: FonteVendasHttp;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FonteVendasHttp,
        { provide: REFERENCIA_SESSAO, useValue: referencia },
      ],
    });
    fonte = TestBed.inject(FonteVendasHttp);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend?.verify();
    TestBed.resetTestingModule();
  });

  it('consulta coleção com revisão no envelope mesmo quando vazia', async () => {
    const respostaPendente = firstValueFrom(fonte.consultarColecao('prejuizos'));
    const requisicao = backend.expectOne('/api/v1/vendas?colecao=Prejuizo&referencia=9999-12-31');

    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ colecao: 'Prejuizo', referencia, revisao, vendas: [] });

    await expect(respostaPendente).resolves.toEqual({
      colecao: 'prejuizos',
      referencia,
      revisao,
      vendas: [],
    });
  });

  it('codifica ID opaco uma vez e mapeia detalhe, enumerações, null e datas civis extremas', async () => {
    const respostaPendente = firstValueFrom(fonte.consultarVenda(vendaId));
    const requisicao = backend.expectOne(
      '/api/v1/vendas/detalhe?vendaId=venda%2Fexterna%20%25%3F%26&referencia=9999-12-31',
    );

    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('vendaId')).toBe(vendaId);
    requisicao.flush(detalheWire());

    const resultado = await respostaPendente;
    expect(resultado.tipo).toBe('sucesso');
    if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
    expect(resultado.valor.resumo).toMatchObject({
      id: vendaId,
      dataVenda: '0001-01-01',
      statusAdministrativo: 'Prejuízo',
      situacao: 'Próximos dias',
      valorTotalCentavos: 9007199254740991,
      revisao,
      referencia,
      cliente: { descricao: null },
    });
    expect(resultado.valor.parcelas[0]).toMatchObject({
      id: 'parcela/externa %',
      situacao: 'Aberto',
      vencimento: '9999-12-31',
      dataPagamento: null,
      formaPagamento: null,
    });
    expect(resultado.valor.recebimentos[0]).toMatchObject({
      forma: 'Cartão de débito',
      origem: 'Lote',
    });
  });

  it('consulta painel e relatório com referência fixa e mapeamento wire explícito', async () => {
    const painelPendente = firstValueFrom(fonte.consultarVisaoGeral());
    backend.expectOne(`/api/v1/visao-geral?referencia=${referencia}`).flush({
      referencia,
      revisao,
      indicadores: {
        totalEmAbertoCentavos: 1,
        valoresEmAtrasoCentavos: 2,
        recebidoNoMesCentavos: 3,
        quantidadeVendasAtivas: 4,
      },
      vendasRecentes: [resumoWire()],
      parcelasProximas: [{ venda: resumoWire(), parcela: parcelaWire() }],
      parcelasAtrasadas: [],
    });
    const painel = await painelPendente;
    expect(painel.indicadores.vendasCadastradas).toBe(4);
    expect(painel.vendasRecentes[0].statusAdministrativo).toBe('Prejuízo');
    expect(painel.parcelasProximas[0].parcela.situacao).toBe('Aberto');

    const relatorioPendente = firstValueFrom(fonte.consultarRelatorioMensal('2024-02-01'));
    const requisicao = backend.expectOne(
      `/api/v1/relatorios/mensal?ano=2024&mes=2&referencia=${referencia}`,
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(relatorioWire());
    const relatorio = await relatorioPendente;

    expect(relatorio).toMatchObject({
      inicioMes: '2024-02-01',
      fimMes: '2024-02-29',
      revisao,
      totalRecebidoCentavos: 9007199254740991,
    });
    expect(relatorio.recebimentos.map(({ origem }) => origem)).toEqual([
      'Entrada',
      'Lote',
      'Individual',
    ]);
    expect(relatorio.recebimentos[1]).toMatchObject({
      forma: 'Cartão de crédito',
      valorCentavos: 200,
    });
    expect(relatorio.saldos[0].primeiroVencimentoPendente).toBeNull();
    expect(relatorio.saldos[0].venda.proximoVencimento).toBeNull();
    expect(relatorio.parcelasAtrasadas[0].parcela).toMatchObject({
      dataPagamento: null,
      formaPagamento: null,
    });
    expect(relatorio.recebimentosDiarios).toHaveLength(29);
  });

  it.each([
    [1, 1, '0001-01-01', '0001-01-31'],
    [9999, 12, '9999-12-01', '9999-12-31'],
  ])('mapeia relatório mensal completo nos limites civis %s/%s', async (ano, mes, inicio, fim) => {
    const pendente = firstValueFrom(fonte.consultarRelatorioMensal(inicio));
    const requisicao = backend.expectOne(
      `/api/v1/relatorios/mensal?ano=${ano}&mes=${mes}&referencia=${referencia}`,
    );
    requisicao.flush(relatorioWire(Number(ano), Number(mes)));
    const relatorio = await pendente;

    expect(relatorio).toMatchObject({ inicioMes: inicio, fimMes: fim });
    expect(relatorio.recebimentosDiarios).toHaveLength(diasNoMes(Number(ano), Number(mes)));
    expect(relatorio.recebimentosDiarios[0].data).toBe(inicio);
    expect(relatorio.recebimentosDiarios.at(-1)?.data).toBe(fim);
  });

  it('mapeia os cinco comandos para paths e corpos wire sem renovar revisão', async () => {
    const revisaoObservada = '9007199254740993';
    const base = { revisaoEsperada: revisaoObservada };

    const cadastroPendente = firstValueFrom(fonte.cadastrarVenda({ comando: cadastro(), ...base }));
    const cadastroRequest = backend.expectOne('/api/v1/vendas');
    expect(cadastroRequest.request.method).toBe('POST');
    expect(cadastroRequest.request.body).toEqual({
      nome: 'Cliente sintético',
      cpf: '52998224725',
      telefone: '11987654321',
      descricao: 'descrição',
      dataVenda: '0001-01-01',
      valorTotalCentavos: 9007199254740991,
      quantidadeParcelas: 1,
      referencia,
      revisaoEsperada: revisaoObservada,
      entrada: { valorCentavos: 100, forma: 'CartaoDebito' },
    });
    cadastroRequest.flush(detalheWire(), { status: 201, statusText: 'Created' });
    expect((await cadastroPendente).tipo).toBe('sucesso');

    const edicaoPendente = firstValueFrom(
      fonte.editarCliente({ comando: comandoEdicao(), ...base }),
    );
    const edicaoRequest = backend.expectOne('/api/v1/vendas/cliente');
    expect(edicaoRequest.request.method).toBe('PUT');
    expect(edicaoRequest.request.body).toEqual({
      vendaId,
      nome: 'Nome corrigido',
      cpf: '52998224725',
      telefone: '11987654321',
      descricao: null,
      referencia,
      revisaoEsperada: revisaoObservada,
    });
    edicaoRequest.flush(detalheWire());
    expect((await edicaoPendente).tipo).toBe('sucesso');

    const statusPendente = firstValueFrom(
      fonte.alterarStatus({
        comando: { vendaId, status: 'Prejuízo' },
        ...base,
      }),
    );
    const statusRequest = backend.expectOne('/api/v1/vendas/status');
    expect(statusRequest.request.method).toBe('PUT');
    expect(statusRequest.request.body).toEqual({
      vendaId,
      novoStatus: 'Prejuizo',
      referencia,
      revisaoEsperada: revisaoObservada,
    });
    statusRequest.flush(detalheWire());
    expect((await statusPendente).tipo).toBe('sucesso');

    const pagamentoPendente = firstValueFrom(
      fonte.registrarPagamento({ comando: comandoPagamento(), ...base }),
    );
    const pagamentoRequest = backend.expectOne('/api/v1/recebimentos');
    expect(pagamentoRequest.request.method).toBe('POST');
    expect(pagamentoRequest.request.body).toEqual({
      vendaId,
      parcelaId: 'parcela/externa %',
      valorRecebidoCentavos: 500,
      data: referencia,
      forma: 'CartaoCredito',
      observacao: 'baixa sintética',
      referencia,
      revisaoEsperada: revisaoObservada,
    });
    pagamentoRequest.flush(detalheWire());
    expect((await pagamentoPendente).tipo).toBe('sucesso');

    const correcaoPendente = firstValueFrom(
      fonte.corrigirPagamento({ comando: comandoCorrecao(), ...base }),
    );
    const correcaoRequest = backend.expectOne('/api/v1/recebimentos');
    expect(correcaoRequest.request.method).toBe('PUT');
    expect(correcaoRequest.request.body).toEqual({
      vendaId,
      recebimentoId: 'recebimento/externo %',
      valorRecebidoCentavos: 450,
      data: referencia,
      forma: 'Pix',
      observacao: 'correção sintética',
      referencia,
      revisaoEsperada: revisaoObservada,
    });
    correcaoRequest.flush(detalheWire());
    expect((await correcaoPendente).tipo).toBe('sucesso');
  });

  it('recusa revisão ausente/não canônica antes de enviar qualquer comando', async () => {
    const invalidas = ['', '01', '-1', '+1', ' 1', '9223372036854775808'];
    const executar = (revisaoEsperada: string | null) => [
      fonte.cadastrarVenda({ comando: cadastro(), revisaoEsperada }),
      fonte.editarCliente({ comando: comandoEdicao(), revisaoEsperada }),
      fonte.alterarStatus({ comando: { vendaId, status: 'Ativo' }, revisaoEsperada }),
      fonte.registrarPagamento({ comando: comandoPagamento(), revisaoEsperada }),
      fonte.corrigirPagamento({ comando: comandoCorrecao(), revisaoEsperada }),
    ];

    for (const valor of [null, ...invalidas]) {
      for (const request of executar(valor)) {
        await expect(firstValueFrom(request)).rejects.toBeInstanceOf(ErroContratoApi);
      }
    }
    backend.expectNone(() => true);
  });

  it('converte problema de conflito estruturado em falha de domínio tipada', async () => {
    const respostaPendente = firstValueFrom(
      fonte.alterarStatus({
        comando: { vendaId, status: 'Ativo' },
        revisaoEsperada: '4',
      }),
    );
    backend.expectOne('/api/v1/vendas/status').flush(
      {
        type: 'about:blank',
        title: 'Conflito',
        status: 409,
        detail: 'O estado mudou; consulte novamente.',
        codigo: 'conflito-revisao',
      },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(respostaPendente).resolves.toEqual({
      tipo: 'falha',
      codigo: 'conflito-revisao',
      mensagem: 'O estado mudou; consulte novamente.',
    });
  });

  it('preserva erros estruturados de campo único e validação múltipla do cadastro', async () => {
    const individualPendente = firstValueFrom(
      fonte.cadastrarVenda({ comando: cadastro(), revisaoEsperada: revisao }),
    );
    backend.expectOne('/api/v1/vendas').flush(
      {
        type: 'about:blank',
        title: 'Requisição inválida',
        status: 400,
        detail: 'CPF inválido.',
        codigo: 'cpf-invalido',
        campo: 'cpf',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await expect(individualPendente).resolves.toEqual({
      tipo: 'validacao',
      codigo: 'cpf-invalido',
      mensagem: 'CPF inválido.',
      campo: 'cpf',
    });

    const multiplosPendente = firstValueFrom(
      fonte.cadastrarVenda({ comando: cadastro(), revisaoEsperada: revisao }),
    );
    backend.expectOne('/api/v1/vendas').flush(
      {
        type: 'about:blank',
        title: 'Requisição inválida',
        status: 400,
        detail: 'Um ou mais campos da requisição não são válidos.',
        codigo: 'erros-validacao',
        erros: [
          { codigo: 'cpf-invalido', mensagem: 'CPF inválido.', campo: 'cpf' },
          {
            codigo: 'dados-recebimento-invalidos',
            mensagem: 'Informe uma forma aceita para a entrada.',
            campo: 'entrada.forma',
          },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await expect(multiplosPendente).resolves.toEqual({
      tipo: 'validacao',
      codigo: 'erros-validacao',
      mensagem: 'Um ou mais campos da requisição não são válidos.',
      erros: [
        { codigo: 'cpf-invalido', mensagem: 'CPF inválido.', campo: 'cpf' },
        {
          codigo: 'dados-recebimento-invalidos',
          mensagem: 'Informe uma forma aceita para a entrada.',
          campo: 'entrada.forma',
        },
      ],
    });
  });

  it('omite descrição vazia e envia uma única entrada com centavos e data civil', async () => {
    const comando = cadastro();
    const pendente = firstValueFrom(
      fonte.cadastrarVenda({
        comando: {
          ...comando,
          cliente: { ...comando.cliente, descricao: undefined },
          dataVenda: '2027-01-31',
          valorTotalCentavos: 100000,
          quantidadeParcelas: 4,
          entrada: { valorCentavos: 20000, data: '2027-01-31', forma: 'Pix' },
        },
        revisaoEsperada: revisao,
      }),
    );
    const requisicao = backend.expectOne('/api/v1/vendas');
    expect(requisicao.request.body).toEqual({
      nome: 'Cliente sintético',
      cpf: '52998224725',
      telefone: '11987654321',
      dataVenda: '2027-01-31',
      valorTotalCentavos: 100000,
      quantidadeParcelas: 4,
      referencia,
      revisaoEsperada: revisao,
      entrada: { valorCentavos: 20000, forma: 'Pix' },
    });
    expect(Array.isArray(requisicao.request.body.entrada)).toBe(false);
    requisicao.flush(detalheWire(), { status: 201, statusText: 'Created' });
    expect((await pendente).tipo).toBe('sucesso');
  });

  it('rejeita resposta inválida de POST como exceção não confirmada', async () => {
    const pendente = firstValueFrom(
      fonte.cadastrarVenda({ comando: cadastro(), revisaoEsperada: revisao }),
    );
    backend
      .expectOne('/api/v1/vendas')
      .flush({ id: 'sem representação de venda válida' }, { status: 201, statusText: 'Created' });

    await expect(pendente).rejects.toBeInstanceOf(ErroContratoApi);
  });

  it.each([
    ['revisão numérica', resumoWire({ revisao: 9223372036854775807 })],
    ['revisão além de Int64', resumoWire({ revisao: '9223372036854775808' })],
    ['centavos fracionários', resumoWire({ valorTotalBaseCentavos: 1.5 })],
    ['centavos além do inteiro seguro', resumoWire({ valorTotalBaseCentavos: 9007199254740992 })],
    ['data impossível', resumoWire({ dataVenda: '9999-02-29' })],
    ['enum wire desconhecido', resumoWire({ situacao: 'EmAberto?' })],
    [
      'descrição sem null/string',
      resumoWire({
        cliente: {
          nome: 'Cliente sintético',
          cpf: '52998224725',
          telefone: '11987654321',
          descricao: 0,
        },
      }),
    ],
  ])('recusa resposta inválida (%s) sem publicar sucesso', async (_caso, resposta) => {
    const pendente = firstValueFrom(fonte.consultarColecao('prejuizos'));
    backend.expectOne('/api/v1/vendas?colecao=Prejuizo&referencia=9999-12-31').flush({
      colecao: 'Prejuizo',
      referencia,
      revisao,
      vendas: [resposta],
    });

    await expect(pendente).rejects.toBeInstanceOf(ErroContratoApi);
  });

  it('recusa coleção com lista nula em vez de tratar como coleção vazia', async () => {
    const pendente = firstValueFrom(fonte.consultarColecao('prejuizos'));
    backend.expectOne('/api/v1/vendas?colecao=Prejuizo&referencia=9999-12-31').flush({
      colecao: 'Prejuizo',
      referencia,
      revisao,
      vendas: null,
    });

    await expect(pendente).rejects.toBeInstanceOf(ErroContratoApi);
  });

  it('recusa referência divergente, limites mensais inconsistentes e comandos financeiros incompletos', async () => {
    const painelPendente = firstValueFrom(fonte.consultarVisaoGeral());
    backend.expectOne(`/api/v1/visao-geral?referencia=${referencia}`).flush({
      referencia: '2026-01-01',
      revisao,
      indicadores: {
        totalEmAbertoCentavos: 0,
        valoresEmAtrasoCentavos: 0,
        recebidoNoMesCentavos: 0,
        quantidadeVendasAtivas: 0,
      },
      vendasRecentes: [],
      parcelasProximas: [],
      parcelasAtrasadas: [],
    });
    await expect(painelPendente).rejects.toBeInstanceOf(ErroContratoApi);

    const mesPendente = firstValueFrom(fonte.consultarRelatorioMensal('2024-02-01'));
    backend.expectOne('/api/v1/relatorios/mensal?ano=2024&mes=2&referencia=9999-12-31').flush({
      ...relatorioWire(),
      fimMes: '2024-02-28',
    });
    await expect(mesPendente).rejects.toBeInstanceOf(ErroContratoApi);

    await expect(
      firstValueFrom(
        fonte.registrarPagamento({
          comando: { ...comandoPagamento(), valorCentavos: undefined },
          revisaoEsperada: revisao,
        }),
      ),
    ).rejects.toBeInstanceOf(ErroContratoApi);
    backend.expectNone('/api/v1/recebimentos');
  });
});
