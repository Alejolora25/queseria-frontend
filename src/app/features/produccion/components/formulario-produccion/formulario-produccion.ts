import { KeyValuePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import {
  AbrirProduccionRequest, AporteRequest, EditarProduccionRequest, InsumoLoteRequest,
  LoteProduccion,
} from '../../../../core/api/produccion.models';
import { decimalPositivo, previsualizarProduccion } from '../produccion-calculos';
import {
  ReferenciaSeleccionada, ReferenciaTipo, SelectorReferenciaProduccionComponent,
} from '../selector-referencia/selector-referencia';

type DestinoSelector = { tipo: ReferenciaTipo; indice?: number } | null;

function cantidadValida(decimales: number, enteros: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    decimalPositivo(String(control.value ?? ''), decimales, enteros) === null
      ? { cantidadPositiva: true } : null;
}

function fechaHoyLocal(): string {
  const hoy = new Date();
  const fecha = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60_000);
  return fecha.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-formulario-produccion',
  standalone: true,
  imports: [KeyValuePipe, ReactiveFormsModule, RouterLink, SelectorReferenciaProduccionComponent],
  templateUrl: './formulario-produccion.html',
})
export class FormularioProduccionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProduccionApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) modo!: 'nuevo' | 'editar';

  readonly form = this.fb.group({
    productoId: this.fb.control<number | null>(null, Validators.required),
    fechaProduccion: this.fb.nonNullable.control(fechaHoyLocal(), Validators.required),
    operarioId: this.fb.control<number | null>(null, Validators.required),
    rendimiento: this.fb.nonNullable.control('', cantidadValida(4, 8)),
    observaciones: this.fb.nonNullable.control(''),
    aportes: this.fb.array([this.nuevoAporte()]),
    insumos: this.fb.array<ReturnType<FormularioProduccionComponent['nuevoInsumo']>>([]),
  });
  readonly valorForm = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly vista = computed(() => {
    this.valorForm();
    return previsualizarProduccion(
      this.aportes.controls.map(control => control.controls.litros.value),
      this.form.controls.rendimiento.value,
    );
  });
  readonly titulo = computed(() => this.modo === 'editar' ? 'Editar lote en proceso' : 'Abrir producción');
  readonly productoNombre = signal('');
  readonly operarioNombre = signal('');
  readonly selector = signal<DestinoSelector>(null);
  readonly error = signal<string | null>(null);
  readonly erroresValidacion = signal<string[] | null>(null);
  readonly camposError = signal<Record<string, string[]> | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly loteActual = signal<LoteProduccion | null>(null);
  readonly loteCreado = signal<LoteProduccion | null>(null);

  get aportes() { return this.form.controls.aportes; }
  get insumos() { return this.form.controls.insumos; }

  ngOnInit(): void {
    if (this.modo !== 'editar') return;
    this.form.controls.fechaProduccion.disable();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.error.set('El identificador del lote no es válido.');
      return;
    }
    this.cargando.set(true);
    this.api.consultar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: detalle => {
        this.cargando.set(false);
        if (detalle.produccion.estado !== 'EN_PROCESO') {
          this.error.set('Solo se pueden editar lotes en proceso.');
          return;
        }
        this.cargarLote(detalle.produccion);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(parseApiError(err).message);
      },
    });
  }

  agregarAporte(): void { this.aportes.push(this.nuevoAporte()); }
  quitarAporte(indice: number): void {
    if (this.aportes.length > 1) this.aportes.removeAt(indice);
  }
  agregarInsumo(): void { this.insumos.push(this.nuevoInsumo()); }
  quitarInsumo(indice: number): void { this.insumos.removeAt(indice); }

  abrirSelector(tipo: ReferenciaTipo, indice?: number): void {
    this.error.set(null);
    this.selector.set({ tipo, indice });
  }

  seleccionar(referencia: ReferenciaSeleccionada): void {
    const destino = this.selector();
    if (!destino) return;
    switch (destino.tipo) {
      case 'producto': {
        const anterior = this.form.controls.productoId.value;
        this.form.controls.productoId.setValue(referencia.id);
        this.productoNombre.set(referencia.nombre);
        if (anterior !== referencia.id && referencia.rendimientoEsperadoLPorKg !== undefined)
          this.form.controls.rendimiento.setValue(String(referencia.rendimientoEsperadoLPorKg));
        break;
      }
      case 'operario':
        this.form.controls.operarioId.setValue(referencia.id);
        this.operarioNombre.set(referencia.nombre);
        break;
      case 'proveedor': {
        const indice = destino.indice!;
        if (this.aportes.controls.some((c, i) => i !== indice && c.controls.proveedorId.value === referencia.id)) {
          this.error.set('Este proveedor ya está incluido en el lote. Modifica su línea existente.');
          this.selector.set(null);
          return;
        }
        this.aportes.at(indice).patchValue({ proveedorId: referencia.id, nombre: referencia.nombre });
        break;
      }
      case 'insumo': {
        const indice = destino.indice!;
        if (this.insumos.controls.some((c, i) => i !== indice && c.controls.insumoId.value === referencia.id)) {
          this.error.set('Este insumo ya está incluido en el lote. Modifica su línea existente.');
          this.selector.set(null);
          return;
        }
        this.insumos.at(indice).patchValue({ insumoId: referencia.id, nombre: referencia.nombre,
          unidad: referencia.unidad ?? '' });
        break;
      }
    }
    this.selector.set(null);
  }

  guardar(): void {
    if (this.guardando() || this.cargando() || this.loteCreado()) return;
    this.form.markAllAsTouched();
    this.error.set(null);
    this.camposError.set(null);
    this.aviso.set(null);
    if (this.form.invalid || this.aportes.length === 0) {
      this.error.set('Completa los campos obligatorios y corrige las cantidades antes de guardar.');
      this.erroresValidacion.set(this.detallarErrores());
      return;
    }
    const aportes = this.aportes.getRawValue();
    const insumos = this.insumos.getRawValue();
    if (new Set(aportes.map(a => a.proveedorId)).size !== aportes.length) {
      this.error.set('Cada proveedor debe aparecer una sola vez.');
      this.erroresValidacion.set([this.error()!]);
      return;
    }
    if (new Set(insumos.map(i => i.insumoId)).size !== insumos.length) {
      this.error.set('Cada insumo debe aparecer una sola vez.');
      this.erroresValidacion.set([this.error()!]);
      return;
    }
    const valor = this.form.getRawValue();
    const comun = {
      productoId: valor.productoId!, operarioId: valor.operarioId!,
      aportes: aportes.map(a => ({ proveedorId: a.proveedorId!,
        litros: this.numero(a.litros), observacion: a.observacion.trim() || null })) as AporteRequest[],
      insumos: insumos.map(i => ({ insumoId: i.insumoId!,
        cantidad: this.numero(i.cantidad) })) as InsumoLoteRequest[],
      rendimientoEsperadoLPorKg: this.numero(valor.rendimiento),
      observaciones: valor.observaciones.trim() || null,
    };
    this.guardando.set(true);
    const peticion = this.modo === 'editar'
      ? this.api.editar(this.loteActual()!.id, comun satisfies EditarProduccionRequest)
      : this.api.abrir({ ...comun, fechaProduccion: valor.fechaProduccion } satisfies AbrirProduccionRequest);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lote => {
        this.guardando.set(false);
        this.error.set(null);
        if (this.modo === 'nuevo') {
          this.loteCreado.set(lote);
          this.aviso.set(`Producción ${lote.codigoLote} abierta correctamente.`);
        } else {
          this.cargarLote(lote);
          this.aviso.set(`Lote ${lote.codigoLote} actualizado correctamente.`);
        }
      },
      error: err => {
        this.guardando.set(false);
        const parsed = parseApiError(err);
        this.error.set(parsed.message);
        this.camposError.set(parsed.fields ?? null);
      },
    });
  }

  private cargarLote(lote: LoteProduccion): void {
    this.loteActual.set(lote);
    this.productoNombre.set(lote.productoNombre);
    this.operarioNombre.set(lote.operarioNombre);
    this.aportes.clear();
    this.insumos.clear();
    lote.aportes.forEach(a => this.aportes.push(this.nuevoAporte({
      proveedorId: a.proveedorId, nombre: a.proveedorNombre,
      litros: String(a.litros), observacion: a.observacion ?? '',
    })));
    lote.insumos.forEach(i => this.insumos.push(this.nuevoInsumo({
      insumoId: i.insumoId, nombre: i.insumoNombre,
      unidad: i.unidad === 'L' ? 'L' : i.unidad.toLowerCase(),
      cantidad: String(i.cantidad),
    })));
    this.form.patchValue({ productoId: lote.productoId, operarioId: lote.operarioId,
      fechaProduccion: lote.fechaProduccion,
      rendimiento: String(lote.rendimientoEsperadoLPorKg),
      observaciones: lote.observaciones ?? '' });
  }

  private nuevoAporte(valor: { proveedorId?: number; nombre?: string;
    litros?: string; observacion?: string } = {}) {
    return this.fb.group({
      proveedorId: this.fb.control<number | null>(valor.proveedorId ?? null, Validators.required),
      nombre: this.fb.nonNullable.control(valor.nombre ?? ''),
      litros: this.fb.nonNullable.control(valor.litros ?? '', cantidadValida(3, 12)),
      observacion: this.fb.nonNullable.control(valor.observacion ?? ''),
    });
  }

  private nuevoInsumo(valor: { insumoId?: number; nombre?: string; unidad?: string;
    cantidad?: string } = {}) {
    return this.fb.group({
      insumoId: this.fb.control<number | null>(valor.insumoId ?? null, Validators.required),
      nombre: this.fb.nonNullable.control(valor.nombre ?? ''),
      unidad: this.fb.nonNullable.control(valor.unidad ?? ''),
      cantidad: this.fb.nonNullable.control(valor.cantidad ?? '', cantidadValida(3, 12)),
    });
  }

  private detallarErrores(): string[] {
    const errores: string[] = [];
    if (this.form.controls.productoId.invalid) errores.push('Selecciona un producto.');
    if (this.form.controls.operarioId.invalid) errores.push('Selecciona un operario.');
    if (this.form.controls.fechaProduccion.invalid) errores.push('Indica la fecha de producción.');
    if (this.form.controls.rendimiento.invalid)
      errores.push('Indica un rendimiento esperado positivo con hasta cuatro decimales.');
    this.aportes.controls.forEach((aporte, indice) => {
      if (aporte.controls.proveedorId.invalid)
        errores.push(`Proveedor ${indice + 1}: selecciona un proveedor.`);
      if (aporte.controls.litros.invalid)
        errores.push(`Proveedor ${indice + 1}: ingresa una cantidad de litros mayor que cero.`);
    });
    this.insumos.controls.forEach((insumo, indice) => {
      if (insumo.controls.insumoId.invalid)
        errores.push(`Insumo ${indice + 1}: selecciona un insumo.`);
      if (insumo.controls.cantidad.invalid)
        errores.push(`Insumo ${indice + 1}: ingresa una cantidad de ${insumo.controls.unidad.value || 'insumo'} mayor que cero.`);
    });
    return errores;
  }

  private numero(valor: string): number { return Number(valor.trim().replace(',', '.')); }
}
