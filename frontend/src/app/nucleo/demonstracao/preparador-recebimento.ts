import { Injectable } from '@angular/core';
import {
  AlocacaoPagamento,
  ComandoPagamento,
} from '../../funcionalidades/parcelas/pagamento.modelos';
import { prepararPagamento } from '../../funcionalidades/parcelas/pagamento.validacoes';
import { prepararAlocacao } from '../../funcionalidades/parcelas/parcela.calculos';
import { Parcela } from '../../funcionalidades/parcelas/parcela.modelos';
import { projetarVendas } from '../../funcionalidades/vendas/venda.calculos';
import { Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';

/** Fronteira sem estado; publicação e identificadores pertencem à sessão. */
@Injectable({ providedIn: 'root' })
export class PreparadorRecebimento {
  alocar(parcela: Parcela): AlocacaoPagamento {
    return prepararAlocacao(parcela);
  }

  validarConjunto(vendas: readonly Venda[], referencia: string): void {
    projetarVendas(vendas, referencia);
  }

  preparar(
    vendas: readonly Venda[],
    comando: ComandoPagamento,
    referencia: string,
    recebimentoId: string,
  ): Resultado<readonly Venda[]> {
    return prepararPagamento(vendas, comando, referencia, recebimentoId, {
      alocar: (parcela) => this.alocar(parcela),
      validarConjunto: (conjunto, data) => this.validarConjunto(conjunto, data),
    });
  }
}
