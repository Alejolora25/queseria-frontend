import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UsuariosApi } from './usuarios.api';
import { CrearUsuarioRequest, UsuarioAdmin, UsuariosPageResponse } from './usuarios.models';

describe('UsuariosApi', () => {
  let api: UsuariosApi;
  let httpTesting: HttpTestingController;
  const usuario: UsuarioAdmin = {
    id: 2, nombre: 'Operador', email: 'operador@queseria.local', activo: true,
    roles: ['OPERADOR'], queseriaId: null,
    creadoEn: '2026-07-20T10:00:00-05:00', actualizadoEn: '2026-07-20T10:00:00-05:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UsuariosApi, provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(UsuariosApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists users using filters and pagination', () => {
    const response: UsuariosPageResponse = { items: [usuario], total: 1, limit: 20, offset: 20 };
    let actual: UsuariosPageResponse | undefined;
    api.listar({ q: ' operador ', activo: true, limit: 20, offset: 20 }).subscribe(result => actual = result);

    const request = httpTesting.expectOne(req => req.url === '/api/v1/usuarios');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('operador');
    expect(request.request.params.get('activo')).toBe('true');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('offset')).toBe('20');
    request.flush(response);
    expect(actual).toEqual(response);
  });

  it('creates a user without expecting a password hash in the response', () => {
    const payload: CrearUsuarioRequest = { nombre: 'Operador', email: 'operador@queseria.local', password: 'Temporal123*', roles: ['OPERADOR'] };
    let actual: UsuarioAdmin | undefined;
    api.crear(payload).subscribe(result => actual = result);

    const request = httpTesting.expectOne('/api/v1/usuarios');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(usuario);
    expect(actual).toEqual(usuario);
    expect(actual && 'passwordHash' in actual).toBeFalse();
  });

  it('activates and deactivates users', () => {
    api.activar(2).subscribe();
    const activate = httpTesting.expectOne('/api/v1/usuarios/2/activar');
    expect(activate.request.method).toBe('PATCH'); activate.flush(usuario);

    api.desactivar(2).subscribe();
    const deactivate = httpTesting.expectOne('/api/v1/usuarios/2/desactivar');
    expect(deactivate.request.method).toBe('PATCH'); deactivate.flush({ ...usuario, activo: false });
  });

  it('updates exactly one selected role', () => {
    api.cambiarRol(2, 'LECTOR').subscribe();
    const request = httpTesting.expectOne('/api/v1/usuarios/2/roles');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ roles: ['LECTOR'] });
    request.flush({ ...usuario, roles: ['LECTOR'] });
  });
});
