import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LotesProduccionPageComponent } from './lotes-produccion-page';

describe('LotesProduccionPageComponent', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LotesProduccionPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía todos los filtros al servidor y los conserva al paginar', () => {
    const fixture = TestBed.createComponent(LotesProduccionPageComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url === '/api/v1/produccion/producciones')
      .flush({ items: [], page: 0, size: 10, total: 0 });
    const page = fixture.componentInstance;
    page.desde = '2026-10-01';
    page.hasta = '2026-10-31';
    page.estado = 'FINALIZADA';
    page.codigo = '20261025-001';
    page.selector.set('producto');
    page.elegir({ id: 2, nombre: 'Queso', detalle: '' });
    page.selector.set('proveedor');
    page.elegir({ id: 4, nombre: 'Granja', detalle: '' });
    page.selector.set('operario');
    page.elegir({ id: 3, nombre: 'Ana', detalle: '' });
    page.buscar();
    const primera = http.expectOne(r => r.url === '/api/v1/produccion/producciones');
    expect(primera.request.params.keys().sort()).toEqual([
      'codigoLote', 'desde', 'estado', 'hasta', 'operarioId', 'page', 'productoId',
      'proveedorId', 'size',
    ].sort());
    expect(primera.request.params.get('desde')).toBe('2026-10-01');
    expect(primera.request.params.get('productoId')).toBe('2');
    expect(primera.request.params.get('proveedorId')).toBe('4');
    expect(primera.request.params.get('operarioId')).toBe('3');
    expect(primera.request.params.has('queseriaId')).toBeFalse();
    primera.flush({ items: [{ id: 5, codigoLote: '20261025-001', fechaProduccion: '2026-10-25',
      estado: 'FINALIZADA', productoNombre: 'Queso', operarioNombre: 'Ana',
      litrosTotales: 50, kgEsperados: 5, kgReales: 4.5 }], page: 0, size: 10, total: 12 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/produccion/producciones/5"]'))
      .not.toBeNull();
    page.codigo = 'sin aplicar';
    page.cargar(1);
    const segunda = http.expectOne(r => r.url === '/api/v1/produccion/producciones');
    expect(segunda.request.params.get('page')).toBe('1');
    expect(segunda.request.params.get('codigoLote')).toBe('20261025-001');
    segunda.flush({ items: [], page: 1, size: 10, total: 12 });
  });

  it('rechaza un rango invertido sin llamar a la API', () => {
    const fixture = TestBed.createComponent(LotesProduccionPageComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url === '/api/v1/produccion/producciones')
      .flush({ items: [], page: 0, size: 10, total: 0 });
    const page = fixture.componentInstance;
    page.desde = '2026-11-01';
    page.hasta = '2026-10-01';
    page.buscar();
    expect(page.error()).toContain('fecha inicial');
    http.expectNone(r => r.url === '/api/v1/produccion/producciones');
  });
});
