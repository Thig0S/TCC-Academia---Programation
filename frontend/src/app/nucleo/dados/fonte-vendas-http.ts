import {
  HttpClient,
  HttpErrorResponse,
  HttpParameterCodec,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, defer, map, Observable, of, throwError } from 'rxjs';
import {
  ComandoCorrecaoPagamento,
  ComandoPagamento,
} from '../../funcionalidades/parcelas/pagamento.modelos';
import {
  ComandoCadastro,
  ComandoEdicaoCliente,
  ComandoMudancaStatus,
  Resultado,
} from '../../funcionalidades/vendas/venda.modelos';
import {
  ErroContratoApi,
  formaPagamentoWire,
  mapearColecaoApi,
  mapearDetalheApi,
  mapearRelatorioMensalApi,
  mapearVisaoGeralApi,
  nomeColecaoWire,
  revisaoCanonica,
  statusAdministrativoWire,
  validarCentavosEntrada,
  validarDataCivilEntrada,
  validarIdentificadorEntrada,
} from './contratos-api';
import { ComandoComRevisao, FonteVendas } from './fonte-vendas';
import {
  ColecaoVendas,
  ColecaoVendasLeitura,
  RelatorioMensalLeitura,
  VendaDetalheLeitura,
  VisaoGeralLeitura,
} from './modelos-leitura';
import { REFERENCIA_SESSAO } from './referencia-sessao';

interface ProblemaApi {
  readonly status: number;
  readonly codigo: string;
  readonly detalhe: string;
}

class CodificadorQueryEstrito implements HttpParameterCodec {
  encodeKey(chave: string): string {
    return encodeURIComponent(chave);
  }

