import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type ProveedorNoEncontradoAction = 'crear' | 'revisar';

export interface ProveedorNoEncontradoDialogData {
  tipoIdentificacion: string;
  identificacion: string;
}

@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
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
        <button mat-stroked-button type="button" (click)="close('revisar')">
          Revisar número
        </button>
        <button mat-raised-button color="primary" type="button" (click)="close('crear')">
          Crear proveedor
        </button>
      </div>
    </div>
  `,
})
export class ProveedorNoEncontradoDialogComponent {
  protected readonly data = inject<ProveedorNoEncontradoDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<ProveedorNoEncontradoDialogComponent, ProveedorNoEncontradoAction>
  );

  protected close(action: ProveedorNoEncontradoAction) {
    this.dialogRef.close(action);
  }
}
