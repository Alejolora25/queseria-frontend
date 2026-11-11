import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { parseApiError } from '../../../../core/api/api-error';
import { ProduccionApi } from '../../../../core/api/produccion.api';
import {
  CorregirFinalizadaRequest, DetalleProduccion, FinalizarProduccionRequest,
  InstantaneaProduccion, LoteProduccion, SubproductoLoteRequest,
} from '../../../../core/api/produccion.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { decimalPositivo } from '../../components/produccion-calculos';
import {
  ReferenciaSeleccionada, ReferenciaTipo, SelectorReferenciaProduccionComponent,
} from '../../components/selector-referencia/selector-referencia';

type Accion = 'finalizar' | 'perdida' | 'corregirFinalizada' | 'corregirPerdida';
type Linea = { id: number | null; nombre: string; cantidad: string; observacion: string };
type DestinoSelector = { tipo: ReferenciaTipo; indice?: number } | null;

interface Borrador {
  productoId: number;
  productoNombre: string;
  operarioId: number;
  operarioNombre: string;
  aportes: Linea[];
  insumos: Linea[];
  subproductos: Linea[];
  rendimiento: string;
  kgReales: string;
  bloques: string;
  pesoPromedio: string;
  observaciones: string;
  motivoPerdida: string;
  motivoCorreccion: string;
}

