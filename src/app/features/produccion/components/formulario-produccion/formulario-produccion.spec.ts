import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { LoteProduccion } from '../../../../core/api/produccion.models';
import { EditarProduccionPageComponent } from '../../pages/editar-produccion-page/editar-produccion-page';
import { NuevaProduccionPageComponent } from '../../pages/nueva-produccion-page/nueva-produccion-page';
import { FormularioProduccionComponent } from './formulario-produccion';

function lote(): LoteProduccion {
  return {
    id: 5, codigoLote: '20261025-001', fechaProduccion: '2026-10-25', estado: 'EN_PROCESO',
    productoId: 2, productoNombre: 'Queso fresco', operarioId: 3, operarioNombre: 'Ana',
    rendimientoEsperadoLPorKg: 10, aportes: [{ queseriaId: 1, proveedorId: 4,
      proveedorNombre: 'Granja A', litros: 50, observacion: null }],
    insumos: [], subproductos: [],
    resultado: { litrosTotales: 50, kgEsperados: 5, kgReales: null,
      rendimientoRealLPorKg: null, diferenciaKg: null, diferenciaPorcentaje: null,
      bloques: null, pesoPromedioBloqueKg: null },
    observaciones: null, motivoPerdida: null,
    creadoPorUsuarioId: 1, actualizadoPorUsuarioId: 1, cerradoPorUsuarioId: null,
    fechaCreacion: '2026-10-25T08:00:00-05:00',
    fechaActualizacion: '2026-10-25T08:00:00-05:00', fechaCierre: null,
  };
}

