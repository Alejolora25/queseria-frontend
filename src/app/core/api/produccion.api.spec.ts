import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ProduccionApi } from './produccion.api';

describe('ProduccionApi', () => {
  let api: ProduccionApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ProduccionApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('filtra lotes mediante los parámetros del servidor sin enviar queseriaId', () => {
    api.listar({ desde: '2026-10-01', estado: 'FINALIZADA', proveedorId: 12, page: 2 }).subscribe();
    const req = http.expectOne('/api/v1/produccion/producciones?'+
      'page=2&size=20&desde=2026-10-01&estado=FINALIZADA&proveedorId=12');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('queseriaId')).toBeFalse();
    req.flush({ items: [], page: 2, size: 20, total: 0 });
  });

  it('abre un lote sin referencia de quesería enviada por el cliente', () => {
    const datos = { productoId: 2, fechaProduccion: '2026-10-25', operarioId: 3,
      aportes: [{ proveedorId: 4, litros: 50 }] };
    api.abrir(datos).subscribe();
    const req = http.expectOne('/api/v1/produccion/producciones');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    expect(req.request.body['queseriaId']).toBeUndefined();
    req.flush({});
  });

  it('consulta el resumen operativo', () => {
    api.resumen({ desde: '2026-10-01', hasta: '2026-10-31' }).subscribe();
    const req = http.expectOne('/api/v1/produccion/resumen?desde=2026-10-01&hasta=2026-10-31');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
