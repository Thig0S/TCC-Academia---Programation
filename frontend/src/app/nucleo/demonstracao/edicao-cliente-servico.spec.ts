import { TestBed } from '@angular/core/testing';
import { buscarVendas } from '../../funcionalidades/vendas/venda.busca';
import {
  ComandoCadastro,
  ComandoEdicaoCliente,
  Resultado,
} from '../../funcionalidades/vendas/venda.modelos';
import { PreparadorEdicaoCliente } from './preparador-edicao-cliente';
import { REFERENCIA_DEMONSTRACAO } from './referencia-demonstracao';
import { ServicoDemonstracao } from './servico-demonstracao';

const referencia = '2027-01-31';
function cadastro(): ComandoCadastro {
  return {
    cliente: { nome: 'DEMO original', cpf: '90000000175', telefone: '00900000001' },
    dataVenda: '2026-10-31',
    valorTotalCentavos: 80000,
    quantidadeParcelas: 4,
    entrada: null,
  };
}
function sucesso<T>(resultado: Resultado<T>): T {
  expect(resultado.tipo).toBe('sucesso');
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}
function edicao(vendaId: string): ComandoEdicaoCliente {
  return {
    vendaId,
    cliente: {
      nome: 'DEMO corrigido',
      cpf: '900.000.002-56',
      telefone: '(00) 1234-5678',
      descricao: ' Correção ',
    },
  };
}
function iniciar(preparador = new PreparadorEdicaoCliente()): ServicoDemonstracao {
  TestBed.configureTestingModule({
    providers: [
      { provide: REFERENCIA_DEMONSTRACAO, useValue: referencia },
      { provide: PreparadorEdicaoCliente, useValue: preparador },
    ],
  });
  return TestBed.inject(ServicoDemonstracao);
}

describe('Edição interna atômica na fonte da sessão', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['sem recebimentos', 'com entrada', 'parcial', 'quitada'])(
    'edita %s sem mudar histórico, resumo ou outra venda com mesmo CPF',
    (situacao) => {
      const fonte = iniciar();
      const original = sucesso(
        fonte.cadastrarVenda({
          ...cadastro(),
          entrada:
            situacao === 'com entrada'
              ? { data: '2026-10-31', valorCentavos: 20000, forma: 'Pix' }
              : null,
        }),
      );
      if (situacao === 'parcial' || situacao === 'quitada') {
        const parcelas = situacao === 'parcial' ? original.parcelas.slice(0, 1) : original.parcelas;
        for (const parcela of parcelas)
          sucesso(
            fonte.registrarPagamento({
              vendaId: original.id,
              parcelaId: parcela.id,
              data: referencia,
              forma: 'Pix',
            }),
          );
      }
      const duplicada = sucesso(fonte.cadastrarVenda(cadastro()));
      const antes = fonte.vendas();
      const resumo = fonte.resumo();
      const anterior = sucesso(fonte.consultarVenda(original.id));
      const comando = {
        ...edicao(original.id),
        dataVenda: '0001-01-01',
        entrada: null,
        valorTotalCentavos: 1,
        parcelas: [],
        recebimentos: [],
      };
      const editada = sucesso(fonte.editarCliente(comando));
      const depois = sucesso(fonte.consultarVenda(original.id));
      expect(depois).toEqual({ ...anterior, cliente: editada.cliente });
      expect(fonte.resumo()).toEqual(resumo);
      expect(fonte.vendas().filter((v) => v.id !== original.id)).toEqual(
        antes.filter((v) => v.id !== original.id),
      );
      expect(sucesso(fonte.consultarVenda(duplicada.id)).cliente).toEqual(duplicada.cliente);
      expect(depois.situacao).toBe(anterior.situacao);
      expect(buscarVendas(fonte.vendas(), 'corrigido').map((v) => v.id)).toEqual([original.id]);
      expect(buscarVendas(fonte.vendas(), '900.000.002-56').some((v) => v.id === original.id)).toBe(
        true,
      );
      expect(buscarVendas(fonte.vendas(), '(00) 1234-5678').map((v) => v.id)).toEqual([
        original.id,
      ]);
      Reflect.set(comando.cliente, 'nome', 'intruso');
      expect(Reflect.set(editada.cliente, 'nome', 'intruso')).toBe(false);
      expect(Reflect.set(editada.parcelas[0], 'valorCentavos', 1)).toBe(false);
      expect(sucesso(fonte.consultarVenda(original.id)).cliente.nome).toBe('DEMO corrigido');
      expect(antes).toContainEqual(anterior);
    },
  );

  it('aceita CPF repetido, descrição ausente e rascunho cancelado sem chamar comando', () => {
    const fonte = iniciar();
    const v = sucesso(fonte.cadastrarVenda(cadastro()));
    const antes = fonte.vendas();
    const rascunho = structuredClone(edicao(v.id));
    Reflect.set(rascunho.cliente, 'nome', 'Rascunho não confirmado');
    expect(fonte.vendas()).toBe(antes);
    sucesso(
      fonte.editarCliente({
        vendaId: v.id,
        cliente: { ...cadastro().cliente, nome: 'Outra grafia' },
      }),
    );
    expect(sucesso(fonte.consultarVenda(v.id)).cliente.descricao).toBeNull();
    expect(fonte.vendas()[0].cliente.cpf).toBe(v.cliente.cpf);
    expect(fonte.vendas()[0].cliente.nome).not.toBe('Outra grafia');
  });

  it.each(['ausencia', 'validacao', 'preparacao', 'agregado'] as const)(
    '%s não publica nem consome contador e permite nova tentativa',
    (etapa) => {
      const preparador = new PreparadorEdicaoCliente();
      const fonte = iniciar(preparador);
      const v = sucesso(fonte.cadastrarVenda(cadastro()));
      const antes = fonte.vendas();
      const resumo = fonte.resumo();
      const abertas = fonte.abertas();
      const quitadas = fonte.quitadas();
      let comando = edicao(v.id);
      if (etapa === 'ausencia') comando = edicao('ausente');
      if (etapa === 'validacao')
        comando = { ...comando, cliente: { ...comando.cliente, cpf: 'invalido' } };
      if (etapa === 'preparacao')
        vi.spyOn(preparador, 'preparar').mockImplementationOnce(() => {
          throw new Error('Falha somente no teste');
        });
      if (etapa === 'agregado')
        vi.spyOn(preparador, 'preparar').mockReturnValueOnce({
          tipo: 'sucesso',
          mensagem: 'Somente teste',
          valor: { ...v, valorTotalCentavos: 1 },
        });
      expect(fonte.editarCliente(comando).tipo).toBe(
        etapa === 'ausencia' ? 'inexistencia' : etapa === 'preparacao' ? 'falha' : 'validacao',
      );
      expect(fonte.vendas()).toBe(antes);
      expect(fonte.resumo()).toBe(resumo);
      expect(fonte.abertas()).toBe(abertas);
      expect(fonte.quitadas()).toBe(quitadas);
      vi.restoreAllMocks();
      sucesso(fonte.editarCliente(edicao(v.id)));
      expect(sucesso(fonte.cadastrarVenda(cadastro())).id).toBe('sessao/venda/3');
    },
  );
});
