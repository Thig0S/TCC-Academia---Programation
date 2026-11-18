/** Geração determinística, sem dados coletados. Validade não garante ausência de titular. */
export function criarIdentificacaoSintetica(indice: number): { cpf: string; telefone: string } {
  if (!Number.isSafeInteger(indice) || indice < 1 || indice > 9999) {
    throw new RangeError('Índice sintético fora do intervalo permitido.');
  }
  let cpf = String(900000000 + indice);
  for (const tamanho of [9, 10]) {
    const soma = [...cpf].reduce(
      (total, digito, posicao) => total + Number(digito) * (tamanho + 1 - posicao),
      0,
    );
    const resto = soma % 11;
    cpf += resto < 2 ? '0' : String(11 - resto);
  }
  return { cpf, telefone: `0090000${String(indice).padStart(4, '0')}` };
}
