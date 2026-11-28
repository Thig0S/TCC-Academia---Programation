import { InjectionToken, inject } from '@angular/core';
import { REFERENCIA_SESSAO } from '../dados/referencia-sessao';

export const REFERENCIA_DEMONSTRACAO = new InjectionToken<string>('Referência civil da sessão', {
  providedIn: 'root',
  factory: () => inject(REFERENCIA_SESSAO),
});
