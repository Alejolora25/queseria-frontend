import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

import { ProduccionInicioPageComponent } from './produccion-inicio-page';

describe('ProduccionInicioPageComponent', () => {
  it('consulta el resumen de la quesería y muestra los estados', async () => {
    await TestBed.configureTestingModule({
      imports: [ProduccionInicioPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { tieneRol: () => false } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProduccionInicioPageComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const req = http.expectOne('/api/v1/produccion/resumen');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('queseriaId')).toBeFalse();
    req.flush({
      periodo: { desde: null, hasta: null },
      indicadores: {
        totalLotes: 3, enProceso: 1, finalizadas: 1, perdidasTotales: 1,
        litrosTodosEstados: 120, kgEsperadosTodosEstados: 12,
        litrosFinalizados: 40, kgEsperadosFinalizados: 4,
        kgRealesFinalizados: 3.8, diferenciaKgFinalizados: -0.2,
      },
      rendimientoGlobalRealLPorKg: 10.5263,
      distribucionPorProducto: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Lotes registrados');
    expect(fixture.nativeElement.textContent).toContain('Pérdidas totales');
    expect(fixture.nativeElement.textContent).toContain('120');
    http.verify();
  });

  it('aplica periodo inclusivo y presenta la distribución por producto recibida', async () => {
    await TestBed.configureTestingModule({
      imports: [ProduccionInicioPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { tieneRol: () => false } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProduccionInicioPageComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/produccion/resumen').flush({
      periodo: { desde: null, hasta: null },
      indicadores: { totalLotes: 0, enProceso: 0, finalizadas: 0, perdidasTotales: 0,
        litrosTodosEstados: 0, kgEsperadosTodosEstados: 0, litrosFinalizados: 0,
        kgEsperadosFinalizados: 0, kgRealesFinalizados: 0, diferenciaKgFinalizados: 0 },
      rendimientoGlobalRealLPorKg: null, distribucionPorProducto: [],
    });
    const page = fixture.componentInstance;
    page.desde = '2026-10-01';
    page.hasta = '2026-10-31';
    page.actualizar();
    const req = http.expectOne('/api/v1/produccion/resumen?desde=2026-10-01&hasta=2026-10-31');
    expect(req.request.params.has('queseriaId')).toBeFalse();
    req.flush({
      periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
      indicadores: { totalLotes: 2, enProceso: 1, finalizadas: 1, perdidasTotales: 0,
        litrosTodosEstados: 80, kgEsperadosTodosEstados: 8, litrosFinalizados: 50,
        kgEsperadosFinalizados: 5, kgRealesFinalizados: 4.5, diferenciaKgFinalizados: -0.5 },
      rendimientoGlobalRealLPorKg: 11.111,
      distribucionPorProducto: [{ productoId: 4, productoNombre: 'Queso costeño',
        totalLotes: 2, enProceso: 1, finalizadas: 1, perdidasTotales: 0,
        litrosTodosEstados: 80, kgEsperadosTodosEstados: 8, kgRealesFinalizados: 4.5 }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Queso costeño');
    expect(fixture.nativeElement.textContent).toContain('2026-10-01 a 2026-10-31');
    page.desde = '2026-11-01';
    page.actualizar();
    expect(page.error()).toContain('fecha inicial');
    http.expectNone(r => r.url === '/api/v1/produccion/resumen');
    http.verify();
  });
});
