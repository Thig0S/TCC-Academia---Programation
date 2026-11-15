import { computed, inject, Injectable, signal } from '@angular/core';
import { ComandoPagamento } from '../../funcionalidades/parcelas/pagamento.modelos';
import {
  consultarPeriodo,
  projetarVendas,
  resumirVendas,
  separarVendas,
  ProjecaoVenda,
} from '../../funcionalidades/vendas/venda.calculos';
import { ComandoCadastro, Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';
import { prepararCadastro } from '../../funcionalidades/vendas/venda.validacoes';
import { criarDadosDemonstrativos } from './dados-demonstrativos';
import { EstadoDemonstracao } from './demonstracao.modelos';
import { PreparadorRecebimento } from './preparador-recebimento';
import { REFERENCIA_DEMONSTRACAO } from './referencia-demonstracao';

function congelar<T>(valor: T): T {
  if (valor !== null && typeof valor === 'object') {
    Object.values(valor).forEach((item: unknown) => congelar(item));
    Object.freeze(valor);
  }
  return valor;
}

function copiarCongelado<T>(valor: T): T {
  return congelar(structuredClone(valor));
}

@Injectable({ providedIn: 'root' })
export class ServicoDemonstracao {
  private readonly preparador = inject(PreparadorRecebimento);
  readonly referencia = inject(REFERENCIA_DEMONSTRACAO);
  private readonly estado = signal<EstadoDemonstracao>(
    copiarCongelado({
      referencia: this.referencia,
      vendas: criarDadosDemonstrativos(this.referencia),
      proximoId: 1,
    }),
  );

  readonly vendas = computed(() =>
    copiarCongelado(projetarVendas(this.estado().vendas, this.referencia)),
  );
  readonly abertas = computed(() => congelar(separarVendas(this.vendas()).abertas));
  readonly quitadas = computed(() => congelar(separarVendas(this.vendas()).quitadas));
  readonly resumo = computed(() =>
    copiarCongelado(resumirVendas(this.estado().vendas, this.referencia)),
  );

  consultarVenda(id: string): Resultado<ProjecaoVenda> {
    const venda = this.vendas().find((item) => item.id === id);
    return congelar(
      venda
        ? { tipo: 'sucesso', valor: venda, mensagem: 'Venda demonstrativa consultada.' }
        : {
            tipo: 'inexistencia',
            codigo: 'venda-inexistente',
            mensagem: 'Venda demonstrativa não encontrada.',
          },
    );
  }

  consultarPeriodo(
    inicio: string,
    fim: string,
  ): Resultado<{ readonly recebidosCentavos: number; readonly vendas: readonly Venda[] }> {
    return copiarCongelado(consultarPeriodo(this.estado().vendas, inicio, fim));
  }

  cadastrarVenda(comando: ComandoCadastro): Resultado<Venda> {
    try {
      const atual = this.estado();
      const resultado = prepararCadastro(
        structuredClone(comando),
        this.referencia,
        `sessao/venda/${atual.proximoId}`,
      );
      if (resultado.tipo !== 'sucesso') return resultado;
      return this.publicar(
        [...atual.vendas, resultado.valor],
        resultado.valor.id,
        'Venda demonstrativa cadastrada.',
      );
    } catch (erro) {
      return this.tratarFalha(erro);
    }
  }

  registrarPagamento(comando: ComandoPagamento): Resultado<Venda> {
    try {
      const atual = this.estado();
      const resultado = this.preparador.preparar(
        atual.vendas,
        structuredClone(comando),
        this.referencia,
        `sessao/recebimento/${atual.proximoId}`,
      );
      if (resultado.tipo !== 'sucesso') return resultado;
      return this.publicar(
        resultado.valor,
        comando.vendaId,
        'Recebimento demonstrativo registrado integralmente.',
      );
    } catch (erro) {
      return this.tratarFalha(erro);
    }
  }

  private publicar(vendas: readonly Venda[], id: string, mensagem: string): Resultado<Venda> {
    projetarVendas(vendas, this.referencia);
    const proximoId = this.estado().proximoId + 1;
    if (!Number.isSafeInteger(proximoId)) throw new RangeError('Identificadores locais esgotados.');
    const preparado = copiarCongelado({ referencia: this.referencia, vendas, proximoId });
    const venda = preparado.vendas.find((item) => item.id === id);
    if (!venda) throw new Error('Venda ausente no conjunto preparado.');
    const resultado = congelar({ tipo: 'sucesso' as const, valor: venda, mensagem });
    this.estado.set(preparado);
    return resultado;
  }

  private tratarFalha(erro: unknown): Resultado<never> {
    return erro instanceof RangeError
      ? { tipo: 'validacao', codigo: 'agregado-invalido', mensagem: erro.message }
      : {
          tipo: 'falha',
          codigo: 'falha-comando',
          mensagem: 'Não foi possível concluir a simulação. O estado anterior foi preservado.',
        };
  }
}
