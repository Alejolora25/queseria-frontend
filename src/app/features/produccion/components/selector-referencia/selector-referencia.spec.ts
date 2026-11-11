import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SelectorReferenciaProduccionComponent } from './selector-referencia';

describe('SelectorReferenciaProduccionComponent', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SelectorReferenciaProduccionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('busca proveedores activos con paginación y permite elegir uno', () => {
    const fixture = TestBed.createComponent(SelectorReferenciaProduccionComponent);
    fixture.componentRef.setInput('tipo', 'proveedor');
    const elegido = jasmine.createSpy('elegido');
    fixture.componentInstance.elegido.subscribe(elegido);
    fixture.detectChanges();
    const req = http.expectOne(r => r.url === '/api/v1/proveedores');
    expect(req.request.params.get('activo')).toBe('true');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('offset')).toBe('0');
    req.flush({ items: [{ id: 7, nombre: 'Granja A', tipoIdentificacion: 'NIT',
      identificacion: '123', activo: true }], total: 21, limit: 20, offset: 0 });
    fixture.detectChanges();
    (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(boton => boton.textContent?.includes('Granja A'))?.click();
    expect(elegido).toHaveBeenCalledWith({ id: 7, nombre: 'Granja A', detalle: 'NIT 123' });
    fixture.componentInstance.paginaSiguiente(1);
    const siguiente = http.expectOne(r => r.url === '/api/v1/proveedores');
    expect(siguiente.request.params.get('offset')).toBe('20');
    siguiente.flush({ items: [], total: 21, limit: 20, offset: 20 });
  });

  it('solo ofrece productos activos de la quesería autenticada', () => {
    const fixture = TestBed.createComponent(SelectorReferenciaProduccionComponent);
    fixture.componentRef.setInput('tipo', 'producto');
    fixture.detectChanges();
    const req = http.expectOne(r => r.url === '/api/v1/produccion/productos');
    expect(req.request.params.get('estado')).toBe('ACTIVO');
    expect(req.request.params.has('queseriaId')).toBeFalse();
    req.flush({ items: [{ id: 4, nombre: 'Queso', rendimientoEsperadoLPorKg: 10 }],
      total: 1, page: 0, size: 20 });
    expect(fixture.componentInstance.items()[0].rendimientoEsperadoLPorKg).toBe(10);
  });

  it('incluye referencias inactivas cuando filtra el histórico', () => {
    const fixture = TestBed.createComponent(SelectorReferenciaProduccionComponent);
    fixture.componentRef.setInput('tipo', 'producto');
    fixture.componentRef.setInput('soloActivos', false);
    fixture.detectChanges();
    const req = http.expectOne(r => r.url === '/api/v1/produccion/productos');
    expect(req.request.params.has('estado')).toBeFalse();
    req.flush({ items: [{ id: 5, nombre: 'Queso anterior', estado: 'INACTIVO',
      rendimientoEsperadoLPorKg: 10 }], total: 1, page: 0, size: 20 });
    expect(fixture.componentInstance.items()[0].nombre).toBe('Queso anterior');
  });
});
