import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import {
  EmptyError,
  Observable,
  TimeoutError,
  defer,
  firstValueFrom,
  take,
  throwIfEmpty,
} from 'rxjs';
import { Resultado } from '../../funcionalidades/vendas/venda.modelos';
import { ColecaoVendas } from './modelos-leitura';
import { ControleConsultas } from './controle-consultas';

export type OperacaoConfirmacao = 'cadastro' | 'edicao' | 'status' | 'baixa' | 'correcao';

export type AlvoConfirmacao =
  | { readonly tipo: 'colecao'; readonly colecao: ColecaoVendas }
  | { readonly tipo: 'detalhe'; readonly vendaId: string };

/** Snapshot de confirmação conservado em memória; a revisão não é lida nem renovada pelo controle. */
export interface ContextoConfirmacao {
  readonly operacao: OperacaoConfirmacao;
  readonly alvo: AlvoConfirmacao;
  readonly referencia: string;
  readonly revisaoEsperada: string | null;
  readonly rascunho: unknown;
}

export type UltimoResultadoConfirmacao =
  | {
      readonly tipo: 'confirmado';
      readonly contexto: ContextoConfirmacao;
      readonly resultado: Resultado<unknown>;
    }
  | {
      readonly tipo: 'recusado';
      readonly contexto: ContextoConfirmacao;
      readonly resultado: Resultado<unknown>;
    }
  | { readonly tipo: 'reconhecido'; readonly contexto: ContextoConfirmacao };

export type EstadoControleConfirmacoes =
  | { readonly tipo: 'disponivel'; readonly ultimoResultado: UltimoResultadoConfirmacao | null }
  | { readonly tipo: 'enviando'; readonly id: number; readonly contexto: ContextoConfirmacao }
  | {
      readonly tipo: 'incerto';
      readonly id: number;
      readonly contexto: ContextoConfirmacao;
      readonly codigo: string;
      readonly consulta: 'nao-iniciada' | 'consultando' | 'falhou' | 'concluida';
    };

export class ErroConfirmacaoBloqueada extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErroConfirmacaoBloqueada';
  }
}

const CODIGOS_RESULTADO_CONHECIDOS = new Set([
  'acesso-local-negado',
  'alteracao-historico-nao-permitida',
  'ano-invalido',
  'armazenamento-indisponivel',
  'banco-ausente',
  'banco-ocupado',
  'caminho-invalido',
  'candidato-invalido',
  'colecao-invalida',
  'confirmacao-indeterminada',
  'conflito-revisao',
  'conjunto-vendas-invalido',
  'conteudo-muito-grande',
  'cpf-invalido',
  'dados-persistidos-invalidos',
  'dados-recebimento-invalidos',
  'dados-correcao-pagamento-invalidos',
  'data-invalida',
  'entrada-pendente',
  'erros-validacao',
  'exclusao-nao-permitida',
  'falha-interna',
  'falha-comando',
  'falha-correcao-pagamento',
  'falha-preparacao',
  'falha-preparacao-edicao',
  'falha-preparacao-lote',
  'falha-preparacao-lote-historico',
  'agregado-invalido',
  'historico-invalido',
  'identificacao-obrigatoria',
  'comando-correcao-pagamento-invalido',
  'comando-pagamento-invalido',
  'identificador-duplicado',
  'identificador-invalido',
  'limite-financeiro-excedido',
  'limite-revisao-excedido',
  'mes-invalido',
  'metodo-nao-permitido',
  'observacao-longa-demais',
  'periodo-invalido',
  'requisicao-invalida',
  'recebimento-de-outra-venda',
  'recebimento-historico-nao-editavel',
  'recebimento-inexistente',
  'revisao-invalida',
  'schema-incompativel',
  'selecao-nao-sequencial',
  'status-invalido',
  'status-administrativo-invalido',
  'telefone-invalido',
  'tipo-conteudo-nao-suportado',
  'transicao-nao-permitida',
  'valor-invalido',
  'valor-recebido-inferior-ao-base',
  'venda-inexistente',
  'venda-nao-ativa',
  'transicao-status-inelegivel',
  'prejuizo-sem-saldo',
  'valor-corrigido-inferior-ao-base',
  'valor-nao-integral',
  'valor-parcela-invalido',
  'recebimento-duplicado',
  'recebimento-individual-invalido',
  'recebimento-invalido',
]);