@Component({
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, SelectorReferenciaProduccionComponent],
  templateUrl: './detalle-produccion-page.html',
})
export class DetalleProduccionPageComponent implements OnInit {
  private readonly api = inject(ProduccionApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private id = 0;

  readonly detalle = signal<DetalleProduccion | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly accion = signal<Accion | null>(null);
  readonly borrador = signal<Borrador | null>(null);
  readonly selector = signal<DestinoSelector>(null);
  readonly esAdmin = () => this.auth.tieneRol('ADMIN');
  readonly puedeOperar = () => this.auth.tieneRol('ADMIN') || this.auth.tieneRol('OPERADOR');

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.error.set('El identificador del lote no es válido.');
      return;
    }
    this.cargar();
  }

  cargar(): void {
    if (!this.id || this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    this.api.consultar(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: detalle => { this.detalle.set(detalle); this.cargando.set(false); },
      error: err => { this.error.set(parseApiError(err).message); this.cargando.set(false); },
    });
  }

  abrir(accion: Accion): void {
    const lote = this.detalle()?.produccion;
    if (!lote || this.guardando() || this.cargando() ||
        (accion === 'finalizar' || accion === 'perdida') &&
          (lote.estado !== 'EN_PROCESO' || !this.puedeOperar()) ||
        accion === 'corregirFinalizada' && (lote.estado !== 'FINALIZADA' || !this.esAdmin()) ||
        accion === 'corregirPerdida' && (lote.estado !== 'PERDIDA_TOTAL' || !this.esAdmin())) return;
    this.error.set(null);
    this.aviso.set(null);
    this.borrador.set(this.desdeLote(lote));
    this.accion.set(accion);
  }

  cerrar(): void {
    if (this.guardando()) return;
    this.accion.set(null);
    this.borrador.set(null);
    this.selector.set(null);
    this.error.set(null);
  }

  tituloAccion(accion: Accion): string {
    return ({ finalizar: 'Finalizar lote', perdida: 'Registrar pérdida total',
      corregirFinalizada: 'Corregir lote finalizado',
      corregirPerdida: 'Aclarar pérdida total' })[accion];
  }

  agregar(tipo: 'aporte' | 'insumo' | 'subproducto'): void {
    this.lineas(tipo).push({ id: null, nombre: '', cantidad: '', observacion: '' });
  }

  quitar(tipo: 'aporte' | 'insumo' | 'subproducto', indice: number): void {
    const lineas = this.lineas(tipo);
    if (tipo !== 'aporte' || lineas.length > 1) lineas.splice(indice, 1);
  }

  elegir(tipo: ReferenciaTipo, indice?: number): void {
    this.error.set(null);
    this.selector.set({ tipo, indice });
  }

  seleccionar(ref: ReferenciaSeleccionada): void {
    const destino = this.selector();
    const d = this.borrador();
    if (!destino || !d) return;
    if (destino.tipo === 'producto') {
      d.productoId = ref.id;
      d.productoNombre = ref.nombre;
    } else if (destino.tipo === 'operario') {
      d.operarioId = ref.id;
      d.operarioNombre = ref.nombre;
    } else {
      const tipo = destino.tipo === 'proveedor' ? 'aporte' : destino.tipo;
      const lineas = this.lineas(tipo);
      if (lineas.some((linea, i) => i !== destino.indice && linea.id === ref.id)) {
        this.error.set('Esta referencia ya está incluida. Modifica su línea existente.');
        this.selector.set(null);
        return;
      }
      const linea = lineas[destino.indice!];
      if (linea) { linea.id = ref.id; linea.nombre = ref.nombre; }
    }
    this.selector.set(null);
  }

  guardar(): void {
    if (this.guardando() || !this.detalle() || !this.borrador() || !this.accion()) return;
    const d = this.borrador()!;
    const accion = this.accion()!;
    const validacion = this.validar(accion, d);
    if (validacion) { this.error.set(validacion); return; }
    this.error.set(null);
    const bloques = d.bloques.trim() ? Number(d.bloques) : null;
    const pesoPromedioBloqueKg = d.pesoPromedio.trim() ? this.numero(d.pesoPromedio) : null;
    const subproductos: SubproductoLoteRequest[] = d.subproductos.map(s => ({
      subproductoId: s.id!, cantidad: this.numero(s.cantidad),
    }));
    const observaciones = d.observaciones.trim() || null;
    let peticion;
    switch (accion) {
      case 'finalizar': {
        const datos: FinalizarProduccionRequest = { kgReales: this.numero(d.kgReales),
          bloques, pesoPromedioBloqueKg, subproductos, observaciones };
        peticion = this.api.finalizar(this.id, datos);
        break;
      }
      case 'perdida':
        peticion = this.api.registrarPerdidaTotal(this.id, {
          motivo: d.motivoPerdida.trim(), observaciones });
        break;
      case 'corregirPerdida':
        peticion = this.api.corregirPerdida(this.id, {
          motivoCorreccion: d.motivoCorreccion.trim(),
          motivoPerdida: d.motivoPerdida.trim(), observaciones });
        break;
      case 'corregirFinalizada': {
        const datos: CorregirFinalizadaRequest = {
          productoId: d.productoId, operarioId: d.operarioId,
          aportes: d.aportes.map(a => ({ proveedorId: a.id!, litros: this.numero(a.cantidad),
            observacion: a.observacion.trim() || null })),
          insumos: d.insumos.map(i => ({ insumoId: i.id!, cantidad: this.numero(i.cantidad) })),
          subproductos, rendimientoEsperadoLPorKg: this.numero(d.rendimiento),
          kgReales: this.numero(d.kgReales), bloques, pesoPromedioBloqueKg,
          observaciones, motivoCorreccion: d.motivoCorreccion.trim(),
        };
        peticion = this.api.corregirFinalizada(this.id, datos);
      }
    }
    this.guardando.set(true);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrar();
        this.aviso.set('El lote se actualizó correctamente. Los resultados mostrados proceden del servidor.');
        this.cargar();
      },
      error: err => {
        this.error.set(parseApiError(err).message);
        this.guardando.set(false);
      },
    });
  }

  private validar(accion: Accion, d: Borrador): string | null {
    if (accion === 'perdida' || accion === 'corregirPerdida') {
      if (!d.motivoPerdida.trim()) return 'Escribe el motivo de la pérdida total.';
    }
    if (accion.startsWith('corregir') && !d.motivoCorreccion.trim())
      return 'Escribe el motivo administrativo de la corrección.';
    if (accion === 'finalizar' || accion === 'corregirFinalizada') {
      if (decimalPositivo(d.kgReales, 3, 12) === null)
        return 'Los kilogramos reales deben ser positivos, con hasta tres decimales.';
      const hayBloques = !!d.bloques.trim();
      const hayPeso = !!d.pesoPromedio.trim();
      if (hayBloques !== hayPeso) return 'Indica juntos el número de bloques y su peso promedio, o deja ambos vacíos.';
      if (hayBloques && (!/^[1-9]\d*$/.test(d.bloques.trim()) ||
          !Number.isSafeInteger(Number(d.bloques.trim())) || Number(d.bloques.trim()) > 2147483647 ||
          decimalPositivo(d.pesoPromedio, 3, 12) === null))
        return 'Indica bloques enteros positivos y un peso promedio positivo con hasta tres decimales.';
      const errorSubproductos = this.validarLineas(d.subproductos, 'subproducto');
      if (errorSubproductos) return errorSubproductos;
    }
    if (accion === 'corregirFinalizada') {
      if (!d.productoId || !d.operarioId || decimalPositivo(d.rendimiento, 4, 8) === null)
        return 'Elige producto y operario, e indica un rendimiento esperado positivo.';
      if (d.aportes.length === 0) return 'El lote debe conservar al menos un proveedor.';
      return this.validarLineas(d.aportes, 'proveedor') ||
        this.validarLineas(d.insumos, 'insumo');
    }
    return null;
  }

  private validarLineas(lineas: Linea[], etiqueta: string): string | null {
    if (lineas.some(l => !l.id || decimalPositivo(l.cantidad, 3, 12) === null))
      return `Selecciona cada ${etiqueta} e indica una cantidad positiva con hasta tres decimales.`;
    if (new Set(lineas.map(l => l.id)).size !== lineas.length)
      return `Cada ${etiqueta} debe aparecer una sola vez.`;
    return null;
  }

  private lineas(tipo: 'aporte' | 'insumo' | 'subproducto'): Linea[] {
    const d = this.borrador()!;
    return tipo === 'aporte' ? d.aportes : tipo === 'insumo' ? d.insumos : d.subproductos;
  }

  private desdeLote(lote: LoteProduccion): Borrador {
    return {
      productoId: lote.productoId, productoNombre: lote.productoNombre,
      operarioId: lote.operarioId, operarioNombre: lote.operarioNombre,
      aportes: lote.aportes.map(a => ({ id: a.proveedorId, nombre: a.proveedorNombre,
        cantidad: String(a.litros), observacion: a.observacion ?? '' })),
      insumos: lote.insumos.map(i => ({ id: i.insumoId, nombre: i.insumoNombre,
        cantidad: String(i.cantidad), observacion: '' })),
      subproductos: lote.subproductos.map(s => ({ id: s.subproductoId,
        nombre: s.subproductoNombre, cantidad: String(s.cantidad), observacion: '' })),
      rendimiento: String(lote.rendimientoEsperadoLPorKg),
      kgReales: lote.resultado.kgReales === null ? '' : String(lote.resultado.kgReales),
      bloques: lote.resultado.bloques === null ? '' : String(lote.resultado.bloques),
      pesoPromedio: lote.resultado.pesoPromedioBloqueKg === null ? '' :
        String(lote.resultado.pesoPromedioBloqueKg),
      observaciones: lote.observaciones ?? '', motivoPerdida: lote.motivoPerdida ?? '',
      motivoCorreccion: '',
    };
  }

  numero(valor: string): number { return Number(valor.trim().replace(',', '.')); }

  resumenLineas(s: InstantaneaProduccion, tipo: 'aportes' | 'insumos' | 'subproductos'): string {
    if (tipo === 'aportes') return s.aportes.map(a => `${a.proveedorNombre}: ${a.litros} L`).join('; ') || 'Ninguno';
    if (tipo === 'insumos') return s.insumos.map(i => `${i.insumoNombre}: ${i.cantidad} ${i.unidad}`).join('; ') || 'Ninguno';
    return s.subproductos.map(i => `${i.subproductoNombre}: ${i.cantidad} ${i.unidad}`).join('; ') || 'Ninguno';
  }
}
