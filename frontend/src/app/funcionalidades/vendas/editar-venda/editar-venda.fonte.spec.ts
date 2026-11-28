import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { appConfig } from '../../../app.config';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { ErroContratoApi } from '../../../nucleo/dados/contratos-api';
import { FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import {
  ColecaoVendasLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
} from '../../../nucleo/dados/modelos-leitura';
import { RetornoFormulario } from '../../../nucleo/navegacao/retorno-formulario';
import { ComandoCadastro, Resultado } from '../venda.modelos';

const referencia = '2027-01-31';
const idInicial = 'venda/cliente % externo';
const clienteInicial = {
  nome: 'Cliente original',
  cpf: '90000000175',
  telefone: '0012345678',
  descricao: 'Observação original',
};

function detalhe(
  id = idInicial,
  revisao: string | null = '12',
  cliente: VendaResumoLeitura['cliente'] = clienteInicial,
): VendaDetalheLeitura {
  return {
    resumo: {
      id,
      cliente,
      dataVenda: '2027-01-01',
      statusAdministrativo: 'Ativo',
      situacao: 'Em aberto',
      valorTotalCentavos: 10000,
      acrescimosCentavos: 500,
      valorTotalEfetivoCentavos: 10500,
      totalRecebidoCentavos: 2500,
      saldoCentavos: 8000,
      quantidadePaga: 1,
      quantidadeParcelas: 3,
      proximoVencimento: '2027-02-01',
      revisao,
      referencia,
    },
    parcelas: [],
    recebimentos: [],
  };
}

function sucesso(valor = detalhe()): Resultado<VendaDetalheLeitura> {
  return { tipo: 'sucesso', valor, mensagem: 'Dados do cliente atualizados.' };
}

function colecao(): ColecaoVendasLeitura {
  return { colecao: 'abertas', referencia, revisao: '12', vendas: [] };
}

function clienteLeitura(cliente: ComandoCadastro['cliente']): VendaResumoLeitura['cliente'] {
  return {
    nome: cliente.nome,
    cpf: cliente.cpf,
    telefone: cliente.telefone,
    descricao: cliente.descricao ?? null,
  };
}

function criarFonte(
  consultarVenda: (id: string) => Observable<Resultado<VendaDetalheLeitura>> = () => of(sucesso()),
  editarCliente: (
    entrada: Parameters<FonteVendas['editarCliente']>[0],
  ) => Observable<Resultado<VendaDetalheLeitura>> = () => of(sucesso()),
): FonteVendas {
  return {
    referencia,
    consultarColecao: vi.fn(() => of(colecao())),
    consultarVenda: vi.fn(consultarVenda),
    consultarVisaoGeral: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    consultarRelatorioMensal: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    cadastrarVenda: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    editarCliente: vi.fn(editarCliente),
    alterarStatus: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    registrarPagamento: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    corrigirPagamento: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
  };
}

describe('Edição pela fonte assíncrona', () => {
  let fonte: FonteVendas;

  beforeEach(() => {
    fonte = criarFonte((_id) => of(sucesso(detalhe())));
    TestBed.configureTestingModule({
      providers: [
        ...(appConfig.providers ?? []),
        { provide: MODO_APLICACAO, useValue: 'local' },
        { provide: FONTE_VENDAS, useValue: fonte },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  function url(id: string): string {
    const router = TestBed.inject(Router);
    return router.serializeUrl(router.createUrlTree(['/vendas', id, 'editar']));
  }

  async function abrir(id = idInicial) {
    const harness = await RouterTestingHarness.create(url(id));
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const preencher = async (campoId: string, valor: string) => {
      const campo = pagina.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${campoId}`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      await harness.fixture.whenStable();
    };
    const enviar = () =>
      pagina
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { harness, pagina, preencher, enviar };
  }

  it('carrega os quatro campos do ID opaco e envia somente cliente com a revisão observada', async () => {
    const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const editar = vi.fn((_entrada: Parameters<FonteVendas['editarCliente']>[0]) =>
      resposta.asObservable(),
    );
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher, enviar } = await abrir();
    const navegacao = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    expect(fonte.consultarVenda).toHaveBeenCalledWith(idInicial);
    expect(pagina.querySelectorAll('input, textarea')).toHaveLength(4);
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      clienteInicial.nome,
    );
    expect(pagina.querySelector<HTMLInputElement>('#cpf-cliente')?.value).toBe(clienteInicial.cpf);
    expect(pagina.querySelector<HTMLInputElement>('#telefone-cliente')?.value).toBe(
      clienteInicial.telefone,
    );
    expect(pagina.querySelector<HTMLTextAreaElement>('#descricao-cliente')?.value).toBe(
      clienteInicial.descricao,
    );

    await preencher('nome-cliente', 'Cliente atualizado');
    await preencher('telefone-cliente', '(11) 98765-4321');
    await preencher('descricao-cliente', 'Nova descrição');
    enviar();
    enviar();

    expect(editar).toHaveBeenCalledTimes(1);
    const entrada = editar.mock.calls[0]?.[0]!;
    expect(entrada.revisaoEsperada).toBe('12');
    expect(entrada.comando).toEqual({
      vendaId: idInicial,
      cliente: {
        nome: 'Cliente atualizado',
        cpf: clienteInicial.cpf,
        telefone: '(11) 98765-4321',
        descricao: 'Nova descrição',
      },
    });
    expect(Object.keys(entrada.comando)).toEqual(['vendaId', 'cliente']);
    expect(navegacao).not.toHaveBeenCalled();

    resposta.next(
      sucesso(
        detalhe(idInicial, '13', {
          nome: 'Cliente atualizado',
          cpf: clienteInicial.cpf,
          telefone: '11987654321',
          descricao: 'Nova descrição',
        }),
      ),
    );
    resposta.complete();
    await harness.fixture.whenStable();

    expect(TestBed.inject(ControleConsultas).geracao()).toBe(1);
    expect(navegacao).toHaveBeenCalledWith(['/vendas', idInicial]);
    expect(pagina.querySelector('[role="alert"]')).toBeNull();
  });

  it('oferece edição na tela de detalhe local sem depender da fonte demonstrativa', async () => {
    const router = TestBed.inject(Router);
    const detalheUrl = router.serializeUrl(router.createUrlTree(['/vendas', idInicial]));
    const harness = await RouterTestingHarness.create(detalheUrl);
    await harness.fixture.whenStable();

    const editar = harness.routeNativeElement?.querySelector<HTMLAnchorElement>(
      'a[data-foco-formulario^="editar-"]',
    );
    expect(editar).not.toBeNull();
    expect(editar?.getAttribute('href')).toContain('/editar');
    expect(fonte.consultarVenda).toHaveBeenCalledWith(idInicial);
  });

  it('não prepara edição se o detalhe retornado não pertence ao ID da rota', async () => {
    fonte = criarFonte((_id) => of(sucesso(detalhe('outro/ID', '99'))));
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { pagina } = await abrir(idInicial);

    expect(pagina.querySelector('form')).toBeNull();
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Nenhuma edição foi enviada',
    );
    expect(fonte.editarCliente).not.toHaveBeenCalled();
  });

  it('envia os quatro valores originais em no-op sem ampliar o comando financeiro', async () => {
    const editar = vi.fn((entrada: Parameters<FonteVendas['editarCliente']>[0]) =>
      of(sucesso(detalhe(entrada.comando.vendaId, entrada.revisaoEsperada, clienteInicial))),
    );
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, enviar } = await abrir();

    enviar();
    await harness.fixture.whenStable();

    expect(editar).toHaveBeenCalledTimes(1);
    expect(editar.mock.calls[0]?.[0]).toEqual({
      comando: { vendaId: idInicial, cliente: clienteInicial },
      revisaoEsperada: '12',
    });
    expect(pagina.querySelector('[role="alert"]')).toBeNull();
    expect(TestBed.inject(ControleConfirmacoes).estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: { tipo: 'confirmado' },
    });
  });

  it('descarta a leitura anterior ao trocar de ID e prepara o novo rascunho/revisão', async () => {
    const leituraA = new Subject<Resultado<VendaDetalheLeitura>>();
    const leituraB = new Subject<Resultado<VendaDetalheLeitura>>();
    const idA = 'venda/anterior';
    const idB = 'venda/atual';
    const editar = vi.fn((entrada: Parameters<FonteVendas['editarCliente']>[0]) =>
      of(sucesso(detalhe(idB, '42', clienteLeitura(entrada.comando.cliente)))),
    );
    fonte = criarFonte(
      (id) => (id === idA ? leituraA.asObservable() : leituraB.asObservable()),
      editar,
    );
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create(url(idA));
    await harness.navigateByUrl(url(idB));
    leituraB.next(
      sucesso(
        detalhe(idB, '42', {
          nome: 'Cliente B',
          cpf: '90000000175',
          telefone: '11912345678',
          descricao: 'Venda B',
        }),
      ),
    );
    leituraB.complete();
    await harness.fixture.whenStable();
    leituraA.next(sucesso(detalhe(idA, '41', { ...clienteInicial, nome: 'Cliente A atrasado' })));
    leituraA.complete();
    await harness.fixture.whenStable();

    const pagina = harness.routeNativeElement!;
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe('Cliente B');
    const campoNome = pagina.querySelector<HTMLInputElement>('#nome-cliente')!;
    campoNome.value = 'Cliente B editado';
    campoNome.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    pagina.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await harness.fixture.whenStable();

    expect(editar).toHaveBeenCalledTimes(1);
    expect(editar.mock.calls[0]?.[0]).toMatchObject({
      comando: { vendaId: idB, cliente: { nome: 'Cliente B editado' } },
      revisaoEsperada: '42',
    });
  });

  it('preserva rascunho no conflito e só adquire nova revisão após recarga explícita', async () => {
    let leituras = 0;
    const consulta = vi.fn(() => {
      leituras++;
      return of(sucesso(detalhe(idInicial, leituras === 1 ? '12' : '13')));
    });
    const editar = vi.fn((entrada: Parameters<FonteVendas['editarCliente']>[0]) =>
      entrada.revisaoEsperada === '12'
        ? of({ tipo: 'falha', codigo: 'conflito-revisao', mensagem: 'Revisão antiga.' } as const)
        : of(sucesso(detalhe(idInicial, '14', clienteLeitura(entrada.comando.cliente)))),
    );
    fonte = criarFonte(consulta, editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher, enviar } = await abrir();
    await preencher('nome-cliente', 'Rascunho preservado');
    enviar();
    await harness.fixture.whenStable();

    expect(editar).toHaveBeenCalledTimes(1);
    expect(consulta).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      'Rascunho preservado',
    );
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('recarregue o detalhe');
    expect(pagina.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);

    [...pagina.querySelectorAll<HTMLButtonElement>('button')]
      .find((botao) => botao.textContent?.includes('Recarregar detalhe antes'))!
      .click();
    await harness.fixture.whenStable();
    expect(consulta).toHaveBeenCalledTimes(2);
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      'Rascunho preservado',
    );
    expect(pagina.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(false);

    enviar();
    await harness.fixture.whenStable();
    expect(editar).toHaveBeenCalledTimes(2);
    expect(editar.mock.calls.map(([entrada]) => entrada.revisaoEsperada)).toEqual(['12', '13']);
    expect(editar.mock.calls[1]?.[0].comando.cliente.nome).toBe('Rascunho preservado');
  });

  it('associa erro de cliente ao campo e envia o CPF repetido sem impor unicidade', async () => {
    const editar = vi.fn(() =>
      of({
        tipo: 'validacao',
        codigo: 'erros-validacao',
        mensagem: 'Há campos inválidos.',
        erros: [{ codigo: 'cpf-invalido', mensagem: 'CPF recusado.', campo: 'cpf' }],
      } as const),
    );
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher, enviar } = await abrir();
    await preencher('nome-cliente', 'Nome alterado');
    await preencher('cpf-cliente', '900.000.001-75');
    enviar();
    await harness.fixture.whenStable();

    expect(pagina.querySelector('#erro-cpf')?.textContent).toContain('CPF recusado.');
    expect(pagina.querySelector<HTMLInputElement>('#cpf-cliente')?.value).toBe('900.000.001-75');
    expect(document.activeElement).toBe(pagina.querySelector('#cpf-cliente'));
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe('Nome alterado');
  });

  it('apresenta resumo seguro para campo desconhecido e preserva todos os valores', async () => {
    const editar = vi.fn(() =>
      of({
        tipo: 'validacao',
        codigo: 'erros-validacao',
        mensagem: 'Detalhes internos.',
        erros: [
          {
            codigo: 'erro-interno',
            mensagem: 'Marcador interno do servidor.',
            campo: 'cliente.secreto',
          },
        ],
      } as const),
    );
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher, enviar } = await abrir();
    await preencher('descricao-cliente', 'Rascunho em edição');
    enviar();
    await harness.fixture.whenStable();

    const alerta = pagina.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alerta).toContain('A API recusou os dados da edição.');
    expect(alerta).not.toContain('Marcador interno');
    expect(alerta).not.toContain('cliente.secreto');
    expect(pagina.querySelector<HTMLTextAreaElement>('#descricao-cliente')?.value).toBe(
      'Rascunho em edição',
    );
  });

  it('bloqueia replay e mantém rascunho quando a resposta do PUT é inválida', async () => {
    const editar = vi.fn(() => throwError(() => new ErroContratoApi('Resposta incompatível.')));
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher, enviar } = await abrir();
    const navegacao = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await preencher('nome-cliente', 'Rascunho incerto');
    enviar();
    await harness.fixture.whenStable();

    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('incerto');
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('não reenvie');
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe('Rascunho incerto');
    expect(pagina.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);
    expect(navegacao).not.toHaveBeenCalled();
    enviar();
    await harness.fixture.whenStable();
    expect(editar).toHaveBeenCalledTimes(1);
  });

  it('classifica como incerto um sucesso do PUT com ID diferente do alvo confirmado', async () => {
    const editar = vi.fn(() => of(sucesso(detalhe('outro/ID', '13'))));
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher, enviar } = await abrir();
    const navegacao = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await preencher('nome-cliente', 'Rascunho preservado');
    enviar();
    await harness.fixture.whenStable();

    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('incerto');
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('não reenvie');
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      'Rascunho preservado',
    );
    expect(navegacao).not.toHaveBeenCalled();
  });

  it('cancelar antes do envio retorna ao detalhe e não publica edição', async () => {
    const editar = vi.fn((_entrada: Parameters<FonteVendas['editarCliente']>[0]) => of(sucesso()));
    fonte = criarFonte((_id) => of(sucesso(detalhe())), editar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencher } = await abrir();
    await preencher('nome-cliente', 'Alteração descartada');
    [...pagina.querySelectorAll<HTMLButtonElement>('button')]
      .find((botao) => botao.textContent?.trim() === 'Cancelar')!
      .click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe(url(idInicial).replace('/editar', ''));
    expect(editar).not.toHaveBeenCalled();
    expect(TestBed.inject(RetornoFormulario).consumir()).toBe(`editar-${idInicial}`);
  });
});
