
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';


import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { MuestrasApi } from '../../../../core/api/muestras.api';
import { parseApiError } from '../../../../core/api/api-error';
import { MuestraResp, ProveedorResp } from '../../../../core/api/models';
import { environment } from '../../../../../environments/environment';

import { AnaliticasApi } from '../../../../core/api/analiticas.api';
import { AnaliticaDialogComponent } from '../../components/analitica-dialog/analitica-dialog';

type UiState = 'idle' | 'searchingProveedor' | 'loadingHistorico';

@Component({
  standalone: true,
  providers: [DialogService],
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    PaginatorModule,
    DynamicDialogModule,
],
  template: `
    <div class="space-y-4">
      <!-- Buscar proveedor -->
      <div class="app-card">
        <div class="app-card-content space-y-3">
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(320px,1fr)_auto_auto] lg:items-start">
            <div class="w-full" appearance="outline">
              <label class="text-sm font-semibold">Tipo</label>
              <p-select [options]="['CC', 'NIT']" [formControl]="buscarForm.controls.tipoIdentificacion" />
            </div>

            <div class="flex-1 min-w-[240px]" appearance="outline">
              <label class="text-sm font-semibold">Identificación</label>
              <input pInputText [formControl]="buscarForm.controls.identificacion" placeholder="Ej: NIT-123" />
              @if (buscarForm.controls.identificacion.invalid) {
                <small class="text-red-600">Requerido</small>
              }
            </div>

            <button
              pButton

              class="w-full lg:w-auto lg:mt-1"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
              >
              <span class="inline-flex items-center gap-2">
                @if (state() === 'searchingProveedor') {
                  <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                }
                Buscar
              </span>
            </button>

            <button pButton class="w-full lg:w-auto lg:mt-1" (click)="reset()" [disabled]="busy()">
              Limpiar
            </button>
          </div>

          @if (bannerError()) {
            <div class="app-alert app-alert-error">
              <div class="font-medium">Error</div>
              <div>{{ bannerError() }}</div>
            </div>
          }

          @if (proveedor()) {
            <div class="pt-2">
              <hr class="my-4 border-surface" />
              <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm text-slate-600">Proveedor</div>
                  <div class="font-semibold">
                    {{ proveedor()!.nombre }} — {{ proveedor()!.tipoIdentificacion }} {{ proveedor()!.identificacion }}
                  </div>
                </div>
                <span class="app-badge app-badge-neutral">
                  ID: {{ proveedor()!.id }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Filtros histórico -->
      @if (proveedor()) {
        <div class="app-card">
          <div class="app-card-content space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="font-semibold">Filtros</div>
              <button
                pButton

                class="w-full sm:w-auto"
                (click)="cargarHistorico(0)"
                [disabled]="busy() || filtrosForm.invalid"
                >
                <span class="inline-flex items-center gap-2">
                  @if (state() === 'loadingHistorico') {
                    <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                  }
                  Consultar
                </span>
              </button>
            </div>
            <form class="grid grid-cols-1 md:grid-cols-3 gap-3" [formGroup]="filtrosForm">
              <div appearance="outline">
                <label class="text-sm font-semibold">Desde (ISO)</label>
                <input pInputText [formControl]="filtrosForm.controls.desde" />
                @if (filtrosForm.controls.desde.invalid) {
                  <small class="text-red-600">Requerido</small>
                }
              </div>
              <div appearance="outline">
                <label class="text-sm font-semibold">Hasta (ISO)</label>
                <input pInputText [formControl]="filtrosForm.controls.hasta" />
                @if (filtrosForm.controls.hasta.invalid) {
                  <small class="text-red-600">Requerido</small>
                }
              </div>
              <div appearance="outline">
                <label class="text-sm font-semibold">Tamaño de página</label>
                <p-select [options]="[10, 20, 50, 100]" [formControl]="filtrosForm.controls.limit" />
              </div>
            </form>
            <!-- Error histórico -->
            @if (histError()) {
              <div class="app-alert app-alert-error">
                <div class="font-medium">No se pudo cargar</div>
                <div>{{ histError() }}</div>
              </div>
            }
            <!-- Error analítica (arriba de la tabla) -->
            @if (analiticaError()) {
              <div class="app-alert app-alert-error">
                <div class="font-medium">Analítica</div>
                <div>{{ analiticaError() }}</div>
              </div>
            }
            <!-- Lista móvil -->
            <div class="historico-mobile-list space-y-3">
              @for (r of items(); track r.id) {
                <div class="app-card">
                  <div class="app-card-content space-y-3">
                    <div>
                      <div class="text-xs font-semibold uppercase text-slate-500">Fecha</div>
                      <div class="mt-1 break-words font-semibold text-slate-950">{{ r.fechaMuestra }}</div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-sm">
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">Volumen</div>
                        <div class="font-semibold">{{ r.volumenLitros }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">Precio/L</div>
                        <div class="font-semibold">{{ r.precioLitro ?? '—' }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">Grasa</div>
                        <div class="font-semibold">{{ r.grasa }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">Proteína</div>
                        <div class="font-semibold">{{ r.proteina }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">ST</div>
                        <div class="font-semibold">{{ r.solidosTotales }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">Densidad</div>
                        <div class="font-semibold">{{ r.densidad }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">°D</div>
                        <div class="font-semibold">{{ r.acidezDornic }}</div>
                      </div>
                      <div class="app-metric-card p-3">
                        <div class="text-xs text-slate-500">°C</div>
                        <div class="font-semibold">{{ r.temperaturaC }}</div>
                      </div>
                    </div>

                    @if (r.observaciones) {
                      <div class="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600">
                        {{ r.observaciones }}
                      </div>
                    }

                    <button class="w-full" pButton (click)="verAnalitica(r.id)" [disabled]="busy()">
                      Ver analítica
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Tabla desktop -->
            <div class="historico-desktop-table">
              <div class="app-table-frame overflow-auto">
                <p-table [value]="items()" [loading]="state() === 'loadingHistorico'" [tableStyle]="{ 'min-width': '900px' }">
  <ng-template #header><tr><th>Fecha</th><th>Vol (L)</th><th>Precio/L</th><th>Grasa</th><th>Prot</th><th>ST</th><th>Dens</th><th>°D</th><th>°C</th><th>Obs</th><th>Acciones</th></tr></ng-template>
  <ng-template #body let-r><tr><td>{{ r.fechaMuestra }}</td><td>{{ r.volumenLitros ?? '' }}</td><td>{{ r.precioLitro ?? '' }}</td><td>{{ r.grasa }}</td><td>{{ r.proteina }}</td><td>{{ r.solidosTotales }}</td><td>{{ r.densidad }}</td><td>{{ r.acidezDornic }}</td><td>{{ r.temperaturaC }}</td><td>{{ r.observaciones ?? '' }}</td><td><button pButton (click)="verAnalitica(r.id)" [disabled]="busy()">Ver analítica</button></td></tr></ng-template>
</p-table>
              </div>
            </div>

            <p-paginator [first]="offset()" [rows]="limit()" [totalRecords]="total()" [rowsPerPageOptions]="[10,20,50,100]" (onPageChange)="onPage($event)" />
          </div>
        </div>
      }
    </div>
    `,
})
export class HistoricoPageComponent {
  private fb = inject(FormBuilder);
  private proveedoresApi = inject(ProveedoresApi);
  private muestrasApi = inject(MuestrasApi);

