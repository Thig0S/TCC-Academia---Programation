import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { RetornoFormulario } from '../../../nucleo/navegacao/retorno-formulario';
import { IdentificacaoCliente } from '../formulario-venda/identificacao-cliente';
import {
  converterEdicao,
  copiarCliente,
  errosCliente,
  RascunhoCliente,
} from '../formulario-venda/rascunhos';

@Component({
  selector: 'app-editar-venda',
  imports: [Cabecalho, RouterLink, IdentificacaoCliente],
  templateUrl: './editar-venda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarVenda {
  private readonly fonte = inject(ServicoDemonstracao);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retorno = inject(RetornoFormulario);
  private readonly parametros = toSignal(this.rota.paramMap, {
    initialValue: this.rota.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.parametros().get('id') ?? '');
  protected readonly consulta = computed(() => this.fonte.consultarVenda(this.id()));
  private readonly origem: unknown =
    this.router.currentNavigation()?.extras.state?.['origemEdicao'];
  protected readonly rascunho = linkedSignal<RascunhoCliente>(() => {
    const id = this.id();
    return untracked(() => {
      const resultado = this.fonte.consultarVenda(id);
      return resultado.tipo === 'sucesso'
        ? copiarCliente(resultado.valor.cliente)
        : { nome: '', cpf: '', telefone: '', descricao: '' };
    });
  });
  protected readonly mensagem = linkedSignal({ source: this.id, computation: () => '' });
  protected readonly concluido = linkedSignal({ source: this.id, computation: () => false });
  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of ['nome', 'cpf', 'telefone'] as const) {
      validate(p[chave], () => {
        const message = errosCliente(this.rascunho())[chave];
        return message ? { kind: 'dominio', message } : null;
      });
    }
  });

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido()) return;
    try {
      await submit(this.campos, {
        onInvalid: (campo) => campo().errorSummary()[0]?.fieldTree().focusBoundControl(),
        action: async () => {
          this.mensagem.set('');
          const comando = converterEdicao(this.rascunho(), this.id());
          if (comando.tipo !== 'sucesso') return;
          try {
            const resultado = this.fonte.editarCliente(comando.comando);
            if (resultado.tipo !== 'sucesso') {
              this.mensagem.set(resultado.mensagem);
              return;
            }
            this.concluido.set(true);
            this.retorno.anunciar(resultado.mensagem);
            await this.router.navigate(['/vendas', resultado.valor.id]);
          } catch {
            this.mensagem.set(
              'Não foi possível concluir a edição. Seus dados foram mantidos para nova tentativa.',
            );
          }
        },
      });
    } catch {
      this.mensagem.set('Não foi possível enviar. Seus dados foram mantidos para nova tentativa.');
    }
  }

  protected cancelar(): void {
    this.retorno.preparar(`editar-${this.id()}`);
    const destino =
      this.origem === 'abertas'
        ? ['/vendas']
        : this.origem === 'quitadas'
          ? ['/vendas/quitadas']
          : this.origem === 'inativas'
            ? ['/vendas/inativas']
            : this.origem === 'prejuizo'
              ? ['/vendas/prejuizo']
              : ['/vendas', this.id()];
    void this.router.navigate(destino);
  }
}
