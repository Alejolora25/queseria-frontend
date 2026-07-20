import { NgClass } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { merge } from 'rxjs';

import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { MuestrasApi } from '../../../../core/api/muestras.api';
import { parseApiError } from '../../../../core/api/api-error';
import { CrearMuestraReq, MuestraResp, ProveedorResp } from '../../../../core/api/models';
import { ProveedorFormDialogComponent } from '../../../proveedores/components/proveedor-form-dialog/proveedor-form-dialog';
import { ProveedorNoEncontradoDialogComponent } from '../../components/proveedor-no-encontrado-dialog/proveedor-no-encontrado-dialog';

type UiState = 'idle' | 'searching' | 'submittingMuestra';

@Component({
  standalone: true,
  providers: [DialogService],
  imports: [
    NgClass,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DynamicDialogModule,
  ],
  template: `
    <div class="space-y-4">
      <!-- Buscar proveedor -->
      <div class="app-card">
        <div class="app-card-content space-y-4">
          <div>
            <div class="text-sm font-semibold text-slate-900">Proveedor</div>
            <p class="mt-1 text-sm text-slate-500">
              Busca el proveedor por identificación antes de registrar la muestra.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(320px,1fr)_auto_auto] lg:items-start">
            <div class="app-field w-full">
              <label class="text-sm font-semibold">Tipo</label>
              <p-select [options]="['CC', 'NIT']" [formControl]="buscarForm.controls.tipoIdentificacion" />
            </div>

            <div class="app-field min-w-0">
              <label class="text-sm font-semibold">Identificación</label>
              <input pInputText [formControl]="buscarForm.controls.identificacion" placeholder="Ej: 123456789" />
              @if (buscarForm.controls.identificacion.invalid) {
                <small class="text-red-600">
                  La identificación es requerida
                </small>
              }
            </div>

            <button
              pButton

              class="w-full lg:w-auto lg:self-end"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
              >
              <span class="inline-flex items-center gap-2">
                @if (state() === 'searching') {
                  <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                }
                Buscar
              </span>
            </button>

            <button
              pButton
              class="w-full lg:w-auto lg:self-end"
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
              <hr class="my-4 border-surface" />
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
        </div>
      </div>

      <!-- Form muestra -->
      @if (proveedor()) {
        <div class="app-card">
          <div class="app-card-content space-y-4">
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
                  <div class="app-field">
                    <label class="text-sm font-semibold">
                      Fecha y hora de la muestra <span class="text-red-600">*</span>
                    </label>
                    <input
                      pInputText
                      type="datetime-local"
                      step="60"
                      [formControl]="muestraForm.controls.fechaMuestra"
                    />
                    <small class="text-muted-color">Se completa automáticamente con la fecha y hora actuales.</small>
                    @if (muestraForm.controls.fechaMuestra.touched && muestraForm.controls.fechaMuestra.invalid) {
                      <small class="text-red-600">Selecciona la fecha y hora de la muestra.</small>
                      }
                    </div>
                    <div class="app-field">
                      <label class="text-sm font-semibold">Volumen (L) <span class="text-red-600">*</span></label>
                      <input pInputText type="number" min="0.01" step="any" placeholder="Ingresa el volumen" [formControl]="muestraForm.controls.volumenLitros" />
                      @if (muestraForm.controls.volumenLitros.touched && muestraForm.controls.volumenLitros.hasError('required')) {
                        <small class="text-red-600">Ingresa el volumen.</small>
                      } @else if (muestraForm.controls.volumenLitros.touched && muestraForm.controls.volumenLitros.hasError('min')) {
                        <small class="text-red-600">El volumen debe ser mayor que cero.</small>
                      }
                    </div>
                    <div class="app-field">
                      <label class="text-sm font-semibold">Precio/Litro <span class="text-red-600">*</span></label>
                      <input pInputText type="number" min="0.01" step="any" placeholder="Ingresa el precio" [formControl]="muestraForm.controls.precioLitro" />
                      @if (muestraForm.controls.precioLitro.touched && muestraForm.controls.precioLitro.hasError('required')) {
                        <small class="text-red-600">Ingresa el precio por litro.</small>
                      } @else if (muestraForm.controls.precioLitro.touched && muestraForm.controls.precioLitro.hasError('min')) {
                        <small class="text-red-600">El precio debe ser mayor que cero.</small>
                      }
                    </div>
                  </div>

                  <div class="app-field w-full">
                    <label class="text-sm font-semibold">Observaciones <span class="text-muted-color font-normal">(opcional)</span></label>
                    <textarea pInputText rows="2" [formControl]="muestraForm.controls.observaciones"></textarea>
                  </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Composición</div>
                  <div class="text-xs text-slate-500">Grasa, proteína, lactosa, SNG y sólidos totales.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-5">
                  <div class="app-field">
                    <label class="text-sm font-semibold">Grasa (%) <span class="text-red-600">*</span></label>
                    <input pInputText type="number" step="any" placeholder="Ingresa la grasa" [formControl]="muestraForm.controls.grasa" />
                    @if (muestraForm.controls.grasa.touched && muestraForm.controls.grasa.invalid) {
                      <small class="text-red-600">Ingresa la grasa.</small>
                    }
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">Proteína (%) <span class="text-red-600">*</span></label>
                    <input pInputText type="number" step="any" placeholder="Ingresa la proteína" [formControl]="muestraForm.controls.proteina" />
                    @if (muestraForm.controls.proteina.touched && muestraForm.controls.proteina.invalid) {
                      <small class="text-red-600">Ingresa la proteína.</small>
                    }
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">Lactosa (%) <span class="text-muted-color font-normal">(opcional)</span></label>
                    <input pInputText type="number" step="any" placeholder="Opcional" [formControl]="muestraForm.controls.lactosa" />
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">SNG (%) <span class="text-red-600">*</span></label>
                    <input pInputText type="number" step="any" placeholder="Ingresa el SNG" [formControl]="muestraForm.controls.sng" />
                    @if (muestraForm.controls.sng.touched && muestraForm.controls.sng.invalid) {
                      <small class="text-red-600">Ingresa los sólidos no grasos.</small>
                    }
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">Sólidos Totales (%)</label>
                    <input pInputText type="number" readonly placeholder="Se calcula automáticamente" [formControl]="muestraForm.controls.solidosTotales" />
                    <small class="text-muted-color">Grasa + SNG</small>
                    @if (muestraForm.controls.solidosTotales.touched && muestraForm.controls.solidosTotales.invalid) {
                      <small class="text-red-600">Completa Grasa y SNG para calcularlo.</small>
                    }
                  </div>
                </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Físico-químico</div>
                  <div class="text-xs text-slate-500">Densidad, acidez y temperatura de la muestra.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div class="app-field">
                    <label class="text-sm font-semibold">Densidad (g/mL) <span class="text-red-600">*</span></label>
                    <input pInputText type="number" step="any" placeholder="Ingresa la densidad" [formControl]="muestraForm.controls.densidad" />
                    @if (muestraForm.controls.densidad.touched && muestraForm.controls.densidad.invalid) {
                      <small class="text-red-600">Ingresa la densidad.</small>
                    }
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">Acidez Dornic (°D) <span class="text-red-600">*</span></label>
                    <input pInputText type="number" step="any" placeholder="Ingresa la acidez" [formControl]="muestraForm.controls.acidezDornic" />
                    @if (muestraForm.controls.acidezDornic.touched && muestraForm.controls.acidezDornic.invalid) {
                      <small class="text-red-600">Ingresa la acidez Dornic.</small>
                    }
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">Temperatura (°C) <span class="text-red-600">*</span></label>
                    <input pInputText type="number" step="any" placeholder="Ingresa la temperatura" [formControl]="muestraForm.controls.temperaturaC" />
                    @if (muestraForm.controls.temperaturaC.touched && muestraForm.controls.temperaturaC.invalid) {
                      <small class="text-red-600">Ingresa la temperatura.</small>
                    }
                  </div>
                </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Higiene</div>
                  <div class="text-xs text-slate-500">Recuentos bacterianos y células somáticas.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div class="app-field">
                    <label class="text-sm font-semibold">UFC Bacterias <span class="text-muted-color font-normal">(opcional)</span></label>
                    <input pInputText type="number" min="0" step="1" placeholder="Opcional" [formControl]="muestraForm.controls.ufcBacterias" />
                  </div>
                  <div class="app-field">
                    <label class="text-sm font-semibold">CC Somáticas <span class="text-muted-color font-normal">(opcional)</span></label>
                    <input pInputText type="number" min="0" step="1" placeholder="Opcional" [formControl]="muestraForm.controls.ccSomaticas" />
                  </div>
                </div>
              </section>

              <section class="app-panel p-4">
                <div class="mb-3">
                  <div class="text-sm font-semibold text-slate-900">Opcionales</div>
                  <div class="text-xs text-slate-500">Valores complementarios si están disponibles.</div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div class="app-field">
                    <label class="text-sm font-semibold">Agua añadida (%) <span class="text-muted-color font-normal">(opcional)</span></label>
                    <input pInputText type="number" min="0" step="any" placeholder="Opcional" [formControl]="muestraForm.controls.aguaPct" />
                  </div>
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
                  pButton

                  class="w-full md:w-auto"
                  (click)="registrarMuestra()"
                  [disabled]="busy()"
                  >
                  <span class="inline-flex items-center gap-2">
                    @if (state() === 'submittingMuestra') {
                      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                    }
                    Registrar muestra
                  </span>
                </button>
              </form>
            </div>
          </div>
        }

        <!-- Resultado evaluación -->
        @if (muestraCreada()) {
          <div class="app-card border-emerald-200 bg-emerald-50">
            <div class="app-card-content space-y-4">
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
                          <div>
                            <span [ngClass]="chipClass(por[k].estado)">
                              {{ por[k].estado }}
                            </span>
                          </div>
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
            </div>
          </div>
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
  private destroyRef = inject(DestroyRef);
  private proveedoresApi = inject(ProveedoresApi);
  private muestrasApi = inject(MuestrasApi);
  private dynamicDialog = inject(DialogService);

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

  readonly muestraForm = this.fb.group({
    // meta
    fechaMuestra: [this.defaultNowLocalDateTime(), Validators.required],
    volumenLitros: [null as number | null, [Validators.required, Validators.min(0.01)]],
    precioLitro: [null as number | null, [Validators.required, Validators.min(0.01)]],
    observaciones: [''],

    // composicion
    grasa: [null as number | null, Validators.required],
    proteina: [null as number | null, Validators.required],
    lactosa: [null as number | null],
    solidosTotales: [null as number | null, Validators.required],

    // fisicoquimico
    densidad: [null as number | null, Validators.required],
    acidezDornic: [null as number | null, Validators.required],
    temperaturaC: [null as number | null, Validators.required],

    // higiene
    ufcBacterias: [null as number | null],
    ccSomaticas: [null as number | null],

    // composicion complementaria
    sng: [null as number | null, Validators.required],
    aguaPct: [null as number | null],
  });

  constructor() {
    this.actualizarSolidosTotales();

    merge(
      this.muestraForm.controls.grasa.valueChanges,
      this.muestraForm.controls.sng.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.actualizarSolidosTotales());
  }

  reset() {
    this.state.set('idle');
    this.proveedor.set(null);
    this.bannerError.set(null);
    this.muestraError.set(null);
    this.muestraFields.set(null);
    this.muestraCreada.set(null);

    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.muestraForm.reset({
      fechaMuestra: this.defaultNowLocalDateTime(),
      volumenLitros: null,
      precioLitro: null,
      observaciones: '',
      grasa: null,
      proteina: null,
      lactosa: null,
      solidosTotales: null,
      densidad: null,
      acidezDornic: null,
      temperaturaC: null,
      ufcBacterias: null,
      ccSomaticas: null,
      sng: null,
      aguaPct: null,
    });
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

    if (this.muestraForm.invalid) {
      this.muestraForm.markAllAsTouched();
      this.muestraError.set('Completa los campos obligatorios antes de registrar la muestra.');
      return;
    }

    const v = this.muestraForm.getRawValue();

    const payload: CrearMuestraReq = {
      proveedorId: proveedor.id,
      fechaMuestra: this.toOffsetDateTime(v.fechaMuestra!),

      volumenLitros: Number(v.volumenLitros),
      precioLitro: Number(v.precioLitro),
      observaciones: (v.observaciones ?? '').trim() || null,

      composicion: {
        grasa: Number(v.grasa),
        proteina: Number(v.proteina),
        lactosa: this.zeroIfEmptyNumber(v.lactosa),
        solidosTotales: Number(v.solidosTotales),
      },
      fisicoQuimico: {
        densidad: Number(v.densidad),
        acidezDornic: Number(v.acidezDornic),
        temperaturaC: Number(v.temperaturaC),
      },
      higiene: {
        ufcBacterias: this.zeroIfEmptyNumber(v.ufcBacterias),
        ccSomaticas: this.zeroIfEmptyNumber(v.ccSomaticas),
      },
      sng: Number(v.sng),
      aguaPct: this.zeroIfEmptyNumber(v.aguaPct),
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
    const ref = this.dynamicDialog.open(ProveedorNoEncontradoDialogComponent, {
      data: { tipoIdentificacion, identificacion },
      width: 'min(92vw, 520px)',
      modal: true,
      closable: false,
      showHeader: false,
    });

    if (!ref) return;
    ref.onClose.subscribe((action) => {
      if (action !== 'crear') return;
      this.abrirCrearProveedor(tipoIdentificacion, identificacion);
    });
  }

  private abrirCrearProveedor(tipoIdentificacion: string, identificacion: string) {
    const ref = this.dynamicDialog.open(ProveedorFormDialogComponent, {
      data: {
        initialValues: {
          tipoIdentificacion,
          identificacion,
        },
      },
      width: 'min(92vw, 560px)',
      modal: true,
      closable: false,
      showHeader: false,
    });

    if (!ref) return;

    ref.onClose.subscribe((proveedor?: ProveedorResp) => {
      if (!proveedor) return;
      this.proveedor.set(proveedor);
      this.bannerError.set(null);
      this.muestraCreada.set(null);
    });
  }

  private zeroIfEmptyNumber(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private actualizarSolidosTotales() {
    const total = this.calcularSolidosTotales(
      this.muestraForm.controls.grasa.value,
      this.muestraForm.controls.sng.value,
    );

    this.muestraForm.controls.solidosTotales.setValue(total, { emitEvent: false });
  }

  private calcularSolidosTotales(grasa: unknown, sng: unknown): number | null {
    if (grasa === null || grasa === undefined || grasa === '' || sng === null || sng === undefined || sng === '') {
      return null;
    }

    const grasaNum = Number(grasa);
    const sngNum = Number(sng);

    if (!Number.isFinite(grasaNum) || !Number.isFinite(sngNum)) {
      return null;
    }

    return Number((grasaNum + sngNum).toFixed(2));
  }

  private defaultNowLocalDateTime(): string {
    const now = new Date();
    const pad = (x: number) => String(x).padStart(2, '0');

    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());

    return `${y}-${m}-${d}T${hh}:${mm}`;
  }

  private toOffsetDateTime(localValue: string): string {
    const localDate = new Date(localValue);
    const offsetMinutes = -localDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
    const offsetRemainder = String(absoluteOffset % 60).padStart(2, '0');
    const valueWithSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;

    return `${valueWithSeconds}${sign}${offsetHours}:${offsetRemainder}`;
  }
}
