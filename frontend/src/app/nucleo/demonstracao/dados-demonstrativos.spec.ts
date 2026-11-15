import { projetarVendas, validarVenda } from '../../funcionalidades/vendas/venda.calculos';
import { criarDadosDemonstrativos } from './dados-demonstrativos';

describe('Dados sintéticos', () => {
  it.each(['2026-11-15', '2027-01-31', '2028-02-29', '2027-03-31', '2027-08-31'])(
    'cria doze vendas válidas e variadas em %s',
    (referencia) => {
      const vendas = criarDadosDemonstrativos(referencia);
      expect(vendas).toHaveLength(12);
      vendas.forEach((venda) => {
        expect(() => validarVenda(venda, referencia)).not.toThrow();
        expect(venda.cliente.cpf).toMatch(/^CPF-DEMO-/);
        expect(venda.cliente.telefone).toMatch(/^TEL-DEMO-/);
        expect(venda.cliente.nome).toContain('DEMO Aurora');
        const ids = venda.recebimentos.flatMap((r) => r.alocacoes.map((a) => a.parcelaId));
        expect(ids).toEqual(venda.parcelas.slice(0, ids.length).map((p) => p.id));
      });
      expect(new Set(projetarVendas(vendas, referencia).map((v) => v.situacao))).toEqual(
        new Set(['Em aberto', 'Próximos dias', 'Atrasada', 'Quitada']),
      );
      expect(vendas.some((v) => v.entrada === null)).toBe(true);
      expect(vendas.some((v) => v.entrada !== null)).toBe(true);
    },
  );

  it('é determinística sem compartilhar objetos entre chamadas', () => {
    const a = criarDadosDemonstrativos('2026-11-15');
    const b = criarDadosDemonstrativos('2026-11-15');
    expect(a).toEqual(b);
    expect(a[0].cliente).not.toBe(b[0].cliente);
    expect(a[0].parcelas[0]).not.toBe(b[0].parcelas[0]);
    expect(a[3].recebimentos[0].alocacoes[0]).not.toBe(b[3].recebimentos[0].alocacoes[0]);
    Reflect.set(a[0].cliente, 'nome', 'alterado somente na primeira cópia');
    expect(b).toEqual(criarDadosDemonstrativos('2026-11-15'));
  });
});
