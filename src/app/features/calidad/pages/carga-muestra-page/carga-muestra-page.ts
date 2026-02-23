import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { ProveedoresApi } from '../../../../core/api/proveedores.api';
import { MuestrasApi } from '../../../../core/api/muestras.api';
import { parseApiError } from '../../../../core/api/api-error';
import { CrearMuestraReq, MuestraResp, ProveedorResp } from '../../../../core/api/models';

type UiState = 'idle' | 'searching' | 'creatingProveedor' | 'submittingMuestra';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Cargar muestra</h2>

      <!-- Buscar proveedor -->
      <mat-card class="rounded-2xl">
        <mat-card-content class="p-4">
          <div class="flex items-start gap-4 flex-wrap">
            <mat-form-field class="w-full sm:w-56" appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select [formControl]="buscarForm.controls.tipoIdentificacion">
                <mat-option value="CC">CC</mat-option>
                <mat-option value="NIT">NIT</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field class="flex-1 min-w-[240px]" appearance="outline">
              <mat-label>Identificación</mat-label>
              <input matInput [formControl]="buscarForm.controls.identificacion" placeholder="Ej: 123456789" />
              <mat-error *ngIf="buscarForm.controls.identificacion.invalid">
                La identificación es requerida
              </mat-error>
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              class="mt-1"
              (click)="buscarProveedor()"
              [disabled]="buscarForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner
                  *ngIf="state() === 'searching'"
                  diameter="18"
                  mode="indeterminate"
                />
                Buscar
              </span>
            </button>

            <button
              mat-stroked-button
              class="mt-1"
              (click)="reset()"
              [disabled]="busy()"
            >
              Limpiar
            </button>
          </div>

          <div *ngIf="bannerError()" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            <div class="font-medium text-red-700">Error</div>
            <div class="text-red-700">{{ bannerError() }}</div>
          </div>

          <div *ngIf="proveedor()" class="mt-4">
            <mat-divider />
            <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-sm text-slate-600">Proveedor seleccionado</div>
                <div class="font-semibold">
                  {{ proveedor()!.nombre }} —
                  {{ proveedor()!.tipoIdentificacion }} {{ proveedor()!.identificacion }}
                </div>
              </div>
              <span class="text-xs rounded-full px-2 py-1 border bg-white">
                ID: {{ proveedor()!.id }}
              </span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Crear proveedor (si no existe) -->
      <mat-card *ngIf="showCrearProveedor()" class="rounded-2xl border border-amber-200 bg-amber-50">
        <mat-card-content class="p-4 space-y-3">
          <div class="font-semibold">No existe proveedor. Crear nuevo</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput [formControl]="crearProveedorForm.controls.nombre" />
              <mat-error *ngIf="crearProveedorForm.controls.nombre.invalid">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select [formControl]="crearProveedorForm.controls.tipoIdentificacion">
                <mat-option value="CC">CC</mat-option>
                <mat-option value="NIT">NIT</mat-option>
              </mat-select>
              <mat-error *ngIf="crearProveedorForm.controls.tipoIdentificacion.invalid">Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Identificación</mat-label>
              <input matInput [formControl]="crearProveedorForm.controls.identificacion" />
              <mat-error *ngIf="crearProveedorForm.controls.identificacion.invalid">Requerido</mat-error>
            </mat-form-field>
          </div>

          <div *ngIf="crearProveedorError()" class="rounded-xl border border-red-200 bg-white p-3 text-sm">
            <div class="font-medium text-red-700">No se pudo crear</div>
            <div class="text-red-700">{{ crearProveedorError() }}</div>

            <div *ngIf="crearProveedorFields()" class="mt-2 text-xs text-slate-700">
              <div class="font-medium">Detalles:</div>
              <ul class="list-disc pl-5">
                <li *ngFor="let item of fieldErrorsList(crearProveedorFields()!)">
                  <span class="font-medium">{{ item.field }}:</span> {{ item.messages.join(', ') }}
                </li>
              </ul>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              mat-raised-button
              color="primary"
              (click)="crearProveedor()"
              [disabled]="crearProveedorForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner
                  *ngIf="state() === 'creatingProveedor'"
                  diameter="18"
                  mode="indeterminate"
                />
                Crear proveedor
              </span>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Form muestra -->
      <mat-card *ngIf="proveedor()" class="rounded-2xl">
        <mat-card-content class="p-4 space-y-4">
          <div class="font-semibold">Datos de la muestra</div>

          <form class="space-y-4" [formGroup]="muestraForm">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <mat-form-field appearance="outline">
                <mat-label>Fecha de muestra (ISO)</mat-label>
                <input
                  matInput
                  [formControl]="muestraForm.controls.fechaMuestra"
                  placeholder="2026-01-12T08:00:00-05:00"
                />
                <mat-hint>OffsetDateTime. Ej: -05:00</mat-hint>
                <mat-error *ngIf="muestraForm.controls.fechaMuestra.invalid">Requerido</mat-error>
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

            <mat-divider />

            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <mat-form-field appearance="outline">
                <mat-label>Grasa (%)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.grasa" />
                <mat-error *ngIf="muestraForm.controls.grasa.invalid">Requerido</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Proteína (%)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.proteina" />
                <mat-error *ngIf="muestraForm.controls.proteina.invalid">Requerido</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Lactosa (%)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.lactosa" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Sólidos Totales (%)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.solidosTotales" />
                <mat-error *ngIf="muestraForm.controls.solidosTotales.invalid">Requerido</mat-error>
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <mat-form-field appearance="outline">
                <mat-label>Densidad (g/mL)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.densidad" />
                <mat-error *ngIf="muestraForm.controls.densidad.invalid">Requerido</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Acidez Dornic (°D)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.acidezDornic" />
                <mat-error *ngIf="muestraForm.controls.acidezDornic.invalid">Requerido</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Temperatura (°C)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.temperaturaC" />
                <mat-error *ngIf="muestraForm.controls.temperaturaC.invalid">Requerido</mat-error>
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <mat-form-field appearance="outline">
                <mat-label>UFC Bacterias</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.ufcBacterias" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>CC Somáticas</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.ccSomaticas" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>SNG (opcional)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.sng" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Agua % (opcional)</mat-label>
                <input matInput type="number" [formControl]="muestraForm.controls.aguaPct" />
              </mat-form-field>
            </div>

            <div *ngIf="muestraError()" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
              <div class="font-medium text-red-700">No se pudo registrar</div>
              <div class="text-red-700">{{ muestraError() }}</div>

              <div *ngIf="muestraFields()" class="mt-2 text-xs text-slate-700">
                <div class="font-medium">Detalles:</div>
                <ul class="list-disc pl-5">
                  <li *ngFor="let item of fieldErrorsList(muestraFields()!)">
                    <span class="font-medium">{{ item.field }}:</span> {{ item.messages.join(', ') }}
                  </li>
                </ul>
              </div>
            </div>

            <button
              mat-raised-button
              color="primary"
              (click)="registrarMuestra()"
              [disabled]="muestraForm.invalid || busy()"
            >
              <span class="inline-flex items-center gap-2">
                <mat-progress-spinner
                  *ngIf="state() === 'submittingMuestra'"
                  diameter="18"
                  mode="indeterminate"
                />
                Registrar muestra
              </span>
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Resultado evaluación -->
      <mat-card *ngIf="muestraCreada()" class="rounded-2xl border border-emerald-200 bg-emerald-50">
        <mat-card-content class="p-4 space-y-3">
          <div class="font-semibold">Muestra registrada ✅</div>
          <div class="text-sm text-slate-700">
            ID muestra: <span class="font-medium">{{ muestraCreada()!.id }}</span>
            — Fecha: {{ muestraCreada()!.fechaMuestra }}
          </div>

          <div *ngIf="muestraCreada()!.evaluacion?.porParametro as por">
            <div class="font-medium mt-2">Evaluación</div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div
                *ngFor="let k of objectKeys(por)"
                class="rounded-xl border bg-white p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="font-medium">{{ prettyKey(k) }}</div>
                  <mat-chip-set>
                    <mat-chip [ngClass]="chipClass(por[k].estado)">
                      {{ por[k].estado }}
                    </mat-chip>
                  </mat-chip-set>
                </div>

                <ul *ngIf="por[k].mensajes?.length" class="mt-2 list-disc pl-5 text-sm text-slate-700">
                  <li *ngFor="let m of por[k].mensajes">{{ m }}</li>
                </ul>

                <div *ngIf="!por[k].mensajes?.length" class="mt-2 text-sm text-slate-500">
                  Sin observaciones
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
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

  // estado UI
  readonly state = signal<UiState>('idle');
  readonly proveedor = signal<ProveedorResp | null>(null);
  readonly bannerError = signal<string | null>(null);

  readonly showCrearProveedor = signal(false);
  readonly crearProveedorError = signal<string | null>(null);
  readonly crearProveedorFields = signal<Record<string, string[]> | null>(null);

  readonly muestraError = signal<string | null>(null);
  readonly muestraFields = signal<Record<string, string[]> | null>(null);
  readonly muestraCreada = signal<MuestraResp | null>(null);

  readonly busy = computed(() => this.state() !== 'idle');

  // forms
  readonly buscarForm = this.fb.nonNullable.group({
    tipoIdentificacion: ['CC', Validators.required],
    identificacion: ['', Validators.required],
  });

  readonly crearProveedorForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
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
    this.showCrearProveedor.set(false);
    this.crearProveedorError.set(null);
    this.crearProveedorFields.set(null);
    this.muestraError.set(null);
    this.muestraFields.set(null);
    this.muestraCreada.set(null);

    this.buscarForm.reset({ tipoIdentificacion: 'CC', identificacion: '' });
    this.crearProveedorForm.reset({ nombre: '', tipoIdentificacion: 'CC', identificacion: '' });
    this.muestraForm.patchValue({ fechaMuestra: this.defaultNowOffsetIso() });
  }

  buscarProveedor() {
    this.bannerError.set(null);
    this.muestraCreada.set(null);

    const ident = this.buscarForm.controls.identificacion.value.trim();
    const tipo = this.buscarForm.controls.tipoIdentificacion.value;

    if (!ident) return;

    // pre-llenar crear proveedor por si no existe
    this.crearProveedorForm.patchValue({
      tipoIdentificacion: tipo,
      identificacion: ident,
    });

    this.state.set('searching');

    this.proveedoresApi.porIdentificacion(ident).subscribe({
      next: (p) => {
        this.state.set('idle');
        this.proveedor.set(p);
        this.showCrearProveedor.set(false);
        this.crearProveedorError.set(null);
        this.crearProveedorFields.set(null);
      },
      error: (err) => {
        // si es 404 típicamente: proveedor no existe
        this.state.set('idle');

        const parsed = parseApiError(err);
        // si backend manda 404 con ResponseStatusException
        if (parsed.status === 404) {
          this.showCrearProveedor.set(true);
          this.bannerError.set(null);
          return;
        }

        this.bannerError.set(parsed.message);
      },
    });
  }

  crearProveedor() {
    this.crearProveedorError.set(null);
    this.crearProveedorFields.set(null);

    const v = this.crearProveedorForm.getRawValue();
    this.state.set('creatingProveedor');

    this.proveedoresApi
      .crear({
        nombre: v.nombre.trim(),
        tipoIdentificacion: v.tipoIdentificacion,
        identificacion: v.identificacion.trim(),
      })
      .subscribe({
        next: (p) => {
          this.state.set('idle');
          this.proveedor.set(p);
          this.showCrearProveedor.set(false);
        },
        error: (err) => {
          this.state.set('idle');
          const parsed = parseApiError(err);
          this.crearProveedorError.set(parsed.message);
          this.crearProveedorFields.set(parsed.fields ?? null);
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