import { Component, DestroyRef, EventEmitter, HostListener, inject, Input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';

export type ReferenciaTipo = 'producto' | 'operario' | 'proveedor' | 'insumo' | 'subproducto';

export interface ReferenciaSeleccionada {
  id: number;
  nombre: string;
  detalle: string;
  unidad?: string;
  rendimientoEsperadoLPorKg?: number;
}

interface PaginaReferencias {
  items: ReferenciaSeleccionada[];
  total: number;
}

@Component({
  selector: 'app-selector-referencia-produccion',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './selector-referencia.html',
})
export class SelectorReferenciaProduccionComponent implements OnInit {
  private readonly produccion = inject(ProduccionApi);
  private readonly proveedores = inject(ProveedoresApi);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud = 0;
  private readonly limite = 20;

  @Input({ required: true }) tipo!: ReferenciaTipo;
  @Input() soloActivos = true;
  @Output() elegido = new EventEmitter<ReferenciaSeleccionada>();
  @Output() cerrado = new EventEmitter<void>();

  readonly q = new FormControl('', { nonNullable: true });
  readonly items = signal<ReferenciaSeleccionada[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  get titulo(): string {
    return ({ producto: 'Seleccionar producto', operario: 'Seleccionar operario',
      proveedor: 'Seleccionar proveedor', insumo: 'Seleccionar insumo',
      subproducto: 'Seleccionar subproducto' })[this.tipo];
  }

  ngOnInit(): void { this.buscar(0); }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void { this.cerrado.emit(); }

  buscar(pagina: number): void {
    const solicitud = ++this.solicitud;
    this.cargando.set(true);
    this.error.set(null);
    this.listar(pagina, this.q.value.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resultado => {
        if (solicitud !== this.solicitud) return;
        this.items.set(resultado.items);
        this.total.set(resultado.total);
        this.pagina.set(pagina);
        this.cargando.set(false);
      },
      error: err => {
        if (solicitud !== this.solicitud) return;
        this.error.set(parseApiError(err).message);
        this.cargando.set(false);
      },
    });
  }

  paginaSiguiente(direccion: -1 | 1): void {
    const destino = this.pagina() + direccion;
    if (destino >= 0 && destino * this.limite < this.total()) this.buscar(destino);
  }

  private listar(pagina: number, q: string): Observable<PaginaReferencias> {
    const filtro = { q, estado: this.soloActivos ? 'ACTIVO' as const : undefined,
      page: pagina, size: this.limite };
    switch (this.tipo) {
      case 'producto': return this.produccion.listarProductos(filtro).pipe(map(r => ({
        total: r.total, items: r.items.map(i => ({ id: i.id, nombre: i.nombre,
          detalle: `${i.rendimientoEsperadoLPorKg} L/kg esperados`,
          rendimientoEsperadoLPorKg: i.rendimientoEsperadoLPorKg })),
      })));
      case 'operario': return this.produccion.listarOperarios(filtro).pipe(map(r => ({
        total: r.total, items: r.items.map(i => ({ id: i.id, nombre: i.nombre, detalle: 'Operario' })),
      })));
      case 'insumo': return this.produccion.listarInsumos(filtro).pipe(map(r => ({
        total: r.total, items: r.items.map(i => ({ id: i.id, nombre: i.nombre,
          detalle: `Unidad: ${i.unidad}`, unidad: i.unidad })),
      })));
      case 'subproducto': return this.produccion.listarSubproductos(filtro).pipe(map(r => ({
        total: r.total, items: r.items.map(i => ({ id: i.id, nombre: i.nombre,
          detalle: `Unidad: ${i.unidad}`, unidad: i.unidad })),
      })));
      case 'proveedor': return this.proveedores.listar({ q, activo: this.soloActivos ? true : null,
        limit: this.limite, offset: pagina * this.limite }).pipe(map(r => ({
          total: r.total, items: r.items.map(i => ({ id: i.id, nombre: i.nombre,
            detalle: `${i.tipoIdentificacion} ${i.identificacion}` })),
        })));
    }
  }
}
