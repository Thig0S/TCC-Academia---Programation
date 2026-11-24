import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { PagamentoDemonstrativo } from '../parcelas/pagamento.modelos';
import { ProjecaoVenda } from '../vendas/venda.calculos';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';

const referencia = '2027-03-31';

function parcela(
  id: string,
  numero: number,
  vencimento: string,
  situacao: ProjecaoParcela['situacao'],
  valorCentavos = 100,
): ProjecaoParcela {
  return {
    id,
    numero,
    vencimento,
    situacao,
    valorCentavos,
    dataPagamento: situacao === 'Paga' ? vencimento : null,
    formaPagamento: situacao === 'Paga' ? 'Pix' : null,
  };
}

function venda(
  id: string,
  dataVenda = '2027-03-01',
  options: {
    readonly entrada?: ProjecaoVenda['entrada'];
    readonly recebimentos?: readonly PagamentoDemonstrativo[];
    readonly parcelas?: readonly ProjecaoParcela[];
    readonly saldo?: number;
    readonly situacao?: ProjecaoVenda['situacao'];
  } = {},
): ProjecaoVenda {
  return {
    id,
    statusAdministrativo: 'Ativo',
    cliente: {
      nome: `Cliente ${id}`,
      cpf: '90000000175',
      telefone: '00900000001',
      descricao: null,
    },
    dataVenda,
    valorTotalCentavos: 1000,
    entrada: options.entrada ?? null,
    recebimentos: options.recebimentos ?? [],
    parcelas: options.parcelas ?? [],
    totalPagoCentavos: 0,
    saldoCentavos: options.saldo ?? 1000,
    quantidadePaga: options.situacao === 'Quitada' ? 1 : 0,
    proximoVencimento: null,
    situacao: options.situacao ?? 'Em aberto',
  };
}

function pagamento(
  id: string,
  data: string,
  valorCentavos: number,
  parcelaId = `parcela/${id}`,
): PagamentoDemonstrativo {
  return {
    id,
    data,
    forma: 'Pix',
    valorCentavos,
    alocacoes: [{ parcelaId, valorCentavos }],
  };
}

function texto(elemento: Element): string {
  return (elemento.textContent ?? '').replaceAll('\u00a0', ' ');
}

