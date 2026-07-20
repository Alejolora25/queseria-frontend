import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export type ProveedorNoEncontradoAction = 'crear' | 'revisar';

export interface ProveedorNoEncontradoDialogData {
  tipoIdentificacion: string;
  identificacion: string;
}

@Component({
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="w-[min(92vw,520px)] p-5 sm:p-6">
      <div class="app-badge app-badge-warning mb-4">Proveedor no encontrado</div>

      <h2 class="text-xl font-semibold tracking-tight">Revisa la identificación</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        No encontramos un proveedor con
        <span class="font-semibold text-slate-900">{{ data.tipoIdentificacion }} {{ data.identificacion }}</span>.
        Verifica que el número esté bien escrito antes de crear uno nuevo.
      </p>

      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <p-button label="Revisar número" severity="secondary" [outlined]="true" (onClick)="close('revisar')" />
        <p-button label="Crear proveedor" icon="pi pi-plus" (onClick)="close('crear')" />
      </div>
    </div>
  `,
})
export class ProveedorNoEncontradoDialogComponent {
  private readonly config = inject(DynamicDialogConfig<ProveedorNoEncontradoDialogData>);
  protected readonly data = this.config.data!;
  private readonly dialogRef = inject(DynamicDialogRef);

  protected close(action: ProveedorNoEncontradoAction) {
    this.dialogRef.close(action);
  }
}
