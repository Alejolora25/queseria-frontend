import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';
import { RolUsuario } from './core/auth/auth.models';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  let roles: RolUsuario[];
  let logoutSpy: jasmine.Spy<() => void>;

  beforeEach(async () => {
    roles = ['ADMIN'];
    logoutSpy = jasmine.createSpy('logout');

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: {
            tieneRol: (role: RolUsuario) => roles.includes(role),
            usuarioActual: signal({
              id: 1,
              nombre: 'Administrador',
              email: 'admin@queseria.local',
              roles: ['ADMIN'],
              queseriaId: null,
            }),
            logout: logoutSpy,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the administration and sample links to ADMIN', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a[href="/admin/usuarios"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/calidad/cargar"]')).not.toBeNull();
  });

  it('should hide restricted navigation from LECTOR', () => {
    roles = ['LECTOR'];
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a[href="/admin/usuarios"]')).toBeNull();
    expect(compiled.querySelector('a[href="/calidad/cargar"]')).toBeNull();
    expect(compiled.querySelector('a[href="/proveedores"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/calidad/historico"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/calidad/resumen"]')).not.toBeNull();
  });

  it('should display the current user and their role', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Administrador');
    expect(text).toContain('admin@queseria.local');
    expect(text).toContain('Cerrar sesión');
  });

  it('should clear the session and replace navigation when logging out', () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[aria-label="Cerrar sesión"]') as HTMLButtonElement;
    button.click();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });
});
