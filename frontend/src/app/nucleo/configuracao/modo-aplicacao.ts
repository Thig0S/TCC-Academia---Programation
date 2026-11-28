import { InjectionToken } from '@angular/core';

export type ModoAplicacao = 'demonstrativo' | 'local';

/** Modo efetivo, selecionado pela composição de providers no build. */
export const MODO_APLICACAO = new InjectionToken<ModoAplicacao>('Modo da aplicação');
