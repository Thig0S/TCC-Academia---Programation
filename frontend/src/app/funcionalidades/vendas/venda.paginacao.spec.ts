import {
  limitarPagina,
  obterFaixaPaginacao,
  obterPagina,
  obterTotalPaginas,
  VENDAS_POR_PAGINA,
} from './venda.paginacao';

describe('Paginação local de vendas', () => {
  it.each([
    [0, 0],
    [1, 1],
    [10, 1],
    [11, 2],
    [21, 3],
  ])('calcula total de páginas para %i itens', (total, esperado) => {
    expect(obterTotalPaginas(total)).toBe(esperado);
  });

  it('deriva faixas completas e vazias sem inventar resultados', () => {
    expect(obterFaixaPaginacao(0, 1)).toEqual({ inicio: 0, fim: 0, total: 0 });
    expect(obterFaixaPaginacao(1, 1)).toEqual({ inicio: 1, fim: 1, total: 1 });
    expect(obterFaixaPaginacao(10, 1)).toEqual({ inicio: 1, fim: 10, total: 10 });
    expect(obterFaixaPaginacao(11, 2)).toEqual({ inicio: 11, fim: 11, total: 11 });
    expect(obterFaixaPaginacao(21, 3)).toEqual({ inicio: 21, fim: 21, total: 21 });
  });

  it('divide a coleção em ordem, sem duplicação ou omissão, nas bordas', () => {
    const itens = Array.from({ length: 21 }, (_, indice) => indice + 1);
    const paginas = [1, 2, 3].map((pagina) => obterPagina(itens, pagina));

    expect(paginas.map((pagina) => pagina.length)).toEqual([10, 10, 1]);
    expect(paginas.flat()).toEqual(itens);
    expect(obterPagina(itens.slice(0, 10), 1)).toHaveLength(VENDAS_POR_PAGINA);
  });

  it('limita a seleção após redução sem produzir página inexistente', () => {
    expect(limitarPagina(3, obterTotalPaginas(11))).toBe(2);
    expect(limitarPagina(2, obterTotalPaginas(10))).toBe(1);
    expect(limitarPagina(4, 0)).toBe(1);
    expect(limitarPagina(2, 3)).toBe(2);
  });

  it('não altera a coleção de entrada', () => {
    const itens = Object.freeze([1, 2, 3]);
    expect(obterPagina(itens, 1)).toEqual([1, 2, 3]);
    expect(itens).toEqual([1, 2, 3]);
  });
});
