import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeloSituacao } from '../../../compartilhado/componentes/selo-situacao/selo-situacao';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro } from '../dinheiro';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { RetornoFormulario } from '../../../nucleo/demonstracao/retorno-formulario';
import { RegistrarPagamento } from '../../parcelas/registrar-pagamento/registrar-pagamento';

@Component({
  selector: 'app-detalhes-venda',
  imports: [Cabecalho, RouterLink, SeloSituacao, RegistrarPagamento],
  templateUrl: './detalhes-venda.html',
  styleUrl: './detalhes-venda.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalhesVenda {
  protected readonly sucesso = inject(RetornoFormulario).consumirSucesso();
  private readonly rota = inject(ActivatedRoute);
  private readonly servico = inject(ServicoDemonstracao);
  private readonly id = toSignal(this.rota.paramMap, { initialValue: this.rota.snapshot.paramMap });
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly recebendo = linkedSignal({
    source: () => this.id().get('id'),
    computation: () => false,
  });
  protected readonly mensagemRecebimento = signal('');
  protected readonly restaurarFoco = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        (
          host.querySelector<HTMLElement>('[data-acao-receber]') ??
          host.querySelector<HTMLElement>('#titulo-parcelas')
        )?.focus();
      },
      { injector: this.injector },
    );
  };
  protected fecharRecebimento(mensagem: string | null): void {
    this.recebendo.set(false);
    if (mensagem) this.mensagemRecebimento.set(mensagem);
  }

  protected readonly consulta = computed(() => {
    const id = this.id().get('id');
    return id === null ? null : this.servico.consultarVenda(id);
  });
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
}
