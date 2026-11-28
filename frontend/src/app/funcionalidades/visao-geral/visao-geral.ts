import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';
import { ControleConsultas } from '../../nucleo/dados/controle-consultas';
import { EstadoConsultaPorChave } from '../../nucleo/dados/estado-consulta';
import { FONTE_VENDAS } from '../../nucleo/dados/fonte-vendas';
import { VisaoGeralLeitura } from '../../nucleo/dados/modelos-leitura';
import { formatarDataCivil, limitesDoMes } from '../vendas/data-civil';
import { formatarDinheiro } from '../vendas/dinheiro';

@Component({
  selector: 'app-visao-geral',
  imports: [Cabecalho, RouterLink],
  templateUrl: './visao-geral.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaoGeral {
  private readonly fonte = inject(FONTE_VENDAS);
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly consultaInterna = new EstadoConsultaPorChave<VisaoGeralLeitura>(
    this.controleConsultas,
  );
  protected readonly estadoConsulta = this.consultaInterna.estado;
  protected readonly referencia = this.fonte.referencia;
  protected readonly limitesMes = limitesDoMes(this.referencia);

  private readonly acompanharConsulta = effect((onCleanup) => {
    this.controleConsultas.geracao();
    untracked(() => this.carregarVisaoGeral());
    onCleanup(() => untracked(() => this.consultaInterna.cancelar()));
  });

  protected recarregar(): void {
    this.carregarVisaoGeral();
  }

  private carregarVisaoGeral(): void {
    this.consultaInterna.carregar({ tipo: 'painel', referencia: this.referencia }, () =>
      this.fonte.consultarVisaoGeral(),
    );
  }

  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarDinheiro = formatarDinheiro;
}
