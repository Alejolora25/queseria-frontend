import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { RolUsuario } from '../auth/auth.models';
import {
  CrearUsuarioRequest,
  ListarUsuariosArgs,
  UsuarioAdmin,
  UsuariosPageResponse,
} from './usuarios.models';

@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);

  listar(args: ListarUsuariosArgs) {
    const params: Record<string, string> = {
      q: (args.q ?? '').trim(),
      limit: String(args.limit),
      offset: String(args.offset),
    };

    if (args.activo !== null && args.activo !== undefined) {
      params['activo'] = String(args.activo);
    }

    return this.http.get<UsuariosPageResponse>('/api/v1/usuarios', { params });
  }

  crear(request: CrearUsuarioRequest) {
    return this.http.post<UsuarioAdmin>('/api/v1/usuarios', request);
  }

  activar(id: number) {
    return this.http.patch<UsuarioAdmin>(`/api/v1/usuarios/${id}/activar`, {});
  }

  desactivar(id: number) {
    return this.http.patch<UsuarioAdmin>(`/api/v1/usuarios/${id}/desactivar`, {});
  }

  cambiarRol(id: number, rol: RolUsuario) {
    return this.http.put<UsuarioAdmin>(`/api/v1/usuarios/${id}/roles`, { roles: [rol] });
  }
}
