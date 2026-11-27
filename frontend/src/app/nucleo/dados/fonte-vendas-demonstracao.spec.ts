import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ComandoCadastro, Resultado } from '../../funcionalidades/vendas/venda.modelos';
import { ServicoDemonstracao } from '../demonstracao/servico-demonstracao';
import { REFERENCIA_DEMONSTRACAO } from '../demonstracao/referencia-demonstracao';
import { FonteVendasDemonstracao } from './fonte-vendas-demonstracao';
import { VendaDetalheLeitura } from './modelos-leitura';

const referencia = '2027-01-31';

function cadastro(): ComandoCadastro {
  return {
    cliente: { nome: 'Cliente Fonte teste', cpf: '90000000175', telefone: '00900000001' },
    dataVenda: '2027-01-01',
    valorTotalCentavos: 100000,
    quantidadeParcelas: 4,
    entrada: { valorCentavos: 20000, data: '2027-01-01', forma: 'Pix' },
  };
}

function valorSucesso<T>(resultado: Resultado<T>): T {
  expect(resultado.tipo).toBe('sucesso');
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}

describe('Adaptador assíncrono da demonstração', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: REFERENCIA_DEMONSTRACAO, useValue: referencia }],
    });
  });

  it('expõe coleções e detalhe em modelos de leitura sem devolver a entidade de domínio', async () => {
    const fonte = TestBed.inject(FonteVendasDemonstracao);
    const demonstracao = TestBed.inject(ServicoDemonstracao);
    const abertas = await firstValueFrom(fonte.consultarColecao('abertas'));
    const esperadas = demonstracao.abertas();

    expect(abertas).toMatchObject({ colecao: 'abertas', referencia, revisao: null });
    expect(abertas.vendas.map((venda) => venda.id)).toEqual(esperadas.map((venda) => venda.id));
    expect(abertas.vendas[0]).toMatchObject({
      referencia,
      revisao: null,
      valorTotalCentavos: esperadas[0].valorTotalCentavos,
      valorTotalEfetivoCentavos: esperadas[0].valorTotalEfetivoCentavos,
      saldoCentavos: esperadas[0].saldoCentavos,
    });
    expect(abertas.vendas[0]).not.toHaveProperty('recebimentos');

    const detalheResultante = await firstValueFrom(fonte.consultarVenda(abertas.vendas[0].id));
    const detalhe = valorSucesso(detalheResultante);
    expect(detalhe.resumo.id).toBe(abertas.vendas[0].id);
    expect(detalhe.resumo.revisao).toBeNull();
    expect(detalhe.parcelas).toHaveLength(esperadas[0].parcelas.length);
    expect(detalhe.recebimentos.length).toBeGreaterThan(0);
    expect(detalhe.recebimentos[0]).toHaveProperty('origem');
    expect(detalhe).not.toHaveProperty('statusAdministrativo');

    const inexistente = await firstValueFrom(fonte.consultarVenda('id/ausente'));
    expect(inexistente).toMatchObject({ tipo: 'inexistencia', codigo: 'venda-inexistente' });
  });

  it('reutiliza as projeções existentes para painel e relatório mensal', async () => {
    const fonte = TestBed.inject(FonteVendasDemonstracao);
    const demonstracao = TestBed.inject(ServicoDemonstracao);
    const visao = await firstValueFrom(fonte.consultarVisaoGeral());

    expect(visao).toMatchObject({
      referencia,
      revisao: null,
      indicadores: {
        totalEmAbertoCentavos: demonstracao.resumo().totalEmAbertoCentavos,
        valoresEmAtrasoCentavos: demonstracao.resumo().valoresEmAtrasoCentavos,
        recebidoNoMesCentavos: demonstracao.resumo().recebidoNoMesCentavos,
        vendasCadastradas: demonstracao.resumo().vendasCadastradas,
      },
    });
    expect(visao.vendasRecentes.length).toBeLessThanOrEqual(5);
    expect(visao.parcelasProximas.length).toBeLessThanOrEqual(5);
    expect(visao.parcelasAtrasadas.length).toBeLessThanOrEqual(5);

    const relatorio = await firstValueFrom(fonte.consultarRelatorioMensal('2027-01-01'));
    expect(relatorio).toMatchObject({
      referencia,
      revisao: null,
      inicioMes: '2027-01-01',
      fimMes: '2027-01-31',
      totalRecebidoCentavos: demonstracao.resumo().recebidoNoMesCentavos,
    });
    expect(relatorio.recebimentosDiarios).toHaveLength(31);
    expect(
      relatorio.recebimentosDiarios.reduce((total, item) => total + item.totalCentavos, 0),
    ).toBe(relatorio.totalRecebidoCentavos);
  });

  it('executa comando demonstrativo somente quando o Observable é consumido', async () => {
    const fonte = TestBed.inject(FonteVendasDemonstracao);
    const demonstracao = TestBed.inject(ServicoDemonstracao);
    const quantidadeInicial = demonstracao.vendas().length;
    const comando = fonte.cadastrarVenda({ comando: cadastro(), revisaoEsperada: null });

    expect(demonstracao.vendas()).toHaveLength(quantidadeInicial);

    const resultado = await firstValueFrom(comando);
    const detalhe: VendaDetalheLeitura = valorSucesso(resultado);

    expect(demonstracao.vendas()).toHaveLength(quantidadeInicial + 1);
    expect(detalhe.resumo.cliente.nome).toBe('Cliente Fonte teste');
    expect(detalhe.recebimentos[0].origem).toBe('Entrada');
  });
});
