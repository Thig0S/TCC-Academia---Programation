import { ProjecaoVenda } from './venda.calculos';
import { buscarVendas } from './venda.busca';

function venda(
  id: string,
  nome: string,
  cpf: string,
  telefone: string,
  dataVenda: string,
  situacao: ProjecaoVenda['situacao'],
): ProjecaoVenda {
  return {
    id,
    cliente: { nome, cpf, telefone, descricao: null },
    dataVenda,
    valorTotalCentavos: 10000,
    entrada: null,
    parcelas: [],
    recebimentos: [],
    totalPagoCentavos: 0,
    saldoCentavos: 10000,
    quantidadePaga: 0,
    proximoVencimento: null,
    situacao,
  };
}

describe('buscarVendas', () => {
  const aberta = venda('a', 'Ágata Silva', '90000000175', '00900000001', '2000-02-29', 'Em aberto');
  const proxima = venda(
    'b',
    'Agata Souza',
    '123.456.789-00',
    '(11) 91234-5678',
    '1900-02-28',
    'Próximos dias',
  );
  const atrasada = venda(
    'c',
    'Bruna Lima',
    '987.654.321-00',
    '+55 11 99999-0000',
    '0001-01-01',
    'Atrasada',
  );
  const quitada = venda('d', 'Caio Luz', '111.222.333-44', '11988887777', '9999-12-31', 'Quitada');
  const colecao = [aberta, proxima, atrasada, quitada] as const;

  it('busca nome parcial ignorando caixa e acentos e mantém homônimos na ordem original', () => {
    expect(buscarVendas(colecao, '  AGATA  ')).toEqual([aberta, proxima]);
    expect(buscarVendas(colecao, 'gata si')).toEqual([aberta]);
    expect(buscarVendas(colecao, 'ágata silva')).toEqual([aberta]);
    expect(buscarVendas(colecao, 'agata silva caio')).toEqual([]);
  });

  it('localiza identificação sintética e dígitos parciais sem validar o campo completo', () => {
    expect(buscarVendas(colecao, '900.000.001-75')).toEqual([aberta]);
    expect(buscarVendas(colecao, '(00) 90000-0001')).toEqual([aberta]);
    expect(buscarVendas(colecao, '00000175')).toEqual([aberta]);
    expect(buscarVendas(colecao, '123456789')).toEqual([proxima]);
    expect(buscarVendas(colecao, '(11) 91234-5678')).toEqual([proxima]);
    expect(buscarVendas(colecao, '+55 11 99999.0000')).toEqual([atrasada]);
  });

  it('não interpreta pontuação sem dígitos nem remove letras de termos mistos', () => {
    expect(buscarVendas(colecao, '...-()+')).toEqual([]);
    expect(buscarVendas(colecao, '123abc456')).toEqual([]);
  });

  it('combina cada situação por E com termo vazio ou busca textual', () => {
    for (const situacao of ['Em aberto', 'Próximos dias', 'Atrasada'] as const) {
      expect(buscarVendas(colecao, '', situacao).map((item) => item.id)).toEqual([
        situacao === 'Em aberto' ? 'a' : situacao === 'Próximos dias' ? 'b' : 'c',
      ]);
      expect(buscarVendas(colecao, 'a', situacao).every((item) => item.situacao === situacao)).toBe(
        true,
      );
    }
    expect(buscarVendas(colecao, '').map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(buscarVendas(colecao, '', 'Em aberto')).toEqual([aberta]);
    expect(buscarVendas([quitada], '', 'Todas')).toEqual([quitada]);
    expect(buscarVendas(colecao, 'caio', 'Em aberto')).toEqual([]);
    expect(buscarVendas(colecao, 'caio', 'Todas')).toEqual([quitada]);
  });

  it('interpreta data completa somente como data da venda e rejeita datas inválidas', () => {
    expect(buscarVendas(colecao, '29/02/2000')).toEqual([aberta]);
    expect(buscarVendas(colecao, '28/02/1900')).toEqual([proxima]);
    expect(buscarVendas(colecao, '01/01/0001')).toEqual([atrasada]);
    expect(buscarVendas(colecao, '31/12/9999')).toEqual([quitada]);
    for (const data of ['31/02/2027', '29/02/1900', '01/01/0000', '00/01/2027']) {
      expect(() => buscarVendas(colecao, data)).not.toThrow();
      expect(buscarVendas(colecao, data)).toEqual([]);
    }
    expect(buscarVendas(colecao, '29/02')).toEqual([]);
  });

  it('restringe-se à coleção fornecida e não altera sua ordem nem conteúdo', () => {
    const original = [...colecao];
    const resultado = buscarVendas([proxima, aberta], 'a');
    expect(resultado).toEqual([proxima, aberta]);
    expect([...colecao]).toEqual(original);
    expect(buscarVendas([], '', 'Atrasada')).toEqual([]);
  });
});
