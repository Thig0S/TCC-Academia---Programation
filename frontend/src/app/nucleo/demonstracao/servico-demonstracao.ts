import { computed, inject, Injectable, signal } from '@angular/core';
import { ComandoPagamento } from '../../funcionalidades/parcelas/pagamento.modelos';
import {
  consultarPeriodo,
  projetarVendas,
  resumirVendas,
  separarVendas,
  ProjecaoVenda,
} from '../../funcionalidades/vendas/venda.calculos';
import {
  ComandoCadastro,
  ComandoEdicaoCliente,
  ComandoMudancaStatus,
  Resultado,
  statusAdministrativoValido,
  Venda,
} from '../../funcionalidades/vendas/venda.modelos';
import { prepararCadastro } from '../../funcionalidades/vendas/venda.validacoes';
import { criarDadosDemonstrativos } from './dados-demonstrativos';
import { EstadoDemonstracao } from './demonstracao.modelos';
import { PreparadorRecebimento } from './preparador-recebimento';
import { PreparadorEdicaoCliente } from './preparador-edicao-cliente';
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
  private readonly preparadorEdicao = inject(PreparadorEdicaoCliente);
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

  editarCliente(comando: ComandoEdicaoCliente): Resultado<Venda> {
    try {
      const atual = this.estado();
      const resultado = this.preparadorEdicao.preparar(atual.vendas, structuredClone(comando));
      if (resultado.tipo !== 'sucesso') return resultado;
      return this.publicar(
        atual.vendas.map((venda) => (venda.id === resultado.valor.id ? resultado.valor : venda)),
        resultado.valor.id,
        'Dados do cliente atualizados na venda demonstrativa.',
      );
    } catch (erro) {
      return this.tratarFalha(erro);
    }
  }

  alterarStatus(comando: ComandoMudancaStatus): Resultado<Venda> {
    try {
      const atual = this.estado();
      const venda = atual.vendas.find((item) => item.id === comando.vendaId);
      if (!venda) {
        return {
          tipo: 'inexistencia',
          codigo: 'venda-inexistente',
          mensagem: 'Venda demonstrativa não encontrada.',
        };
      }
      if (!statusAdministrativoValido(comando.status)) {
        return {
          tipo: 'validacao',
          codigo: 'status-administrativo-invalido',
          mensagem: 'O status administrativo informado é inválido.',
        };
      }
      if (venda.statusAdministrativo === comando.status) {
        return congelar({
          tipo: 'sucesso' as const,
          valor: copiarCongelado(venda),
          mensagem: 'A venda já possui esse status; nenhuma alteração foi necessária.',
        });
      }

      const situacaoAtual = venda.statusAdministrativo;
      const transicaoPermitida =
        (situacaoAtual === 'Ativo' && comando.status === 'Inativo') ||
        (situacaoAtual === 'Ativo' && comando.status === 'Prejuízo') ||
        ((situacaoAtual === 'Inativo' || situacaoAtual === 'Prejuízo') &&
          comando.status === 'Ativo');
      if (!transicaoPermitida) {
        return {
          tipo: 'inelegibilidade',
          codigo: 'transicao-status-inelegivel',
          mensagem: 'Essa transição de status não é permitida.',
        };
      }

      if (comando.status === 'Prejuízo') {
        const projecao = projetarVendas([venda], this.referencia)[0];
        if (projecao.saldoCentavos <= 0) {
          return {
            tipo: 'inelegibilidade',
            codigo: 'prejuizo-sem-saldo',
            mensagem: 'Somente uma venda com saldo em aberto pode ser marcada como Prejuízo.',
          };
        }
      }

      const atualizada = { ...venda, statusAdministrativo: comando.status };
      return this.publicar(
        atual.vendas.map((item) => (item.id === venda.id ? atualizada : item)),
        venda.id,
        `Status da venda atualizado para ${comando.status}.`,
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
