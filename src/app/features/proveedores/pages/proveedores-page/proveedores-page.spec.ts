import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PageResp, ProveedorResp } from '../../../../core/api/models';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { RolUsuario } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProveedoresPageComponent } from './proveedores-page';

describe('ProveedoresPageComponent role actions', () => {
  let roles: RolUsuario[];

  const proveedor: ProveedorResp = {
    id: 1,
    nombre: 'Proveedor de prueba',
    tipoIdentificacion: 'NIT',
    identificacion: '900001',
    activo: true,
  };

  const page: PageResp<ProveedorResp> = {
    items: [proveedor],
    total: 1,
    limit: 20,
    offset: 0,
  };

  beforeEach(async () => {
    roles = ['ADMIN'];

    await TestBed.configureTestingModule({
      imports: [ProveedoresPageComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: ProveedoresApi,
          useValue: { listar: () => of(page) },
        },
        {
          provide: AuthService,
          useValue: { tieneRol: (role: RolUsuario) => roles.includes(role) },
        },
      ],
    }).compileComponents();
  });

  it('shows provider management actions to ADMIN', () => {
    const fixture = TestBed.createComponent(ProveedoresPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nuevo proveedor');
    expect(fixture.nativeElement.textContent).toContain('Editar');
    expect(fixture.nativeElement.textContent).toContain('Desactivar');
  });

  it('hides provider management actions from LECTOR', () => {
    roles = ['LECTOR'];
    const fixture = TestBed.createComponent(ProveedoresPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;

    expect(text).not.toContain('Nuevo proveedor');
    expect(text).not.toContain('Editar');
    expect(text).not.toContain('Desactivar');
    expect(text).not.toContain('Acciones');
    expect(text).toContain('Proveedor de prueba');
  });
});
