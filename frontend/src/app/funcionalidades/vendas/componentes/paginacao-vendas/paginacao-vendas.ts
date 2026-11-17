import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FaixaPaginacao, obterItensNavegacao } from '../../venda.paginacao';

@Component({
  selector: 'app-paginacao-vendas',
  templateUrl: './paginacao-vendas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginacaoVendas {
  readonly faixa = input.required<FaixaPaginacao>();
  readonly paginaAtual = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly paginaAlterada = output<number>();
  protected readonly itens = computed(() =>
    obterItensNavegacao(this.totalPaginas(), this.paginaAtual()),
  );

  protected irPara(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas() || pagina === this.paginaAtual()) return;
    this.paginaAlterada.emit(pagina);
  }

  protected mover(delta: -1 | 1): void {
    this.irPara(this.paginaAtual() + delta);
  }
}
