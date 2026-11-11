import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { LoteProduccion } from '../../../../core/api/produccion.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { DetalleProduccionPageComponent } from './detalle-produccion-page';

function lote(estado: LoteProduccion['estado'] = 'EN_PROCESO'): LoteProduccion {
  return {
    id: 5, codigoLote: '20261025-001', fechaProduccion: '2026-10-25', estado,
    productoId: 2, productoNombre: 'Queso fresco', operarioId: 3, operarioNombre: 'Ana',
    rendimientoEsperadoLPorKg: 10, aportes: [{ queseriaId: 1, proveedorId: 4,
      proveedorNombre: 'Granja A', litros: 50, observacion: null }],
    insumos: [{ queseriaId: 1, insumoId: 8, insumoNombre: 'Cuajo', unidad: 'ML', cantidad: 2 }],
    subproductos: estado === 'FINALIZADA' ? [{ queseriaId: 1, subproductoId: 9,
      subproductoNombre: 'Suero', unidad: 'L', cantidad: 3 }] : [],
    resultado: { litrosTotales: 50, kgEsperados: 5,
      kgReales: estado === 'FINALIZADA' ? 4.5 : null,
      rendimientoRealLPorKg: estado === 'FINALIZADA' ? 11.111 : null,
      diferenciaKg: estado === 'FINALIZADA' ? -0.5 : null,
      diferenciaPorcentaje: estado === 'FINALIZADA' ? -10 : null,
      bloques: null, pesoPromedioBloqueKg: null },
    observaciones: 'Lote inicial', motivoPerdida: estado === 'PERDIDA_TOTAL' ? 'Derrame' : null,
    creadoPorUsuarioId: 1, actualizadoPorUsuarioId: 1, cerradoPorUsuarioId: null,
    fechaCreacion: '2026-10-25T08:00:00-05:00',
    fechaActualizacion: '2026-10-25T08:00:00-05:00', fechaCierre: null,
  };
}

