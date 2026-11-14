import { FORMAS_PAGAMENTO } from '../parcelas/pagamento.modelos';
import { somarCentavos } from './dinheiro';
import { ComandoCadastro, Venda } from './venda.modelos';
import { prepararCadastro } from './venda.validacoes';

const referencia = '2027-01-31';
function comando(): ComandoCadastro {
  return {
    cliente: { nome: 'Cliente DEMO', cpf: 'CPF-DEMO', telefone: 'TEL-DEMO' },
    dataVenda: referencia,
    valorTotalCentavos: 10000,
    quantidadeParcelas: 3,
    entrada: null,
  };
}
function venda(dados: ComandoCadastro = comando(), id = 'v1'): Venda {
  const resultado = prepararCadastro(dados, referencia, id);
  expect(resultado.tipo).toBe('sucesso');
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}

describe('Preparação pura de cadastro', () => {
  it('aceita identificação presente sem checksum, cliente mestre ou descrição obrigatória', () => {
    const dados = comando();
    const primeira = venda(dados);
    const segunda = venda({ ...dados, cliente: { ...dados.cliente, descricao: '  ' } }, 'v2');
    expect(primeira.cliente.descricao).toBeNull();
    expect(segunda.cliente.descricao).toBeNull();
    expect(primeira.cliente).not.toBe(segunda.cliente);
    expect(primeira.id).not.toBe(segunda.id);
    expect(primeira.parcelas.map((p) => p.id)).not.toEqual(segunda.parcelas.map((p) => p.id));
    expect(primeira.entrada).toBeNull();
    expect(primeira.recebimentos).toEqual([]);
    expect(dados).toEqual(comando());
  });

  it.each(['nome', 'cpf', 'telefone'] as const)('rejeita %s ausente', (campo) => {
    const dados = comando();
    expect(
      prepararCadastro({ ...dados, cliente: { ...dados.cliente, [campo]: ' ' } }, referencia, 'v1'),
    ).toMatchObject({ tipo: 'validacao', codigo: 'identificacao-obrigatoria' });
  });

  it('distribui o resto nas primeiras parcelas e preserva o dia-base', () => {
    const parcelas = venda().parcelas;
    expect(parcelas.map((p) => p.valorCentavos)).toEqual([3334, 3333, 3333]);
    expect(parcelas.map((p) => p.vencimento)).toEqual(['2027-02-28', '2027-03-31', '2027-04-30']);
    expect(somarCentavos(parcelas.map((p) => p.valorCentavos))).toBe(10000);
    expect(
      venda({ ...comando(), valorTotalCentavos: 3 }).parcelas.map((p) => p.valorCentavos),
    ).toEqual([1, 1, 1]);
  });

  it.each(FORMAS_PAGAMENTO)('mantém entrada separada com %s', (forma) => {
    const entrada = { valorCentavos: 20000, data: referencia, forma };
    const preparada = venda({
      ...comando(),
      valorTotalCentavos: 100000,
      quantidadeParcelas: 4,
      entrada,
    });
    expect(preparada.entrada).toEqual(entrada);
    expect(preparada.entrada).not.toBe(entrada);
    expect(preparada.recebimentos).toEqual([]);
    expect(preparada.parcelas.map((p) => p.valorCentavos)).toEqual([20000, 20000, 20000, 20000]);
  });

  it.each([
    { valorTotalCentavos: 0 },
    { valorTotalCentavos: -1 },
    { valorTotalCentavos: 1.5 },
    { valorTotalCentavos: Number.MAX_SAFE_INTEGER + 1 },
    { quantidadeParcelas: 0 },
    { quantidadeParcelas: -1 },
    { quantidadeParcelas: 1.5 },
    { quantidadeParcelas: 10001 },
    { dataVenda: '2027-02-01' },
    { dataVenda: '2027-02-29' },
    { entrada: { valorCentavos: 0, data: referencia, forma: 'Pix' } },
    { entrada: { valorCentavos: -1, data: referencia, forma: 'Pix' } },
    { entrada: { valorCentavos: 10000, data: referencia, forma: 'Pix' } },
    { entrada: { valorCentavos: 10001, data: referencia, forma: 'Pix' } },
    { entrada: { valorCentavos: 100, data: '2027-01-30', forma: 'Pix' } },
    { entrada: { valorCentavos: 100, data: referencia, forma: '' } },
    { entrada: { valorCentavos: 100, data: referencia, forma: 'Outra' } },
  ])('rejeita dados financeiros ou civis inválidos: %j', (alteracao) => {
    const dados = { ...comando(), ...alteracao };
    const antes = structuredClone(dados);
    expect(prepararCadastro(dados, referencia, 'v1').tipo).toBe('validacao');
    expect(dados).toEqual(antes);
  });

  it('rejeita calendário final antes de alocar e aceita extremo monetário seguro', () => {
    expect(
      prepararCadastro({ ...comando(), dataVenda: '9999-12-31' }, '9999-12-31', 'v1').tipo,
    ).toBe('validacao');
    expect(
      somarCentavos(
        venda({ ...comando(), valorTotalCentavos: Number.MAX_SAFE_INTEGER }).parcelas.map(
          (p) => p.valorCentavos,
        ),
      ),
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});
