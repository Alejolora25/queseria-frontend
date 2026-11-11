import { Component } from '@angular/core';
import { FormularioProduccionComponent } from '../../components/formulario-produccion/formulario-produccion';

@Component({
  standalone: true,
  imports: [FormularioProduccionComponent],
  template: '<app-formulario-produccion modo="nuevo" />',
})
export class NuevaProduccionPageComponent {}
