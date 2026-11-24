import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { Modal } from '../../../compartilhado/componentes/modal/modal';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { ErroCampo } from '../../vendas/formulario-venda/erro-campo';
import {
  converterEdicaoRecebimento,
  iniciarEdicaoRecebimento,
  RascunhoRecebimento,
} from '../../vendas/formulario-venda/rascunhos';
import { ProjecaoParcela } from '../parcela.calculos';
import { ProjecaoVenda } from '../../vendas/venda.calculos';
import { formatarDinheiro } from '../../vendas/dinheiro';
import { formatarDataCivil } from '../../vendas/data-civil';
import { FORMAS_PAGAMENTO, PagamentoIndividualDemonstrativo } from '../pagamento.modelos';

@Component({
  selector: 'app-corrigir-pagamento',
  imports: [Modal, FormField, ErroCampo],
  templateUrl: './corrigir-pagamento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrigirPagamento {
  readonly venda = input.required<ProjecaoVenda>();
  readonly parcela = input.required<ProjecaoParcela>();
  readonly pagamento = input.required<PagamentoIndividualDemonstrativo>();
  readonly restaurarFoco = input.required<() => void>();
  readonly encerrado = output<string | null>();
  private readonly fonte = inject(ServicoDemonstracao);
  private readonly modal = viewChild.required(Modal);
  private readonly injector = inject(Injector);
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  protected readonly rascunho = linkedSignal({
    source: () => this.pagamento().id,
    computation: () => iniciarEdicaoRecebimento(this.pagamento()),
  });
  protected readonly conversao = computed(() => {
    const atual = this.fonte.consultarVenda(this.venda().id);
    return converterEdicaoRecebimento(
      this.rascunho(),
      atual.tipo === 'sucesso' ? atual.valor : this.venda(),
      this.pagamento().id,
      this.fonte.referencia,
    );
  });
  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of ['data', 'forma', 'valorRecebido', 'observacao'] as const) {
      validate(p[chave], () => {
        const resultado = this.conversao();
        const message = resultado.tipo === 'invalido' ? resultado.erros[chave] : null;
        return message ? { kind: 'dominio', message } : null;
      });
    }
    validate(p, () => {
      const resultado = this.conversao();
      return resultado.tipo === 'invalido' && resultado.resumo
        ? { kind: 'alvo', message: resultado.resumo }
        : null;
    });
  });
  protected readonly formas = FORMAS_PAGAMENTO;
  protected readonly mensagem = signal('');
  protected readonly concluido = signal(false);
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  private sucesso: string | null = null;

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido()) return;
    try {
      await submit(this.campos, {
        onInvalid: (campo) => {
          const resultado = this.conversao();
          if (resultado.tipo === 'invalido' && resultado.resumo) {
            this.mensagem.set(resultado.resumo);
            afterNextRender(() => this.alerta()?.nativeElement.focus(), {
              injector: this.injector,
            });
          } else campo().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
        action: async () => {
          this.mensagem.set('');
          const conversao = this.conversao();
          if (conversao.tipo !== 'sucesso') return;
          try {
            const resultado = this.fonte.corrigirPagamento(conversao.comando);
            if (resultado.tipo !== 'sucesso') {
              this.mensagem.set(resultado.mensagem);
              afterNextRender(() => this.alerta()?.nativeElement.focus(), {
                injector: this.injector,
              });
              return;
            }
            this.concluido.set(true);
            this.sucesso = resultado.mensagem;
            this.modal().fechar();
          } catch {
            this.mensagem.set(
              'Não foi possível corrigir o recebimento. Seus dados foram mantidos para nova tentativa.',
            );
            afterNextRender(() => this.alerta()?.nativeElement.focus(), {
              injector: this.injector,
            });
          }
        },
      });
    } catch {
      this.mensagem.set('Não foi possível enviar. Seus dados foram mantidos para nova tentativa.');
    }
  }

  protected cancelar(): void {
    this.modal().fechar();
  }

  protected fechar(): void {
    this.encerrado.emit(this.sucesso);
  }
}
