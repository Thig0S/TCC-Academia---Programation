import { projetarVendas, validarVenda } from '../../funcionalidades/vendas/venda.calculos';
import { diasNoMes, ordinalCivil } from '../../funcionalidades/vendas/data-civil';
import { somarCentavos } from '../../funcionalidades/vendas/dinheiro';
import { criarDadosDemonstrativos } from './dados-demonstrativos';
import { cpfValido, telefoneValido } from '../../funcionalidades/vendas/identificacao.validacoes';

describe('Dados sintéticos', () => {
  it.each(['0001-01', '0001-02', '0001-03', '0001-04', '9999-09', '9999-10', '9999-11', '9999-12'])(
    'preserva invariantes e todas as situações possíveis em cada dia de %s',
    (anoMes) => {
      const [ano, mes] = anoMes.split('-').map(Number);
      for (let dia = 1; dia <= diasNoMes(ano, mes); dia++) {
        const referencia = `${anoMes}-${String(dia).padStart(2, '0')}`;
        const vendas = criarDadosDemonstrativos(referencia);
        expect(vendas).toHaveLength(12);
        expect(vendas).toEqual(criarDadosDemonstrativos(referencia));
        const ids = vendas.flatMap((v) => [
          v.id,
          ...v.parcelas.map((p) => p.id),
          ...v.recebimentos.map((r) => r.id),
        ]);
        expect(new Set(ids).size).toBe(ids.length);
        vendas.forEach((venda) => {
          expect(() => validarVenda(venda, referencia)).not.toThrow();
          expect(venda.dataVenda <= referencia).toBe(true);
          expect(venda.parcelas.length).toBeGreaterThanOrEqual(1);
          expect(venda.parcelas.length).toBeLessThanOrEqual(venda.entrada ? 5 : 4);
          expect(somarCentavos(venda.parcelas.map((p) => p.valorCentavos))).toBe(
            venda.valorTotalCentavos,
          );
          const pagas = venda.recebimentos.flatMap((r) => r.alocacoes.map((a) => a.parcelaId));
          expect(pagas).toEqual(venda.parcelas.slice(0, pagas.length).map((p) => p.id));
        });
        const esperadas = ['Quitada'];
        if (referencia > '0001-02-01') esperadas.push('Atrasada');
        if (referencia >= '0001-01-25') esperadas.push('Próximos dias');
        if (ordinalCivil('9999-12-31') - ordinalCivil(referencia) > 7) esperadas.push('Em aberto');
        expect(new Set(projetarVendas(vendas, referencia).map((v) => v.situacao))).toEqual(
          new Set(esperadas),
        );
      }
    },
  );

  it.each(['0001-01-01', '9999-12-31'])(
    'isola clientes, parcelas e alocações na borda %s',
    (referencia) => {
      const a = criarDadosDemonstrativos(referencia);
      const b = criarDadosDemonstrativos(referencia);
      Reflect.set(a[0].cliente, 'nome', 'alteração externa');
      Reflect.set(a[0].parcelas[0], 'valorCentavos', 1);
      Reflect.set(a[3].recebimentos[0].alocacoes[0], 'valorCentavos', 1);
      expect(b).toEqual(criarDadosDemonstrativos(referencia));
    },
  );

  it.each(['2026-11-15', '2027-01-31', '2028-02-29', '2027-03-31', '2027-08-31'])(
    'cria doze vendas válidas e variadas em %s',
    (referencia) => {
      const vendas = criarDadosDemonstrativos(referencia);
      expect(vendas).toHaveLength(12);
      vendas.forEach((venda) => {
        expect(() => validarVenda(venda, referencia)).not.toThrow();
        expect(cpfValido(venda.cliente.cpf)).toBe(true);
        expect(telefoneValido(venda.cliente.telefone)).toBe(true);
        expect(venda.cliente.cpf).toMatch(/^\d{11}$/);
        expect(venda.cliente.telefone).toMatch(/^\d{11}$/);
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

  it('preserva IDs e os valores do conjunto anterior ao substituir somente identificação', () => {
    const vendas = criarDadosDemonstrativos('2027-01-31');
    expect(vendas.map((v) => v.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `seed/venda/${i + 1}`),
    );
    vendas.forEach((v, i) => {
      expect(v.valorTotalCentavos).toBe(i % 2 === 0 ? 100000 : 80000);
      expect(v.entrada).toEqual(
        i % 2 === 0 ? { valorCentavos: 20000, data: v.dataVenda, forma: 'Pix' } : null,
      );
      const futuras = v.entrada ? v.parcelas.slice(1) : v.parcelas;
      expect(futuras).toEqual(
        Array.from({ length: 4 }, (_, p) => ({
          id: `seed/venda/${i + 1}/parcela/${p + 1}`,
          numero: p + 1 + (v.entrada ? 1 : 0),
          valorCentavos: 20000,
          vencimento: [
            ['2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31'],
            ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'],
            ['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28'],
            ['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28'],
          ][i % 4][p],
        })),
      );
      if (v.entrada) {
        expect(v.parcelas[0]).toEqual({
          id: `seed/venda/${i + 1}/parcela/entrada`,
          numero: 1,
          valorCentavos: 20000,
          vencimento: v.dataVenda,
        });
      }
      expect(v.dataVenda).toBe(['2027-01-31', '2026-12-31', '2026-10-31', '2026-10-31'][i % 4]);
      expect(v.recebimentos).toHaveLength(i % 2 === 0 ? 1 : i % 4 === 3 ? 1 : 0);
      if (v.entrada) {
        expect(v.recebimentos[0]).toMatchObject({
          id: `seed/venda/${i + 1}/recebimento/entrada`,
          data: v.dataVenda,
          forma: 'Pix',
          valorCentavos: 20000,
          alocacoes: [{ parcelaId: `seed/venda/${i + 1}/parcela/entrada`, valorCentavos: 20000 }],
        });
      }
      if (i % 4 === 3)
        expect(v.recebimentos[0]).toMatchObject({
          id: `seed/recebimento/${i + 1}`,
          data: '2027-01-31',
          forma: 'Dinheiro',
          valorCentavos: 80000,
          alocacoes: v.parcelas.map((parcela) => ({
            parcelaId: parcela.id,
            valorCentavos: parcela.valorCentavos,
          })),
        });
    });
  });
});
