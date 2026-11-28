import { computed, signal } from '@angular/core';
import { EmptyError, Observable, Subscription, defer, take, throwIfEmpty } from 'rxjs';
import { ColecaoVendas } from './modelos-leitura';
import { ControleConsultas } from './controle-consultas';

export type ChaveConsulta =
  | { readonly tipo: 'colecao'; readonly colecao: ColecaoVendas; readonly referencia: string }
  | { readonly tipo: 'detalhe'; readonly vendaId: string; readonly referencia: string }
  | { readonly tipo: 'painel'; readonly referencia: string }
  | { readonly tipo: 'mes'; readonly mes: string; readonly referencia: string };

export type EstadoConsulta<T> =
  | { readonly tipo: 'inicial'; readonly chave: ChaveConsulta | null; readonly geracao: number }
  | { readonly tipo: 'carregando'; readonly chave: ChaveConsulta; readonly geracao: number }
  | {
      readonly tipo: 'pronto';
      readonly chave: ChaveConsulta;
      readonly geracao: number;
      readonly valor: T;
    }
  | {
      readonly tipo: 'erro';
      readonly chave: ChaveConsulta;
      readonly geracao: number;
      readonly erro: unknown;
    }
  | { readonly tipo: 'inexistente'; readonly chave: ChaveConsulta; readonly geracao: number };

interface EstadoConsultaInterno<T> {
  readonly estado: EstadoConsulta<T>;
  readonly epocaInvalidacao: number;
}

function clonarChave(chave: ChaveConsulta): ChaveConsulta {
  return Object.freeze({ ...chave }) as ChaveConsulta;
}

function mesmaChave(a: ChaveConsulta, b: ChaveConsulta): boolean {
  if (a.tipo !== b.tipo || a.referencia !== b.referencia) return false;
  switch (a.tipo) {
    case 'colecao':
      return b.tipo === 'colecao' && a.colecao === b.colecao;
    case 'detalhe':
      return b.tipo === 'detalhe' && a.vendaId === b.vendaId;
    case 'painel':
      return b.tipo === 'painel';
    case 'mes':
      return b.tipo === 'mes' && a.mes === b.mes;
  }
}

/** Estado efêmero de uma fachada: não compartilha cache e descarta respostas obsoletas. */
export class EstadoConsultaPorChave<T> {
  private readonly estadoInterno = signal<EstadoConsultaInterno<T>>({
    estado: { tipo: 'inicial', chave: null, geracao: 0 },
    epocaInvalidacao: 0,
  });
  private readonly geracaoInterna = signal(0);
  private subscription: Subscription | null = null;

  readonly estado = computed<EstadoConsulta<T>>(() => {
    const atual = this.estadoInterno();
    if (atual.epocaInvalidacao !== this.controleConsultas.geracao()) {
      return {
        tipo: 'inicial',
        chave: atual.estado.chave,
        geracao: atual.estado.geracao,
      };
    }
    return atual.estado;
  });

  constructor(private readonly controleConsultas: ControleConsultas) {}

  carregar(
    chave: ChaveConsulta,
    consultar: () => Observable<T>,
    ehInexistente?: (valor: T) => boolean,
  ): number {
    this.subscription?.unsubscribe();
    const chaveFixa = clonarChave(chave);
    const geracao = this.geracaoInterna() + 1;
    const epocaInvalidacao = this.controleConsultas.geracao();
    this.geracaoInterna.set(geracao);
    this.definir({ tipo: 'carregando', chave: chaveFixa, geracao }, epocaInvalidacao);

    this.subscription = defer(consultar)
      .pipe(
        take(1),
        throwIfEmpty(() => new EmptyError()),
      )
      .subscribe({
        next: (valor) => {
          if (!this.ehAtual(chaveFixa, geracao, epocaInvalidacao)) return;
          try {
            this.definir(
              ehInexistente?.(valor)
                ? { tipo: 'inexistente', chave: chaveFixa, geracao }
                : { tipo: 'pronto', chave: chaveFixa, geracao, valor },
              epocaInvalidacao,
            );
          } catch (erro) {
            this.definir({ tipo: 'erro', chave: chaveFixa, geracao, erro }, epocaInvalidacao);
          }
        },
        error: (erro: unknown) => {
          if (this.ehAtual(chaveFixa, geracao, epocaInvalidacao)) {
            this.definir({ tipo: 'erro', chave: chaveFixa, geracao, erro }, epocaInvalidacao);
          }
        },
      });

    return geracao;
  }

  cancelar(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    const geracao = this.geracaoInterna() + 1;
    this.geracaoInterna.set(geracao);
    this.definir(
      { tipo: 'inicial', chave: this.estado().chave, geracao },
      this.controleConsultas.geracao(),
    );
  }

  private ehAtual(chave: ChaveConsulta, geracao: number, epocaInvalidacao: number): boolean {
    const atual = this.estadoInterno();
    return (
      this.geracaoInterna() === geracao &&
      this.controleConsultas.geracao() === epocaInvalidacao &&
      atual.estado.chave !== null &&
      mesmaChave(atual.estado.chave, chave)
    );
  }

  private definir(estado: EstadoConsulta<T>, epocaInvalidacao: number): void {
    this.estadoInterno.set({ estado, epocaInvalidacao });
  }
}
