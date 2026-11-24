import { Injectable } from '@angular/core';
import { ComandoCorrecaoPagamento } from '../../funcionalidades/parcelas/pagamento.modelos';
import {
  OperacoesPreparacaoCorrecaoPagamento,
  prepararCorrecaoPagamento,
} from '../../funcionalidades/parcelas/pagamento.validacoes';
import { projetarVendas } from '../../funcionalidades/vendas/venda.calculos';
import { Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';

/** Fronteira sem estado para preparar uma substituição por ID, sem publicar nem alocar identidade. */
@Injectable({ providedIn: 'root' })
export class PreparadorCorrecaoPagamento {
  validarConjunto(vendas: readonly Venda[], referencia: string): void {
    projetarVendas(vendas, referencia);
  }

  preparar(
    vendas: readonly Venda[],
    comando: ComandoCorrecaoPagamento,
    referencia: string,
  ): Resultado<readonly Venda[]> {
    const operacoes: OperacoesPreparacaoCorrecaoPagamento = {
      validarConjunto: (conjunto, data) => this.validarConjunto(conjunto, data),
    };
    return prepararCorrecaoPagamento(vendas, comando, referencia, operacoes);
  }
}
