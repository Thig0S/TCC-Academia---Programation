import {
  formatarDinheiro,
  interpretarDinheiro,
  somarCentavos,
  subtrairCentavos,
  validarCentavos,
} from './dinheiro';

describe('Dinheiro em centavos seguros', () => {
  it.each([
    ['0', 0],
    ['1234', 123400],
    [' 1234,5 ', 123450],
    ['1.234,56', 123456],
    ['12.345.678,90', 1234567890],
    ['90071992547409,91', Number.MAX_SAFE_INTEGER],
  ])('interpreta %s exatamente', (texto, esperado) => {
    expect(interpretarDinheiro(texto)).toBe(esperado);
  });

  it.each([
    '',
    '1.234',
    '1.23',
    '01.234,56',
    '1.23,45',
    '1,234',
    '-1',
    '+1',
    '1e3',
    'R$ 1,00',
    '1 234,56',
    ',50',
    '1,',
    'NaN',
    '90071992547409,92',
  ])('rejeita texto inválido ou inseguro: %s', (texto) => {
    expect(() => interpretarDinheiro(texto)).toThrow(RangeError);
  });

  it.each([-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejeita centavos inválidos: %s',
    (valor) => expect(() => validarCentavos(valor)).toThrow(RangeError),
  );

  it('soma e subtrai sem aceitar resultado inseguro ou negativo', () => {
    expect(somarCentavos([])).toBe(0);
    expect(somarCentavos([3334, 3333, 3333])).toBe(10000);
    expect(subtrairCentavos(100000, 20000)).toBe(80000);
    expect(() => somarCentavos([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
    expect(() => somarCentavos([1, -1])).toThrow(RangeError);
    expect(() => subtrairCentavos(0, 1)).toThrow(RangeError);
    expect(() => subtrairCentavos(1, 0.5)).toThrow(RangeError);
  });

  it('formata inclusive o extremo seguro sem perder o último centavo', () => {
    expect(formatarDinheiro(0)).toBe('R$\u00a00,00');
    expect(formatarDinheiro(123456)).toBe('R$\u00a01.234,56');
    expect(formatarDinheiro(Number.MAX_SAFE_INTEGER)).toBe('R$\u00a090.071.992.547.409,91');
    expect(() => formatarDinheiro(-1)).toThrow(RangeError);
  });
});
