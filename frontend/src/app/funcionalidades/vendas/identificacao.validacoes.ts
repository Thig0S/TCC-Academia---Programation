import { ComandoCadastro, DadosClienteVenda, Resultado } from './venda.modelos';

export function cpfValido(cpf: string): boolean {
  const digitos = cpf.replace(/[.\s-]/g, '');
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
  for (const tamanho of [9, 10]) {
    const soma = [...digitos.slice(0, tamanho)].reduce(
      (total, digito, indice) => total + Number(digito) * (tamanho + 1 - indice),
      0,
    );
    const resto = soma % 11;
    if (Number(digitos[tamanho]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  }
  return true;
}

export function telefoneValido(telefone: string): boolean {
  return /^\d{10,11}$/.test(telefone.replace(/[\s()-]/g, ''));
}

export function formatarCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, '').slice(0, 11);
  if (digitos.length !== 11) return cpf;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

export function formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '').slice(0, 11);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone;
}

/** Normaliza somente a formatação permitida; nunca consulta titularidade. */
export function prepararCliente(dados: ComandoCadastro['cliente']): Resultado<DadosClienteVenda> {
  if (!dados.nome.trim() || !dados.cpf.trim() || !dados.telefone.trim()) {
    return {
      tipo: 'validacao',
      codigo: 'identificacao-obrigatoria',
      mensagem: 'Informe nome, CPF e telefone do cliente.',
    };
  }
  if (!cpfValido(dados.cpf)) {
    return {
      tipo: 'validacao',
      codigo: 'cpf-invalido',
      mensagem: 'Informe CPF com 11 dígitos e verificadores válidos, sem sequência repetida.',
    };
  }
  if (!telefoneValido(dados.telefone)) {
    return {
      tipo: 'validacao',
      codigo: 'telefone-invalido',
      mensagem: 'Informe telefone brasileiro com DDD e 10 ou 11 dígitos, sem +55.',
    };
  }
  return {
    tipo: 'sucesso',
    mensagem: 'Dados do cliente preparados.',
    valor: {
      nome: dados.nome.trim(),
      cpf: dados.cpf.replace(/[.\s-]/g, ''),
      telefone: dados.telefone.replace(/[\s()-]/g, ''),
      descricao: dados.descricao?.trim() || null,
    },
  };
}
