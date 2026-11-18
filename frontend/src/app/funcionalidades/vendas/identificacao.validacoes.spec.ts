import { cpfValido, prepararCliente, telefoneValido } from './identificacao.validacoes';

describe('Identificação local compartilhada', () => {
  it.each(['90000000175', '900.000.001-75', ' 900.000.001-75 '])('aceita CPF %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    '',
    ' ',
    '123',
    '9000000017',
    '900000001755',
    '90000000176',
    '90000000165',
    ...Array.from({ length: 10 }, (_, n) => String(n).repeat(11)),
    'CPF-DEMO',
    'a90000000175',
    '+90000000175',
    '900/000/00175',
  ])('rejeita CPF %s', (cpf) => expect(cpfValido(cpf)).toBe(false));

  it.each(['0012345678', '00900000001', '(00) 1234-5678', ' (00) 90000-0001 '])(
    'aceita telefone sem tabela de DDD/prefixos: %s',
    (telefone) => expect(telefoneValido(telefone)).toBe(true),
  );
  it.each([
    '',
    ' ',
    '123',
    '001234567',
    '001234567890',
    '+55 (00) 90000-0001',
    '+551234567',
    'TEL-DEMO',
    'a00900000001',
    '00.90000.0001',
  ])('rejeita telefone %s', (telefone) => expect(telefoneValido(telefone)).toBe(false));

  it('normaliza somente pontuação permitida e não altera o rascunho', () => {
    const dados = {
      nome: ' DEMO ',
      cpf: '900.000.001-75',
      telefone: '(00) 90000-0001',
      descricao: ' ',
    };
    const antes = structuredClone(dados);
    expect(prepararCliente(dados)).toMatchObject({
      tipo: 'sucesso',
      valor: {
        nome: 'DEMO',
        cpf: '90000000175',
        telefone: '00900000001',
        descricao: null,
      },
    });
    expect(dados).toEqual(antes);
  });
});
