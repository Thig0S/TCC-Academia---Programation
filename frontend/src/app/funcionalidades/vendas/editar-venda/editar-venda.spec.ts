import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { REFERENCIA_DEMONSTRACAO } from '../../../nucleo/demonstracao/referencia-demonstracao';
import { RetornoFormulario } from '../../../nucleo/demonstracao/retorno-formulario';

describe('Edição dos quatro campos do cliente pela UI', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    }),
  );

  function url(id: string) {
    const router = TestBed.inject(Router);
    return router.serializeUrl(router.createUrlTree(['/vendas', id, 'editar']));
  }
  async function preencher(harness: RouterTestingHarness, id: string, valor: string) {
    const campo = harness.routeNativeElement!.querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
  }
  function enviar(harness: RouterTestingHarness) {
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('copia os quatro campos, não publica ao digitar e troca/limpa por ID opaco', async () => {
    const fonte = TestBed.inject(ServicoDemonstracao);
    const [a, b] = fonte.vendas();
    const antes = structuredClone(fonte.vendas());
    const harness = await RouterTestingHarness.create(url(a.id));
    expect(harness.routeNativeElement!.querySelectorAll('input, textarea')).toHaveLength(4);
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#nome-cliente')!.value,
    ).toBe(a.cliente.nome);
    await preencher(harness, 'nome-cliente', 'Rascunho sem publicação');
    expect(fonte.vendas()).toEqual(antes);
    await harness.navigateByUrl(url(b.id));
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#nome-cliente')!.value,
    ).toBe(b.cliente.nome);
    await harness.navigateByUrl(url('ausente/com/barra'));
    expect(harness.routeNativeElement?.textContent).toContain('Venda não encontrada');
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    expect(harness.routeNativeElement?.querySelectorAll('a')).toHaveLength(2);
    expect(fonte.vendas()).toEqual(antes);
  });

  it.each(['sem recebimento', 'entrada', 'parcial', 'quitada'])(
    'edita %s sem alterar finanças, resumos ou outra venda com mesmo CPF',
    async (situacao) => {
      const fonte = TestBed.inject(ServicoDemonstracao);
      const cadastro = fonte.cadastrarVenda({
        cliente: { nome: 'Cliente DEMO base', cpf: '90000000175', telefone: '0012345678' },
        dataVenda: fonte.referencia,
        valorTotalCentavos: 10000,
        quantidadeParcelas: 3,
        entrada: null,
      });
      if (cadastro.tipo !== 'sucesso') throw new Error(cadastro.mensagem);
      const alvo =
        situacao === 'sem recebimento'
          ? cadastro.valor
          : situacao === 'quitada'
            ? fonte.quitadas()[0]
            : fonte.abertas().find((v) => v.entrada !== null)!;
      if (situacao === 'parcial') {
        const pagas = new Set(
          alvo.recebimentos.flatMap((recebimento) =>
            recebimento.alocacoes.map((alocacao) => alocacao.parcelaId),
          ),
        );
        const primeira = alvo.parcelas.find((parcela) => !pagas.has(parcela.id))!;
        expect(
          fonte.registrarPagamento({
            vendaId: alvo.id,
            parcelaId: primeira.id,
            data: fonte.referencia,
            forma: 'Pix',
          }).tipo,
        ).toBe('sucesso');
      }
      const antes = structuredClone(fonte.vendas());
      const resumo = fonte.resumo();
      const original = antes.find((v) => v.id === alvo.id)!;
      const harness = await RouterTestingHarness.create(url(alvo.id));
      await preencher(harness, 'nome-cliente', 'Cliente DEMO corrigido UI');
      await preencher(harness, 'cpf-cliente', cadastro.valor.cliente.cpf);
      await preencher(harness, 'telefone-cliente', '(00) 91234-5678');
      await preencher(harness, 'descricao-cliente', '');
      enviar(harness);
      enviar(harness);
      await harness.fixture.whenStable();
      const editada = fonte.vendas().find((v) => v.id === alvo.id)!;
      const { cliente: anteriorCliente, ...financeiro } = original;
      const { cliente: novoCliente, ...financeiroEditado } = editada;
      expect(financeiroEditado).toEqual(financeiro);
      expect(novoCliente).toEqual({
        nome: 'Cliente DEMO corrigido UI',
        cpf: cadastro.valor.cliente.cpf,
        telefone: '00912345678',
        descricao: null,
      });
      expect(anteriorCliente.nome).not.toBe(novoCliente.nome);
      expect(fonte.resumo()).toEqual(resumo);
      expect(fonte.vendas().filter((v) => v.id !== alvo.id)).toEqual(
        antes.filter((v) => v.id !== alvo.id),
      );
      expect(harness.routeNativeElement?.textContent).toContain('Cliente DEMO corrigido UI');
      await harness.navigateByUrl(situacao === 'quitada' ? '/vendas/quitadas' : '/vendas');
      const campo =
        harness.routeNativeElement!.querySelector<HTMLInputElement>('input[type="search"]')!;
      campo.value = 'corrigido UI';
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      await harness.fixture.whenStable();
      expect(harness.routeNativeElement?.querySelectorAll('tbody tr')).toHaveLength(1);
    },
  );

  it.each(['resultado', 'excecao'])('mantém rascunho e permite retry em %s', async (modo) => {
    const fonte = TestBed.inject(ServicoDemonstracao);
    const alvo = fonte.abertas()[0];
    const antes = structuredClone(fonte.vendas());
    const harness = await RouterTestingHarness.create(url(alvo.id));
    await preencher(harness, 'nome-cliente', 'DEMO retry');
    const comando = vi.spyOn(fonte, 'editarCliente');
    if (modo === 'resultado')
      comando.mockReturnValueOnce({
        tipo: 'falha',
        codigo: 'teste',
        mensagem: 'Falha controlada na edição.',
      });
    else
      comando.mockImplementationOnce(() => {
        throw new Error('Teste');
      });
    enviar(harness);
    await harness.fixture.whenStable();
    expect(fonte.vendas()).toEqual(antes);
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#nome-cliente')!.value,
    ).toBe('DEMO retry');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')!.textContent).toMatch(
      /Falha controlada|Não foi possível/,
    );
    expect(
      harness.routeNativeElement?.querySelector('[role="alert"]')!.classList.contains('rounded-lg'),
    ).toBe(true);
    expect(
      harness.routeNativeElement
        ?.querySelector('[role="alert"]')!
        .classList.contains('bg-surface-muted'),
    ).toBe(true);
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled,
    ).toBe(false);
    enviar(harness);
    await harness.fixture.whenStable();
    expect(comando).toHaveBeenCalledTimes(2);
    expect(harness.routeNativeElement?.textContent).toContain('Dados do cliente atualizados');
  });

  it('envio inválido revela erro e foco, cancelar descarta e acesso direto retorna ao detalhe', async () => {
    const fonte = TestBed.inject(ServicoDemonstracao);
    const alvo = fonte.abertas()[0];
    const antes = structuredClone(fonte.vendas());
    const harness = await RouterTestingHarness.create(url(alvo.id));
    await preencher(harness, 'cpf-cliente', '11111111111');
    enviar(harness);
    await harness.fixture.whenStable();
    expect(document.activeElement).toBe(harness.routeNativeElement?.querySelector('#cpf-cliente'));
    expect(harness.routeNativeElement?.querySelector('#erro-cpf')!.textContent).toContain(
      'verificadores',
    );
    [...harness.routeNativeElement!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cancelar'))!
      .click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(
      TestBed.inject(Router).serializeUrl(
        TestBed.inject(Router).createUrlTree(['/vendas', alvo.id]),
      ),
    );
    expect(TestBed.inject(RetornoFormulario).consumir()).toBe(`editar-${alvo.id}`);
    expect(fonte.vendas()).toEqual(antes);
  });

  it.each(['/vendas', '/vendas/quitadas'])('cancela para o acionador em %s', async (origem) => {
    const harness = await RouterTestingHarness.create(origem);
    const link = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(
      'a[data-foco-formulario^="editar-"]',
    )!;
    const chave = link.dataset['focoFormulario'];
    link.click();
    await harness.fixture.whenStable();
    [...harness.routeNativeElement!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cancelar'))!
      .click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(origem);
    expect(TestBed.inject(RetornoFormulario).consumir()).toBe(chave);
  });
});
