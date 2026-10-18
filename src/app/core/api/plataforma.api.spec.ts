import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PlataformaApi } from './plataforma.api';

describe('PlataformaApi', () => {
  let api: PlataformaApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PlataformaApi, provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PlataformaApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('filtra y pagina queserías mediante la API de plataforma', () => {
    api.listarQueserias({ q: ' Prueba ', estado: 'ACTIVA', page: 1, size: 20 }).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/platform/queserias');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('Prueba');
    expect(req.request.params.get('estado')).toBe('ACTIVA');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [], page: 1, size: 20, total: 0 });
  });

  it('consulta administradores dentro de la quesería elegida', () => {
    api.listarAdministradoresQueseria(8).subscribe();
    const req = http.expectOne('/api/v1/platform/queserias/8/administradores');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('exige enviar el motivo al desactivar y al regenerar una credencial', () => {
    api.desactivarQueseria(8, 'Prueba local').subscribe();
    const desactivar = http.expectOne('/api/v1/platform/queserias/8/desactivar');
    expect(desactivar.request.method).toBe('PATCH');
    expect(desactivar.request.body).toEqual({ motivo: 'Prueba local' });
    desactivar.flush({});

    api.regenerarCredencial(8, 12, 'Recuperación solicitada').subscribe();
    const regenerar = http.expectOne('/api/v1/platform/queserias/8/administradores/12/regenerar-credencial');
    expect(regenerar.request.method).toBe('POST');
    expect(regenerar.request.body).toEqual({ motivo: 'Recuperación solicitada' });
    regenerar.flush({});
  });
});
