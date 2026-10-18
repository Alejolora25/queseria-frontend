import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CambioPasswordObligatorioPageComponent } from './cambio-password-obligatorio-page';

describe('CambioPasswordObligatorioPageComponent', () => {
  let fixture: ComponentFixture<CambioPasswordObligatorioPageComponent>;
  let component: CambioPasswordObligatorioPageComponent;
  let cambiar: jasmine.Spy;
  let navegar: jasmine.Spy;

  beforeEach(async () => {
    cambiar = jasmine.createSpy('cambiarPasswordObligatoria')
      .and.returnValue(of({ accessToken: 'nuevo-jwt', expiresIn: 3600 }));
    navegar = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [CambioPasswordObligatorioPageComponent],
      providers: [
        { provide: AuthService, useValue: {
          cambiarPasswordObligatoria: cambiar,
          tipoUsuario: () => 'QUESERIA',
          logout: jasmine.createSpy('logout'),
        } },
        { provide: Router, useValue: { navigateByUrl: navegar } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CambioPasswordObligatorioPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('no envía claves cuando la confirmación no coincide', () => {
    component.form.setValue({
      passwordActual: 'Temporal123*',
      passwordNueva: 'NuevaSegura123*',
      confirmacion: 'OtraSegura123*',
    });
    component.submit();
    expect(cambiar).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('no coincide');
  });

  it('envía el cambio y navega solo después de recibir el token nuevo', () => {
    component.form.setValue({
      passwordActual: 'Temporal123*',
      passwordNueva: 'NuevaSegura123*',
      confirmacion: 'NuevaSegura123*',
    });
    component.submit();
    expect(cambiar).toHaveBeenCalledWith({
      passwordActual: 'Temporal123*', passwordNueva: 'NuevaSegura123*',
    });
    expect(navegar).toHaveBeenCalledWith('/calidad/historico');
  });
});
