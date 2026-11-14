export interface PartesDataCivil {
  readonly ano: number;
  readonly mes: number;
  readonly dia: number;
}

export function diasNoMes(ano: number, mes: number): number {
  if (
    !Number.isInteger(ano) ||
    ano < 1 ||
    ano > 9999 ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    throw new RangeError('Ano ou mês fora do calendário civil permitido.');
  }
  if (mes === 2) return ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

export function interpretarDataCivil(data: string): PartesDataCivil {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new RangeError('Informe uma data civil válida no formato AAAA-MM-DD.');
  }
  const [ano, mes, dia] = data.split('-').map(Number);
  if (dia < 1 || dia > diasNoMes(ano, mes)) {
    throw new RangeError('O dia não existe no mês informado.');
  }
  return { ano, mes, dia };
}

function construirDataCivil(ano: number, mes: number, dia: number): string {
  const data = `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  interpretarDataCivil(data);
  return data;
}

export function compararDatasCivis(a: string, b: string): number {
  interpretarDataCivil(a);
  interpretarDataCivil(b);
  return a === b ? 0 : a < b ? -1 : 1;
}

export function formatarDataCivil(data: string): string {
  interpretarDataCivil(data);
  return data.split('-').reverse().join('/');
}

export function adicionarMeses(dataBase: string, meses: number): string {
  const { ano, mes, dia } = interpretarDataCivil(dataBase);
  if (!Number.isSafeInteger(meses))
    throw new RangeError('Informe uma quantidade inteira de meses.');
  const indice = (ano - 1) * 12 + mes - 1 + meses;
  if (!Number.isSafeInteger(indice) || indice < 0 || indice >= 9999 * 12) {
    throw new RangeError('O vencimento ultrapassa o calendário civil permitido.');
  }
  const anoAlvo = Math.floor(indice / 12) + 1;
  const mesAlvo = (indice % 12) + 1;
  return construirDataCivil(anoAlvo, mesAlvo, Math.min(dia, diasNoMes(anoAlvo, mesAlvo)));
}

export function gerarVencimentos(dataBase: string, quantidade: number): readonly string[] {
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new RangeError('Informe uma quantidade positiva e inteira de parcelas.');
  }
  // Rejeitar o alcance antes de alocar, inclusive quantidades gigantes.
  adicionarMeses(dataBase, quantidade);
  return Array.from({ length: quantidade }, (_, indice) => adicionarMeses(dataBase, indice + 1));
}

/** Dia ordinal gregoriano, sem instantes, UTC, relógio ou fuso. */
export function ordinalCivil(data: string): number {
  const { ano, mes, dia } = interpretarDataCivil(data);
  const anteriores = ano - 1;
  let ordinal =
    anteriores * 365 +
    Math.floor(anteriores / 4) -
    Math.floor(anteriores / 100) +
    Math.floor(anteriores / 400) +
    dia;
  for (let atual = 1; atual < mes; atual++) ordinal += diasNoMes(ano, atual);
  return ordinal;
}

export function limitesDoMes(data: string): readonly [string, string] {
  const { ano, mes } = interpretarDataCivil(data);
  return [construirDataCivil(ano, mes, 1), construirDataCivil(ano, mes, diasNoMes(ano, mes))];
}
