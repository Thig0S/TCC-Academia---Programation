import { criarDadosDemonstrativos } from '../../nucleo/demonstracao/dados-demonstrativos';
import { projetarVenda, resumirVendas } from './venda.calculos';
import { ComandoEdicaoCliente, Resultado, Venda } from './venda.modelos';
import { prepararCadastro, prepararEdicaoCliente } from './venda.validacoes';

const referencia = '2027-01-31';
function sucesso<T>(resultado: Resultado<T>): T {
  expect(resultado.tipo).toBe('sucesso');
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}
function cliente(): ComandoEdicaoCliente['cliente'] {
  return { nome: ' DEMO corrigido ', cpf: '900.000.001-75', telefone: '(00) 1234-5678' };
}
function estados(): readonly Venda[] {
  const seed = criarDadosDemonstrativos(referencia);
  const semEntrada = sucesso(
    prepararCadastro(
      {
        cliente: cliente(),
        dataVenda: referencia,
        valorTotalCentavos: 80000,
        quantidadeParcelas: 4,
        entrada: null,
      },
      referencia,
      'teste/sem-entrada',
    ),
  );
  const parcial: Venda = {
    ...seed[2],
    recebimentos: [
      {
        id: 'teste/pagamento',
        valorCentavos: seed[2].parcelas[0].valorCentavos,
        data: referencia,
        forma: 'Pix',
        alocacoes: [
          {
            parcelaId: seed[2].parcelas[0].id,
            valorCentavos: seed[2].parcelas[0].valorCentavos,
          },
        ],
      },
    ],
  };
  return [semEntrada, seed[0], parcial, seed[3]];
}

describe('Preparação pura da edição exclusiva de cliente', () => {
  it.each([0, 1, 2, 3])(
    'preserva todo o histórico na situação %s e não compartilha rascunho',
    (indice) => {
      const vendas = estados();
      const original = vendas[indice];
      const antes = structuredClone(vendas);
      const comando = {
        vendaId: original.id,
        cliente: cliente(),
        dataVenda: '0001-01-01',
        valorTotalCentavos: 1,
        entrada: null,
        parcelas: [],
        recebimentos: [],
      };
      const editada = sucesso(prepararEdicaoCliente(vendas, comando));
      const { cliente: antigoCliente, ...historico } = original;
      const { cliente: novoCliente, ...historicoEditado } = editada;
      expect(historicoEditado).toEqual(historico);
      expect(novoCliente).toEqual({
        nome: 'DEMO corrigido',
        cpf: '90000000175',
        telefone: '0012345678',
        descricao: null,
      });
      expect(novoCliente).not.toBe(antigoCliente);
      expect(editada.parcelas).not.toBe(original.parcelas);
      expect(editada.recebimentos).not.toBe(original.recebimentos);
      expect(resumirVendas([editada], referencia)).toEqual(resumirVendas([original], referencia));
      expect(projetarVenda(editada, referencia)).toEqual({
        ...projetarVenda(original, referencia),
        cliente: novoCliente,
      });
      Reflect.set(comando.cliente, 'nome', 'intruso');
      Reflect.set(editada.parcelas[0], 'valorCentavos', 1);
      expect(novoCliente.nome).toBe('DEMO corrigido');
      expect(vendas).toEqual(antes);
    },
  );

  it('aceita descrição, CPF repetido e não seleciona nem propaga por CPF', () => {
    const vendas = estados();
    const duplicadas = vendas.map((v) => ({ ...v, cliente: { ...v.cliente, cpf: '90000000175' } }));
    const antes = structuredClone(duplicadas);
    const editada = sucesso(
      prepararEdicaoCliente(duplicadas, {
        vendaId: duplicadas[1].id,
        cliente: { ...cliente(), descricao: '  correção sintética  ' },
      }),
    );
    expect(editada.id).toBe(duplicadas[1].id);
    expect(editada.cliente.descricao).toBe('correção sintética');
    expect(duplicadas).toEqual(antes);
    expect(
      prepararEdicaoCliente(duplicadas, { vendaId: '90000000175', cliente: cliente() }).tipo,
    ).toBe('inexistencia');
  });

  it.each([
    { nome: '' },
    { cpf: '' },
    { cpf: '90000000176' },
    { cpf: '11111111111' },
    { cpf: 'CPF-DEMO' },
    { telefone: '' },
    { telefone: '+55 (00) 1234-5678' },
    { telefone: 'abc0012345678' },
  ])('rejeita identificação inválida sem tocar no agregado: %j', (alteracao) => {
    const vendas = estados();
    const antes = structuredClone(vendas);
    expect(
      prepararEdicaoCliente(vendas, {
        vendaId: vendas[0].id,
        cliente: { ...cliente(), ...alteracao },
      }).tipo,
    ).toBe('validacao');
    expect(vendas).toEqual(antes);
  });

  it('distingue ausência e falha inesperada, sem mutação', () => {
    const vendas = estados();
    const antes = structuredClone(vendas);
    expect(prepararEdicaoCliente(vendas, { vendaId: 'ausente', cliente: cliente() }).tipo).toBe(
      'inexistencia',
    );
    const dados = cliente();
    Object.defineProperty(dados, 'nome', {
      get: () => {
        throw new Error('Falha exclusiva do teste');
      },
    });
    expect(prepararEdicaoCliente(vendas, { vendaId: vendas[0].id, cliente: dados }).tipo).toBe(
      'falha',
    );
    expect(vendas).toEqual(antes);
  });
});
