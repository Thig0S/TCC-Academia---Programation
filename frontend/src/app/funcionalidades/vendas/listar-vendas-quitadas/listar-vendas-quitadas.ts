import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { EstadoConsultaPorChave } from '../../../nucleo/dados/estado-consulta';
import { FONTE_VENDAS } from '../../../nucleo/dados/fonte-vendas';
import { ColecaoVendasLeitura } from '../../../nucleo/dados/modelos-leitura';
import { TabelaVendas } from '../componentes/tabela-vendas/tabela-vendas';
import { PaginacaoVendas } from '../componentes/paginacao-vendas/paginacao-vendas';
import { formatarDataCivil } from '../data-civil';
import { buscarVendas } from '../venda.busca';
import {
  limitarPagina,
  obterFaixaPaginacao,
  obterPagina,
  obterTotalPaginas,
} from '../venda.paginacao';

@Component({
  selector: 'app-listar-vendas-quitadas',
  imports: [Cabecalho, TabelaVendas, PaginacaoVendas],
  templateUrl: './listar-vendas-quitadas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListarVendasQuitadas {
  private readonly fonte = inject(FONTE_VENDAS);
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly consultaInterna = new EstadoConsultaPorChave<ColecaoVendasLeitura>(
    this.controleConsultas,
  );
  protected readonly estadoConsulta = this.consultaInterna.estado;
  protected readonly carregando = computed(() => {
    const tipo = this.estadoConsulta().tipo;
    return tipo === 'inicial' || tipo === 'carregando';
  });
  protected readonly consultaPronta = computed(() => this.estadoConsulta().tipo === 'pronto');
  protected readonly vendas = computed(() => {
    const estado = this.estadoConsulta();
    return estado.tipo === 'pronto' ? estado.valor.vendas : [];
  });
  protected readonly referencia = this.fonte.referencia;
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

  private readonly acompanharConsulta = effect((onCleanup) => {
    this.controleConsultas.geracao();
    untracked(() => this.carregarColecao());
    onCleanup(() => untracked(() => this.consultaInterna.cancelar()));
  });

  protected recarregarColecao(): void {
    this.carregarColecao();
  }

  private carregarColecao(): void {
    const colecao = 'quitadas';
    this.consultaInterna.carregar({ tipo: 'colecao', colecao, referencia: this.referencia }, () =>
      this.fonte.consultarColecao(colecao),
    );
  }

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