  private analiticasApi = inject(AnaliticasApi);
  private dialog = inject(DialogService);

  readonly analiticaError = signal<string | null>(null);

  readonly state = signal<UiState>('idle');
  readonly proveedor = signal<ProveedorResp | null>(null);

  readonly bannerError = signal<string | null>(null);
  readonly histError = signal<string | null>(null);

  readonly items = signal<MuestraResp[]>([]);
  readonly total = signal(0);

  readonly limit = signal(environment.defaultPageSize);
  readonly offset = signal(0);

  readonly busy = computed(() => this.state() !== 'idle');

  readonly buscarForm = this.fb.nonNullable.group({
    tipoIdentificacion: ['CC', Validators.required],
    identificacion: ['', Validators.required],
  });

  readonly filtrosForm = this.fb.nonNullable.group({
    desde: [this.startOfMonthIso(), Validators.required],
    hasta: [this.nowIso(), Validators.required],
    limit: [environment.defaultPageSize, Validators.required],
  });

  readonly displayedColumns = [
    'fecha',
    'volumen',
    'precio',
    'grasa',
    'proteina',
    'st',
    'densidad',
    'dornic',
    'temp',
    'obs',
    'acciones',
  ];

  reset() {
    this.state.set('idle');
    this.proveedor.set(null);
    this.bannerError.set(null);
    this.histError.set(null);
    this.analiticaError.set(null); 
    this.items.set([]);
    this.total.set(0);
    this.offset.set(0);

    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.filtrosForm.reset({
      desde: this.startOfMonthIso(),
      hasta: this.nowIso(),
      limit: environment.defaultPageSize,
    });
    this.limit.set(environment.defaultPageSize);
  }

