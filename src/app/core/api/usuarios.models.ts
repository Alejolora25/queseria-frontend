import { RolUsuario } from '../auth/auth.models';

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  roles: [RolUsuario];
  queseriaId: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearUsuarioRequest {
  nombre: string;
  email: string;
  password: string;
  roles: [RolUsuario];
}

export interface UsuariosPageResponse {
  items: UsuarioAdmin[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListarUsuariosArgs {
  q?: string;
  activo?: boolean | null;
  limit: number;
  offset: number;
}
