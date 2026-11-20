import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { ResumoVendas, ProjecaoVenda } from '../vendas/venda.calculos';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';

const referencia = '2027-03-31';
const resumoVazio: ResumoVendas = {
  totalEmAbertoCentavos: 0,
  valoresEmAtrasoCentavos: 0,
  recebidoNoMesCentavos: 0,
  vendasCadastradas: 0,
};

function texto(elemento: Element): string {
  return (elemento.textContent ?? '').replaceAll('\u00a0', ' ');
}

function venda(
  id: string,
  nome: string,
  dataVenda: string,
  parcelas: readonly ProjecaoParcela[] = [],
  situacao: ProjecaoVenda['situacao'] = 'Em aberto',
): ProjecaoVenda {
  return {
    id,
    cliente: { nome, cpf: '90000000175', telefone: '00900000001', descricao: null },
    dataVenda,
    valorTotalCentavos: 10000,
    entrada: null,
    parcelas,
    recebimentos: [],
    totalPagoCentavos: situacao === 'Quitada' ? 10000 : 0,
    saldoCentavos: situacao === 'Quitada' ? 0 : 10000,
    quantidadePaga: situacao === 'Quitada' ? parcelas.length : 0,
    proximoVencimento: parcelas.find((parcela) => parcela.situacao !== 'Paga')?.vencimento ?? null,
    situacao,
  };
}

function parcela(
  id: string,
  numero: number,
  vencimento: string,
  situacao: ProjecaoParcela['situacao'],
): ProjecaoParcela {
  return {
    id,
    numero,
    valorCentavos: 10000,
    vencimento,
    situacao,
    dataPagamento: situacao === 'Paga' ? vencimento : null,
    formaPagamento: situacao === 'Paga' ? 'Pix' : null,
  };
}

describe('Visão Geral', () => {
  const vendas = signal<readonly ProjecaoVenda[]>([]);
  const resumo = signal(resumoVazio);

  beforeEach(() => {
    vendas.set([]);
    resumo.set(resumoVazio);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: ServicoDemonstracao,
          useValue: { referencia, vendas, resumo },
        },
      ],
    });
  });

  it('exibe referência, indicadores zerados e vazios próprios por resumo', async () => {
    const harness = await RouterTestingHarness.create('/visao-geral');
    const pagina = harness.routeNativeElement!;

    const conteudo = texto(pagina);
    expect(conteudo).toContain('Referência da demonstração: 31/03/2027');
    expect(conteudo).toContain('01/03/2027 a 31/03/2027');
    expect(conteudo).toContain('R$ 0,00');
    expect(conteudo).toContain('Nenhuma venda cadastrada nesta sessão.');
    expect(conteudo).toContain('Nenhuma parcela pendente vence de hoje a +7 dias.');
    expect(conteudo).toContain('Nenhuma parcela pendente está atrasada.');
    expect(
      pagina.querySelectorAll('[aria-label="Indicadores financeiros globais"] article'),
    ).toHaveLength(4);
  });

  it('atualiza indicadores e resumos reativamente e liga itens à venda pelo ID completo', async () => {
    const harness = await RouterTestingHarness.create('/visao-geral');
    const id = 'venda/opaca/42';
    const item = venda(id, 'Cliente atualizado', '2027-03-01', [
      parcela('p-proxima', 1, '2027-04-01', 'Próximos dias'),
      parcela('p-atrasada', 2, '2027-03-30', 'Atrasado'),
    ]);
    vendas.set([item]);
    resumo.set({
      totalEmAbertoCentavos: 10000,
      valoresEmAtrasoCentavos: 10000,
      recebidoNoMesCentavos: 5000,
      vendasCadastradas: 1,
    });
    harness.detectChanges();

    const pagina = harness.routeNativeElement!;
    expect(texto(pagina)).toContain('Cliente atualizado');
    expect(texto(pagina)).toContain('R$ 100,00');
    expect(texto(pagina)).toContain('R$ 50,00');
    const links = [...pagina.querySelectorAll<HTMLAnchorElement>('a')];
    expect(links).toHaveLength(3);
    const esperado = TestBed.inject(Router).serializeUrl(
      TestBed.inject(Router).createUrlTree(['/vendas', id]),
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([esperado, esperado, esperado]);

    // Uma edição só de identificação muda rótulos sem mudar os indicadores financeiros.
    const resumoAntesEdicao = resumo();
    vendas.set([venda(id, 'Identificação corrigida', item.dataVenda, item.parcelas)]);
    harness.detectChanges();
    expect(texto(pagina)).toContain('Identificação corrigida');
    expect(resumo()).toBe(resumoAntesEdicao);

    // Uma publicação aceita de recebimento atualiza ambas as projeções da mesma sessão.
    vendas.set([
      venda(id, 'Identificação corrigida', item.dataVenda, [
        parcela('p-proxima', 1, '2027-04-01', 'Paga'),
        parcela('p-atrasada', 2, '2027-03-30', 'Atrasado'),
      ]),
    ]);
    resumo.set({
      totalEmAbertoCentavos: 10000,
      valoresEmAtrasoCentavos: 10000,
      recebidoNoMesCentavos: 10000,
      vendasCadastradas: 1,
    });
    harness.detectChanges();
    expect(texto(pagina)).not.toContain('Parcela 1 · 01/04/2027');
    expect(texto(pagina)).toContain('R$ 100,00');
  });
});
