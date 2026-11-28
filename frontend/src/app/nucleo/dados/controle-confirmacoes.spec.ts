import { HttpErrorResponse } from '@angular/common/http';
import { EmptyError, Observable, Subject, TimeoutError, of, throwError } from 'rxjs';
import { Resultado } from '../../funcionalidades/vendas/venda.modelos';
import { ControleConsultas } from './controle-consultas';
import {
  AlvoConfirmacao,
  ContextoConfirmacao,
  ControleConfirmacoes,
  ErroConfirmacaoBloqueada,
} from './controle-confirmacoes';
import { ErroContratoApi } from './contratos-api';
import { EstadoConsultaPorChave } from './estado-consulta';

function contextoEdicao(): ContextoConfirmacao {
  return {
    operacao: 'edicao',
    alvo: { tipo: 'detalhe', vendaId: 'venda/externa' },
    referencia: '2027-04-05',
    revisaoEsperada: '9007199254740993',
    rascunho: { nome: 'Nome ainda não confirmado' },
  };
}

function contextoCadastro(): ContextoConfirmacao {
  return {
    operacao: 'cadastro',
    alvo: { tipo: 'colecao', colecao: 'abertas' },
    referencia: '2027-04-05',
    revisaoEsperada: '12',
    rascunho: { cliente: { nome: 'Cadastro sintético' } },
  };
}

function sucesso<T>(valor: T): Resultado<T> {
  return { tipo: 'sucesso', valor, mensagem: 'Confirmado.' };
}

function falha(codigo: string): Resultado<never> {
  return { tipo: 'falha', codigo, mensagem: 'Resultado de protocolo.' };
}

describe('EstadoConsultaPorChave', () => {
  it('descarta respostas fora de ordem quando a chave ativa muda', () => {
    const controle = new ControleConsultas();
    const consulta = new EstadoConsultaPorChave<number>(controle);
    const antiga = new Subject<number>();
    const atual = new Subject<number>();

    consulta.carregar(
      { tipo: 'detalhe', vendaId: 'venda-antiga', referencia: '2027-04-05' },
      () => antiga,
    );
    expect(consulta.estado().tipo).toBe('carregando');

    consulta.carregar(
      { tipo: 'detalhe', vendaId: 'venda-atual', referencia: '2027-04-05' },
      () => atual,
    );
    antiga.next(1);
    expect(consulta.estado()).toMatchObject({
      tipo: 'carregando',
      chave: { vendaId: 'venda-atual' },
    });

    atual.next(2);
    expect(consulta.estado()).toMatchObject({
      tipo: 'pronto',
      chave: { vendaId: 'venda-atual' },
      valor: 2,
    });
  });

  it('invalida resultado pronto e descarta leitura iniciada antes de uma confirmação', () => {
    const controle = new ControleConsultas();
    const consulta = new EstadoConsultaPorChave<number>(controle);
    const leituraPendente = new Subject<number>();
    const chave = { tipo: 'painel', referencia: '2027-04-05' } as const;

    consulta.carregar(chave, () => of(1));
    expect(consulta.estado()).toMatchObject({ tipo: 'pronto', valor: 1 });

    consulta.carregar(chave, () => leituraPendente);
    expect(consulta.estado().tipo).toBe('carregando');
    controle.invalidarTodas();
    expect(consulta.estado()).toMatchObject({ tipo: 'inicial', chave });

    leituraPendente.next(2);
    expect(consulta.estado()).toMatchObject({ tipo: 'inicial', chave });
  });

  it('representa consulta inexistente e erro sem mascará-los como vazio', () => {
    const consulta = new EstadoConsultaPorChave<unknown>(new ControleConsultas());
    const chave = { tipo: 'detalhe', vendaId: 'ausente', referencia: '2027-04-05' } as const;
    consulta.carregar(
      chave,
      () => of({ tipo: 'inexistencia', codigo: 'venda-inexistente', mensagem: 'Ausente.' }),
      (valor) =>
        valor !== null &&
        typeof valor === 'object' &&
        'tipo' in valor &&
        valor.tipo === 'inexistencia',
    );
    expect(consulta.estado()).toMatchObject({ tipo: 'inexistente', chave });

    consulta.carregar(chave, () => throwError(() => new Error('falha de rede')));
    expect(consulta.estado()).toMatchObject({ tipo: 'erro', chave });

    consulta.carregar({ tipo: 'colecao', colecao: 'abertas', referencia: '2027-04-05' }, () =>
      of([]),
    );
    expect(consulta.estado()).toMatchObject({ tipo: 'pronto', valor: [] });
  });

  it('não publica leitura vazia de Observable como sucesso', () => {
    const consulta = new EstadoConsultaPorChave<number>(new ControleConsultas());
    consulta.carregar(
      { tipo: 'mes', mes: '2027-04-01', referencia: '2027-04-05' },
      () => new Observable<number>((assinante) => assinante.complete()),
    );

    expect(consulta.estado().tipo).toBe('erro');
    const estado = consulta.estado();
    if (estado.tipo === 'erro') expect(estado.erro).toBeInstanceOf(EmptyError);
  });
});

