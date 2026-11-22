import { FORMAS_PAGAMENTO } from '../parcelas/pagamento.modelos';
import { somarCentavos } from './dinheiro';
import { ComandoCadastro, Venda } from './venda.modelos';
import { prepararCadastro } from './venda.validacoes';

const referencia = '2027-01-31';
function comando(): ComandoCadastro {
  return {
    cliente: { nome: 'Cliente DEMO', cpf: '90000000175', telefone: '00900000001' },
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
  it('aceita identificação válida repetida sem cliente mestre ou descrição obrigatória', () => {
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

  it.each([
    { cpf: 'CPF-DEMO' },
    { cpf: '90000000176' },
    { telefone: 'TEL-DEMO' },
    { telefone: '+55 (00) 90000-0001' },
  ])('revalida identificação no cadastro: %j', (alteracao) => {
    const dados = { ...comando(), cliente: { ...comando().cliente, ...alteracao } };
    const antes = structuredClone(dados);
    expect(prepararCadastro(dados, referencia, 'v1').tipo).toBe('validacao');
    expect(dados).toEqual(antes);
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

  it.each(FORMAS_PAGAMENTO)('prepara entrada como primeira parcela paga com %s', (forma) => {
    const entrada = { valorCentavos: 20000, data: referencia, forma };
    const preparada = venda({
      ...comando(),
      valorTotalCentavos: 200000,
      quantidadeParcelas: 10,
      entrada,
    });
    expect(preparada.entrada).toEqual(entrada);
    expect(preparada.entrada).not.toBe(entrada);
    expect(preparada.parcelas).toHaveLength(10);
    expect(preparada.parcelas[0]).toMatchObject({
      id: 'v1/parcela/entrada',
      numero: 1,
      valorCentavos: 20000,
      vencimento: referencia,
    });
    expect(preparada.parcelas.slice(1).map((p) => p.valorCentavos)).toEqual(Array(9).fill(20000));
    expect(preparada.parcelas.slice(1).map((p) => p.id)).toEqual(
      Array.from({ length: 9 }, (_, indice) => `v1/parcela/${indice + 1}`),
    );
    expect(preparada.recebimentos).toEqual([
      {
        ...entrada,
        id: 'v1/recebimento/entrada',
        alocacoes: [{ parcelaId: 'v1/parcela/entrada', valorCentavos: 20000 }],
      },
    ]);
  });

  it('distribui somente o saldo após uma entrada desigual entre as futuras', () => {
    const preparada = venda({
      ...comando(),
      valorTotalCentavos: 200000,
      quantidadeParcelas: 10,
      entrada: { valorCentavos: 50000, data: referencia, forma: 'Pix' },
    });
    expect(preparada.parcelas.map((p) => p.valorCentavos)).toEqual([
      50000, 16667, 16667, 16667, 16667, 16667, 16667, 16666, 16666, 16666,
    ]);
  });

  it('conta entrada no total, permite sem entrada uma parcela e rejeita entrada em parcela única', () => {
    expect(venda({ ...comando(), quantidadeParcelas: 1 }).parcelas).toHaveLength(1);
    expect(
      prepararCadastro(
        {
          ...comando(),
          quantidadeParcelas: 1,
          entrada: { valorCentavos: 1, data: referencia, forma: 'Pix' },
        },
        referencia,
        'v1',
      ).tipo,
    ).toBe('validacao');
    const minima = venda({
      ...comando(),
      valorTotalCentavos: 2,
      quantidadeParcelas: 2,
      entrada: { valorCentavos: 1, data: referencia, forma: 'Pix' },
    });
    expect(minima.parcelas.map((p) => p.valorCentavos)).toEqual([1, 1]);
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

  it('preserva calendário mensal e aceita a futura de dezembro/9999 após entrada', () => {
    expect(
      prepararCadastro({ ...comando(), dataVenda: '9999-12-31' }, '9999-12-31', 'v1').tipo,
    ).toBe('validacao');
    const bissexto = prepararCadastro(
      {
        ...comando(),
        dataVenda: '2028-01-31',
        quantidadeParcelas: 3,
        valorTotalCentavos: 300,
      },
      '2028-01-31',
      'bissexto',
    );
    expect(bissexto.tipo).toBe('sucesso');
    if (bissexto.tipo === 'sucesso') {
      expect(bissexto.valor.parcelas.map((p) => p.vencimento)).toEqual([
        '2028-02-29', '2028-03-31', '2028-04-30',
      ]);
    }
    const limite = prepararCadastro(
      {
        ...comando(),
        dataVenda: '9999-11-30',
        valorTotalCentavos: 200,
        quantidadeParcelas: 2,
        entrada: { valorCentavos: 100, data: '9999-11-30', forma: 'Pix' },
      },
      '9999-11-30',
      'limite',
    );
    expect(limite).toMatchObject({ tipo: 'sucesso' });
    if (limite.tipo === 'sucesso') {
      expect(limite.valor.parcelas.map((p) => p.vencimento)).toEqual([
        '9999-11-30', '9999-12-30',
      ]);
    }
    expect(
      somarCentavos(
        venda({ ...comando(), valorTotalCentavos: Number.MAX_SAFE_INTEGER }).parcelas.map(
          (p) => p.valorCentavos,
        ),
      ),
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});