const CODIGOS_FALHA_RECUSADA = new Set([
  'acesso-local-negado',
  'alteracao-historico-nao-permitida',
  'armazenamento-indisponivel',
  'banco-ausente',
  'banco-ocupado',
  'caminho-invalido',
  'candidato-invalido',
  'conflito-revisao',
  'conteudo-muito-grande',
  'dados-persistidos-invalidos',
  'exclusao-nao-permitida',
  'falha-comando',
  'falha-correcao-pagamento',
  'falha-preparacao',
  'falha-preparacao-edicao',
  'falha-preparacao-lote',
  'falha-preparacao-lote-historico',
  'identificador-duplicado',
  'limite-revisao-excedido',
  'metodo-nao-permitido',
  'schema-incompativel',
  'tipo-conteudo-nao-suportado',
]);

function ehResultado<T>(valor: unknown): valor is Resultado<T> {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const resultado = valor as Record<string, unknown>;
  if (typeof resultado['mensagem'] !== 'string') return false;
  if (resultado['tipo'] === 'sucesso') return Object.hasOwn(resultado, 'valor');
  return (
    ['validacao', 'inexistencia', 'inelegibilidade', 'falha'].includes(String(resultado['tipo'])) &&
    typeof resultado['codigo'] === 'string'
  );
}

function ehRecusaConhecida(resultado: Resultado<unknown>): boolean {
  if (resultado.tipo === 'sucesso') return false;
  if (!CODIGOS_RESULTADO_CONHECIDOS.has(resultado.codigo)) return false;
  if (resultado.tipo === 'falha') return CODIGOS_FALHA_RECUSADA.has(resultado.codigo);
  return true;
}

function codigoResultadoIncerto(resultado: Resultado<unknown>): string {
  return resultado.tipo === 'falha' && resultado.codigo === 'confirmacao-indeterminada'
    ? resultado.codigo
    : 'resultado-nao-classificado';
}

function codigoDaIncerteza(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) return 'transporte-indisponivel';
    if (erro.status === 408) return 'tempo-esgotado';
    if (erro.status === 502 || erro.status === 504) return 'gateway-indisponivel';
    if (erro.status >= 500) return 'falha-servidor';
    return 'resposta-http-nao-classificada';
  }
  if (erro instanceof TimeoutError) return 'tempo-esgotado';
  if (erro instanceof EmptyError) return 'resposta-ausente';
  if (erro instanceof Error && erro.name === 'ErroContratoApi') return 'resposta-invalida';
  return 'resultado-indeterminado';
}

function fixarContexto(contexto: ContextoConfirmacao): ContextoConfirmacao {
  if (contexto.operacao === 'cadastro' && contexto.alvo.tipo !== 'colecao') {
    throw new TypeError('Cadastro deve conferir a coleção consultada.');
  }
  if (contexto.operacao !== 'cadastro' && contexto.alvo.tipo !== 'detalhe') {
    throw new TypeError('A operação deve conferir o detalhe da venda original.');
  }
  const rascunho = congelarRecursivamente(structuredClone(contexto.rascunho));
  return Object.freeze({
    ...contexto,
    alvo: Object.freeze({ ...contexto.alvo }),
    rascunho,
  });
}

function congelarRecursivamente<T>(valor: T, vistos = new WeakSet<object>()): T {
  if (valor === null || typeof valor !== 'object') return valor;
  const objeto = valor as object;
  if (vistos.has(objeto)) return valor;
  vistos.add(objeto);
  for (const filho of Object.values(objeto)) congelarRecursivamente(filho, vistos);
  return Object.freeze(objeto) as T;
}

@Injectable({ providedIn: 'root' })
export class ControleConfirmacoes {
  private readonly estadoInterno = signal<EstadoControleConfirmacoes>({
    tipo: 'disponivel',
    ultimoResultado: null,
  });
  private proximoId = 0;

  readonly estado = this.estadoInterno.asReadonly();

  constructor(private readonly controleConsultas: ControleConsultas) {}

  confirmar<T>(
    contexto: ContextoConfirmacao,
    criarComando: (contexto: ContextoConfirmacao) => Observable<Resultado<T>>,
  ): Promise<Resultado<T>> {
    if (this.estadoInterno().tipo !== 'disponivel') {
      throw new ErroConfirmacaoBloqueada(
        'Há uma confirmação em andamento ou é necessário conferir o resultado anterior.',
      );
    }

    const contextoFixo = fixarContexto(contexto);
    const id = ++this.proximoId;
    this.estadoInterno.set({ tipo: 'enviando', id, contexto: contextoFixo });
    return this.executar(id, contextoFixo, criarComando);
  }

