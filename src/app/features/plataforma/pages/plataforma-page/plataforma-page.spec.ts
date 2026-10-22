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

  it('abre el detalle en un modal y permite continuar a regenerar credencial', () => {
    TestBed.configureTestingModule({
      imports: [PlataformaPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { usuarioActual: signal({ id: 1, nombre: 'Plataforma', email: 'admin@test.local' }), logout: jasmine.createSpy('logout') } },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } }],
    });
    const fixture = TestBed.createComponent(PlataformaPageComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/v1/platform/queserias').flush({ items: [{
      id: 7, nombre: 'Quesería B', estado: 'ACTIVA', razonSocial: 'Quesos B',
      nit: null, direccion: null, ciudad: 'Pasto', departamento: 'Nariño',
      fechaCreacion: '2026-10-18T10:00:00Z', fechaActualizacion: '2026-10-18T10:00:00Z',
    }], page: 0, size: 20, total: 1 });
    fixture.detectChanges();

    const ver = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Ver');
    expect(ver).toBeDefined();
    ver!.click();
    http.expectOne('/api/v1/platform/queserias/7/administradores').flush([{
      usuarioId: 11, nombre: 'Administradora B', email: 'adminb@queseria.test', activo: true,
    }]);
    fixture.detectChanges();

    const modal = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Detalle de quesería"]');
    expect(modal?.textContent).toContain('Quesería B');
    expect(modal?.textContent).toContain('Administradora B');
    expect((fixture.nativeElement as HTMLElement).querySelector('.platform-main .details')).toBeNull();

    const regenerar = [...modal!.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Regenerar credencial');
    regenerar!.click();
    expect(fixture.componentInstance.dialogo()).toBe('regenerar-credencial');
    fixture.componentInstance.cerrarDialogo();
    expect(fixture.componentInstance.dialogo()).toBe('ver-queseria');
    http.verify();
  });

  it('presenta queserías y administradores en tarjetas con acciones para móvil', () => {
    TestBed.configureTestingModule({
      imports: [PlataformaPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { usuarioActual: signal({ id: 1, nombre: 'Plataforma', email: 'admin@test.local' }), logout: jasmine.createSpy('logout') } },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } }],
    });
    const fixture = TestBed.createComponent(PlataformaPageComponent);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/v1/platform/queserias').flush({ items: [{
      id: 7, nombre: 'Quesería B', estado: 'ACTIVA', razonSocial: null,
      nit: null, direccion: null, ciudad: null, departamento: null,
      fechaCreacion: '2026-10-18T10:00:00Z', fechaActualizacion: '2026-10-18T10:00:00Z',
    }], page: 0, size: 20, total: 1 });
    fixture.detectChanges();
    const queseriaCard = (fixture.nativeElement as HTMLElement).querySelector('.platform-mobile-card');
    expect(queseriaCard?.textContent).toContain('Quesería B');
    expect([...queseriaCard!.querySelectorAll('button')].map(button => button.textContent?.trim()))
      .toEqual(['Ver', 'Editar', 'Desactivar']);

    page.irA('administradores');
    http.expectOne('/api/v1/platform/administradores').flush([
      { id: 1, nombre: 'Plataforma', email: 'admin@test.local', activo: true, creadoEn: '2026-10-18T10:00:00Z' },
      { id: 2, nombre: 'Otro administrador', email: 'otro@test.local', activo: true, creadoEn: '2026-10-18T10:00:00Z' },
    ]);
    fixture.detectChanges();
    const adminCards = (fixture.nativeElement as HTMLElement).querySelectorAll('.platform-mobile-card');
    expect(adminCards.length).toBe(2);
    expect(adminCards[0].querySelector('button')?.hasAttribute('disabled')).toBeTrue();
    expect(adminCards[1].querySelector('button')?.hasAttribute('disabled')).toBeFalse();
    (adminCards[1].querySelector('button') as HTMLButtonElement).click();
    expect(page.dialogo()).toBe('regenerar-admin-plataforma');
    page.motivoForm.patchValue({ motivo: 'Recuperación solicitada por otro administrador' });
    page.regenerarCredencialAdministrador();
    const solicitud = http.expectOne('/api/v1/platform/administradores/2/regenerar-credencial');
    expect(solicitud.request.body).toEqual({ motivo: 'Recuperación solicitada por otro administrador' });
    solicitud.flush({ email: 'otro@test.local', passwordTemporal: 'solo-una-vez',
      credencialTemporalExpiraEn: '2026-10-28T10:00:00Z' });
    expect(page.credencial()?.passwordTemporal).toBe('solo-una-vez');
    page.cerrarCredencial();
    expect(page.credencial()).toBeNull();
    http.verify();
  });
});
