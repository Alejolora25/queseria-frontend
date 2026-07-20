import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MuestrasApi } from '../../../../core/api/muestras.api';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { CrearMuestraReq, MuestraResp, ProveedorResp } from '../../../../core/api/models';
import { CargaMuestraPageComponent } from './carga-muestra-page';

describe('CargaMuestraPageComponent', () => {
  let crearMuestra: jasmine.Spy<(body: CrearMuestraReq) => ReturnType<MuestrasApi['crear']>>;

  const proveedor: ProveedorResp = {
    id: 4,
    nombre: 'Granja de prueba',
    tipoIdentificacion: 'NIT',
    identificacion: '900001',
    activo: true,
  };

  const respuesta: MuestraResp = {
    id: 30,
    proveedorId: proveedor.id,
    fechaMuestra: '2026-07-20T18:11:00-05:00',
    volumenLitros: 120.5,
    precioLitro: 1800,
    grasa: 4,
    proteina: 3.2,
    lactosa: 0,
    solidosTotales: 12.8,
    densidad: 1.032,
    acidezDornic: 15,
    temperaturaC: 18,
    ufcBacterias: 0,
    ccSomaticas: 0,
  };

  beforeEach(async () => {
    crearMuestra = jasmine.createSpy('crear').and.returnValue(of(respuesta));

    await TestBed.configureTestingModule({
      imports: [CargaMuestraPageComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: MuestrasApi,
          useValue: { crear: crearMuestra },
        },
        {
          provide: ProveedoresApi,
          useValue: { porIdentificacion: jasmine.createSpy('porIdentificacion') },
        },
      ],
    }).compileComponents();
  });

  it('inicia con fecha local y campos numéricos manuales vacíos', () => {
    const fixture = TestBed.createComponent(CargaMuestraPageComponent);
    const component = fixture.componentInstance;
    const value = component.muestraForm.getRawValue();

    expect(value.fechaMuestra).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(value.volumenLitros).toBeNull();
    expect(value.precioLitro).toBeNull();
    expect(value.grasa).toBeNull();
    expect(value.proteina).toBeNull();
    expect(value.lactosa).toBeNull();
    expect(value.sng).toBeNull();
    expect(value.solidosTotales).toBeNull();
    expect(value.densidad).toBeNull();
    expect(value.acidezDornic).toBeNull();
    expect(value.temperaturaC).toBeNull();
    expect(value.ufcBacterias).toBeNull();
    expect(value.ccSomaticas).toBeNull();
    expect(value.aguaPct).toBeNull();
  });

  it('no envía la muestra y muestra validaciones cuando faltan obligatorios', () => {
    const fixture = TestBed.createComponent(CargaMuestraPageComponent);
    const component = fixture.componentInstance;
    component.proveedor.set(proveedor);

    component.registrarMuestra();

    expect(crearMuestra).not.toHaveBeenCalled();
    expect(component.muestraError()).toBe('Completa los campos obligatorios antes de registrar la muestra.');
    expect(component.muestraForm.controls.volumenLitros.touched).toBeTrue();
    expect(component.muestraForm.controls.precioLitro.touched).toBeTrue();
    expect(component.muestraForm.controls.grasa.touched).toBeTrue();
    expect(component.muestraForm.controls.densidad.touched).toBeTrue();
  });

  it('calcula sólidos y envía en cero los numéricos opcionales vacíos', () => {
    const fixture = TestBed.createComponent(CargaMuestraPageComponent);
    const component = fixture.componentInstance;
    component.proveedor.set(proveedor);

    component.muestraForm.patchValue({
      fechaMuestra: '2026-07-20T18:11',
      volumenLitros: 120.5,
      precioLitro: 1800,
      grasa: 4,
      proteina: 3.2,
      sng: 8.8,
      densidad: 1.032,
      acidezDornic: 15,
      temperaturaC: 18,
    });

    expect(component.muestraForm.controls.solidosTotales.value).toBe(12.8);

    component.registrarMuestra();

    expect(crearMuestra).toHaveBeenCalledTimes(1);
    const payload = crearMuestra.calls.mostRecent().args[0];
    expect(payload.fechaMuestra).toMatch(/^2026-07-20T18:11:00[+-]\d{2}:\d{2}$/);
    expect(payload.composicion.lactosa).toBe(0);
    expect(payload.higiene).toEqual({ ufcBacterias: 0, ccSomaticas: 0 });
    expect(payload.aguaPct).toBe(0);
    expect(payload.observaciones).toBeNull();
  });
});
