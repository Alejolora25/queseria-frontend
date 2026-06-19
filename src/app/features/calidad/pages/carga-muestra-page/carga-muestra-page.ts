import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { MuestrasApi } from '../../../../core/api/muestras.api';
import { parseApiError } from '../../../../core/api/api-error';
import { CrearMuestraReq, MuestraResp, ProveedorResp } from '../../../../core/api/models';
import { ProveedorFormDialogComponent } from '../../../proveedores/components/proveedor-form-dialog/proveedor-form-dialog';
import { ProveedorNoEncontradoDialogComponent } from '../../components/proveedor-no-encontrado-dialog/proveedor-no-encontrado-dialog';

type UiState = 'idle' | 'searching' | 'submittingMuestra';

@Component({
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDividerModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="space-y-4">
      <!-- Buscar proveedor -->
      <mat-card class="app-card">
        <mat-card-content class="app-card-content space-y-4">
          <div>
            <div class="text-sm font-semibold text-slate-900">Proveedor</div>
            <p class="mt-1 text-sm text-slate-500">
              Busca el proveedor por identificación antes de registrar la muestra.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(320px,1fr)_auto_auto] lg:items-start">
            <mat-form-field class="w-full" appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select [formControl]="buscarForm.controls.tipoIdentificacion">
                <mat-option value="CC">CC</mat-option>
                <mat-option value="NIT">NIT</mat-option>
              </mat-select>
            </mat-form-field>
    
            <mat-form-field class="flex-1 min-w-[240px]" appearance="outline">
              <mat-label>Identificación</mat-label>
              <input matInput [formControl]="buscarForm.controls.identificacion" placeholder="Ej: 123456789" />
              @if (buscarForm.controls.identificacion.invalid) {
                <mat-error>
                  La identificación es requerida
                </mat-error>
              }
            </mat-form-field>
    
            <button
              mat-raised-button
              color="primary"
              class="w-full md:w-auto md:mt-1"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
              >
              <span class="inline-flex items-center gap-2">
                @if (state() === 'searching') {
                  <mat-progress-spinner
                    diameter="18"
                    mode="indeterminate"
                    />
                }
                Buscar
              </span>
            </button>
    
            <button
              mat-stroked-button
              class="w-full md:w-auto md:mt-1"
              (click)="reset()"
              [disabled]="busy()"
              >
              Limpiar
            </button>
          </div>
    
          @if (bannerError()) {
            <div class="app-alert app-alert-error mt-3">
              <div class="font-medium">Error</div>
              <div>{{ bannerError() }}</div>
            </div>
          }
    
          @if (proveedor()) {
            <div class="mt-4">
              <mat-divider />
              <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm text-slate-600">Proveedor seleccionado</div>
                  <div class="font-semibold">
                    {{ proveedor()!.nombre }} —
                    {{ proveedor()!.tipoIdentificacion }} {{ proveedor()!.identificacion }}
                  </div>
                </div>
                <span class="app-badge app-badge-neutral">
                  ID: {{ proveedor()!.id }}
                </span>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    
      <!-- Form muestra -->
      @if (proveedor()) {
        <mat-card class="app-card">
          <mat-card-content class="app-card-content space-y-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">Datos de la muestra</div>
              <p class="mt-1 text-sm text-slate-500">
                Completa los valores disponibles. Los campos requeridos son los que usa la evaluación de calidad.
              </p>
            </div>
            <form class="space-y-4" [formGroup]="muestraForm">
              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Datos generales</div>
                  <div class="text-xs text-slate-500">Fecha, volumen, precio y observaciones.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Fecha de muestra (ISO)</mat-label>
                    <input
                      matInput
                      [formControl]="muestraForm.controls.fechaMuestra"
                      placeholder="2026-01-12T08:00:00-05:00"
                      />
                      <mat-hint>OffsetDateTime. Ej: -05:00</mat-hint>
                      @if (muestraForm.controls.fechaMuestra.invalid) {
                        <mat-error>Requerido</mat-error>
                      }
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Volumen (L)</mat-label>
                      <input matInput type="number" [formControl]="muestraForm.controls.volumenLitros" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Precio/Litro</mat-label>
                      <input matInput type="number" [formControl]="muestraForm.controls.precioLitro" />
                    </mat-form-field>
                  </div>

                  <mat-form-field class="w-full" appearance="outline">
                    <mat-label>Observaciones</mat-label>
                    <textarea matInput rows="2" [formControl]="muestraForm.controls.observaciones"></textarea>
                  </mat-form-field>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Composición</div>
                  <div class="text-xs text-slate-500">Grasa, proteína, lactosa y sólidos totales.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <mat-form-field appearance="outline">
                    <mat-label>Grasa (%)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.grasa" />
                    @if (muestraForm.controls.grasa.invalid) {
                      <mat-error>Requerido</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Proteína (%)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.proteina" />
                    @if (muestraForm.controls.proteina.invalid) {
                      <mat-error>Requerido</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Lactosa (%)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.lactosa" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sólidos Totales (%)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.solidosTotales" />
                    @if (muestraForm.controls.solidosTotales.invalid) {
                      <mat-error>Requerido</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Físico-químico</div>
                  <div class="text-xs text-slate-500">Densidad, acidez y temperatura de la muestra.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Densidad (g/mL)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.densidad" />
                    @if (muestraForm.controls.densidad.invalid) {
                      <mat-error>Requerido</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Acidez Dornic (°D)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.acidezDornic" />
                    @if (muestraForm.controls.acidezDornic.invalid) {
                      <mat-error>Requerido</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Temperatura (°C)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.temperaturaC" />
                    @if (muestraForm.controls.temperaturaC.invalid) {
                      <mat-error>Requerido</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Higiene</div>
                  <div class="text-xs text-slate-500">Recuentos bacterianos y células somáticas.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>UFC Bacterias</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.ufcBacterias" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>CC Somáticas</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.ccSomaticas" />
                  </mat-form-field>
                </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Opcionales</div>
                  <div class="text-xs text-slate-500">Valores calculados o complementarios si están disponibles.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>SNG (opcional)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.sng" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Agua % (opcional)</mat-label>
                    <input matInput type="number" [formControl]="muestraForm.controls.aguaPct" />
                  </mat-form-field>
                </div>
              </section>

                @if (muestraError()) {
                  <div class="app-alert app-alert-error">
                    <div class="font-medium">No se pudo registrar</div>
                    <div>{{ muestraError() }}</div>
                    @if (muestraFields()) {
                      <div class="mt-2 text-xs text-slate-700">
                        <div class="font-medium">Detalles:</div>
                        <ul class="list-disc pl-5">
                          @for (item of fieldErrorsList(muestraFields()!); track item) {
                            <li>
                              <span class="font-medium">{{ item.field }}:</span> {{ item.messages.join(', ') }}
                            </li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                }
                <button
                  mat-raised-button
                  color="primary"
                  class="w-full md:w-auto"
                  (click)="registrarMuestra()"
                  [disabled]="muestraForm.invalid || busy()"
                  >
                  <span class="inline-flex items-center gap-2">
                    @if (state() === 'submittingMuestra') {
                      <mat-progress-spinner
                        diameter="18"
                        mode="indeterminate"
                        />
                    }
                    Registrar muestra
                  </span>
                </button>
              </form>
            </mat-card-content>
          </mat-card>
        }
    
        <!-- Resultado evaluación -->
        @if (muestraCreada()) {
          <mat-card class="app-card border-emerald-200 bg-emerald-50">
            <mat-card-content class="app-card-content space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="text-lg font-semibold text-emerald-900">Muestra registrada</div>
                  <p class="mt-1 text-sm text-emerald-800">
                    La muestra quedó guardada y la evaluación fue generada correctamente.
                  </p>
                </div>
                <span class="app-badge app-badge-success">Registrada</span>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="app-metric-card">
                  <div class="text-xs text-slate-500">ID muestra</div>
                  <div class="mt-1 font-semibold">{{ muestraCreada()!.id }}</div>
                </div>
                <div class="app-metric-card">
                  <div class="text-xs text-slate-500">Fecha</div>
                  <div class="mt-1 break-words font-semibold">{{ muestraCreada()!.fechaMuestra }}</div>
                </div>
              </div>

              @if (muestraCreada()!.evaluacion?.porParametro; as por) {
                <div>
                  <div class="font-medium mt-2">Evaluación</div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    @for (k of objectKeys(por); track k) {
                      <div
                        class="app-metric-card"
                        >
                        <div class="flex items-center justify-between gap-2">
                          <div class="font-medium">{{ prettyKey(k) }}</div>
                          <mat-chip-set>
                            <mat-chip [ngClass]="chipClass(por[k].estado)">
                              {{ por[k].estado }}
                            </mat-chip>
                          </mat-chip-set>
                        </div>
                        @if (por[k].mensajes.length) {
                          <ul class="mt-2 list-disc pl-5 text-sm text-slate-700">
                            @for (m of por[k].mensajes; track m) {
                              <li>{{ m }}</li>
                            }
                          </ul>
                        }
                        @if (!por[k].mensajes.length) {
                          <div class="mt-2 text-sm text-slate-500">
                            Sin observaciones
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      </div>
    `,
  styles: [
    `
      .chip-ok { border: 1px solid rgba(16,185,129,.35); background: rgba(16,185,129,.12); }
      .chip-warn { border: 1px solid rgba(245,158,11,.35); background: rgba(245,158,11,.12); }
      .chip-bad { border: 1px solid rgba(239,68,68,.35); background: rgba(239,68,68,.12); }
      .chip-info { border: 1px solid rgba(100,116,139,.35); background: rgba(100,116,139,.10); }
    `,
  ],
})
export class CargaMuestraPageComponent {
  private fb = inject(FormBuilder);
  private proveedoresApi = inject(ProveedoresApi);
  private muestrasApi = inject(MuestrasApi);
  private dialog = inject(MatDialog);

  // estado UI
  readonly state = signal<UiState>('idle');
  readonly proveedor = signal<ProveedorResp | null>(null);
  readonly bannerError = signal<string | null>(null);

  readonly muestraError = signal<string | null>(null);
  readonly muestraFields = signal<Record<string, string[]> | null>(null);
  readonly muestraCreada = signal<MuestraResp | null>(null);

  readonly busy = computed(() => this.state() !== 'idle');

  // forms
  readonly buscarForm = this.fb.nonNullable.group({
    tipoIdentificacion: ['CC', Validators.required],
    identificacion: ['', Validators.required],
  });

  readonly muestraForm = this.fb.nonNullable.group({
    // meta
    fechaMuestra: [this.defaultNowOffsetIso(), Validators.required],
    volumenLitros: [0],
    precioLitro: [0],
    observaciones: [''],

    // composicion
    grasa: [0, Validators.required],
    proteina: [0, Validators.required],
    lactosa: [0],
    solidosTotales: [0, Validators.required],

    // fisicoquimico
    densidad: [1.03, Validators.required],
    acidezDornic: [15, Validators.required],
    temperaturaC: [18, Validators.required],

    // higiene
    ufcBacterias: [0],
    ccSomaticas: [0],

    // opcionales
    sng: [null as number | null],
    aguaPct: [null as number | null],
  });

  reset() {
    this.state.set('idle');
    this.proveedor.set(null);
    this.bannerError.set(null);
    this.muestraError.set(null);
    this.muestraFields.set(null);
    this.muestraCreada.set(null);

    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.muestraForm.patchValue({ fechaMuestra: this.defaultNowOffsetIso() });
  }

  buscarProveedor() {
    this.bannerError.set(null);
    this.muestraCreada.set(null);

    const ident = this.buscarForm.controls.identificacion.value.trim();
    const tipo = this.buscarForm.controls.tipoIdentificacion.value;

    if (!ident) return;

    this.state.set('searching');

    this.proveedoresApi.porIdentificacion(ident).subscribe({
      next: (p) => {
        this.state.set('idle');
        this.proveedor.set(p);
      },
      error: (err) => {
        // si es 404 típicamente: proveedor no existe
        this.state.set('idle');

        const parsed = parseApiError(err);
        // si backend manda 404 con ResponseStatusException
        if (parsed.status === 404) {
          this.bannerError.set(null);
          this.confirmarProveedorNoEncontrado(tipo, ident);
          return;
        }

        this.bannerError.set(parsed.message);
      },
    });
  }

  registrarMuestra() {
    this.muestraError.set(null);
    this.muestraFields.set(null);
    this.muestraCreada.set(null);

    const proveedor = this.proveedor();
    if (!proveedor) return;

    const v = this.muestraForm.getRawValue();

    const payload: CrearMuestraReq = {
      proveedorId: proveedor.id,
      fechaMuestra: v.fechaMuestra,

      volumenLitros: this.nullIfEmptyNumber(v.volumenLitros),
      precioLitro: this.nullIfEmptyNumber(v.precioLitro),
      observaciones: (v.observaciones ?? '').trim() || null,

      composicion: {
        grasa: Number(v.grasa),
        proteina: Number(v.proteina),
        lactosa: this.nullIfEmptyNumber(v.lactosa),
        solidosTotales: Number(v.solidosTotales),
      },
      fisicoQuimico: {
        densidad: Number(v.densidad),
        acidezDornic: Number(v.acidezDornic),
        temperaturaC: Number(v.temperaturaC),
      },
      higiene: {
        ufcBacterias: this.nullIfEmptyNumber(v.ufcBacterias),
        ccSomaticas: this.nullIfEmptyNumber(v.ccSomaticas),
      },
      sng: v.sng ?? null,
      aguaPct: v.aguaPct ?? null,
    };

    this.state.set('submittingMuestra');

    this.muestrasApi.crear(payload).subscribe({
      next: (resp) => {
        this.state.set('idle');
        this.muestraCreada.set(resp);
      },
      error: (err) => {
        this.state.set('idle');
        const parsed = parseApiError(err);
        this.muestraError.set(parsed.message);
        this.muestraFields.set(parsed.fields ?? null);
      },
    });
  }

  // ===== helpers UI =====
  objectKeys(obj: object) {
    return Object.keys(obj);
  }

  prettyKey(k: string) {
    const map: Record<string, string> = {
      grasa: 'Grasa',
      proteina: 'Proteína',
      densidad_dq: 'Densidad (°Q corregido)',
      solidos_totales: 'Sólidos Totales',
      sng: 'SNG',
      acidez_dornic: 'Acidez Dornic',
      agua_pct: 'Agua %',
      acido_lactico_pct: 'Ácido láctico (%)',
      densidad_dq_crudo: '°Q crudo',
      densidad_dq_corregido: '°Q corregido',
    };
    return map[k] ?? k;
  }

  chipClass(estado: string) {
    if (estado === 'ACEPTABLE') return 'chip-ok';
    if (estado === 'ALERTA') return 'chip-warn';
    if (estado === 'RECHAZAR') return 'chip-bad';
    return 'chip-info';
  }

  fieldErrorsList(fields: Record<string, string[]>) {
    return Object.entries(fields).map(([field, messages]) => ({ field, messages }));
  }

  private confirmarProveedorNoEncontrado(tipoIdentificacion: string, identificacion: string) {
    const ref = this.dialog.open(ProveedorNoEncontradoDialogComponent, {
      data: { tipoIdentificacion, identificacion },
      width: 'min(92vw, 520px)',
      maxWidth: '92vw',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((action) => {
      if (action !== 'crear') return;
      this.abrirCrearProveedor(tipoIdentificacion, identificacion);
    });
  }

  private abrirCrearProveedor(tipoIdentificacion: string, identificacion: string) {
    const ref = this.dialog.open(ProveedorFormDialogComponent, {
      data: {
        initialValues: {
          tipoIdentificacion,
          identificacion,
        },
      },
      width: 'min(92vw, 560px)',
      maxWidth: '92vw',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe((proveedor?: ProveedorResp) => {
      if (!proveedor) return;
      this.proveedor.set(proveedor);
      this.bannerError.set(null);
      this.muestraCreada.set(null);
    });
  }

  private nullIfEmptyNumber(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    // si dejas 0 como válido, no lo convertimos a null
    return Number.isFinite(n) ? n : null;
  }

  private defaultNowOffsetIso(): string {
    // tu backend pide OffsetDateTime. En Colombia -05:00
    const now = new Date();
    const pad = (x: number) => String(x).padStart(2, '0');

    // generar "YYYY-MM-DDTHH:mm:ss-05:00" (sin ms)
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    return `${y}-${m}-${d}T${hh}:${mm}:${ss}-05:00`;
  }
}