describe('ControleConfirmacoes', () => {
  it('faz uma subscription, fixa a revisão e conserva resultado/invalidação fora da tela', async () => {
    const consultas = new ControleConsultas();
    const controle = new ControleConfirmacoes(consultas);
    const estadoConsulta = new EstadoConsultaPorChave<string>(consultas);
    const chaveConsulta = { tipo: 'painel', referencia: '2027-04-05' } as const;
    const leituraAnterior = new Subject<string>();
    estadoConsulta.carregar(chaveConsulta, () => leituraAnterior);

    const resposta = new Subject<Resultado<{ readonly id: string; readonly revisao: string }>>();
    let assinaturas = 0;
    let contextoRecebido: ContextoConfirmacao | undefined;
    const rascunhoOriginal = { cliente: { nome: 'Nome ainda não confirmado' } };
    const contextoOriginal: ContextoConfirmacao = {
      ...contextoEdicao(),
      rascunho: rascunhoOriginal,
    };
    const pendente = controle.confirmar(contextoOriginal, (contextoFixo) => {
      contextoRecebido = contextoFixo;
      return new Observable<Resultado<{ readonly id: string; readonly revisao: string }>>(
        (assinante) => {
          assinaturas++;
          const subscription = resposta.subscribe(assinante);
          return () => subscription.unsubscribe();
        },
      );
    });

    expect(controle.estado().tipo).toBe('enviando');
    expect(assinaturas).toBe(1);
    expect(contextoRecebido?.revisaoEsperada).toBe('9007199254740993');
    rascunhoOriginal.cliente.nome = 'rascunho alterado após confirmar';
    expect(contextoRecebido?.rascunho).toEqual({ cliente: { nome: 'Nome ainda não confirmado' } });
    expect(Object.isFrozen(contextoRecebido?.rascunho)).toBe(true);
    if (contextoRecebido?.rascunho !== null && typeof contextoRecebido?.rascunho === 'object') {
      expect(
        Object.isFrozen((contextoRecebido.rascunho as Record<string, unknown>)['cliente']),
      ).toBe(true);
    }
    const outraChamada = vi.fn(() => of(sucesso({ id: 'cadastro-concorrente', revisao: '1' })));
    expect(() => controle.confirmar(contextoCadastro(), outraChamada)).toThrow(
      ErroConfirmacaoBloqueada,
    );
    expect(outraChamada).not.toHaveBeenCalled();

    resposta.next(sucesso({ id: 'venda-confirmada', revisao: '18' }));
    await expect(pendente).resolves.toMatchObject({
      tipo: 'sucesso',
      valor: { id: 'venda-confirmada', revisao: '18' },
    });
    expect(consultas.geracao()).toBe(1);
    expect(estadoConsulta.estado().tipo).toBe('inicial');
    expect(controle.estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: {
        tipo: 'confirmado',
        contexto: {
          revisaoEsperada: '9007199254740993',
          alvo: { tipo: 'detalhe', vendaId: 'venda/externa' },
        },
        resultado: { valor: { id: 'venda-confirmada', revisao: '18' } },
      },
    });

    estadoConsulta.carregar(chaveConsulta, () => of('18'));
    expect(estadoConsulta.estado()).toMatchObject({ tipo: 'pronto', valor: '18' });
    leituraAnterior.next('17');
    expect(estadoConsulta.estado()).toMatchObject({ tipo: 'pronto', valor: '18' });
    expect(assinaturas).toBe(1);
    expect(outraChamada).not.toHaveBeenCalled();
  });

  it.each([
    [
      'validação',
      { tipo: 'validacao', codigo: 'cpf-invalido', mensagem: 'CPF inválido.' } as const,
    ],
    [
      'inexistência',
      { tipo: 'inexistencia', codigo: 'venda-inexistente', mensagem: 'Ausente.' } as const,
    ],
    [
      'inelegibilidade',
      { tipo: 'inelegibilidade', codigo: 'venda-nao-ativa', mensagem: 'Inativa.' } as const,
    ],
    ['conflito', falha('conflito-revisao')],
    ['indisponibilidade conhecida', falha('armazenamento-indisponivel')],
    ['falha demonstrativa sem publicação', falha('falha-comando')],
    [
      'recusa demonstrativa',
      {
        tipo: 'validacao',
        codigo: 'status-invalido',
        mensagem: 'Status inválido.',
      } as const,
    ],
  ])('mantém recusa conhecida (%s) distinta de incerteza', async (_nome, resultado) => {
    const controle = new ControleConfirmacoes(new ControleConsultas());
    await expect(controle.confirmar(contextoEdicao(), () => of(resultado))).resolves.toEqual(
      resultado,
    );
    expect(controle.estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: { tipo: 'recusado' },
    });
  });

  it.each([
    ['status 0', () => new HttpErrorResponse({ status: 0 })],
    ['timeout', () => new TimeoutError()],
    ['502', () => new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' })],
    ['504', () => new HttpErrorResponse({ status: 504, statusText: 'Gateway Timeout' })],
    ['5xx genérico', () => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })],
    ['resposta inválida', () => new ErroContratoApi('resposta incompatível')],
    ['resposta vazia', () => new EmptyError()],
  ])('bloqueia a aba após incerteza por %s sem repetir a escrita', async (_nome, criarErro) => {
    const controle = new ControleConfirmacoes(new ControleConsultas());
    let chamadas = 0;
    const pendente = controle.confirmar(contextoEdicao(), () => {
      chamadas++;
      return throwError(criarErro);
    });

    await expect(pendente).rejects.toBeDefined();
    expect(controle.estado()).toMatchObject({ tipo: 'incerto', consulta: 'nao-iniciada' });
    expect(chamadas).toBe(1);
    expect(() => controle.confirmar(contextoEdicao(), () => of(sucesso({ id: 'replay' })))).toThrow(
      ErroConfirmacaoBloqueada,
    );
    expect(chamadas).toBe(1);
  });

  it('classifica confirmacao-indeterminada e código não reconhecido como incerteza', async () => {
    const controle = new ControleConfirmacoes(new ControleConsultas());
    await controle.confirmar(contextoEdicao(), () => of(falha('confirmacao-indeterminada')));
    expect(controle.estado()).toMatchObject({
      tipo: 'incerto',
      codigo: 'confirmacao-indeterminada',
    });

    const outro = new ControleConfirmacoes(new ControleConsultas());
    await outro.confirmar(contextoEdicao(), () => of(falha('codigo-inesperado')));
    expect(outro.estado()).toMatchObject({ tipo: 'incerto', codigo: 'resultado-nao-classificado' });
  });

  it('classifica corpo de resultado incompatível como incerto sem publicar sucesso', async () => {
    const controle = new ControleConfirmacoes(new ControleConsultas());
    const respostaMalformada = {
      tipo: 'sucesso',
      valor: { id: 'sem mensagem' },
    } as unknown as Resultado<{ readonly id: string }>;

    await expect(
      controle.confirmar(contextoEdicao(), () => of(respostaMalformada)),
    ).rejects.toThrow('resultado de comando incompatível');
    expect(controle.estado()).toMatchObject({ tipo: 'incerto', codigo: 'resposta-invalida' });
  });

  it('confere o alvo/referência originais e só libera após reconhecimento explícito, sem reenvio', async () => {
    const consultas = new ControleConsultas();
    const controle = new ControleConfirmacoes(consultas);
    const chamadasComando = vi.fn();
    const resultadoIndeterminado = falha('confirmacao-indeterminada');
    await controle.confirmar(contextoCadastro(), (contexto) => {
      chamadasComando(contexto.revisaoEsperada);
      return of(resultadoIndeterminado);
    });

    expect(controle.reconhecerConferencia()).toBe(false);
    await expect(
      controle.conferir(
        (alvo: AlvoConfirmacao, ref) => {
          expect(alvo).toEqual({ tipo: 'colecao', colecao: 'abertas' });
          expect(ref).toBe('2027-04-05');
          return of({ vendas: [] });
        },
        (leitura) => Array.isArray(leitura.vendas),
      ),
    ).resolves.toMatchObject({ bemSucedida: true, valor: { vendas: [] } });
    expect(controle.estado()).toMatchObject({ tipo: 'incerto', consulta: 'concluida' });
    expect(controle.reconhecerConferencia()).toBe(true);
    expect(controle.estado()).toMatchObject({
      tipo: 'disponivel',
      ultimoResultado: { tipo: 'reconhecido', contexto: { revisaoEsperada: '12' } },
    });
    expect(consultas.geracao()).toBe(1);
    expect(chamadasComando).toHaveBeenCalledOnce();

    const resultadoDetalhe = falha('confirmacao-indeterminada');
    await controle.confirmar(contextoEdicao(), () => of(resultadoDetalhe));
    await controle.conferir(
      (alvo, referenciaConsulta) => {
        expect(alvo).toEqual({ tipo: 'detalhe', vendaId: 'venda/externa' });
        expect(referenciaConsulta).toBe('2027-04-05');
        return of({ tipo: 'inexistencia', codigo: 'venda-inexistente' });
      },
      (leitura) => leitura.tipo === 'sucesso',
    );
    expect(controle.estado()).toMatchObject({ tipo: 'incerto', consulta: 'falhou' });
    expect(controle.reconhecerConferencia()).toBe(false);
  });

  it('mantém bloqueio quando a leitura de conferência falha e permite repetir somente a leitura', async () => {
    const controle = new ControleConfirmacoes(new ControleConsultas());
    let escritas = 0;
    await controle
      .confirmar(contextoEdicao(), () => {
        escritas++;
        return throwError(() => new HttpErrorResponse({ status: 0 }));
      })
      .catch(() => undefined);

    await expect(
      controle.conferir(
        () => throwError(() => new HttpErrorResponse({ status: 503 })),
        () => true,
      ),
    ).rejects.toBeDefined();
    expect(controle.estado()).toMatchObject({ tipo: 'incerto', consulta: 'falhou' });
    expect(controle.reconhecerConferencia()).toBe(false);

    const conferido = await controle.conferir(
      () => of({ revisao: '13' }),
      () => true,
    );
    expect(conferido.bemSucedida).toBe(true);
    expect(controle.reconhecerConferencia()).toBe(true);
    expect(escritas).toBe(1);
  });

  it('rejeita chave de conferência incompatível com o tipo de comando sem enviar', () => {
    const controle = new ControleConfirmacoes(new ControleConsultas());
    expect(() =>
      controle.confirmar(
        { ...contextoCadastro(), alvo: { tipo: 'detalhe', vendaId: 'outra' } },
        () => of(sucesso(undefined)),
      ),
    ).toThrow(TypeError);
    expect(controle.estado().tipo).toBe('disponivel');
  });
});
