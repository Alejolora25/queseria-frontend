import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../../../../core/auth/auth.service';
import { CatalogosProduccionPageComponent } from './catalogos-page';

describe('CatalogosProduccionPageComponent', () => {
  let http: HttpTestingController;
  let admin: boolean;

  beforeEach(() => {
    admin = true;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{
          path: 'produccion/catalogos/:tipo', component: CatalogosProduccionPageComponent,
        }]),
        provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { tieneRol: (rol: string) => rol === 'ADMIN' && admin } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  for (const tipo of ['productos', 'insumos', 'subproductos', 'operarios'] as const) {
    it(`lista ${tipo} en tarjetas y permite buscar por estado`, async () => {
      const harness = await RouterTestingHarness.create();
      const pagina = await harness.navigateByUrl(
        `/produccion/catalogos/${tipo}`, CatalogosProduccionPageComponent);
      const inicial = http.expectOne(r => r.url === `/api/v1/produccion/${tipo}`);
      expect(inicial.request.params.get('page')).toBe('0');
      const item = { id: 7, nombre: 'Elemento local', estado: 'ACTIVO',
        descripcion: 'Descripción', rendimientoEsperadoLPorKg: 10.5, unidad: 'kg',
        fechaCreacion: '', fechaActualizacion: '' };
      inicial.flush({ items: [item], page: 0, size: 20, total: 1 });
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelectorAll('article').length).toBe(1);
      expect(harness.routeNativeElement?.textContent).toContain('Elemento local');

      pagina.filtros.setValue({ q: ' Queso ', estado: 'INACTIVO' });
      pagina.cargar(0);
      const filtrada = http.expectOne(r => r.url === `/api/v1/produccion/${tipo}`);
      expect(filtrada.request.params.get('q')).toBe('Queso');
      expect(filtrada.request.params.get('estado')).toBe('INACTIVO');
      filtrada.flush({ items: [], page: 0, size: 20, total: 0 });
    });
  }

  it('permite a ADMIN crear un producto con rendimiento y confirmar su desactivación', async () => {
    const harness = await RouterTestingHarness.create();
    const pagina = await harness.navigateByUrl(
      '/produccion/catalogos/productos', CatalogosProduccionPageComponent);
    http.expectOne(r => r.url === '/api/v1/produccion/productos')
      .flush({ items: [], page: 0, size: 20, total: 0 });
    pagina.nuevo();
    pagina.formulario.setValue({ nombre: '  Queso fresco  ', descripcion: '',
      unidad: '', rendimiento: '10,5' });
    pagina.guardar();
    const alta = http.expectOne('/api/v1/produccion/productos');
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toEqual({ nombre: 'Queso fresco', descripcion: null,
      rendimientoEsperadoLPorKg: 10.5 });
    expect(alta.request.body['queseriaId']).toBeUndefined();
    alta.flush({ id: 3, nombre: 'Queso fresco', descripcion: null,
      rendimientoEsperadoLPorKg: 10.5, estado: 'ACTIVO' });
    http.expectOne(r => r.url === '/api/v1/produccion/productos')
      .flush({ items: [{ id: 3, nombre: 'Queso fresco', descripcion: null,
        rendimientoEsperadoLPorKg: 10.5, estado: 'ACTIVO' }], page: 0, size: 20, total: 1 });
    harness.detectChanges();
    const boton = Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === 'Desactivar');
    boton?.click();
    harness.detectChanges();
    const confirmar = harness.routeNativeElement!.querySelector('[role="dialog"] button:last-child') as HTMLButtonElement;
    confirmar.click();
    const cambio = http.expectOne('/api/v1/produccion/productos/3/desactivar');
    expect(cambio.request.method).toBe('PATCH');
    cambio.flush({ id: 3, nombre: 'Queso fresco', estado: 'INACTIVO' });
    http.expectOne(r => r.url === '/api/v1/produccion/productos')
      .flush({ items: [], page: 0, size: 20, total: 0 });
  });

  for (const tipo of ['insumos', 'subproductos', 'operarios'] as const) {
    it(`edita ${tipo} con el contrato apropiado`, async () => {
      const harness = await RouterTestingHarness.create();
      const pagina = await harness.navigateByUrl(
        `/produccion/catalogos/${tipo}`, CatalogosProduccionPageComponent);
      http.expectOne(r => r.url === `/api/v1/produccion/${tipo}`)
        .flush({ items: [{ id: 4, nombre: 'Original', unidad: 'kg', estado: 'ACTIVO' }],
          page: 0, size: 20, total: 1 });
      pagina.editar(pagina.filas()[0]);
      pagina.formulario.controls.nombre.setValue('Corregido');
      pagina.guardar();
      const guardar = http.expectOne(`/api/v1/produccion/${tipo}/4`);
      expect(guardar.request.method).toBe('PUT');
      expect(guardar.request.body).toEqual(tipo === 'operarios'
        ? { nombre: 'Corregido' } : { nombre: 'Corregido', unidad: 'kg' });
      guardar.flush({ id: 4, nombre: 'Corregido', unidad: 'kg', estado: 'ACTIVO' });
      http.expectOne(r => r.url === `/api/v1/produccion/${tipo}`)
        .flush({ items: [], page: 0, size: 20, total: 0 });
    });
  }

  it('rechaza en el formulario un rendimiento no positivo o con más de cuatro decimales', async () => {
    const harness = await RouterTestingHarness.create();
    const pagina = await harness.navigateByUrl(
      '/produccion/catalogos/productos', CatalogosProduccionPageComponent);
    http.expectOne(r => r.url === '/api/v1/produccion/productos')
      .flush({ items: [], page: 0, size: 20, total: 0 });
    pagina.nuevo();
    pagina.formulario.controls.nombre.setValue('Queso');
    pagina.formulario.controls.rendimiento.setValue('1,12345');
    pagina.guardar();
    expect(pagina.formulario.invalid).toBeTrue();
    pagina.formulario.controls.rendimiento.setValue('0');
    pagina.guardar();
    expect(pagina.errorDialogo()).toContain('mayor que cero');
    http.expectNone('/api/v1/produccion/productos');
  });

  it('oculta acciones de escritura a OPERADOR y LECTOR', async () => {
    admin = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/produccion/catalogos/operarios', CatalogosProduccionPageComponent);
    http.expectOne(r => r.url === '/api/v1/produccion/operarios')
      .flush({ items: [{ id: 1, nombre: 'Ana', estado: 'ACTIVO' }],
        page: 0, size: 20, total: 1 });
    harness.detectChanges();
    const texto = harness.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('Ana');
    expect(texto).not.toContain('Nuevo operario');
    expect(texto).not.toContain('Editar');
    expect(texto).not.toContain('Desactivar');
  });
});
