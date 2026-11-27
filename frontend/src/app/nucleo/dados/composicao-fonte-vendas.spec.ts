import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import { FonteVendasDemonstracao } from './fonte-vendas-demonstracao';
import { FONTE_VENDAS, FONTE_VENDAS_LOCAL, FonteVendas } from './fonte-vendas';
import { REFERENCIA_SESSAO, RELOGIO_SESSAO } from './referencia-sessao';
import { REFERENCIA_DEMONSTRACAO } from '../demonstracao/referencia-demonstracao';
import { ServicoDemonstracao } from '../demonstracao/servico-demonstracao';
import { provedoresFonteVendas as provedoresLocais } from '../../../configuracoes/provedores-fonte-vendas.local';

describe('Composição da fonte de vendas', () => {
  it('mantém a composição padrão demonstrativa sem fonte local nem cliente HTTP', () => {
    TestBed.configureTestingModule({
      providers: [
        ...(appConfig.providers ?? []),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    });

    const fonte = TestBed.inject(FONTE_VENDAS);

    expect(fonte).toBeInstanceOf(FonteVendasDemonstracao);
    expect(fonte.referencia).toBe('2027-01-31');
    expect(TestBed.inject(FONTE_VENDAS_LOCAL, null)).toBeNull();
  });

  it('resolve a composição local pelo provider substituto sem instanciar demonstração', () => {
    let instanciacoesDemonstrativas = 0;
    const fonteSubstituta = { referencia: '2027-02-01' } as FonteVendas;
    TestBed.configureTestingModule({
      providers: [
        ...provedoresLocais,
        { provide: FONTE_VENDAS_LOCAL, useValue: fonteSubstituta },
        {
          provide: ServicoDemonstracao,
          useFactory: () => {
            instanciacoesDemonstrativas++;
            throw new Error('A composição local não pode instanciar demonstração.');
          },
        },
      ],
    });

    expect(TestBed.inject(FONTE_VENDAS)).toBe(fonteSubstituta);
    expect(instanciacoesDemonstrativas).toBe(0);
  });

  it('falha fechada quando a fonte local não foi fornecida, sem fallback demonstrativo', () => {
    let instanciacoesDemonstrativas = 0;
    TestBed.configureTestingModule({
      providers: [
        ...provedoresLocais,
        {
          provide: ServicoDemonstracao,
          useFactory: () => {
            instanciacoesDemonstrativas++;
            throw new Error('Não deve haver fallback.');
          },
        },
      ],
    });

    expect(() => TestBed.inject(FONTE_VENDAS)).toThrow();
    expect(instanciacoesDemonstrativas).toBe(0);
  });

  it('fixa a referência civil ao abrir e cria nova referência após reiniciar o injector', () => {
    let instante = new Date(2027, 0, 1, 23, 59, 59);
    const relogio = vi.fn(() => instante);
    TestBed.configureTestingModule({ providers: [{ provide: RELOGIO_SESSAO, useValue: relogio }] });

    const referenciaInicial = TestBed.inject(REFERENCIA_SESSAO);
    instante = new Date(2027, 0, 2, 0, 0, 1);

    expect(referenciaInicial).toBe('2027-01-01');
    expect(TestBed.inject(REFERENCIA_SESSAO)).toBe('2027-01-01');
    expect(relogio).toHaveBeenCalledOnce();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: RELOGIO_SESSAO, useValue: () => instante }],
    });

    expect(TestBed.inject(REFERENCIA_SESSAO)).toBe('2027-01-02');
  });
});
