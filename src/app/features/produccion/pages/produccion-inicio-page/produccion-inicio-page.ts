import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import { ResumenGeneralProduccion } from '../../../../core/api/produccion.models';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './produccion-inicio-page.html',
})
export class ProduccionInicioPageComponent {
  private readonly api = inject(ProduccionApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly puedeOperar = () => this.auth.tieneRol('ADMIN') || this.auth.tieneRol('OPERADOR');

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenGeneralProduccion | null>(null);
  desde = '';
  hasta = '';

  constructor() {
    this.actualizar();
  }

  actualizar(): void {
    if (this.cargando()) return;
    this.error.set(null);
    if (this.desde && this.hasta && this.desde > this.hasta) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.cargando.set(true);
    this.api.resumen({ desde: this.desde || null, hasta: this.hasta || null })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resumen => {
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(parseApiError(err).message);
        this.resumen.set(null);
        this.cargando.set(false);
      },
    });
  }

  limpiarPeriodo(): void {
    this.desde = '';
    this.hasta = '';
    this.actualizar();
  }
}