describe('FormularioProduccionComponent', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: 'produccion/nueva', component: NuevaProduccionPageComponent },
        { path: 'produccion/producciones/:id/editar', component: EditarProduccionPageComponent },
      ]), provideHttpClient(), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('abre un lote multiproveedor sin insumos y muestra la respuesta guardada', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/produccion/nueva', NuevaProduccionPageComponent);
    const formulario = harness.routeDebugElement!.query(By.directive(FormularioProduccionComponent))
      .componentInstance as FormularioProduccionComponent;
    formulario.abrirSelector('producto');
    formulario.seleccionar({ id: 2, nombre: 'Queso fresco', detalle: '',
      rendimientoEsperadoLPorKg: 10 });
    formulario.abrirSelector('operario');
    formulario.seleccionar({ id: 3, nombre: 'Ana', detalle: '' });
    formulario.abrirSelector('proveedor', 0);
    formulario.seleccionar({ id: 4, nombre: 'Granja A', detalle: '' });
    formulario.aportes.at(0).controls.litros.setValue('20,125');
    formulario.agregarAporte();
    formulario.abrirSelector('proveedor', 1);
    formulario.seleccionar({ id: 6, nombre: 'Granja B', detalle: '' });
    formulario.aportes.at(1).controls.litros.setValue('30,375');
    harness.detectChanges();
    expect(formulario.vista()).toEqual({ litrosTotales: '50,5', kgEsperados: '5,05' });

    formulario.guardar();
    const req = http.expectOne('/api/v1/produccion/producciones');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.aportes).toEqual([
      { proveedorId: 4, litros: 20.125, observacion: null },
      { proveedorId: 6, litros: 30.375, observacion: null },
    ]);
    expect(req.request.body.insumos).toEqual([]);
    expect(req.request.body['queseriaId']).toBeUndefined();
    const guardado = lote();
    req.flush({ ...guardado,
      resultado: { ...guardado.resultado, litrosTotales: 50.5, kgEsperados: 5.05 } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Lote 20261025-001');
    expect(harness.routeNativeElement?.textContent).toContain('50.5 L');
    expect(harness.routeNativeElement?.textContent).toContain('5.05 kg');
  });

  it('edita un lote existente conservando fecha, proveedor e insumo históricos', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/produccion/producciones/5/editar', EditarProduccionPageComponent);
    const formulario = harness.routeDebugElement!.query(By.directive(FormularioProduccionComponent))
      .componentInstance as FormularioProduccionComponent;
    const anterior = lote();
    anterior.insumos.push({ queseriaId: 1, insumoId: 8, insumoNombre: 'Cuajo',
      unidad: 'ML', cantidad: 2 });
    http.expectOne('/api/v1/produccion/producciones/5')
      .flush({ produccion: anterior, correcciones: [] });
    harness.detectChanges();
    expect(formulario.aportes.length).toBe(1);
    expect(formulario.insumos.length).toBe(1);
    formulario.aportes.at(0).controls.litros.setValue('55');
    formulario.guardar();
    const req = http.expectOne('/api/v1/produccion/producciones/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.aportes[0].proveedorId).toBe(4);
    expect(req.request.body.insumos[0].insumoId).toBe(8);
    expect(req.request.body['fechaProduccion']).toBeUndefined();
    expect(req.request.body['codigoLote']).toBeUndefined();
    expect(req.request.body['queseriaId']).toBeUndefined();
    const avisosAngular = spyOn(console, 'warn').and.callThrough();
    req.flush({ ...anterior, aportes: [{ ...anterior.aportes[0], litros: 55 }],
      resultado: { ...anterior.resultado, litrosTotales: 55, kgEsperados: 5.5 } });
    harness.detectChanges();
    expect(avisosAngular.calls.allArgs().flat().join(' ')).not.toContain('NG0956');
  });

  it('impide duplicar proveedores y no envía una apertura inválida', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/produccion/nueva', NuevaProduccionPageComponent);
    const formulario = harness.routeDebugElement!.query(By.directive(FormularioProduccionComponent))
      .componentInstance as FormularioProduccionComponent;
    formulario.abrirSelector('proveedor', 0);
    formulario.seleccionar({ id: 4, nombre: 'Granja A', detalle: '' });
    formulario.agregarAporte();
    formulario.abrirSelector('proveedor', 1);
    formulario.seleccionar({ id: 4, nombre: 'Granja A', detalle: '' });
    expect(formulario.error()).toContain('ya está incluido');
    formulario.guardar();
    http.expectNone('/api/v1/produccion/producciones');
  });

  it('explica junto al botón lo que falta y muestra la unidad del insumo elegido', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/produccion/nueva', NuevaProduccionPageComponent);
    const formulario = harness.routeDebugElement!.query(By.directive(FormularioProduccionComponent))
      .componentInstance as FormularioProduccionComponent;
    formulario.abrirSelector('producto');
    formulario.seleccionar({ id: 2, nombre: 'Queso', detalle: '',
      rendimientoEsperadoLPorKg: 10 });
    formulario.abrirSelector('proveedor', 0);
    formulario.seleccionar({ id: 4, nombre: 'Granja A', detalle: '' });
    formulario.aportes.at(0).controls.litros.setValue('50');
    formulario.agregarInsumo();
    formulario.abrirSelector('insumo', 0);
    formulario.seleccionar({ id: 8, nombre: 'Sal', detalle: 'Unidad: g', unidad: 'g' });
    formulario.insumos.at(0).controls.cantidad.setValue('100');
    formulario.guardar();
    harness.detectChanges();
    const aviso = document.querySelector('[role="alertdialog"]');
    expect(aviso?.textContent).toContain('Selecciona un operario.');
    expect(harness.routeNativeElement?.textContent).toContain('Sal');
    expect(harness.routeNativeElement?.textContent).toContain('Cantidad utilizada (g)');
    http.expectNone('/api/v1/produccion/producciones');
    formulario.erroresValidacion.set(null);
    harness.detectChanges();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('conserva el formulario y explica un rechazo del backend', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/produccion/nueva', NuevaProduccionPageComponent);
    const formulario = harness.routeDebugElement!.query(By.directive(FormularioProduccionComponent))
      .componentInstance as FormularioProduccionComponent;
    formulario.abrirSelector('producto');
    formulario.seleccionar({ id: 2, nombre: 'Queso', detalle: '', rendimientoEsperadoLPorKg: 10 });
    formulario.abrirSelector('operario');
    formulario.seleccionar({ id: 3, nombre: 'Ana', detalle: '' });
    formulario.abrirSelector('proveedor', 0);
    formulario.seleccionar({ id: 4, nombre: 'Granja A', detalle: '' });
    formulario.aportes.at(0).controls.litros.setValue('50');
    formulario.guardar();
    http.expectOne('/api/v1/produccion/producciones').flush({
      error: 'conflict', message: 'El proveedor está inactivo',
    }, { status: 409, statusText: 'Conflict' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('El proveedor está inactivo');
    expect(formulario.loteCreado()).toBeNull();
    expect(formulario.form.controls.productoId.value).toBe(2);
  });
});
