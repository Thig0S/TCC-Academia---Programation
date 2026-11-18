import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { RetornoFormulario } from '../../../nucleo/demonstracao/retorno-formulario';
import { FORMAS_PAGAMENTO } from '../../parcelas/pagamento.modelos';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro, subtrairCentavos } from '../dinheiro';
import { IdentificacaoCliente } from '../formulario-venda/identificacao-cliente';
import { ErroCampo } from '../formulario-venda/erro-campo';
import { converterCadastro, iniciarCadastro, prepararPrevia } from '../formulario-venda/rascunhos';

@Component({
  selector: 'app-cadastrar-venda',
  imports: [Cabecalho, RouterLink, FormField, IdentificacaoCliente, ErroCampo],
  templateUrl: './cadastrar-venda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastrarVenda {
  private readonly fonte = inject(ServicoDemonstracao);
  private readonly router = inject(Router);
  private readonly retorno = inject(RetornoFormulario);
  protected readonly referencia = this.fonte.referencia;
  protected readonly rascunho = signal(iniciarCadastro(this.referencia));
  protected readonly conversao = computed(() =>
    converterCadastro(this.rascunho(), this.referencia),
  );
  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of [
      'nome',
      'cpf',
      'telefone',
      'dataVenda',
      'valorTotal',
      'valorEntrada',
      'formaEntrada',
      'quantidadeParcelas',
    ] as const) {
      validate(p[chave], () => {
        const resultado = this.conversao();
        const mensagem = resultado.tipo === 'invalido' ? resultado.erros[chave] : null;
        return mensagem ? { kind: 'dominio', message: mensagem } : null;
      });
    }
  });
  protected readonly previa = computed(() => prepararPrevia(this.rascunho(), this.referencia));
  protected readonly formas = FORMAS_PAGAMENTO;
  protected readonly mensagem = signal('');
  protected readonly concluido = signal(false);
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly subtrairCentavos = subtrairCentavos;

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido()) return;
    try {
      await submit(this.campos, {
        onInvalid: (campo) => campo().errorSummary()[0]?.fieldTree().focusBoundControl(),
        action: async () => {
          this.mensagem.set('');
          const conversao = converterCadastro(this.rascunho(), this.referencia);
          if (conversao.tipo !== 'sucesso') return;
          try {
            const resultado = this.fonte.cadastrarVenda(conversao.comando);
            if (resultado.tipo !== 'sucesso') {
              this.mensagem.set(resultado.mensagem);
              return;
            }
            this.concluido.set(true);
            this.retorno.anunciar(resultado.mensagem);
            await this.router.navigate(['/vendas', resultado.valor.id]);
          } catch {
            const message = 'Não foi possível concluir a simulação. Revise e tente novamente.';
            this.mensagem.set(message);
            return;
          }
        },
      });
    } catch {
      this.mensagem.set('Não foi possível enviar. Seus dados foram mantidos para nova tentativa.');
    }
  }

  protected cancelar(): void {
    this.retorno.preparar('nova-venda');
    void this.router.navigate(['/vendas']);
  }
}
