import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { TabelaVendas } from '../componentes/tabela-vendas/tabela-vendas';
import { PaginacaoVendas } from '../componentes/paginacao-vendas/paginacao-vendas';
import { formatarDataCivil } from '../data-civil';
import { buscarVendas, FiltroSituacaoVenda } from '../venda.busca';
import {
  CriterioOrdenacaoVenda,
  CRITERIOS_ORDENACAO_VENDAS,
  ordenarVendas,
} from '../venda.ordenacao';
import {
  limitarPagina,
  obterFaixaPaginacao,
  obterPagina,
  obterTotalPaginas,
} from '../venda.paginacao';

@Component({
  selector: 'app-listar-vendas',
  imports: [Cabecalho, RouterLink, TabelaVendas, PaginacaoVendas],
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
  protected readonly ordenacao = signal<CriterioOrdenacaoVenda>('original');
  protected readonly criteriosOrdenacao = CRITERIOS_ORDENACAO_VENDAS;
  private readonly filtrados = computed(() =>
    buscarVendas(this.vendas(), this.termo(), this.situacao()),
  );
  protected readonly resultados = computed(() => ordenarVendas(this.filtrados(), this.ordenacao()));
  protected readonly totalPaginas = computed(() => obterTotalPaginas(this.resultados().length));
  private readonly chaveCriterios = computed(() =>
    JSON.stringify([this.termo(), this.situacao(), this.ordenacao()]),
  );
  private readonly origemPagina = computed(() => ({
    chaveCriterios: this.chaveCriterios(),
    totalPaginas: this.totalPaginas(),
  }));
  protected readonly paginaSelecionada = linkedSignal<
    { chaveCriterios: string; totalPaginas: number },
    number
  >({
    source: this.origemPagina,
    computation: (atual, anterior) => {
      if (!anterior || atual.chaveCriterios !== anterior.source.chaveCriterios) return 1;
      return limitarPagina(anterior.value, atual.totalPaginas);
    },
  });
  protected readonly vendasPagina = computed(() =>
    obterPagina(this.resultados(), this.paginaSelecionada()),
  );
  protected readonly faixaResultados = computed(() =>
    obterFaixaPaginacao(this.resultados().length, this.paginaSelecionada()),
  );

  protected atualizarTermo(evento: Event): void {
    this.termo.set((evento.target as HTMLInputElement).value);
  }

  protected atualizarSituacao(evento: Event): void {
    this.situacao.set((evento.target as HTMLSelectElement).value as FiltroSituacaoVenda);
  }

  protected atualizarOrdenacao(evento: Event): void {
    this.ordenacao.set((evento.target as HTMLSelectElement).value as CriterioOrdenacaoVenda);
  }

  protected limparPesquisa(campo: HTMLInputElement): void {
    this.termo.set('');
    this.paginaSelecionada.set(1);
    campo.focus();
  }

  protected selecionarPagina(pagina: number): void {
    this.paginaSelecionada.set(pagina);
  }
}
