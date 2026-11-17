import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { TabelaVendas } from '../componentes/tabela-vendas/tabela-vendas';
import { formatarDataCivil } from '../data-civil';
import { buscarVendas, FiltroSituacaoVenda } from '../venda.busca';

@Component({
  selector: 'app-listar-vendas',
  imports: [Cabecalho, RouterLink, TabelaVendas],
  templateUrl: './listar-vendas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListarVendas {
  private readonly servico = inject(ServicoDemonstracao);
  protected readonly vendas = this.servico.abertas;
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly termo = signal('');
  protected readonly situacao = signal<FiltroSituacaoVenda>('Todas');
  protected readonly resultados = computed(() =>
    buscarVendas(this.vendas(), this.termo(), this.situacao()),
  );

  protected atualizarTermo(evento: Event): void {
    this.termo.set((evento.target as HTMLInputElement).value);
  }

  protected atualizarSituacao(evento: Event): void {
    this.situacao.set((evento.target as HTMLSelectElement).value as FiltroSituacaoVenda);
  }

  protected limparPesquisa(campo: HTMLInputElement): void {
    this.termo.set('');
    campo.focus();
  }

  protected limparCriterios(campo: HTMLInputElement): void {
    this.termo.set('');
    this.situacao.set('Todas');
    campo.focus();
  }
}
