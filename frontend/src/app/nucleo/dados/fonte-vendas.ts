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
  RelatorioMensalLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
  VisaoGeralLeitura,
} from './modelos-leitura';

/** Fonte de dados assíncrona compartilhada pelas composições de demonstração e local. */
export interface FonteVendas {
  readonly referencia: string;

  consultarColecao(colecao: ColecaoVendas): Observable<readonly VendaResumoLeitura[]>;
  consultarVenda(id: string): Observable<Resultado<VendaDetalheLeitura>>;
  consultarVisaoGeral(): Observable<VisaoGeralLeitura>;
  consultarRelatorioMensal(mes: string): Observable<RelatorioMensalLeitura>;

  cadastrarVenda(comando: ComandoCadastro): Observable<Resultado<VendaDetalheLeitura>>;
  editarCliente(comando: ComandoEdicaoCliente): Observable<Resultado<VendaDetalheLeitura>>;
  alterarStatus(comando: ComandoMudancaStatus): Observable<Resultado<VendaDetalheLeitura>>;
  registrarPagamento(comando: ComandoPagamento): Observable<Resultado<VendaDetalheLeitura>>;
  corrigirPagamento(comando: ComandoCorrecaoPagamento): Observable<Resultado<VendaDetalheLeitura>>;
}

export const FONTE_VENDAS = new InjectionToken<FonteVendas>('Fonte assíncrona de vendas');

/** Implementação ligada somente pela composição local, preenchida junto ao cliente HTTP. */
export const FONTE_VENDAS_LOCAL = new InjectionToken<FonteVendas>(
  'Fonte local persistida de vendas',
);
