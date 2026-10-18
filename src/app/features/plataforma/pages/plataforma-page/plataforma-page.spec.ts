import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { PlataformaPageComponent } from './plataforma-page';

describe('PlataformaPageComponent', () => {
  it('muestra la contraseña temporal solo hasta cerrar el aviso inicial', () => {
    TestBed.configureTestingModule({
      imports: [PlataformaPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { usuarioActual: signal({ id: 1, nombre: 'Plataforma', email: 'admin@test.local' }), logout: jasmine.createSpy('logout') } },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } }],
    });
    const fixture = TestBed.createComponent(PlataformaPageComponent);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/v1/platform/queserias').flush({ items: [], page: 0, size: 20, total: 0 });

    page.nuevaQueseria();
    page.queseriaForm.patchValue({ nombre: 'Quesería B', nombreAdministrador: 'Ana', emailAdministrador: 'ana@ejemplo.test' });
    page.guardarQueseria();
    const alta = http.expectOne('/api/v1/platform/queserias');
    expect(alta.request.body).toEqual(jasmine.objectContaining({ nombre: 'Quesería B', nombreAdministrador: 'Ana' }));
    alta.flush({ queseria: { id: 2, nombre: 'Quesería B', estado: 'ACTIVA' }, administradorId: 8,
      administradorEmail: 'ana@ejemplo.test', passwordTemporal: 'valor-solo-una-vez',
      credencialTemporalExpiraEn: '2026-10-25T10:00:00Z' });
    http.expectOne(req => req.url === '/api/v1/platform/queserias').flush({ items: [], page: 0, size: 20, total: 0 });

    expect(page.credencial()?.passwordTemporal).toBe('valor-solo-una-vez');
    page.cerrarCredencial();
    expect(page.credencial()).toBeNull();
    http.verify();
  });
});
