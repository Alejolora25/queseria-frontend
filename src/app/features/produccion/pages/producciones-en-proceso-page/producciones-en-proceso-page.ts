import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import { ResumenLoteProduccion } from '../../../../core/api/produccion.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './producciones-en-proceso-page.html',
})
export class ProduccionesEnProcesoPageComponent {
  private readonly api = inject(ProduccionApi);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud = 0;
  readonly codigo = new FormControl('', { nonNullable: true });
  readonly items = signal<ResumenLoteProduccion[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / 10)));

  constructor() { this.cargar(0); }

  cargar(pagina: number): void {
    const solicitud = ++this.solicitud;
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({ estado: 'EN_PROCESO', codigoLote: this.codigo.value.trim() || null,
      page: pagina, size: 10 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: respuesta => {
          if (solicitud !== this.solicitud) return;
          this.items.set(respuesta.items ?? []);
          this.total.set(respuesta.total ?? 0);
          this.pagina.set(respuesta.page);
          this.cargando.set(false);
        },
        error: err => {
          if (solicitud !== this.solicitud) return;
          this.error.set(parseApiError(err).message);
          this.cargando.set(false);
        },
    });
  }

  cambiarPagina(direccion: -1 | 1): void {
    const destino = this.pagina() + direccion;
    if (destino >= 0 && destino < this.totalPaginas()) this.cargar(destino);
  }
}
