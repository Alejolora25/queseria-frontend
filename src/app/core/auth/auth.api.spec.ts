import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthApi } from './auth.api';
import { LoginRequest, LoginResponse } from './auth.models';

describe('AuthApi', () => {
  let api: AuthApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthApi, provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(AuthApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should post credentials to the login endpoint', () => {
    const request: LoginRequest = {
      email: 'admin@queseria.local',
      password: 'Admin123*',
    };
    const response: LoginResponse = {
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario: {
        id: 1,
        nombre: 'Administrador',
        email: 'admin@queseria.local',
        roles: ['ADMIN'],
        queseriaId: null,
      },
    };

    let actual: LoginResponse | undefined;
    api.login(request).subscribe((result) => (actual = result));

    const httpRequest = httpTesting.expectOne('/api/v1/auth/login');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(response);

    expect(actual).toEqual(response);
    expect(actual?.usuario.nombre).toBe('Administrador');
  });
});
