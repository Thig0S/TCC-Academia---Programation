import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { TabelaVendas } from '../componentes/tabela-vendas/tabela-vendas';
import { formatarDataCivil } from '../data-civil';
import { buscarVendas } from '../venda.busca';

@Component({
  selector: 'app-listar-vendas-quitadas',
  imports: [Cabecalho, RouterLink, TabelaVendas],
  templateUrl: './listar-vendas-quitadas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListarVendasQuitadas {
  private readonly servico = inject(ServicoDemonstracao);
  protected readonly vendas = this.servico.quitadas;
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly termo = signal('');
  protected readonly resultados = computed(() => buscarVendas(this.vendas(), this.termo()));

  protected atualizarTermo(evento: Event): void {
    this.termo.set((evento.target as HTMLInputElement).value);
  }

  protected limparPesquisa(campo: HTMLInputElement): void {
    this.termo.set('');
    campo.focus();
  }
}
