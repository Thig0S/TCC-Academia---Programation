/** Contrato técnico: valores não negativos, inteiros e exatamente representáveis. */
export function validarCentavos(valor: number): number {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new RangeError('Informe centavos inteiros não negativos e seguros.');
  }
  return valor;
}

export function somarCentavos(valores: readonly number[]): number {
  return valores.reduce((total, valor) => validarCentavos(total + validarCentavos(valor)), 0);
}

export function subtrairCentavos(total: number, valor: number): number {
  return validarCentavos(validarCentavos(total) - validarCentavos(valor));
}

/** Não aceita pontos de milhar sem uma parte decimal explícita. */
export function interpretarDinheiro(texto: string): number {
  const normalizado = texto.trim();
  if (!/^(?:\d+(?:,\d{1,2})?|[1-9]\d{0,2}(?:\.\d{3})+,\d{1,2})$/.test(normalizado)) {
    throw new RangeError('Informe um valor válido em reais, usando vírgula para centavos.');
  }
  const [inteira, fracao = ''] = normalizado.replaceAll('.', '').split(',');
  const centavos = BigInt(inteira) * 100n + BigInt(fracao.padEnd(2, '0'));
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('O valor excede o limite seguro de centavos.');
  }
  return Number(centavos);
}

export function formatarDinheiro(valor: number): string {
  const centavos = BigInt(validarCentavos(valor));
  const reais = (centavos / 100n).toLocaleString('pt-BR');
  return `R$\u00a0${reais},${String(centavos % 100n).padStart(2, '0')}`;
}
