import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { UsuariosApi } from '../../../../core/api/usuarios.api';
import { UsuarioAdmin, UsuariosPageResponse } from '../../../../core/api/usuarios.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { UsuariosPageComponent } from './usuarios-page';

describe('UsuariosPageComponent', () => {
  const adminActual: UsuarioAdmin = {
    id: 1, nombre: 'Administrador', email: 'admin@queseria.local', activo: true,
    roles: ['ADMIN'], queseriaId: null, creadoEn: '', actualizadoEn: '',
  };
  const operador: UsuarioAdmin = {
    id: 2, nombre: 'Operador', email: 'operador@queseria.local', activo: true,
    roles: ['OPERADOR'], queseriaId: null, creadoEn: '', actualizadoEn: '',
  };
  const page: UsuariosPageResponse = { items: [adminActual, operador], total: 2, limit: 20, offset: 0 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosPageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: UsuariosApi, useValue: { listar: jasmine.createSpy().and.returnValue(of(page)) } },
        { provide: AuthService, useValue: { usuarioActual: signal({ id: 1, nombre: 'Administrador', email: 'admin@queseria.local', roles: ['ADMIN'], queseriaId: null }) } },
      ],
    }).compileComponents();
  });

  it('loads and displays users with their roles', () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Administrador');
    expect(text).toContain('Operador');
    expect(text).toContain('Nuevo usuario');
    expect(text).toContain('Tu cuenta');
  });

  it('identifies the current admin and does not request their deactivation', () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const confirmation = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmation, 'confirm');

    expect(component.esUsuarioActual(adminActual)).toBeTrue();
    expect(component.esUsuarioActual(operador)).toBeFalse();
    component.confirmarEstado(adminActual, false);
    expect(confirmation.confirm).not.toHaveBeenCalled();
  });

  it('asks for confirmation before changing another user state', () => {
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    fixture.detectChanges();
    const confirmation = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmation, 'confirm');

    fixture.componentInstance.confirmarEstado(operador, false);
    expect(confirmation.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      header: 'Desactivar usuario',
      acceptLabel: 'Desactivar',
    }));
  });
});
