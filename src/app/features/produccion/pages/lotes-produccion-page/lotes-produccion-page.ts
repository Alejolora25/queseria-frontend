import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import {
  EstadoProduccion, FiltroLotesProduccion, ResumenLoteProduccion,
} from '../../../../core/api/produccion.models';
import {
  ReferenciaSeleccionada, SelectorReferenciaProduccionComponent,
} from '../../components/selector-referencia/selector-referencia';

type FiltroReferencia = 'producto' | 'proveedor' | 'operario';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, SelectorReferenciaProduccionComponent],
  templateUrl: './lotes-produccion-page.html',
})
export class LotesProduccionPageComponent {
  private readonly api = inject(ProduccionApi);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud = 0;
  codigo = '';
  estado: EstadoProduccion | '' = '';
  desde = '';
  hasta = '';
  readonly producto = signal<ReferenciaSeleccionada | null>(null);
  readonly proveedor = signal<ReferenciaSeleccionada | null>(null);
  readonly operario = signal<ReferenciaSeleccionada | null>(null);
  readonly selector = signal<FiltroReferencia | null>(null);
  private readonly aplicado = signal<FiltroLotesProduccion>({});
  readonly lotes = signal<ResumenLoteProduccion[]>([]);
  readonly pagina = signal(0);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / 10)));

  constructor() { this.cargar(0); }

  buscar(): void {
    this.error.set(null);
    if (this.desde && this.hasta && this.desde > this.hasta) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.aplicado.set({ desde: this.desde || null, hasta: this.hasta || null,
      estado: this.estado || null, codigoLote: this.codigo.trim() || null,
      productoId: this.producto()?.id ?? null, proveedorId: this.proveedor()?.id ?? null,
      operarioId: this.operario()?.id ?? null });
    this.cargar(0);
  }

  limpiar(): void {
    this.desde = '';
    this.hasta = '';
    this.estado = '';
    this.codigo = '';
    this.producto.set(null);
    this.proveedor.set(null);
    this.operario.set(null);
    this.aplicado.set({});
    this.cargar(0);
  }

  elegir(ref: ReferenciaSeleccionada): void {
    const tipo = this.selector();
    if (tipo === 'producto') this.producto.set(ref);
    if (tipo === 'proveedor') this.proveedor.set(ref);
    if (tipo === 'operario') this.operario.set(ref);
    this.selector.set(null);
  }

  quitarReferencia(tipo: FiltroReferencia): void {
    if (tipo === 'producto') this.producto.set(null);
    if (tipo === 'proveedor') this.proveedor.set(null);
    if (tipo === 'operario') this.operario.set(null);
  }

  cargar(pagina: number): void {
    if (pagina < 0 || (pagina > 0 && pagina >= this.paginas())) return;
    const solicitud = ++this.solicitud;
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({ ...this.aplicado(), page: pagina, size: 10 })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: respuesta => {
        if (solicitud !== this.solicitud) return;
        this.lotes.set(respuesta.items ?? []);
        this.pagina.set(respuesta.page);
        this.total.set(respuesta.total);
        this.cargando.set(false);
      },
      error: err => {
        if (solicitud !== this.solicitud) return;
        this.error.set(parseApiError(err).message);
        this.lotes.set([]);
        this.total.set(0);
        this.pagina.set(0);
        this.cargando.set(false);
      },
    });
  }
}
