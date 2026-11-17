import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeloSituacao } from '../../../compartilhado/componentes/selo-situacao/selo-situacao';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro } from '../dinheiro';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';

@Component({
  selector: 'app-detalhes-venda',
  imports: [Cabecalho, RouterLink, SeloSituacao],
  templateUrl: './detalhes-venda.html',
  styleUrl: './detalhes-venda.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalhesVenda {
  private readonly rota = inject(ActivatedRoute);
  private readonly servico = inject(ServicoDemonstracao);
  private readonly id = toSignal(this.rota.paramMap, { initialValue: this.rota.snapshot.paramMap });

  protected readonly consulta = computed(() => {
    const id = this.id().get('id');
    return id === null ? null : this.servico.consultarVenda(id);
  });
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
}
