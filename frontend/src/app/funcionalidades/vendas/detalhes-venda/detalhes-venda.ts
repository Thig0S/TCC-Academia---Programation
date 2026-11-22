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
import { ProjecaoParcela } from '../../parcelas/parcela.calculos';
import { ProjecaoVenda } from '../venda.calculos';

@Component({
  selector: 'app-detalhes-venda',
  imports: [Cabecalho, RouterLink, SeloSituacao, RegistrarPagamento],
  templateUrl: './detalhes-venda.html',
  styleUrl: './detalhes-venda.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalhesVenda {
  protected readonly sucesso = inject(RetornoFormulario).consumirSucesso();
  private readonly rota = inject(ActivatedRoute);
  private readonly servico = inject(ServicoDemonstracao);
  private readonly id = toSignal(this.rota.paramMap, { initialValue: this.rota.snapshot.paramMap });
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly parcelaPagamento = linkedSignal<string | null, string | null>({
    source: () => this.id().get('id'),
    computation: () => null,
  });
  protected readonly mensagemRecebimento = signal('');
  private readonly focoProxima = signal(false);
  private readonly acionadorPagamento = signal<string | null>(null);
  protected readonly restaurarFoco = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        const acoes = [...host.querySelectorAll<HTMLElement>('[data-acao-pagar]')];
        const destino = this.focoProxima()
          ? acoes[0]
          : acoes.find((acao) => acao.dataset['acaoPagar'] === this.acionadorPagamento());
        (destino ?? host.querySelector<HTMLElement>('#titulo-parcelas'))?.focus();
        this.focoProxima.set(false);
      },
      { injector: this.injector },
    );
  };
  protected fecharRecebimento(mensagem: string | null): void {
    this.parcelaPagamento.set(null);
    if (mensagem) {
      this.mensagemRecebimento.set(mensagem);
      this.focoProxima.set(true);
    }
  }

  protected abrirPagamento(parcelaId: string): void {
    this.mensagemRecebimento.set('');
    this.acionadorPagamento.set(parcelaId);
    this.parcelaPagamento.set(parcelaId);
  }

  protected primeiraPendente(venda: ProjecaoVenda, parcela: ProjecaoParcela): boolean {
    return venda.parcelas.find((item) => item.situacao !== 'Paga')?.id === parcela.id;
  }

  protected parcelaAlvo(venda: ProjecaoVenda): ProjecaoParcela | null {
    const id = this.parcelaPagamento();
    return id ? (venda.parcelas.find((parcela) => parcela.id === id) ?? null) : null;
  }

  protected readonly consulta = computed(() => {
    const id = this.id().get('id');
    return id === null ? null : this.servico.consultarVenda(id);
  });
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
}
