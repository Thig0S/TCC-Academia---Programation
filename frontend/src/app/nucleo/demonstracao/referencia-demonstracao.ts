import { InjectionToken } from '@angular/core';
import { interpretarDataCivil } from '../../funcionalidades/vendas/data-civil';

export const REFERENCIA_DEMONSTRACAO = new InjectionToken<string>('Referência civil da sessão', {
  providedIn: 'root',
  factory: () => {
    const agora = new Date();
    const data = `${String(agora.getFullYear()).padStart(4, '0')}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    interpretarDataCivil(data);
    return data;
  },
});
