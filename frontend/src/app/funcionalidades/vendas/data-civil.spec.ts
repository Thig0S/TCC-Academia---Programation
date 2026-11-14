import {
  adicionarMeses,
  compararDatasCivis,
  diasNoMes,
  formatarDataCivil,
  gerarVencimentos,
  interpretarDataCivil,
  limitesDoMes,
  ordinalCivil,
} from './data-civil';

describe('Calendário civil gregoriano', () => {
  it('preserva dia-base sem deslocamento permanente em fevereiro', () => {
    expect(gerarVencimentos('2027-01-31', 3)).toEqual(['2027-02-28', '2027-03-31', '2027-04-30']);
    expect(gerarVencimentos('2028-01-31', 3)).toEqual(['2028-02-29', '2028-03-31', '2028-04-30']);
    expect(adicionarMeses('2028-03-31', -1)).toBe('2028-02-29');
    expect(adicionarMeses('2028-01-31', 0)).toBe('2028-01-31');
  });

  it('aplica exceções gregorianas de século e limites inclusivos', () => {
    expect(diasNoMes(1900, 2)).toBe(28);
    expect(diasNoMes(2000, 2)).toBe(29);
    expect(interpretarDataCivil('0001-01-01')).toEqual({ ano: 1, mes: 1, dia: 1 });
    expect(interpretarDataCivil('9999-12-31')).toEqual({ ano: 9999, mes: 12, dia: 31 });
    expect(adicionarMeses('9999-11-30', 1)).toBe('9999-12-30');
    expect(ordinalCivil('0001-01-01')).toBe(1);
    expect(ordinalCivil('9999-12-31')).toBe(3652059);
  });

  it.each([
    '2027-02-29',
    '1900-02-29',
    '2028-04-31',
    '0000-01-01',
    '10000-01-01',
    '2027-00-01',
    '2027-13-01',
    '2027-01-00',
    '2027-1-01',
    '31/01/2027',
    '2027-01-01T00:00:00Z',
    ' 2027-01-01',
  ])('rejeita %s', (data) => {
    expect(() => interpretarDataCivil(data)).toThrow(RangeError);
    expect(() => formatarDataCivil(data)).toThrow(RangeError);
  });

  it('rejeita alcance e quantidade antes de alocar arrays', () => {
    for (const quantidade of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER]) {
      expect(() => gerarVencimentos('2027-01-31', quantidade)).toThrow(RangeError);
    }
    expect(() => gerarVencimentos('9999-12-01', 1)).toThrow(RangeError);
    expect(() => adicionarMeses('0001-01-01', -1)).toThrow(RangeError);
    expect(() => adicionarMeses('9999-12-31', 1)).toThrow(RangeError);
    expect(() => adicionarMeses('2027-01-01', 0.5)).toThrow(RangeError);
  });

  it(`compara, apresenta e calcula dias; fuso observado: ${Intl.DateTimeFormat().resolvedOptions().timeZone}; offset janeiro: ${new Date(2026, 0, 1).getTimezoneOffset()}`, () => {
    expect(formatarDataCivil('0001-01-01')).toBe('01/01/0001');
    expect(formatarDataCivil('2027-01-31')).toBe('31/01/2027');
    expect(compararDatasCivis('2027-01-31', '2027-02-01')).toBe(-1);
    expect(compararDatasCivis('2027-01-31', '2027-01-31')).toBe(0);
    expect(compararDatasCivis('2027-02-01', '2027-01-31')).toBe(1);
    expect(() => compararDatasCivis('inválida', '2027-01-31')).toThrow(RangeError);
    expect(ordinalCivil('2028-03-01') - ordinalCivil('2028-02-28')).toBe(2);
    expect(ordinalCivil('1900-03-01') - ordinalCivil('1900-02-28')).toBe(1);
    expect(limitesDoMes('2028-02-15')).toEqual(['2028-02-01', '2028-02-29']);
  });
});
