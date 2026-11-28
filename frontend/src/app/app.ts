import {
  afterNextRender,
  AfterRenderRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { BarraNavegacao } from './compartilhado/componentes/barra-navegacao/barra-navegacao';
import { AvisoConfirmacaoIncerta } from './compartilhado/componentes/aviso-confirmacao-incerta/aviso-confirmacao-incerta';
import { MODO_APLICACAO } from './nucleo/configuracao/modo-aplicacao';
import { ServicoTema } from './nucleo/configuracao/servico-tema';
import { FONTE_VENDAS } from './nucleo/dados/fonte-vendas';
import { RetornoFormulario } from './nucleo/navegacao/retorno-formulario';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, BarraNavegacao, AvisoConfirmacaoIncerta],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tema]': 'servicoTema.tema()',
  },
})
export class App {
  protected readonly servicoTema = inject(ServicoTema);
  protected readonly modo = inject(MODO_APLICACAO);
  private readonly fonte = inject(FONTE_VENDAS);
  private readonly retornoFormulario = inject(RetornoFormulario);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private focoPendente?: AfterRenderRef;
  private ultimoDestino?: string;

  constructor() {
    // Captura e mantém a referência da fonte efetiva desde a abertura do app.
    void this.fonte.referencia;
    this.router.events.pipe(takeUntilDestroyed()).subscribe((evento) => {
      if (evento instanceof NavigationStart) this.focoPendente?.destroy();
      if (!(evento instanceof NavigationEnd)) return;
      const mudou =
        this.ultimoDestino !== undefined && this.ultimoDestino !== evento.urlAfterRedirects;
      this.ultimoDestino = evento.urlAfterRedirects;
      if (!mudou) return;
      this.focoPendente = afterNextRender(
        () => {
          if (this.router.lastSuccessfulNavigation()?.id === evento.id) {
            const chave = this.retornoFormulario.consumir();
            const acionador = chave
              ? [
                  ...this.elemento.nativeElement.querySelectorAll<HTMLElement>(
                    '[data-foco-formulario]',
                  ),
                ].find((item) => item.dataset['focoFormulario'] === chave)
              : null;
            (
              acionador ?? this.elemento.nativeElement.querySelector<HTMLElement>('main h1')
            )?.focus();
          }
        },
        { injector: this.injector },
      );
    });
  }
}