  encodeValue(valor: string): string {
    return encodeURIComponent(valor).replace(
      /[!'()*]/g,
      (caractere) => `%${caractere.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  decodeKey(chave: string): string {
    return decodeURIComponent(chave);
  }

  decodeValue(valor: string): string {
    return decodeURIComponent(valor);
  }
}

function criarParametros(): HttpParams {
  return new HttpParams({ encoder: new CodificadorQueryEstrito() });
}

function lerProblemaApi(erro: unknown): ProblemaApi | null {
  if (!(erro instanceof HttpErrorResponse)) return null;
  const corpo = erro.error;
  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) return null;
  const problema = corpo as Record<string, unknown>;
  const status = problema['status'];
  const codigo = problema['codigo'];
  const detalhe = problema['detail'];
  if (
    typeof status !== 'number' ||
    status !== erro.status ||
    !Number.isInteger(status) ||
    typeof codigo !== 'string' ||
    typeof detalhe !== 'string' ||
    detalhe.length === 0
  ) {
    return null;
  }
  return { status, codigo, detalhe };
}

function resultadoProblema<T>(problema: ProblemaApi): Resultado<T> {
  if (problema.status === 400) {
    return { tipo: 'validacao', codigo: problema.codigo, mensagem: problema.detalhe };
  }
  if (problema.status === 404) {
    return { tipo: 'inexistencia', codigo: problema.codigo, mensagem: problema.detalhe };
  }
  if (problema.status === 422) {
    return { tipo: 'inelegibilidade', codigo: problema.codigo, mensagem: problema.detalhe };
  }
  return { tipo: 'falha', codigo: problema.codigo, mensagem: problema.detalhe };
}

function resultadoSucesso<T>(valor: T): Resultado<T> {
  return { tipo: 'sucesso', valor, mensagem: 'Operação confirmada.' };
}

@Injectable({ providedIn: 'root' })
export class FonteVendasHttp implements FonteVendas {
  private readonly http = inject(HttpClient);
  readonly referencia = inject(REFERENCIA_SESSAO);

  constructor() {
    validarDataCivilEntrada(this.referencia, 'referencia da sessão');
  }

  consultarColecao(colecao: ColecaoVendas): Observable<ColecaoVendasLeitura> {
    const params = criarParametros()
      .set('colecao', nomeColecaoWire(colecao))
      .set('referencia', this.referencia);
    return this.http
      .get<unknown>('/api/v1/vendas', { params })
      .pipe(map((resposta) => mapearColecaoApi(resposta, colecao, this.referencia)));
  }

  consultarVenda(id: string): Observable<Resultado<VendaDetalheLeitura>> {
    const vendaId = validarIdentificadorEntrada(id, 'vendaId');
    const params = criarParametros().set('vendaId', vendaId).set('referencia', this.referencia);
    return this.resultadoHttp(
      this.http.get<unknown>('/api/v1/vendas/detalhe', { params }),
      (resposta) => mapearDetalheApi(resposta, this.referencia),
    );
  }

  consultarVisaoGeral(): Observable<VisaoGeralLeitura> {
    const params = criarParametros().set('referencia', this.referencia);
    return this.http
      .get<unknown>('/api/v1/visao-geral', { params })
      .pipe(map((resposta) => mapearVisaoGeralApi(resposta, this.referencia)));
  }

  consultarRelatorioMensal(mes: string): Observable<RelatorioMensalLeitura> {
    const data = validarDataCivilEntrada(mes, 'mes');
    if (!data.endsWith('-01'))
      throw new ErroContratoApi('O mês deve ser informado no primeiro dia.');
    const [anoTexto, mesTexto] = data.split('-');
    const ano = Number.parseInt(anoTexto, 10);
    const numeroMes = Number.parseInt(mesTexto, 10);
    const params = criarParametros()
      .set('ano', String(ano))
      .set('mes', String(numeroMes))
      .set('referencia', this.referencia);
    return this.http
      .get<unknown>('/api/v1/relatorios/mensal', { params })
      .pipe(map((resposta) => mapearRelatorioMensalApi(resposta, this.referencia, ano, numeroMes)));
  }

  cadastrarVenda(
    entrada: ComandoComRevisao<ComandoCadastro>,
  ): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() => {
      const revisaoEsperada = this.revisaoDoComando(entrada.revisaoEsperada);
      const comando = entrada.comando;
      const body = {
        nome: comando.cliente.nome,
        cpf: comando.cliente.cpf,
        telefone: comando.cliente.telefone,
        descricao: comando.cliente.descricao ?? null,
        dataVenda: validarDataCivilEntrada(comando.dataVenda, 'dataVenda'),
        valorTotalCentavos: validarCentavosEntrada(
          comando.valorTotalCentavos,
          'valorTotalCentavos',
        ),
        quantidadeParcelas: validarCentavosEntrada(
          comando.quantidadeParcelas,
          'quantidadeParcelas',
        ),
        referencia: this.referencia,
        revisaoEsperada,
        entrada:
          comando.entrada === null
            ? null
            : {
                valorCentavos: validarCentavosEntrada(
                  comando.entrada.valorCentavos,
                  'entrada.valorCentavos',
                ),
                forma: formaPagamentoWire(comando.entrada.forma),
              },
      };
      return this.resultadoHttp(this.http.post<unknown>('/api/v1/vendas', body), (resposta) =>
        mapearDetalheApi(resposta, this.referencia),
      );
    });
  }

  editarCliente(
    entrada: ComandoComRevisao<ComandoEdicaoCliente>,
  ): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() => {
      const revisaoEsperada = this.revisaoDoComando(entrada.revisaoEsperada);
      const comando = entrada.comando;
      const body = {
        vendaId: validarIdentificadorEntrada(comando.vendaId, 'vendaId'),
        nome: comando.cliente.nome,
        cpf: comando.cliente.cpf,
        telefone: comando.cliente.telefone,
        descricao: comando.cliente.descricao ?? null,
        referencia: this.referencia,
        revisaoEsperada,
      };
      return this.resultadoHttp(
        this.http.put<unknown>('/api/v1/vendas/cliente', body),
        (resposta) => mapearDetalheApi(resposta, this.referencia),
      );
    });
  }

  alterarStatus(
    entrada: ComandoComRevisao<ComandoMudancaStatus>,
  ): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() => {
      const revisaoEsperada = this.revisaoDoComando(entrada.revisaoEsperada);
      const comando = entrada.comando;
      const body = {
        vendaId: validarIdentificadorEntrada(comando.vendaId, 'vendaId'),
        novoStatus: statusAdministrativoWire(comando.status),
        referencia: this.referencia,
        revisaoEsperada,
      };
      return this.resultadoHttp(this.http.put<unknown>('/api/v1/vendas/status', body), (resposta) =>
        mapearDetalheApi(resposta, this.referencia),
      );
    });
  }

  registrarPagamento(
    entrada: ComandoComRevisao<ComandoPagamento>,
  ): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() => {
      const revisaoEsperada = this.revisaoDoComando(entrada.revisaoEsperada);
      const comando = entrada.comando;
      if (comando.valorCentavos === undefined) {
        throw new ErroContratoApi('O valor do recebimento é obrigatório para a API local.');
      }
      const body = {
        vendaId: validarIdentificadorEntrada(comando.vendaId, 'vendaId'),
        parcelaId: validarIdentificadorEntrada(comando.parcelaId, 'parcelaId'),
        valorRecebidoCentavos: validarCentavosEntrada(comando.valorCentavos, 'valorCentavos'),
        data: validarDataCivilEntrada(comando.data, 'data'),
        forma: formaPagamentoWire(comando.forma),
        observacao: comando.observacao ?? null,
        referencia: this.referencia,
        revisaoEsperada,
      };
      return this.resultadoHttp(this.http.post<unknown>('/api/v1/recebimentos', body), (resposta) =>
        mapearDetalheApi(resposta, this.referencia),
      );
    });
  }

  corrigirPagamento(
    entrada: ComandoComRevisao<ComandoCorrecaoPagamento>,
  ): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() => {
      const revisaoEsperada = this.revisaoDoComando(entrada.revisaoEsperada);
      const comando = entrada.comando;
      const body = {
        vendaId: validarIdentificadorEntrada(comando.vendaId, 'vendaId'),
        recebimentoId: validarIdentificadorEntrada(comando.recebimentoId, 'recebimentoId'),
        valorRecebidoCentavos: validarCentavosEntrada(comando.valorCentavos, 'valorCentavos'),
        data: validarDataCivilEntrada(comando.data, 'data'),
        forma: formaPagamentoWire(comando.forma),
        observacao: comando.observacao,
        referencia: this.referencia,
        revisaoEsperada,
      };
      return this.resultadoHttp(this.http.put<unknown>('/api/v1/recebimentos', body), (resposta) =>
        mapearDetalheApi(resposta, this.referencia),
      );
    });
  }

  private revisaoDoComando(valor: string | null): string {
    if (valor === null) throw new ErroContratoApi('A API local exige revisaoEsperada.');
    return revisaoCanonica(valor, 'revisaoEsperada');
  }

  private resultadoHttp<TWire, TLeitura>(
    request: Observable<TWire>,
    mapear: (resposta: TWire) => TLeitura,
  ): Observable<Resultado<TLeitura>> {
    return request.pipe(
      map((resposta) => resultadoSucesso(mapear(resposta))),
      catchError((erroHttp: unknown) => {
        const problema = lerProblemaApi(erroHttp);
        return problema ? of(resultadoProblema<TLeitura>(problema)) : throwError(() => erroHttp);
      }),
    );
  }
}
