import { Injectable } from '@angular/core';

/** Identidade lógica de foco, usada uma única vez após a navegação de cancelamento. */
@Injectable({ providedIn: 'root' })
export class RetornoFormulario {
  private chave: string | null = null;
  private sucesso: string | null = null;
  anunciar(mensagem: string): void {
    this.sucesso = mensagem;
  }
  consumirSucesso(): string | null {
    const mensagem = this.sucesso;
    this.sucesso = null;
    return mensagem;
  }
  preparar(chave: string): void {
    this.chave = chave;
  }
  consumir(): string | null {
    const chave = this.chave;
    this.chave = null;
    return chave;
  }
}
