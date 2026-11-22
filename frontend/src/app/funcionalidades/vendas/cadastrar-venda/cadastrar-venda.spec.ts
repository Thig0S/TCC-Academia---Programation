import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { REFERENCIA_DEMONSTRACAO } from '../../../nucleo/demonstracao/referencia-demonstracao';
import { RetornoFormulario } from '../../../nucleo/demonstracao/retorno-formulario';

describe('Cadastro demonstrativo pela interface', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    }),
  );

  async function abrir() {
    const harness = await RouterTestingHarness.create('/vendas/nova');
    const fonte = TestBed.inject(ServicoDemonstracao);
    const pagina = harness.routeNativeElement!;
    const preencher = async (id: string, valor: string) => {
      const campo = pagina.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      if (campo.tagName === 'SELECT') campo.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
    };
    const validos = async () => {
      for (const [id, valor] of Object.entries({
        'nome-cliente': 'Cliente DEMO cadastro',
        'cpf-cliente': '900.000.001-75',
        'telefone-cliente': '(00) 1234-5678',
        'tem-entrada': 'nao',
        'valor-total': '100',
        'quantidade-parcelas': '3',
      }))
        await preencher(id, valor);
    };
    const enviar = () =>
      pagina
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { harness, fonte, pagina, preencher, validos, enviar };
  }

  it('abre cadastro funcional inclusive após quitar toda a coleção aberta', async () => {
    const fonte = TestBed.inject(ServicoDemonstracao);
    for (const venda of fonte.abertas()) {
      const pendentes = venda.parcelas.filter((p) => p.situacao !== 'Paga');
      expect(
        fonte.registrarPagamento({
          vendaId: venda.id,
          parcelaIds: pendentes.map((p) => p.id),
          valorCentavos: venda.saldoCentavos,
          data: fonte.referencia,
          forma: 'Pix',
        }).tipo,
      ).toBe('sucesso');
    }
    const harness = await RouterTestingHarness.create('/vendas');
    expect(harness.routeNativeElement?.textContent).toContain('Não há vendas em aberto.');
    const link =
      harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href="/vendas/nova"]')!;
    expect(link).not.toBeNull();
    link.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('#nome-cliente')).not.toBeNull();
  });

  it('abandonar por outro link descarta o rascunho sem publicar', async () => {
    const { harness, fonte, pagina, validos } = await abrir();
    const antes = structuredClone(fonte.vendas());
    await validos();
    pagina.querySelector<HTMLAnchorElement>('a[href="/vendas"]')!.click();
    await harness.fixture.whenStable();
    await harness.navigateByUrl('/vendas/nova');
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#nome-cliente')!.value,
    ).toBe('');
    expect(fonte.vendas()).toEqual(antes);
  });

  it('usa referência fixa, prévia do domínio e invalida sem publicar ou consumir ID', async () => {
    const { harness, fonte, pagina, preencher, validos } = await abrir();
    const antes = structuredClone(fonte.vendas());
    expect(pagina.querySelector<HTMLInputElement>('#data-venda')!.value).toBe('2027-01-31');
    await validos();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(3);
    const linhas = [...pagina.querySelectorAll('tbody tr')].map((p) => p.textContent);
    expect(linhas[0]).toContain('33,34');
    expect(linhas[0]).toContain('28/02/2027');
    expect(linhas[1]).toContain('31/03/2027');
    expect(linhas[2]).toContain('30/04/2027');
    await preencher('valor-total', '0');
    expect(pagina.querySelector('tbody')).toBeNull();
    await preencher('valor-total', '100');
    await preencher('quantidade-parcelas', '9007199254740991');
    expect(pagina.querySelector('tbody')).toBeNull();
    await preencher('quantidade-parcelas', '3');
    await preencher('data-venda', '2027-02-01');
    expect(pagina.querySelector('tbody')).toBeNull();
    expect(fonte.vendas()).toEqual(antes);
    await harness.navigateByUrl('/vendas');
    expect(
      fonte.cadastrarVenda({
        cliente: { nome: 'DEMO', cpf: '90000000175', telefone: '0012345678' },
        dataVenda: fonte.referencia,
        valorTotalCentavos: 100,
        quantidadeParcelas: 1,
        entrada: null,
      }),
    ).toMatchObject({ tipo: 'sucesso', valor: { id: 'sessao/venda/1' } });
  });

  it('inclui entrada condicional, descrição opcional e recalcula a prévia', async () => {
    const { harness, fonte, pagina, preencher, validos } = await abrir();
    const antes = structuredClone(fonte.vendas());
    await validos();
    expect(pagina.textContent).not.toContain(
      'A entrada será registrada na data da venda e não conta como parcela paga.',
    );
    await preencher('valor-total', '1000');
    await preencher('quantidade-parcelas', '4');
    await preencher('tem-entrada', 'sim');
    expect(pagina.querySelector('tbody')).toBeNull();
    await preencher('valor-entrada', '200');
    await preencher('forma-entrada', 'Pix');
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(pagina.textContent).toContain('800,00');
    expect(pagina.querySelector('tbody tr')?.textContent).toContain('Entrada');
    expect(pagina.querySelector('tbody tr')?.textContent).toContain('Paga');
    expect(pagina.querySelector('tbody tr')?.textContent).toContain('31/01/2027');
    expect(fonte.vendas()).toEqual(antes);
    await preencher('tem-entrada', 'nao');
    expect(pagina.querySelector('#valor-entrada')).toBeNull();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(4);
    await preencher('tem-entrada', 'sim');
    expect(pagina.querySelector<HTMLInputElement>('#valor-entrada')?.value).toBe('200');
    expect(pagina.querySelector<HTMLSelectElement>('#forma-entrada')?.value).toBe('Pix');
    await preencher('valor-entrada', '1000');
    expect(pagina.querySelector('tbody')).toBeNull();
  });

  it('apresenta a escolha antes dos dados financeiros e foca erro sem escolha', async () => {
    const { harness, fonte, pagina, preencher, enviar } = await abrir();
    const antes = structuredClone(fonte.vendas());
    expect(pagina.querySelector('label[for="tem-entrada"]')?.textContent).toContain(
      'Possui Entrada',
    );
    expect(pagina.querySelector<HTMLSelectElement>('#tem-entrada')?.options[0].textContent).toBe(
      'Selecione uma opção',
    );
    expect(
      [...pagina.querySelector<HTMLSelectElement>('#tem-entrada')!.options].map((opcao) => [
        opcao.value,
        opcao.textContent,
      ]),
    ).toEqual([
      ['', 'Selecione uma opção'],
      ['sim', 'Sim'],
      ['nao', 'Não'],
    ]);
    const ordem = ['tem-entrada', 'data-venda', 'valor-total', 'quantidade-parcelas'].map((id) =>
      [...pagina.querySelectorAll('input, select')].findIndex((campo) => campo.id === id),
    );
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    for (const [id, valor] of Object.entries({
      'nome-cliente': 'Cliente DEMO sem escolha',
      'cpf-cliente': '900.000.001-75',
      'telefone-cliente': '(00) 1234-5678',
      'valor-total': '100',
      'quantidade-parcelas': '3',
    }))
      await preencher(id, valor);
    expect(pagina.querySelector('tbody')).toBeNull();
    enviar();
    await harness.fixture.whenStable();
    expect(pagina.querySelector('#erro-tem-entrada')?.textContent).toContain(
      'Informe se a venda possui entrada ou não.',
    );
    expect(document.activeElement).toBe(pagina.querySelector('#tem-entrada'));
    expect(fonte.vendas()).toEqual(antes);
    expect(
      fonte.cadastrarVenda({
        cliente: { nome: 'DEMO', cpf: '90000000175', telefone: '0012345678' },
        dataVenda: fonte.referencia,
        valorTotalCentavos: 100,
        quantidadeParcelas: 1,
        entrada: null,
      }),
    ).toMatchObject({ tipo: 'sucesso', valor: { id: 'sessao/venda/1' } });
  });

  it('revela erros associados, foca o primeiro campo e não publica envio inválido', async () => {
    const { harness, fonte, pagina, enviar } = await abrir();
    const antes = structuredClone(fonte.vendas());
    enviar();
    await harness.fixture.whenStable();
    expect(pagina.querySelector('#erro-nome')!.textContent).toContain('Informe o nome');
    expect(pagina.querySelector('#erro-cpf')!.textContent).toContain('CPF');
    expect(pagina.querySelector('#erro-telefone')!.textContent).toContain('DDD');
    expect(document.activeElement).toBe(pagina.querySelector('#nome-cliente'));
    expect(fonte.vendas()).toEqual(antes);
  });

  it('confirma uma única vez, anuncia sucesso e abre detalhe por ID opaco', async () => {
    const { harness, fonte, validos, enviar } = await abrir();
    await validos();
    const comando = vi.spyOn(fonte, 'cadastrarVenda');
    enviar();
    enviar();
    await harness.fixture.whenStable();
    expect(comando).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/vendas/sessao%2Fvenda%2F1');
    expect(harness.routeNativeElement?.textContent).toContain('Venda demonstrativa cadastrada.');
    expect(fonte.vendas().filter((v) => v.cliente.nome === 'Cliente DEMO cadastro')).toHaveLength(
      1,
    );
    await harness.navigateByUrl('/vendas');
    await harness.navigateByUrl('/vendas/sessao%2Fvenda%2F1');
    expect(harness.routeNativeElement?.querySelector('[role="status"]')).toBeNull();
  });

  it.each(['resultado', 'excecao'])('preserva rascunho e permite retry após %s', async (modo) => {
    const { harness, fonte, pagina, validos, enviar } = await abrir();
    await validos();
    const antes = structuredClone(fonte.vendas());
    const comando = vi.spyOn(fonte, 'cadastrarVenda');
    if (modo === 'resultado')
      comando.mockReturnValueOnce({
        tipo: 'falha',
        codigo: 'teste',
        mensagem: 'Falha controlada sem publicação.',
      });
    else
      comando.mockImplementationOnce(() => {
        throw new Error('Teste');
      });
    enviar();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/vendas/nova');
    expect(pagina.querySelector('[role="alert"]')!.textContent).toMatch(
      /Falha controlada|Não foi possível/,
    );
    expect(pagina.querySelector('[role="alert"]')!.classList.contains('rounded-lg')).toBe(true);
    expect(pagina.querySelector('[role="alert"]')!.classList.contains('bg-surface-muted')).toBe(
      true,
    );
    expect(pagina.querySelector<HTMLInputElement>('#nome-cliente')!.value).toBe(
      'Cliente DEMO cadastro',
    );
    expect(pagina.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(false);
    expect(fonte.vendas()).toEqual(antes);
    enviar();
    await harness.fixture.whenStable();
    expect(comando).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(Router).url).toBe('/vendas/sessao%2Fvenda%2F1');
  });

  it('cancelar retorna a Vendas com identidade lógica de foco, sem publicar', async () => {
    const { harness, fonte, pagina, validos } = await abrir();
    const antes = structuredClone(fonte.vendas());
    await validos();
    [...pagina.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cancelar'))!
      .click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/vendas');
    expect(TestBed.inject(RetornoFormulario).consumir()).toBe('nova-venda');
    expect(fonte.vendas()).toEqual(antes);
    await harness.navigateByUrl('/vendas/nova');
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#nome-cliente')!.value,
    ).toBe('');
  });
});