describe('DetalleProduccionPageComponent', () => {
  let http: HttpTestingController;
  let rol: 'ADMIN' | 'OPERADOR' | 'LECTOR';
  beforeEach(() => {
    rol = 'ADMIN';
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'produccion/producciones/:id', component: DetalleProduccionPageComponent }]),
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { tieneRol: (valor: string) => valor === rol } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function abrirLote(estado: LoteProduccion['estado']) {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/produccion/producciones/5', DetalleProduccionPageComponent);
    http.expectOne('/api/v1/produccion/producciones/5').flush({ produccion: lote(estado), correcciones: [] });
    harness.detectChanges();
    return { page, harness };
  }

  it('finaliza una sola vez, valida bloques/peso y muestra cálculos guardados por el servidor', async () => {
    const { page, harness } = await abrirLote('EN_PROCESO');
    page.abrir('finalizar');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Kg reales');
    page.borrador()!.kgReales = '4,5';
    page.borrador()!.bloques = '4';
    page.guardar();
    expect(page.error()).toContain('juntos');
    http.expectNone('/api/v1/produccion/producciones/5/finalizar');
    page.borrador()!.pesoPromedio = '1,125';
    page.guardar();
    page.guardar();
    const req = http.expectOne('/api/v1/produccion/producciones/5/finalizar');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ kgReales: 4.5, bloques: 4,
      pesoPromedioBloqueKg: 1.125, subproductos: [], observaciones: 'Lote inicial' });
    req.flush(lote('FINALIZADA'));
    http.expectOne('/api/v1/produccion/producciones/5')
      .flush({ produccion: lote('FINALIZADA'), correcciones: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('11.1 L/kg');
    expect(page.accion()).toBeNull();
  });

  it('exige motivo para pérdida y conserva el formulario ante error del servidor', async () => {
    const { page } = await abrirLote('EN_PROCESO');
    page.abrir('perdida');
    page.guardar();
    expect(page.error()).toContain('motivo');
    http.expectNone('/api/v1/produccion/producciones/5/perdida-total');
    page.borrador()!.motivoPerdida = 'Derrame';
    page.guardar();
    http.expectOne('/api/v1/produccion/producciones/5/perdida-total').flush({
      error: 'conflict', message: 'El lote ya fue cerrado',
    }, { status: 409, statusText: 'Conflict' });
    expect(page.accion()).toBe('perdida');
    expect(page.borrador()?.motivoPerdida).toBe('Derrame');
    expect(page.error()).toContain('ya fue cerrado');
  });

  it('solo ADMIN ve la corrección finalizada y envía el estado completo con motivo', async () => {
    const { page, harness } = await abrirLote('FINALIZADA');
    expect(harness.routeNativeElement?.textContent).toContain('Corregir lote');
    page.abrir('corregirFinalizada');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Motivo administrativo');
    page.guardar();
    expect(page.error()).toContain('motivo');
    harness.detectChanges();
    const avisos = harness.routeNativeElement?.querySelectorAll('.app-alert-error');
    expect(avisos?.length).toBe(2);
    expect(avisos?.[1].textContent).toContain('motivo administrativo');
    page.borrador()!.motivoCorreccion = 'Peso corregido';
    page.borrador()!.kgReales = '4,750';
    page.guardar();
    const req = http.expectOne('/api/v1/produccion/producciones/5/corregir-finalizada');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      productoId: 2, operarioId: 3, rendimientoEsperadoLPorKg: 10, kgReales: 4.75,
      aportes: [{ proveedorId: 4, litros: 50, observacion: null }],
      insumos: [{ insumoId: 8, cantidad: 2 }],
      subproductos: [{ subproductoId: 9, cantidad: 3 }],
      motivoCorreccion: 'Peso corregido',
    }));
    expect(req.request.body.fechaProduccion).toBeUndefined();
    expect(req.request.body.queseriaId).toBeUndefined();
    req.flush(lote('FINALIZADA'));
    const corregido = lote('FINALIZADA');
    corregido.resultado.kgReales = 4.75;
    http.expectOne('/api/v1/produccion/producciones/5').flush({ produccion: corregido,
      correcciones: [{ id: 1, actorUsuarioId: 2, fecha: '2026-10-25T10:00:00Z',
        motivo: 'Peso corregido', antes: lote('FINALIZADA'), despues: corregido }] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Peso corregido');
    expect(harness.routeNativeElement?.textContent).toContain('Antes');
    expect(harness.routeNativeElement?.textContent).toContain('Después');
  });

  it('LECTOR solo consulta y OPERADOR no puede corregir una pérdida', async () => {
    rol = 'LECTOR';
    const { page, harness } = await abrirLote('PERDIDA_TOTAL');
    expect(harness.routeNativeElement?.textContent).toContain('Derrame');
    expect(harness.routeNativeElement?.textContent).not.toContain('Aclarar pérdida');
    page.abrir('corregirPerdida');
    expect(page.accion()).toBeNull();
    rol = 'OPERADOR';
    page.abrir('corregirPerdida');
    expect(page.accion()).toBeNull();
  });

  it('ADMIN aclara una pérdida sin enviar datos de producción ni cambiar su estado', async () => {
    const { page } = await abrirLote('PERDIDA_TOTAL');
    page.abrir('corregirPerdida');
    page.borrador()!.motivoCorreccion = 'Aclaración de causa';
    page.borrador()!.motivoPerdida = 'Derrame durante traslado';
    page.guardar();
    const req = http.expectOne('/api/v1/produccion/producciones/5/corregir-perdida');
    expect(req.request.body).toEqual({ motivoCorreccion: 'Aclaración de causa',
      motivoPerdida: 'Derrame durante traslado', observaciones: 'Lote inicial' });
    expect(req.request.body.kgReales).toBeUndefined();
    req.flush(lote('PERDIDA_TOTAL'));
    http.expectOne('/api/v1/produccion/producciones/5')
      .flush({ produccion: lote('PERDIDA_TOTAL'), correcciones: [] });
    expect(page.detalle()?.produccion.estado).toBe('PERDIDA_TOTAL');
  });

  it('rechaza subproductos duplicados antes de finalizar', async () => {
    const { page } = await abrirLote('EN_PROCESO');
    page.abrir('finalizar');
    page.borrador()!.kgReales = '5';
    page.agregar('subproducto');
    page.elegir('subproducto', 0);
    page.seleccionar({ id: 9, nombre: 'Suero', detalle: 'L' });
    page.agregar('subproducto');
    page.elegir('subproducto', 1);
    page.seleccionar({ id: 9, nombre: 'Suero', detalle: 'L' });
    expect(page.error()).toContain('ya está incluida');
    page.borrador()!.subproductos[0].cantidad = '3';
    page.guardar();
    http.expectNone('/api/v1/produccion/producciones/5/finalizar');
  });
});
