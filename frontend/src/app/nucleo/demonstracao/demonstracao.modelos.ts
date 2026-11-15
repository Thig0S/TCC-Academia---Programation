import { Venda } from '../../funcionalidades/vendas/venda.modelos';

export interface EstadoDemonstracao {
  readonly referencia: string;
  readonly vendas: readonly Venda[];
  readonly proximoId: number;
}
