import { InjectionToken, inject } from '@angular/core';
import { interpretarDataCivil } from '../../funcionalidades/vendas/data-civil';

export const RELOGIO_SESSAO = new InjectionToken<() => Date>('Relógio civil da sessão', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Captura a data civil uma vez por injector; não persiste nem consulta o seed. */
export const REFERENCIA_SESSAO = new InjectionToken<string>('Referência civil da sessão', {
  providedIn: 'root',
  factory: () => {
    const agora = inject(RELOGIO_SESSAO)();
    const data = `${String(agora.getFullYear()).padStart(4, '0')}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    interpretarDataCivil(data);
    return data;
  },
});
