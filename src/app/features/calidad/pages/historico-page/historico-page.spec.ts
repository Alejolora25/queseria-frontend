import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject, throwError } from 'rxjs';

import { AnaliticasApi } from '../../../../core/api/analiticas.api';
import { AnaliticaMuestraDocResp } from '../../../../core/api/models';
import { MuestrasApi } from '../../../../core/api/muestras.api';
import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { HistoricoPageComponent } from './historico-page';

describe('HistoricoPageComponent analítica bajo demanda', () => {
  let porMuestra: jasmine.Spy;

  beforeEach(async () => {
    porMuestra = jasmine.createSpy('porMuestra');

    await TestBed.configureTestingModule({
      imports: [HistoricoPageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AnaliticasApi, useValue: { porMuestra } },
        { provide: MuestrasApi, useValue: {} },
        { provide: ProveedoresApi, useValue: {} },
      ],
    }).compileComponents();
  });

  it('muestra el estado de cálculo y abre la analítica al recibirla', () => {
    const respuesta$ = new Subject<AnaliticaMuestraDocResp>();
    porMuestra.and.returnValue(respuesta$);
    const fixture = TestBed.createComponent(HistoricoPageComponent);
    const component = fixture.componentInstance;
    const dialog = fixture.debugElement.injector.get(DialogService);
    spyOn(dialog, 'open');

    component.verAnalitica(10);

    expect(component.state()).toBe('loadingAnalitica');
    expect(component.analiticaCargandoId()).toBe(10);

    respuesta$.next({
      sampleId: 10,
      proveedorId: 4,
      timestamp: '2026-01-10T13:00:00Z',
    });

    expect(component.state()).toBe('idle');
    expect(component.analiticaCargandoId()).toBeNull();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('informa cuando la muestra ya no existe y restablece la carga', () => {
    porMuestra.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(HistoricoPageComponent);
    const component = fixture.componentInstance;

    component.verAnalitica(99);

    expect(component.state()).toBe('idle');
    expect(component.analiticaCargandoId()).toBeNull();
    expect(component.analiticaError()).toBe('La muestra ya no existe');
  });
});