  async conferir<T>(
    ler: (alvo: AlvoConfirmacao, referencia: string) => Observable<T>,
    leituraBemSucedida: (valor: T) => boolean,
  ): Promise<{ readonly valor: T; readonly bemSucedida: boolean }> {
    const estado = this.estadoInterno();
    if (estado.tipo !== 'incerto') {
      throw new ErroConfirmacaoBloqueada('Não há confirmação incerta para conferir.');
    }
    if (estado.consulta === 'consultando') {
      throw new ErroConfirmacaoBloqueada('A consulta de conferência já está em andamento.');
    }

    const { id, contexto } = estado;
    this.estadoInterno.set({ ...estado, consulta: 'consultando' });
    try {
      const valor = await firstValueFrom(
        defer(() => ler(contexto.alvo, contexto.referencia)).pipe(
          take(1),
          throwIfEmpty(() => new EmptyError()),
        ),
      );
      const atual = this.estadoInterno();
      if (atual.tipo !== 'incerto' || atual.id !== id) {
        throw new ErroConfirmacaoBloqueada('A confirmação mudou durante a conferência.');
      }
      const bemSucedida = leituraBemSucedida(valor);
      this.estadoInterno.set({
        ...atual,
        consulta: bemSucedida ? 'concluida' : 'falhou',
        ...(bemSucedida ? {} : { codigo: 'consulta-sem-confirmacao' }),
      });
      return { valor, bemSucedida };
    } catch (erro) {
      const atual = this.estadoInterno();
      if (atual.tipo === 'incerto' && atual.id === id) {
        this.estadoInterno.set({ ...atual, consulta: 'falhou', codigo: 'consulta-indisponivel' });
      }
      throw erro;
    }
  }

  reconhecerConferencia(): boolean {
    const atual = this.estadoInterno();
    if (atual.tipo !== 'incerto' || atual.consulta !== 'concluida') return false;
    this.controleConsultas.invalidarTodas();
    this.estadoInterno.set({
      tipo: 'disponivel',
      ultimoResultado: { tipo: 'reconhecido', contexto: atual.contexto },
    });
    return true;
  }

  private async executar<T>(
    id: number,
    contexto: ContextoConfirmacao,
    criarComando: (contexto: ContextoConfirmacao) => Observable<Resultado<T>>,
  ): Promise<Resultado<T>> {
    try {
      const resultadoDesconhecido: unknown = await firstValueFrom(
        defer(() => criarComando(contexto)).pipe(
          take(1),
          throwIfEmpty(() => new EmptyError()),
        ),
      );
      const atual = this.estadoInterno();
      if (atual.tipo !== 'enviando' || atual.id !== id) {
        throw new ErroConfirmacaoBloqueada('A confirmação mudou durante o envio.');
      }
      if (!ehResultado<T>(resultadoDesconhecido)) {
        this.marcarIncerto(id, contexto, 'resposta-invalida');
        throw new TypeError('A fonte devolveu um resultado de comando incompatível.');
      }

      const resultado = resultadoDesconhecido;
      if (resultado.tipo === 'sucesso') {
        this.controleConsultas.invalidarTodas();
        this.estadoInterno.set({
          tipo: 'disponivel',
          ultimoResultado: { tipo: 'confirmado', contexto, resultado },
        });
      } else if (ehRecusaConhecida(resultado)) {
        this.estadoInterno.set({
          tipo: 'disponivel',
          ultimoResultado: { tipo: 'recusado', contexto, resultado },
        });
      } else {
        this.marcarIncerto(id, contexto, codigoResultadoIncerto(resultado));
      }
      return resultado;
    } catch (erro) {
      const atual = this.estadoInterno();
      if (atual.tipo === 'enviando' && atual.id === id) {
        this.marcarIncerto(id, contexto, codigoDaIncerteza(erro));
      }
      throw erro;
    }
  }

  private marcarIncerto(id: number, contexto: ContextoConfirmacao, codigo: string): void {
    this.estadoInterno.set({
      tipo: 'incerto',
      id,
      contexto,
      codigo,
      consulta: 'nao-iniciada',
    });
  }
}