describe('Relatórios', () => {
  const vendas = signal<readonly ProjecaoVenda[]>([]);

  beforeEach(() => {
    vendas.set([]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ServicoDemonstracao, useValue: { referencia, vendas } },
      ],
    });
  });

  it('identifica mês e posição na referência, com totais zero e estados vazios por seção', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const conteudo = texto(pagina);

    expect(conteudo).toContain('01/03/2027 a 31/03/2027');
    expect(conteudo).toContain('Referência: 31/03/2027');
    expect(conteudo).toContain('Nenhum recebimento neste mês.');
    expect(conteudo).toContain('Nenhuma venda cadastrada neste mês.');
    expect(conteudo).toContain('Nenhum saldo em aberto nesta referência.');
    expect(conteudo).toContain('Nenhuma parcela vencida nesta referência.');
    expect(conteudo).toContain('R$ 0,00');
    expect(pagina.querySelectorAll('table')).toHaveLength(0);
    expect(pagina.querySelectorAll('[aria-label="Indicadores financeiros globais"]')).toHaveLength(
      0,
    );
    expect(pagina.querySelectorAll('select, canvas')).toHaveLength(0);
  });

  it('apresenta todas as linhas, preserva IDs opacos e distingue movimentos mensais da posição', async () => {
    const id = 'venda/com/barras';
    const primeira = venda(id, '2027-02-28', {
      entrada: { data: '2027-02-28', forma: 'Dinheiro', valorCentavos: 200 },
      recebimentos: [
        pagamento('entrada', '2027-02-28', 200, 'parcela/entrada'),
        pagamento('lote/marco', '2027-03-31', 300),
      ],
      parcelas: [
        parcela('parcela/entrada', 1, '2027-02-28', 'Paga', 200),
        parcela('atrasada', 2, '2027-03-30', 'Atrasado', 300),
      ],
      saldo: 500,
    });
    const vendasDoMes = Array.from({ length: 6 }, (_, indice) =>
      venda(`mes/${indice}`, `2027-03-${String(indice + 1).padStart(2, '0')}`, {
        entrada: {
          data: `2027-03-${String(indice + 1).padStart(2, '0')}`,
          forma: 'Pix',
          valorCentavos: 10,
        },
        recebimentos: [
          pagamento(
            `entrada/${indice}`,
            `2027-03-${String(indice + 1).padStart(2, '0')}`,
            10,
            `parcela/entrada/${indice}`,
          ),
        ],
        parcelas: [
          parcela(
            `parcela/entrada/${indice}`,
            1,
            `2027-03-${String(indice + 1).padStart(2, '0')}`,
            'Paga',
            10,
          ),
        ],
        saldo: 100,
      }),
    );
    vendas.set([primeira, ...vendasDoMes]);
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;

    const recebimentos = pagina.querySelector('[aria-label="Recebimentos do mês"] table')!;
    const tabelaVendas = pagina.querySelector('[aria-label="Vendas do mês"] table')!;
    const saldos = pagina.querySelector('[aria-label="Posição em aberto"] table')!;
    const atrasadas = pagina.querySelector('[aria-label="Parcelas vencidas"] table')!;
    expect(recebimentos.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(tabelaVendas.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(saldos.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(atrasadas.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(recebimentos.textContent).toContain('Lote');
    expect(recebimentos.textContent).toContain('Cliente venda/com/barras');
    expect(tabelaVendas.textContent).not.toContain('Cliente venda/com/barras');
    expect(saldos.textContent).toContain('Cliente venda/com/barras');
    expect(atrasadas.textContent).toContain('Cliente venda/com/barras');
    expect(texto(pagina)).toContain('6 vendas');

    const link = recebimentos.querySelector<HTMLAnchorElement>('tbody a')!;
    const router = TestBed.inject(Router);
    expect(link.getAttribute('href')).toBe(
      router.serializeUrl(router.createUrlTree(['/vendas', id])),
    );
  });

  it('recalcula após publicação recebida e edição, sem mudar valores ao apenas consultar', async () => {
    const vendaInicial = venda('sessao/1', '2027-03-01', {
      recebimentos: [pagamento('lote/1', '2027-03-15', 200)],
      parcelas: [parcela('p1', 1, '2027-03-30', 'Atrasado', 200)],
      saldo: 800,
    });
    vendas.set([vendaInicial]);
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    expect(texto(pagina)).toContain('R$ 2,00');
    const original = vendas();

    // Consulta e navegação são somente leitura; uma publicação rejeitada não substitui a fonte.
    harness.detectChanges();
    expect(vendas()).toBe(original);
    expect(texto(pagina)).toContain('R$ 2,00');

    // Publicação aceita de novo lote e edição do rótulo atualizam projeção sem trocar referência.
    const atualizada = venda('sessao/1', '2027-03-01', {
      recebimentos: [
        pagamento('lote/1', '2027-03-15', 200),
        pagamento('lote/2', '2027-03-31', 300),
      ],
      parcelas: [parcela('p1', 1, '2027-03-30', 'Paga', 200)],
      saldo: 500,
    });
    vendas.set([{ ...atualizada, cliente: { ...atualizada.cliente, nome: 'Cliente editado' } }]);
    harness.detectChanges();
    expect(texto(pagina)).toContain('R$ 5,00');
    expect(texto(pagina)).toContain('Cliente editado');
    expect(texto(pagina)).toContain('Nenhuma parcela vencida nesta referência.');
    expect(texto(pagina)).toContain('Referência: 31/03/2027');
  });

  it('explica a exportação indisponível e anuncia a ação sem gerar arquivo', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    const botao = pagina.querySelector<HTMLButtonElement>('button')!;
    expect(botao.textContent).toContain('Exportar relatório');
    expect(botao.getAttribute('aria-describedby')).toBe('indisponibilidade-exportacao');
    expect(pagina.querySelector('#indisponibilidade-exportacao')?.textContent).toContain(
      'Exportação não disponível no protótipo.',
    );
    expect(pagina.querySelector('[role="status"]')).toBeNull();

    botao.click();
    harness.detectChanges();
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain(
      'A exportação de relatórios não está disponível no protótipo.',
    );
    expect(pagina.querySelectorAll('a[download]')).toHaveLength(0);
  });
});