  buscarProveedor() {
    this.analiticaError.set(null);
    this.bannerError.set(null);
    this.histError.set(null);
    this.items.set([]);
    this.total.set(0);
    this.offset.set(0);

    const ident = this.buscarForm.controls.identificacion.value.trim();
    if (!ident) return;

    this.state.set('searchingProveedor');
    this.proveedoresApi.porIdentificacion(ident).subscribe({
      next: (p) => {
        this.state.set('idle');
        this.proveedor.set(p);
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.bannerError.set(parsed.status === 404 ? 'Proveedor no existe' : parsed.message);
      },
    });
  }

  cargarHistorico(offset: number) {
    this.analiticaError.set(null);
    this.histError.set(null);

    const p = this.proveedor();
    if (!p) return;

    const desde = this.filtrosForm.controls.desde.value;
    const hasta = this.filtrosForm.controls.hasta.value;
    const limit = this.filtrosForm.controls.limit.value;

    this.limit.set(limit);
    this.offset.set(offset);

    this.state.set('loadingHistorico');
    this.muestrasApi
      .historico({
        proveedorId: p.id,
        desde,
        hasta,
        limit,
        offset,
      })
      .subscribe({
        next: (page) => {
          this.state.set('idle');
          this.items.set(page.items ?? []);
          this.total.set(page.total ?? 0);
        },
        error: (err) => {
          this.state.set('idle');
          const parsed = parseApiError(err);
          this.histError.set(parsed.message);
        },
      });
  }

  onPage(ev: PaginatorState) {
    const pageSize = ev.rows ?? this.limit();
    const newOffset = ev.first ?? 0;

    // si cambió el pageSize, volvemos a 0
    if (pageSize !== this.limit()) {
      this.filtrosForm.controls.limit.setValue(pageSize);
      this.cargarHistorico(0);
      return;
    }

    this.cargarHistorico(newOffset);
  }

  verAnalitica(sampleId: number) {
    this.analiticaError.set(null);

    this.analiticasApi.porMuestra(sampleId).subscribe({
      next: (doc) => {
        // Si el backend devuelve 200 sin body, doc podría venir undefined/null según implementación.
        if (!doc) {
          this.analiticaError.set('No hay analítica registrada para esta muestra.');
          return;
        }

        this.dialog.open(AnaliticaDialogComponent, {
          data: doc,
          modal: true,
          closable: false,
          showHeader: false,
          width: 'min(92vw, 880px)',
        });
      },
      error: (err) => {
        const parsed = parseApiError(err);
        this.analiticaError.set(parsed.status === 404 ? 'No hay analítica para esta muestra' : parsed.message);
      },
    });
  }

  private nowIso(): string {
    const now = new Date();
    return this.toOffsetIso(now);
  }

  private startOfMonthIso(): string {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return this.toOffsetIso(d);
  }

  private toOffsetIso(date: Date): string {
    const pad = (x: number) => String(x).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}-05:00`;
  }
}
