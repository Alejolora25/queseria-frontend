import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProduccionesEnProcesoPageComponent } from './producciones-en-proceso-page';

describe('ProduccionesEnProcesoPageComponent', () => {
  it('lista lotes abiertos y enlaza su edición con un ID propio', async () => {
    await TestBed.configureTestingModule({ imports: [ProduccionesEnProcesoPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const fixture = TestBed.createComponent(ProduccionesEnProcesoPageComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const req = http.expectOne(r => r.url === '/api/v1/produccion/producciones');
    expect(req.request.params.get('estado')).toBe('EN_PROCESO');
    expect(req.request.params.has('queseriaId')).toBeFalse();
    req.flush({ items: [{ id: 9, codigoLote: '20261025-001', productoNombre: 'Queso',
      fechaProduccion: '2026-10-25', litrosTotales: 100, kgEsperados: 10 }],
      page: 0, size: 10, total: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/produccion/producciones/9/editar"]'))
      .not.toBeNull();
    http.verify();
  });
});
