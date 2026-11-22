import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '../app/app';
import { ServicoDemonstracao } from '../app/nucleo/demonstracao/servico-demonstracao';
import { criarIdentificacaoSintetica } from '../app/nucleo/demonstracao/identificacao-sintetica';

@Component({
  selector: 'app-paginacao-fixture',
  imports: [App],
  template: '<app-root />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginacaoFixture {
  private readonly servico = inject(ServicoDemonstracao);
  private readonly router = inject(Router);

  constructor() {
    for (let indice = 0; this.servico.abertas().length < 21; indice++) {
      const resultado = this.servico.cadastrarVenda({
        cliente: {
          nome: `Cliente Fixture ${indice}`,
          ...criarIdentificacaoSintetica(100 + indice),
        },
        dataVenda: this.servico.referencia,
        valorTotalCentavos: 5000 + indice * 19750,
        quantidadeParcelas: 1,
        entrada: null,
      });
      if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
    }
    for (const { quantidadeParcelas, nome, descricao, entrada } of [
      {
        quantidadeParcelas: 10,
        nome: 'Cliente Fixture Detalhe Dez',
        descricao: 'Descrição curta para o cenário de dez parcelas.',
        entrada: { valorCentavos: 10000, data: this.servico.referencia, forma: 'Pix' },
      },
      {
        quantidadeParcelas: 11,
        nome: 'Cliente Fixture Detalhe Onze',
        descricao: 'Descrição extensa para rolagem interna. '.repeat(40),
        entrada: null,
      },
    ]) {
      const venda = this.servico.cadastrarVenda({
        cliente: {
          nome,
          ...criarIdentificacaoSintetica(200 + quantidadeParcelas),
          descricao,
        },
        dataVenda: this.servico.referencia,
        valorTotalCentavos: 110000,
        quantidadeParcelas,
        entrada,
      });
      if (venda.tipo !== 'sucesso') throw new Error(venda.mensagem);
      const pagas = new Set(
        venda.valor.recebimentos.flatMap((recebimento) =>
          recebimento.alocacoes.map((alocacao) => alocacao.parcelaId),
        ),
      );
      const pendentes = venda.valor.parcelas.filter((parcela) => !pagas.has(parcela.id));
      const pagamento = this.servico.registrarPagamento({
        vendaId: venda.valor.id,
        parcelaIds: pendentes.map((parcela) => parcela.id),
        valorCentavos: pendentes.reduce((total, parcela) => total + parcela.valorCentavos, 0),
        data: this.servico.referencia,
        forma: 'Pix',
      });
      if (pagamento.tipo !== 'sucesso') throw new Error(pagamento.mensagem);
    }
    const quantidade = new URLSearchParams(location.search).get('quantidade');
    if (quantidade !== null && ['0', '1', '10', '11', '21'].includes(quantidade)) {
      for (const venda of this.servico.abertas().slice(Number(quantidade))) {
        const pendentes = venda.parcelas.filter((parcela) => parcela.situacao !== 'Paga');
        const pagamento = this.servico.registrarPagamento({
          vendaId: venda.id,
          parcelaIds: pendentes.map((parcela) => parcela.id),
          valorCentavos: pendentes.reduce((total, parcela) => total + parcela.valorCentavos, 0),
          data: this.servico.referencia,
          forma: 'Pix',
        });
        if (pagamento.tipo !== 'sucesso') throw new Error(pagamento.mensagem);
      }
    }
    afterNextRender(() => void this.router.navigateByUrl('/vendas'));
  }
}
