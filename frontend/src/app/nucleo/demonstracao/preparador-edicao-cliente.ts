import { Injectable } from '@angular/core';
import { ComandoEdicaoCliente, Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';
import { prepararEdicaoCliente } from '../../funcionalidades/vendas/venda.validacoes';

/** Fronteira sem estado, seguindo o adaptador de recebimento; não publica. */
@Injectable({ providedIn: 'root' })
export class PreparadorEdicaoCliente {
  preparar(vendas: readonly Venda[], comando: ComandoEdicaoCliente): Resultado<Venda> {
    return prepararEdicaoCliente(vendas, comando);
  }
}
