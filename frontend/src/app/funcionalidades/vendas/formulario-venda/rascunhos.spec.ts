import {
  converterCadastro,
  converterEdicao,
  converterRecebimento,
  copiarCliente,
  iniciarCadastro,
  iniciarRecebimento,
  prepararPrevia,
  RascunhoCadastro,
  RascunhoRecebimento,
} from './rascunhos';
import { Venda } from '../venda.modelos';

const referencia = '2027-01-31';
function cadastro(): RascunhoCadastro {
  return {
    ...iniciarCadastro(referencia),
    nome: 'Cliente DEMO',
    cpf: '900.000.001-75',
    telefone: '(00) 1234-5678',
    temEntrada: 'nao',
    valorTotal: '100',
    quantidadeParcelas: '3',
  };
}
function venda(): Venda {
  const previa = prepararPrevia(cadastro(), referencia);
  if (!previa) throw new Error('Prévia sintética inválida.');
  return previa;
}
function recebimento(): RascunhoRecebimento {
  return iniciarRecebimento(referencia);
}

describe('Adaptadores puros de rascunhos', () => {
  it('inicia pela referência informada e aponta todos os obrigatórios vazios', () => {
    const rascunho = iniciarCadastro(referencia);
    expect(rascunho.dataVenda).toBe(referencia);
    const resultado = converterCadastro(rascunho, referencia);
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo !== 'invalido') return;
    expect(Object.keys(resultado.erros)).toEqual([
      'nome',
      'cpf',
      'telefone',
      'valorTotal',
      'temEntrada',
      'quantidadeParcelas',
    ]);
    expect(prepararPrevia(rascunho, referencia)).toBeNull();
  });

  it.each(['900.000.001-75', '90000000175'])('aceita CPF %s sem impor unicidade', (cpf) => {
    const rascunho = { ...cadastro(), cpf };
    const antes = structuredClone(rascunho);
    expect(converterCadastro(rascunho, referencia).tipo).toBe('sucesso');
    expect(converterCadastro(rascunho, referencia)).toEqual(
      converterCadastro(rascunho, referencia),
    );
    expect(converterEdicao(rascunho, 'outra/venda').tipo).toBe('sucesso');
    expect(rascunho).toEqual(antes);
  });

  it.each(['', '11111111111', '90000000174', 'abc'])('associa CPF inválido %s', (cpf) => {
    const resultado = converterEdicao({ ...cadastro(), cpf }, 'venda');
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo === 'invalido') expect(resultado.erros.cpf).toBeTruthy();
  });

  it.each(['(00) 1234-5678', '0012345678', '(00) 91234-5678'])('aceita telefone %s', (telefone) => {
    expect(converterEdicao({ ...cadastro(), telefone }, 'venda').tipo).toBe('sucesso');
  });

  it.each(['', '+55 00 1234-5678', 'telefone', '12345'])(
    'associa telefone inválido %s',
    (telefone) => {
      const resultado = converterEdicao({ ...cadastro(), telefone }, 'venda');
      expect(resultado.tipo).toBe('invalido');
      if (resultado.tipo === 'invalido') expect(resultado.erros.telefone).toBeTruthy();
    },
  );

  it('não inclui campos financeiros na edição e copia os quatro campos', () => {
    const rascunho = cadastro();
    const resultado = converterEdicao(rascunho, 'seed/venda/1');
    expect(resultado).toEqual({
      tipo: 'sucesso',
      comando: {
        vendaId: 'seed/venda/1',
        cliente: {
          nome: rascunho.nome,
          cpf: rascunho.cpf,
          telefone: rascunho.telefone,
          descricao: '',
        },
      },
    });
    const copia = copiarCliente({ ...rascunho, descricao: null });
    copia.nome = 'Outro';
    expect(rascunho.nome).toBe('Cliente DEMO');
    expect(copia.descricao).toBe('');
  });

  it.each(['0', '1,001', '1.5', '1e3', '90071992547409,92'])(
    'rejeita dinheiro impreciso/inseguro %s',
    (valorTotal) => {
      const resultado = converterCadastro({ ...cadastro(), valorTotal }, referencia);
      expect(resultado.tipo).toBe('invalido');
      if (resultado.tipo === 'invalido') expect(resultado.erros.valorTotal).toBeTruthy();
    },
  );

  it('converte vírgula sem arredondamento e distribui centavos/calendário pelo domínio', () => {
    const resultado = converterCadastro({ ...cadastro(), valorTotal: '100,01' }, referencia);
    expect(resultado.tipo).toBe('sucesso');
    if (resultado.tipo === 'sucesso') expect(resultado.comando.valorTotalCentavos).toBe(10001);
    const previa = venda();
    expect(previa.parcelas.map((p) => [p.valorCentavos, p.vencimento])).toEqual([
      [3334, '2027-02-28'],
      [3333, '2027-03-31'],
      [3333, '2027-04-30'],
    ]);
    expect(prepararPrevia({ ...cadastro(), valorTotal: '' }, referencia)).toBeNull();
    expect(prepararPrevia(cadastro(), referencia)?.id).toBe('previa/local');
  });

  it.each(['0', '-1', '1,5', '1.5', '1e2', '9007199254740992', '10001'])(
    'rejeita quantidade %s',
    (quantidadeParcelas) => {
      const resultado = converterCadastro({ ...cadastro(), quantidadeParcelas }, referencia);
      expect(resultado.tipo).toBe('invalido');
      if (resultado.tipo === 'invalido') expect(resultado.erros.quantidadeParcelas).toBeTruthy();
    },
  );

  it.each(['2027-02-01', '2027-02-30', '0000-01-01', ''])(
    'associa data inválida/futura %s',
    (dataVenda) => {
      const resultado = converterCadastro({ ...cadastro(), dataVenda }, referencia);
      expect(resultado.tipo).toBe('invalido');
      if (resultado.tipo === 'invalido') expect(resultado.erros.dataVenda).toBeTruthy();
    },
  );

  it('associa vencimento irrepresentável à quantidade, sem alocar array gigante', () => {
    const resultado = converterCadastro({ ...cadastro(), dataVenda: '9999-12-01' }, '9999-12-31');
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo === 'invalido')
      expect(resultado.erros.quantidadeParcelas).toContain('calendário');
  });

  it('exige escolha explícita e ignora dados inativos ao selecionar Não', () => {
    const rascunho = {
      ...cadastro(),
      temEntrada: '' as const,
      valorEntrada: 'inválido',
      formaEntrada: '',
    };
    const resultado = converterCadastro(rascunho, referencia);
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo === 'invalido')
      expect(resultado.erros.temEntrada).toBe('Informe se a venda possui entrada ou não.');
    expect(prepararPrevia(rascunho, referencia)).toBeNull();
    expect(converterCadastro({ ...rascunho, temEntrada: 'sim' }, referencia).tipo).toBe('invalido');
    expect(
      converterCadastro(
        { ...rascunho, temEntrada: 'nao', valorEntrada: 'inválido', formaEntrada: '' },
        referencia,
      ).tipo,
    ).toBe('sucesso');
    expect(converterCadastro({ ...rascunho, temEntrada: 'talvez' as never }, referencia).tipo).toBe(
      'invalido',
    );
  });

  it('preserva e revalida valor/forma da entrada ao alternar Sim e Não', () => {
    const rascunho = {
      ...cadastro(),
      valorTotal: '1.000,00',
      temEntrada: 'sim' as const,
      valorEntrada: '200',
      formaEntrada: 'Pix',
      quantidadeParcelas: '4',
    };
    const previa = prepararPrevia(rascunho, referencia);
    expect(previa?.entrada).toEqual({ valorCentavos: 20000, data: referencia, forma: 'Pix' });
    expect(previa?.parcelas.map((p) => p.valorCentavos)).toEqual([20000, 26667, 26667, 26666]);
    const semEntrada = converterCadastro(
      { ...rascunho, temEntrada: 'nao', valorEntrada: 'inválido', formaEntrada: '' },
      referencia,
    );
    expect(semEntrada.tipo).toBe('sucesso');
    expect(rascunho.valorEntrada).toBe('200');
    expect(rascunho.formaEntrada).toBe('Pix');
    expect(
      converterCadastro({ ...rascunho, valorEntrada: '1000', formaEntrada: '' }, referencia).tipo,
    ).toBe('invalido');
    expect(
      converterCadastro(
        { ...rascunho, temEntrada: 'nao', valorEntrada: '1000', formaEntrada: '' },
        referencia,
      ).tipo,
    ).toBe('sucesso');
  });

  it('prévia projeta entrada como primeira paga em N linhas e divide só o saldo futuro', () => {
    const previa = prepararPrevia(
      {
        ...cadastro(),
        temEntrada: 'sim',
        valorTotal: '2.000,00',
        quantidadeParcelas: '10',
        valorEntrada: '500',
        formaEntrada: 'Pix',
      },
      referencia,
    );
    expect(previa?.parcelas).toHaveLength(10);
    expect(previa?.parcelas[0]).toMatchObject({
      numero: 1,
      valorCentavos: 50000,
      vencimento: referencia,
      situacao: 'Paga',
      dataPagamento: referencia,
      formaPagamento: 'Pix',
    });
    expect(previa?.parcelas.slice(1).map((parcela) => parcela.valorCentavos)).toEqual([
      16667, 16667, 16667, 16667, 16667, 16667, 16666, 16666, 16666,
    ]);
  });

  it('rejeita quantidade maior que saldo após entrada', () => {
    const resultado = converterCadastro(
      {
        ...cadastro(),
        valorTotal: '1',
        temEntrada: 'sim',
        valorEntrada: '0,99',
        formaEntrada: 'Pix',
        quantidadeParcelas: '3',
      },
      referencia,
    );
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo === 'invalido') expect(resultado.erros.quantidadeParcelas).toBeTruthy();
  });

  it('converte pagamento individual com ID capturado sem alterar venda/rascunho', () => {
    const atual = venda();
    const antes = structuredClone(atual);
    const parcelaId = atual.parcelas[0].id;
    const rascunho = { ...recebimento(), forma: 'Pix' };
    const antesRascunho = structuredClone(rascunho);
    const resultado = converterRecebimento(rascunho, atual, parcelaId, referencia);
    expect(resultado.tipo).toBe('sucesso');
    if (resultado.tipo === 'sucesso') {
      expect(resultado.comando).toEqual({
        vendaId: atual.id,
        parcelaId,
        data: referencia,
        forma: 'Pix',
      });
    }
    expect(atual).toEqual(antes);
    expect(rascunho).toEqual(antesRascunho);
  });

  it.each(['2026-12-31', '2027-02-01', '2027-01-32'])('associa data de recebimento %s', (data) => {
    const atual = venda();
    const resultado = converterRecebimento(
      { ...recebimento(), data, forma: '' },
      atual,
      atual.parcelas[0].id,
      referencia,
    );
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo === 'invalido') {
      expect(resultado.erros.data).toBeTruthy();
      expect(resultado.erros.forma).toBeTruthy();
      expect(resultado.erros).not.toHaveProperty('quantidade');
      expect(resultado.erros).not.toHaveProperty('valor');
    }
  });

  it('mantém inelegibilidade de alvo saltado ou obsoleto no resumo', () => {
    const atual = venda();
    for (const id of [atual.parcelas[1].id, 'antiga', '']) {
      const resultado = converterRecebimento(recebimento(), atual, id, referencia);
      expect(resultado.tipo).toBe('invalido');
      if (resultado.tipo === 'invalido') {
        expect(resultado.resumo).toBeTruthy();
        expect(resultado.erros).not.toHaveProperty('quantidade');
        expect(resultado.erros).not.toHaveProperty('valor');
      }
    }
  });

  it('usa data fixa de referência como inicial e aceita as bordas do intervalo venda–referência', () => {
    expect(iniciarRecebimento(referencia)).toEqual({ data: referencia, forma: '' });
    const atual = prepararPrevia({ ...cadastro(), dataVenda: '2027-01-01' }, referencia)!;
    for (const data of ['2027-01-01', referencia])
      expect(
        converterRecebimento({ data, forma: 'Pix' }, atual, atual.parcelas[0].id, referencia).tipo,
      ).toBe('sucesso');
  });

  it.each(['', 'Transferência'])('rejeita forma ausente/desconhecida %s', (forma) => {
    const atual = prepararPrevia({ ...cadastro(), dataVenda: '2027-01-01' }, referencia)!;
    const resultado = converterRecebimento(
      { data: referencia, forma },
      atual,
      atual.parcelas[0].id,
      referencia,
    );
    expect(resultado.tipo).toBe('invalido');
    if (resultado.tipo === 'invalido') expect(resultado.erros.forma).toBeTruthy();
  });
});
