import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { Modal } from '../../../compartilhado/componentes/modal/modal';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { formatarDinheiro, somarCentavos } from '../../vendas/dinheiro';
import { formatarDataCivil } from '../../vendas/data-civil';
import { ProjecaoVenda } from '../../vendas/venda.calculos';
import { ErroCampo } from '../../vendas/formulario-venda/erro-campo';
import {
  converterRecebimento,
  inteiroPositivo,
  RascunhoRecebimento,
} from '../../vendas/formulario-venda/rascunhos';
import { FORMAS_PAGAMENTO } from '../pagamento.modelos';
import { ProjecaoParcela } from '../parcela.calculos';

@Component({
  selector: 'app-registrar-pagamento',
  imports: [Modal, FormField, ErroCampo],
  templateUrl: './registrar-pagamento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPagamento implements OnInit {
  readonly venda = input.required<ProjecaoVenda>();
  readonly restaurarFoco = input.required<() => void>();
  readonly encerrado = output<string | null>();
  private readonly fonte = inject(ServicoDemonstracao);
  private readonly modal = viewChild.required(Modal);
  protected readonly pendentes = signal<readonly ProjecaoParcela[]>([]);
  protected readonly rascunho = signal<RascunhoRecebimento>({
    quantidade: '1',
    valor: '',
    data: this.fonte.referencia,
    forma: '',
  });
  protected readonly selecionadas = computed(() => {
    const quantidade = inteiroPositivo(this.rascunho().quantidade);
    return quantidade !== null && quantidade <= this.pendentes().length
      ? this.pendentes().slice(0, quantidade)
      : [];
  });
  protected readonly soma = computed(() =>
    somarCentavos(this.selecionadas().map((p) => p.valorCentavos)),
  );
  protected readonly conversao = computed(() => {
    const atual = this.fonte.consultarVenda(this.venda().id);
    return converterRecebimento(
      this.rascunho(),
      atual.tipo === 'sucesso' ? atual.valor : this.venda(),
      this.selecionadas().map((p) => p.id),
      this.fonte.referencia,
    );
  });
  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of ['quantidade', 'valor', 'data', 'forma'] as const) {
      validate(p[chave], () => {
        const resultado = this.conversao();
        const message = resultado.tipo === 'invalido' ? resultado.erros[chave] : null;
        return message ? { kind: 'dominio', message } : null;
      });
    }
    validate(p, () => {
      const resultado = this.conversao();
      return resultado.tipo === 'invalido' && resultado.resumo
        ? { kind: 'selecao', message: resultado.resumo }
        : null;
    });
  });
  protected readonly formas = FORMAS_PAGAMENTO;
  protected readonly mensagem = signal('');
  protected readonly concluido = signal(false);
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  private sucesso: string | null = null;

  ngOnInit(): void {
    // Snapshot de abertura: nunca recalcular o prefixo sobre pendências novas.
    this.pendentes.set(this.venda().parcelas.filter((p) => p.situacao !== 'Paga'));
  }

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido()) return;
    try {
      await submit(this.campos, {
        onInvalid: (campo) => {
          const resultado = this.conversao();
          if (resultado.tipo === 'invalido' && resultado.resumo) {
            this.mensagem.set(resultado.resumo);
            this.campos.quantidade().focusBoundControl();
          } else campo().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
        action: async () => {
          this.mensagem.set('');
          const conversao = this.conversao();
          if (conversao.tipo !== 'sucesso') return;
          try {
            const resultado = this.fonte.registrarPagamento(conversao.comando);
            if (resultado.tipo !== 'sucesso') {
              this.mensagem.set(resultado.mensagem);
              return;
            }
            this.concluido.set(true);
            this.sucesso = resultado.mensagem;
            this.modal().fechar();
          } catch {
            this.mensagem.set(
              'Não foi possível concluir o recebimento. Seus dados foram mantidos para nova tentativa.',
            );
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
