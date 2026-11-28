import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { appConfig } from '../../../app.config';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import { ColecaoVendasLeitura, VendaDetalheLeitura } from '../../../nucleo/dados/modelos-leitura';
import { ErroContratoApi } from '../../../nucleo/dados/contratos-api';
import { Resultado } from '../venda.modelos';
import { RetornoFormulario } from '../../../nucleo/navegacao/retorno-formulario';

const referencia = '2027-01-31';

function colecao(revisao: string | null = '15'): ColecaoVendasLeitura {
  return { colecao: 'abertas', referencia, revisao, vendas: [] };
}

function sucesso(id = 'id/confirmado'): Resultado<VendaDetalheLeitura> {
  return {
    tipo: 'sucesso',
    mensagem: 'Venda cadastrada.',
    valor: {
      resumo: { id } as VendaDetalheLeitura['resumo'],
      parcelas: [],
      recebimentos: [],
    },
  };
}

function criarFonte(
  consultarColecao: () => Observable<ColecaoVendasLeitura> = () => of(colecao()),
  cadastrarVenda: (
    entrada: Parameters<FonteVendas['cadastrarVenda']>[0],
  ) => Observable<Resultado<VendaDetalheLeitura>> = () => of(sucesso()),
): FonteVendas {
  return {
    referencia,
    consultarColecao: vi.fn(consultarColecao),
    consultarVenda: vi.fn((): Observable<Resultado<VendaDetalheLeitura>> =>
      of({ tipo: 'inexistencia', codigo: 'venda-inexistente', mensagem: 'Ausente.' }),
    ),
    consultarVisaoGeral: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    consultarRelatorioMensal: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
    cadastrarVenda: vi.fn(cadastrarVenda),
    editarCliente: vi.fn(() => {
      throw new Error('Não usado neste teste.');
    }),
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

describe('Cadastro pela fonte assíncrona', () => {
  let fonte: FonteVendas;

  beforeEach(() => {
    fonte = criarFonte();
    TestBed.configureTestingModule({
      providers: [
        ...(appConfig.providers ?? []),
        { provide: MODO_APLICACAO, useValue: 'local' },
        { provide: FONTE_VENDAS, useValue: fonte },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  async function abrir() {
    const harness = await RouterTestingHarness.create('/vendas/nova');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const preencher = async (id: string, valor: string) => {
      const campo = pagina.querySelector<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(`#${id}`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      if (campo.tagName === 'SELECT') campo.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
    };
    const preencherValidos = async (comEntrada = false) => {
      for (const [id, valor] of Object.entries({
        'nome-cliente': 'Cliente sintético cadastro',
        'cpf-cliente': '900.000.001-75',
        'telefone-cliente': '(00) 1234-5678',
        'tem-entrada': comEntrada ? 'sim' : 'nao',
        'valor-total': comEntrada ? '1000' : '100',
        'quantidade-parcelas': comEntrada ? '4' : '3',
        ...(comEntrada ? { 'valor-entrada': '200', 'forma-entrada': 'Pix' } : {}),
      })) {
        await preencher(id, valor);
      }
    };
    const enviar = () =>
      pagina
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { harness, pagina, preencher, preencherValidos, enviar };
  }

  it('não habilita nem envia até a coleção fornecer a revisão observada', async () => {
    const resposta = new Subject<ColecaoVendasLeitura>();
    const consulta = vi.fn(() => resposta.asObservable());
    fonte = criarFonte(consulta);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });

    const { harness, pagina, preencherValidos, enviar } = await abrir();
    await preencherValidos();
    const confirmar = pagina.querySelector<HTMLButtonElement>('[type="submit"]')!;
    expect(confirmar.disabled).toBe(true);
    enviar();
    await harness.fixture.whenStable();
    expect(fonte.cadastrarVenda).not.toHaveBeenCalled();
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Aguarde uma consulta válida',
    );

    resposta.next(colecao('9007199254740993'));
    resposta.complete();
    await harness.fixture.whenStable();
    expect(confirmar.disabled).toBe(false);
  });

  it('falha na consulta sem fallback/escrita e só libera após retry explícito bem-sucedido', async () => {
    let tentativas = 0;
    const consulta = vi.fn(() => {
      tentativas++;
      return tentativas === 1
        ? throwError(() => new Error('API indisponível.'))
        : of(colecao('22'));
    });
    fonte = criarFonte(consulta);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencherValidos, enviar } = await abrir();
    await preencherValidos();

    const confirmar = pagina.querySelector<HTMLButtonElement>('[type="submit"]')!;
    expect(confirmar.disabled).toBe(true);
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Nenhum cadastro foi enviado',
    );
    enviar();
    await harness.fixture.whenStable();
    expect(fonte.cadastrarVenda).not.toHaveBeenCalled();

    [...pagina.querySelectorAll<HTMLButtonElement>('button')]
      .find((botao) => botao.textContent?.includes('Tentar consultar novamente'))!
      .click();
    await harness.fixture.whenStable();
    expect(consulta).toHaveBeenCalledTimes(2);
    expect(confirmar.disabled).toBe(false);
    expect(fonte.cadastrarVenda).not.toHaveBeenCalled();
  });

  it('não aceita revisão nula no modo local, mesmo após consulta bem-sucedida', async () => {
    fonte = criarFonte(() => of(colecao(null)));
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { pagina, preencherValidos, enviar } = await abrir();
    await preencherValidos();

    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'não forneceu uma revisão válida',
    );
    expect(pagina.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);
    enviar();
    expect(fonte.cadastrarVenda).not.toHaveBeenCalled();
  });

  it('cancela antes do envio sem publicar cadastro e conserva o retorno lógico de foco', async () => {
    const { harness, pagina, preencherValidos } = await abrir();
    await preencherValidos();
    [...pagina.querySelectorAll<HTMLButtonElement>('button')]
      .find((botao) => botao.textContent?.trim() === 'Cancelar')!
      .click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/vendas');
    expect(fonte.cadastrarVenda).not.toHaveBeenCalled();
    expect(TestBed.inject(RetornoFormulario).consumir()).toBe('nova-venda');
  });

  it('envia uma escrita com revisão/cents/entrada observadas e navega apenas após confirmação', async () => {
    const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
    const cadastrar = vi.fn((_entrada: Parameters<FonteVendas['cadastrarVenda']>[0]) =>
      resposta.asObservable(),
    );
    fonte = criarFonte(() => of(colecao('9007199254740993')), cadastrar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencherValidos, enviar } = await abrir();
    const geracaoConsultas = TestBed.inject(ControleConsultas);
    expect(geracaoConsultas.geracao()).toBe(0);
    const navegacao = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await preencherValidos(true);

    enviar();
    enviar();
    expect(cadastrar).toHaveBeenCalledTimes(1);
    const entrada = cadastrar.mock.calls[0]?.[0]!;
    expect(entrada.revisaoEsperada).toBe('9007199254740993');
    expect(entrada.comando).toMatchObject({
      dataVenda: referencia,
      valorTotalCentavos: 100000,
      quantidadeParcelas: 4,
      entrada: { valorCentavos: 20000, data: referencia, forma: 'Pix' },
    });
    expect(Array.isArray(entrada.comando.entrada)).toBe(false);
    expect(Object.hasOwn(entrada.comando.cliente, 'descricao')).toBe(false);
    expect(navegacao).not.toHaveBeenCalled();

    resposta.next(sucesso());
    resposta.complete();
    await harness.fixture.whenStable();
    expect(geracaoConsultas.geracao()).toBe(1);
    expect(navegacao).toHaveBeenCalledWith(['/vendas', 'id/confirmado']);
  });

  it('preserva rascunho no 409 e só obtém nova revisão após ação explícita', async () => {
    let quantidadeConsultas = 0;
    const consulta = vi.fn(() => {
      quantidadeConsultas++;
      return of(colecao(quantidadeConsultas === 1 ? '15' : '16'));
    });
    const cadastrar = vi.fn(() =>
      of({
        tipo: 'falha',
        codigo: 'conflito-revisao',
        mensagem: 'A revisão mudou.',
      } as const),
    );
    fonte = criarFonte(consulta, cadastrar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencherValidos, enviar } = await abrir();
    await preencherValidos();
    enviar();
    await harness.fixture.whenStable();

    expect(cadastrar).toHaveBeenCalledTimes(1);
    expect(consulta).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      'Cliente sintético cadastro',
    );
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('recarregue a coleção');
    const confirmar = pagina.querySelector<HTMLButtonElement>('[type="submit"]')!;
    expect(confirmar.disabled).toBe(true);

    [...pagina.querySelectorAll<HTMLButtonElement>('button')]
      .find((botao) => botao.textContent?.includes('Recarregar coleção antes'))!
      .click();
    await harness.fixture.whenStable();
    expect(consulta).toHaveBeenCalledTimes(2);
    expect(cadastrar).toHaveBeenCalledTimes(1);
    expect(confirmar.disabled).toBe(false);
  });

  it('associa Problem Details aos campos conhecidos e foca o primeiro sem perder valores', async () => {
    const cadastrar = vi.fn(() =>
      of({
        tipo: 'validacao',
        codigo: 'erros-validacao',
        mensagem: 'Um ou mais campos são inválidos.',
        erros: [
          { codigo: 'cpf-invalido', mensagem: 'CPF recusado.', campo: 'cpf' },
          {
            codigo: 'dados-recebimento-invalidos',
            mensagem: 'Forma da entrada recusada.',
            campo: 'entrada.forma',
          },
        ],
      } as const),
    );
    fonte = criarFonte(() => of(colecao()), cadastrar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencherValidos, enviar } = await abrir();
    await preencherValidos(true);
    enviar();
    await harness.fixture.whenStable();

    expect(pagina.querySelector('#erro-cpf')?.textContent).toContain('CPF recusado.');
    expect(pagina.querySelector('#erro-forma-entrada')?.textContent).toContain(
      'Forma da entrada recusada.',
    );
    expect(pagina.querySelector<HTMLInputElement>('#cpf-cliente')?.value).toBe('900.000.001-75');
    expect(document.activeElement).toBe(pagina.querySelector('#cpf-cliente'));
    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('disponivel');
  });

  it('usa resumo seguro quando a API aponta campo desconhecido', async () => {
    const cadastrar = vi.fn(() =>
      of({
        tipo: 'validacao',
        codigo: 'erros-validacao',
        mensagem: 'Detalhes internos da API.',
        erros: [
          {
            codigo: 'erro-interno',
            mensagem: 'Stack marker de implementação.',
            campo: 'interno.secreto',
          },
        ],
      } as const),
    );
    fonte = criarFonte(() => of(colecao()), cadastrar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencherValidos, enviar } = await abrir();
    await preencherValidos();
    enviar();
    await harness.fixture.whenStable();

    const alerta = pagina.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alerta).toContain('A API recusou os dados informados.');
    expect(alerta).not.toContain('Stack marker');
    expect(alerta).not.toContain('interno.secreto');
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      'Cliente sintético cadastro',
    );
  });

  it('trata estrutura inválida como incerta, preserva o rascunho e nunca anuncia sucesso', async () => {
    const cadastrar = vi.fn(() => throwError(() => new ErroContratoApi('Resposta incompatível.')));
    fonte = criarFonte(() => of(colecao()), cadastrar);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const { harness, pagina, preencherValidos, enviar } = await abrir();
    const navegacao = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await preencherValidos();
    enviar();
    await harness.fixture.whenStable();

    expect(TestBed.inject(ControleConfirmacoes).estado().tipo).toBe('incerto');
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('não reenvie');
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')?.value).toBe(
      'Cliente sintético cadastro',
    );
    expect(pagina.querySelector<HTMLButtonElement>('[type="submit"]')?.disabled).toBe(true);
    expect(navegacao).not.toHaveBeenCalled();
    expect(cadastrar).toHaveBeenCalledTimes(1);
  });
});
