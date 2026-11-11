import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import {
  EstadoCatalogoProduccion, FiltroCatalogoProduccion, InsumoProduccion,
  OperarioProduccion, PaginaProduccion, ProductoProduccion, SubproductoProduccion,
  UnidadInsumo, UnidadSubproducto,
} from '../../../../core/api/produccion.models';
import { AuthService } from '../../../../core/auth/auth.service';

type CatalogoTipo = 'productos' | 'insumos' | 'subproductos' | 'operarios';
type CatalogoItem = ProductoProduccion | InsumoProduccion |
  SubproductoProduccion | OperarioProduccion;
type Dialogo = 'formulario' | 'estado' | null;

interface FilaCatalogo {
  id: number;
  nombre: string;
  estado: EstadoCatalogoProduccion;
  detalle: string;
  descripcion: string | null;
  original: CatalogoItem;
}

const TIPOS: readonly CatalogoTipo[] = ['productos', 'insumos', 'subproductos', 'operarios'];

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './catalogos-page.html',
})
export class CatalogosProduccionPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProduccionApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private solicitudListado = 0;

  readonly tabs = TIPOS.map(tipo => ({ tipo, label: this.nombreTipo(tipo) }));
  readonly tipo = signal<CatalogoTipo>('productos');
  readonly titulo = computed(() => this.nombreTipo(this.tipo()));
  readonly singular = computed(() => this.nombreSingular(this.tipo()));
  readonly puedeAdministrar = computed(() => this.auth.tieneRol('ADMIN'));
  readonly filas = signal<FilaCatalogo[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly errorDialogo = signal<string | null>(null);
  readonly dialogo = signal<Dialogo>(null);
  readonly seleccionado = signal<FilaCatalogo | null>(null);
  readonly unidadesInsumo: readonly { valor: UnidadInsumo; etiqueta: string }[] = [
    { valor: 'kg', etiqueta: 'Kilogramos (kg)' },
    { valor: 'g', etiqueta: 'Gramos (g)' },
    { valor: 'L', etiqueta: 'Litros (L)' },
    { valor: 'ml', etiqueta: 'Mililitros (ml)' },
    { valor: 'unidad', etiqueta: 'Unidad' },
  ];
  readonly unidadesSubproducto: readonly { valor: UnidadSubproducto; etiqueta: string }[] = [
    { valor: 'kg', etiqueta: 'Kilogramos (kg)' },
    { valor: 'L', etiqueta: 'Litros (L)' },
  ];

  readonly filtros = this.fb.nonNullable.group({ q: [''], estado: [''] });
  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    unidad: [''],
    rendimiento: ['', [Validators.pattern(/^\d{1,8}(?:[.,]\d{1,4})?$/)]],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const solicitado = params.get('tipo');
      if (!this.esTipo(solicitado)) {
        void this.router.navigateByUrl('/produccion/catalogos/productos', { replaceUrl: true });
        return;
      }
      this.tipo.set(solicitado);
      this.filtros.reset({ q: '', estado: '' });
      this.dialogo.set(null);
      this.seleccionado.set(null);
      this.aviso.set(null);
      this.filas.set([]);
      this.total.set(0);
      this.cargar(0);
    });
  }

  cargar(pagina = this.pagina()): void {
    const solicitud = ++this.solicitudListado;
    const { q, estado } = this.filtros.getRawValue();
    this.cargando.set(true);
    this.error.set(null);
    this.listar(this.tipo(), {
      q: q.trim(), estado: (estado || null) as EstadoCatalogoProduccion | null,
      page: pagina, size: this.tamano(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resultado => {
        if (solicitud !== this.solicitudListado) return;
        this.filas.set((resultado.items ?? []).map(item => this.fila(this.tipo(), item)));
        this.total.set(resultado.total ?? 0);
        this.pagina.set(resultado.page);
        this.cargando.set(false);
      },
      error: err => {
        if (solicitud !== this.solicitudListado) return;
        this.error.set(parseApiError(err).message);
        this.cargando.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtros.reset({ q: '', estado: '' });
    this.cargar(0);
  }

  cambiarTamano(event: Event): void {
    this.tamano.set(Number((event.target as HTMLSelectElement).value));
    this.cargar(0);
  }

  cambiarPagina(direccion: -1 | 1): void {
    const destino = this.pagina() + direccion;
    if (destino >= 0 && destino < this.totalPaginas()) this.cargar(destino);
  }

  nuevo(): void {
    if (!this.puedeAdministrar()) return;
    this.seleccionado.set(null);
    this.prepararFormulario();
    this.formulario.reset({ nombre: '', descripcion: '', unidad: '', rendimiento: '' });
    this.errorDialogo.set(null);
    this.dialogo.set('formulario');
  }

  editar(fila: FilaCatalogo): void {
    if (!this.puedeAdministrar()) return;
    this.seleccionado.set(fila);
    this.prepararFormulario();
    const item = fila.original;
    this.formulario.reset({
      nombre: item.nombre,
      descripcion: this.tipo() === 'productos' ? (item as ProductoProduccion).descripcion ?? '' : '',
      unidad: this.tipo() === 'insumos' ? (item as InsumoProduccion).unidad
        : this.tipo() === 'subproductos' ? (item as SubproductoProduccion).unidad : '',
      rendimiento: this.tipo() === 'productos'
        ? String((item as ProductoProduccion).rendimientoEsperadoLPorKg) : '',
    });
    this.errorDialogo.set(null);
    this.dialogo.set('formulario');
  }

  confirmarEstado(fila: FilaCatalogo): void {
    if (!this.puedeAdministrar()) return;
    this.seleccionado.set(fila);
    this.errorDialogo.set(null);
    this.dialogo.set('estado');
  }

  cerrarDialogo(): void {
    if (this.guardando()) return;
    this.dialogo.set(null);
    this.seleccionado.set(null);
    this.errorDialogo.set(null);
  }

  guardar(): void {
    if (!this.puedeAdministrar() || this.guardando()) return;
    this.formulario.markAllAsTouched();
    const valor = this.formulario.getRawValue();
    if (this.formulario.invalid || !valor.nombre.trim()) return;
    const rendimiento = Number(valor.rendimiento.replace(',', '.'));
    if (this.tipo() === 'productos' && !(rendimiento > 0)) {
      this.errorDialogo.set('El rendimiento esperado debe ser mayor que cero.');
      return;
    }
    const tipo = this.tipo();
    const actual = this.seleccionado();
    const nombre = valor.nombre.trim();
    this.guardando.set(true);
    this.errorDialogo.set(null);
    this.guardarItem(tipo, actual?.id ?? null, {
      nombre,
      descripcion: valor.descripcion.trim() || null,
      unidad: valor.unidad,
      rendimientoEsperadoLPorKg: rendimiento,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogo.set(null);
        this.seleccionado.set(null);
        this.aviso.set(`${this.nombreSingular(tipo)} ${actual ? 'actualizado' : 'creado'} correctamente.`);
        this.cargar(this.pagina());
      },
      error: err => {
        this.guardando.set(false);
        this.errorDialogo.set(parseApiError(err).message);
      },
    });
  }

  cambiarEstado(): void {
    const actual = this.seleccionado();
    if (!this.puedeAdministrar() || !actual || this.guardando()) return;
    const activar = actual.estado !== 'ACTIVO';
    const tipo = this.tipo();
    this.guardando.set(true);
    this.errorDialogo.set(null);
    this.estadoItem(tipo, actual.id, activar).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogo.set(null);
        this.seleccionado.set(null);
        this.aviso.set(`${this.nombreSingular(tipo)} ${activar ? 'activado' : 'desactivado'} correctamente.`);
        this.cargar(this.pagina());
      },
      error: err => {
        this.guardando.set(false);
        this.errorDialogo.set(parseApiError(err).message);
      },
    });
  }

  private prepararFormulario(): void {
    const rendimiento = this.formulario.controls.rendimiento;
    rendimiento.setValidators(this.tipo() === 'productos'
      ? [Validators.required, Validators.pattern(/^\d{1,8}(?:[.,]\d{1,4})?$/)] : []);
    rendimiento.updateValueAndValidity();
    const unidad = this.formulario.controls.unidad;
    unidad.setValidators(this.tipo() === 'insumos' || this.tipo() === 'subproductos'
      ? [Validators.required] : []);
    unidad.updateValueAndValidity();
  }

  private listar(tipo: CatalogoTipo, filtro: FiltroCatalogoProduccion):
      Observable<PaginaProduccion<CatalogoItem>> {
    switch (tipo) {
      case 'productos': return this.api.listarProductos(filtro);
      case 'insumos': return this.api.listarInsumos(filtro);
      case 'subproductos': return this.api.listarSubproductos(filtro);
      case 'operarios': return this.api.listarOperarios(filtro);
    }
  }

  private guardarItem(tipo: CatalogoTipo, id: number | null, valor: {
    nombre: string; descripcion: string | null; unidad: string; rendimientoEsperadoLPorKg: number;
  }): Observable<CatalogoItem> {
    switch (tipo) {
      case 'productos': {
        const datos = { nombre: valor.nombre, descripcion: valor.descripcion,
          rendimientoEsperadoLPorKg: valor.rendimientoEsperadoLPorKg };
        return id === null ? this.api.crearProducto(datos) : this.api.actualizarProducto(id, datos);
      }
      case 'insumos': {
        const datos = { nombre: valor.nombre, unidad: valor.unidad as UnidadInsumo };
        return id === null ? this.api.crearInsumo(datos) : this.api.actualizarInsumo(id, datos);
      }
      case 'subproductos': {
        const datos = { nombre: valor.nombre, unidad: valor.unidad as UnidadSubproducto };
        return id === null ? this.api.crearSubproducto(datos) : this.api.actualizarSubproducto(id, datos);
      }
      case 'operarios': {
        const datos = { nombre: valor.nombre };
        return id === null ? this.api.crearOperario(datos) : this.api.actualizarOperario(id, datos);
      }
    }
  }

  private estadoItem(tipo: CatalogoTipo, id: number, activar: boolean): Observable<CatalogoItem> {
    switch (tipo) {
      case 'productos': return this.api.cambiarEstadoProducto(id, activar);
      case 'insumos': return this.api.cambiarEstadoInsumo(id, activar);
      case 'subproductos': return this.api.cambiarEstadoSubproducto(id, activar);
      case 'operarios': return this.api.cambiarEstadoOperario(id, activar);
    }
  }

  private fila(tipo: CatalogoTipo, item: CatalogoItem): FilaCatalogo {
    const detalle = tipo === 'productos'
      ? `${(item as ProductoProduccion).rendimientoEsperadoLPorKg} L/kg esperados`
      : tipo === 'operarios' ? 'Operario'
        : `Unidad: ${(item as InsumoProduccion | SubproductoProduccion).unidad}`;
    return { id: item.id, nombre: item.nombre, estado: item.estado, detalle,
      descripcion: tipo === 'productos' ? (item as ProductoProduccion).descripcion : null,
      original: item };
  }

  private esTipo(tipo: string | null): tipo is CatalogoTipo {
    return TIPOS.some(valor => valor === tipo);
  }

  private nombreTipo(tipo: CatalogoTipo): string {
    return ({ productos: 'Productos', insumos: 'Insumos',
      subproductos: 'Subproductos', operarios: 'Operarios' })[tipo];
  }

  private nombreSingular(tipo: CatalogoTipo): string {
    return ({ productos: 'Producto', insumos: 'Insumo',
      subproductos: 'Subproducto', operarios: 'Operario' })[tipo];
  }
}
