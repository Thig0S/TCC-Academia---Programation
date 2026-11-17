import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '../app/app';
import { ServicoDemonstracao } from '../app/nucleo/demonstracao/servico-demonstracao';

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
          cpf: `CPF-DEMO-FIXTURE-${indice}`,
          telefone: `TEL-DEMO-FIXTURE-${indice}`,
        },
        dataVenda: this.servico.referencia,
        valorTotalCentavos: 60000,
        quantidadeParcelas: 1,
        entrada: null,
      });
      if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
    }
    afterNextRender(() => void this.router.navigateByUrl('/vendas'));
  }
}
