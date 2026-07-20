import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { LoginRequest, LoginResponse } from '../../../../core/auth/auth.models';
import { LoginPageComponent } from './login-page';

describe('LoginPageComponent', () => {
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

  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let loginSpy: jasmine.Spy<(request: LoginRequest) => Observable<LoginResponse>>;
  let navigateByUrlSpy: jasmine.Spy<(url: string) => Promise<boolean>>;
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    queryParams = {};
    loginSpy = jasmine.createSpy('login');
    navigateByUrlSpy = jasmine.createSpy('navigateByUrl').and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: { login: loginSpy } },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => convertToParamMap(queryParams).get(key),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should keep an invalid form from sending credentials', () => {
    component.submit();

    expect(component.form.controls.email.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('should validate the email format', () => {
    component.form.setValue({ email: 'correo-invalido', password: 'Admin123*' });

    expect(component.form.controls.email.hasError('email')).toBeTrue();
    expect(component.form.invalid).toBeTrue();
  });

  it('should login and redirect to the default page', () => {
    loginSpy.and.returnValue(of(response));
    component.form.setValue({ email: 'admin@queseria.local', password: 'Admin123*' });

    component.submit();

    expect(loginSpy).toHaveBeenCalledWith({
      email: 'admin@queseria.local',
      password: 'Admin123*',
    });
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/calidad/historico');
    expect(component.loading()).toBeFalse();
  });

  it('should redirect to a safe internal returnUrl', () => {
    queryParams = { returnUrl: '/proveedores?activo=true' };
    loginSpy.and.returnValue(of(response));
    component.form.setValue({ email: 'admin@queseria.local', password: 'Admin123*' });

    component.submit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/proveedores?activo=true');
  });

  it('should discard an external returnUrl', () => {
    queryParams = { returnUrl: 'https://sitio-malicioso.example' };
    loginSpy.and.returnValue(of(response));
    component.form.setValue({ email: 'admin@queseria.local', password: 'Admin123*' });

    component.submit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/calidad/historico');
  });

  it('should show the generic message for invalid credentials', () => {
    loginSpy.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    component.form.setValue({ email: 'admin@queseria.local', password: 'incorrecta' });

    component.submit();

    expect(component.errorMessage()).toBe('Correo o contraseña incorrectos.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should keep the button loading until the request finishes', () => {
    const pendingLogin = new Subject<LoginResponse>();
    loginSpy.and.returnValue(pendingLogin);
    component.form.setValue({ email: 'admin@queseria.local', password: 'Admin123*' });

    component.submit();
    expect(component.loading()).toBeTrue();

    pendingLogin.next(response);
    pendingLogin.complete();
    expect(component.loading()).toBeFalse();
  });
});
