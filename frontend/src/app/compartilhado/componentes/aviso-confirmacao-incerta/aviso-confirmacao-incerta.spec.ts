import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ContextoConfirmacao,
  ControleConfirmacoes,
} from '../../../nucleo/dados/controle-confirmacoes';
import { FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import {
  ColecaoVendas,
  ColecaoVendasLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
} from '../../../nucleo/dados/modelos-leitura';
import { AvisoConfirmacaoIncerta } from './aviso-confirmacao-incerta';

const referencia = '2027-04-05';
const idVenda = 'venda/opaca%2Fexterna';

function resumo(id = 'venda-similar', ref = referencia): VendaResumoLeitura {
  return {
    id,
    cliente: {
      nome: 'Cliente semelhante',
      cpf: '90000000175',
      telefone: '11900000001',
      descricao: null,
    },
    dataVenda: '2027-04-01',
    statusAdministrativo: 'Ativo',
    situacao: 'Em aberto',
    valorTotalCentavos: 10000,
    acrescimosCentavos: 0,
    valorTotalEfetivoCentavos: 10000,
    totalRecebidoCentavos: 0,
    saldoCentavos: 10000,
    quantidadePaga: 0,
    quantidadeParcelas: 1,
    proximoVencimento: '2027-05-01',
    revisao: '13',
    referencia: ref,
  };
}

function detalhe(id: string, ref = referencia): VendaDetalheLeitura {
  return { resumo: resumo(id, ref), parcelas: [], recebimentos: [] };
}

function colecao(colecaoAlvo: ColecaoVendas = 'abertas'): ColecaoVendasLeitura {
  return {
    colecao: colecaoAlvo,
    referencia,
    revisao: '13',
    vendas: [resumo()],
  };
}

function contexto(operacao: ContextoConfirmacao['operacao']): ContextoConfirmacao {
  return {
    operacao,
    alvo:
      operacao === 'cadastro'
        ? { tipo: 'colecao', colecao: 'abertas' }
        : { tipo: 'detalhe', vendaId: idVenda },
    referencia,
    revisaoEsperada: '12',
    rascunho: { cliente: { nome: 'Cliente semelhante' }, observacao: 'rascunho preservado' },
  };
}

describe('AvisoConfirmacaoIncerta', () => {
  let fonte: {
    consultarColecao: ReturnType<typeof vi.fn>;
    consultarVenda: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    fonte = {
      consultarColecao: vi.fn((alvo: ColecaoVendas) => of(colecao(alvo))),
      consultarVenda: vi.fn((id: string) =>
        of({ tipo: 'sucesso' as const, valor: detalhe(id), mensagem: 'Consultado.' }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [AvisoConfirmacaoIncerta],
      providers: [
        provideRouter([]),
        { provide: FONTE_VENDAS, useValue: fonte as unknown as FonteVendas },
      ],
    }).compileComponents();
  });

  async function abrirComIncerteza(operacao: ContextoConfirmacao['operacao']) {
    const fixture = TestBed.createComponent(AvisoConfirmacaoIncerta);
    const confirmacoes = TestBed.inject(ControleConfirmacoes);
    const chamadaComando = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    const contextoOriginal = contexto(operacao);

    await confirmacoes.confirmar(contextoOriginal, chamadaComando).catch(() => undefined);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, confirmacoes, chamadaComando, contextoOriginal };
  }

  it.each(['cadastro', 'edicao', 'status', 'baixa', 'correcao'] as const)(
    'consulta o alvo correto para %s e libera apenas reconhecimento explícito sem replay',
    async (operacao) => {
      const { fixture, confirmacoes, chamadaComando, contextoOriginal } =
        await abrirComIncerteza(operacao);
      const pagina = fixture.nativeElement as HTMLElement;
      const reconhecimento = pagina.querySelector<HTMLButtonElement>(
        '[data-testid="reconhecer-conferencia"]',
      )!;

      expect(pagina.querySelector('[data-testid="aviso-confirmacao-incerta"]')).not.toBeNull();
      expect(reconhecimento.disabled).toBe(true);
      expect(confirmacoes.estado()).toMatchObject({ tipo: 'incerto', consulta: 'nao-iniciada' });
      const proximaOperacao = operacao === 'cadastro' ? 'edicao' : 'cadastro';
      const chamadaBloqueada = vi.fn(() =>
        of({ tipo: 'sucesso' as const, valor: undefined, mensagem: 'Não deve executar.' }),
      );
      expect(() => confirmacoes.confirmar(contexto(proximaOperacao), chamadaBloqueada)).toThrow();
      expect(chamadaBloqueada).not.toHaveBeenCalled();

      pagina.querySelector<HTMLButtonElement>('[data-testid="consultar-conferencia"]')!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      if (operacao === 'cadastro') {
        expect(fonte.consultarColecao).toHaveBeenCalledOnce();
        expect(fonte.consultarColecao).toHaveBeenCalledWith('abertas');
        expect(fonte.consultarVenda).not.toHaveBeenCalled();
        expect(pagina.textContent).toContain('não permite concluir pela semelhança do cliente');
        expect(pagina.textContent).not.toContain('Cliente semelhante');
        expect(pagina.querySelector('a')?.getAttribute('href')).toBe('/vendas');
      } else {
        expect(fonte.consultarVenda).toHaveBeenCalledOnce();
        expect(fonte.consultarVenda).toHaveBeenCalledWith(idVenda);
        expect(fonte.consultarColecao).not.toHaveBeenCalled();
        expect(pagina.textContent).toContain('O detalhe do alvo original foi consultado');
        expect(pagina.querySelector('a')?.getAttribute('href')).toBe(
          `/vendas/${encodeURIComponent(idVenda)}`,
        );
      }

      expect(confirmacoes.estado()).toMatchObject({ tipo: 'incerto', consulta: 'concluida' });
      expect(reconhecimento.disabled).toBe(false);
      reconhecimento.click();
      fixture.detectChanges();

      expect(confirmacoes.estado()).toMatchObject({
        tipo: 'disponivel',
        ultimoResultado: { tipo: 'reconhecido' },
      });
      expect(chamadaComando).toHaveBeenCalledOnce();
      expect(confirmacoes.estado()).toMatchObject({
        ultimoResultado: { contexto: { rascunho: contextoOriginal.rascunho } },
      });
      expect(pagina.querySelector('[data-testid="aviso-confirmacao-incerta"]')).toBeNull();
    },
  );

  it('mantém bloqueio e reconhecimento desabilitado se a consulta falha; retry consulta sem reenviar', async () => {
    let falharConsulta = true;
    fonte.consultarVenda.mockImplementation((id: string) =>
      falharConsulta
        ? throwError(() => new HttpErrorResponse({ status: 503 }))
        : of({ tipo: 'sucesso' as const, valor: detalhe(id), mensagem: 'Consultado.' }),
    );
    const { fixture, confirmacoes, chamadaComando } = await abrirComIncerteza('edicao');
    const pagina = fixture.nativeElement as HTMLElement;
    const reconhecimento = pagina.querySelector<HTMLButtonElement>(
      '[data-testid="reconhecer-conferencia"]',
    )!;

    pagina.querySelector<HTMLButtonElement>('[data-testid="consultar-conferencia"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(confirmacoes.estado()).toMatchObject({ tipo: 'incerto', consulta: 'falhou' });
    expect(reconhecimento.disabled).toBe(true);
    expect(pagina.textContent).toContain('As confirmações continuam bloqueadas');

    falharConsulta = false;
    pagina.querySelector<HTMLButtonElement>('[data-testid="consultar-conferencia"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(confirmacoes.estado()).toMatchObject({ tipo: 'incerto', consulta: 'concluida' });
    expect(reconhecimento.disabled).toBe(false);
    expect(fonte.consultarVenda).toHaveBeenCalledTimes(2);
    expect(chamadaComando).toHaveBeenCalledOnce();
  });
});
