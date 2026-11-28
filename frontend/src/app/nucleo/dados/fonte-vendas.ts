import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
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
  ColecaoVendas,
  ColecaoVendasLeitura,
  RelatorioMensalLeitura,
  VendaDetalheLeitura,
  VisaoGeralLeitura,
} from './modelos-leitura';

/** Fonte de dados assíncrona compartilhada pelas composições de demonstração e local. */
export interface FonteVendas {
  readonly referencia: string;

  consultarColecao(colecao: ColecaoVendas): Observable<ColecaoVendasLeitura>;
  consultarVenda(id: string): Observable<Resultado<VendaDetalheLeitura>>;
  consultarVisaoGeral(): Observable<VisaoGeralLeitura>;
  consultarRelatorioMensal(mes: string): Observable<RelatorioMensalLeitura>;

  cadastrarVenda(
    entrada: ComandoComRevisao<ComandoCadastro>,
  ): Observable<Resultado<VendaDetalheLeitura>>;
  editarCliente(
    entrada: ComandoComRevisao<ComandoEdicaoCliente>,
  ): Observable<Resultado<VendaDetalheLeitura>>;
  alterarStatus(
    entrada: ComandoComRevisao<ComandoMudancaStatus>,
  ): Observable<Resultado<VendaDetalheLeitura>>;
  registrarPagamento(
    entrada: ComandoComRevisao<ComandoPagamento>,
  ): Observable<Resultado<VendaDetalheLeitura>>;
  corrigirPagamento(
    entrada: ComandoComRevisao<ComandoCorrecaoPagamento>,
  ): Observable<Resultado<VendaDetalheLeitura>>;
}

/** Revisão do snapshot que autorizou a confirmação; null existe somente na demonstração. */
export interface ComandoComRevisao<T> {
  readonly comando: T;
  readonly revisaoEsperada: string | null;
}

export const FONTE_VENDAS = new InjectionToken<FonteVendas>('Fonte assíncrona de vendas');

/** Implementação ligada somente pela composição local, preenchida junto ao cliente HTTP. */
export const FONTE_VENDAS_LOCAL = new InjectionToken<FonteVendas>(
  'Fonte local persistida de vendas',
);
