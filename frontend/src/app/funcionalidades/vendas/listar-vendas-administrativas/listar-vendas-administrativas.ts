import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { TabelaVendas } from '../componentes/tabela-vendas/tabela-vendas';
import { PaginacaoVendas } from '../componentes/paginacao-vendas/paginacao-vendas';
import { formatarDataCivil } from '../data-civil';
import { buscarVendas } from '../venda.busca';
import { StatusAdministrativoVenda } from '../venda.modelos';
import {
  limitarPagina,
  obterFaixaPaginacao,
  obterPagina,
  obterTotalPaginas,
} from '../venda.paginacao';

@Component({
  selector: 'app-listar-vendas-administrativas',
  imports: [Cabecalho, TabelaVendas, PaginacaoVendas],
  templateUrl: './listar-vendas-administrativas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListarVendasAdministrativas {
  private readonly servico = inject(ServicoDemonstracao);
  private readonly rota = inject(ActivatedRoute);
  private readonly configuracao = toSignal(this.rota.data, {
    initialValue: this.rota.snapshot.data,
  });
  protected readonly status = computed<Extract<StatusAdministrativoVenda, 'Inativo' | 'Prejuízo'>>(
    () => (this.configuracao()['statusAdministrativo'] === 'Prejuízo' ? 'Prejuízo' : 'Inativo'),
  );
  protected readonly titulo = computed(() =>
    this.status() === 'Inativo' ? 'Vendas inativas' : 'Vendas em Prejuízo',
  );
  protected readonly descricao = computed(() =>
    this.status() === 'Inativo'
      ? 'Vendas preservadas, fora das coleções e dos indicadores operacionais.'
      : 'Cobranças separadas das vendas ativas e dos indicadores operacionais.',
  );
  protected readonly origem = computed<'inativas' | 'prejuizo'>(() =>
    this.status() === 'Inativo' ? 'inativas' : 'prejuizo',
  );
  protected readonly vendas = computed(() =>
    this.status() === 'Inativo' ? this.servico.inativas() : this.servico.prejuizos(),
  );
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly termo = signal('');
  protected readonly resultados = computed(() => buscarVendas(this.vendas(), this.termo()));
  protected readonly totalPaginas = computed(() => obterTotalPaginas(this.resultados().length));
  private readonly chaveCriterios = computed(() => this.termo());
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

  protected limparPesquisa(campo: HTMLInputElement): void {
    this.termo.set('');
    this.paginaSelecionada.set(1);
    campo.focus();
  }

  protected selecionarPagina(pagina: number): void {
    this.paginaSelecionada.set(pagina);
  }
}
