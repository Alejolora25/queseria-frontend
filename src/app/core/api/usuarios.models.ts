import { RolUsuario } from '../auth/auth.models';
import { TipoUsuario } from '../auth/auth.models';

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  roles: [RolUsuario];
  queseriaId: number | null;
  tipoUsuario?: TipoUsuario;
  debeCambiarPassword?: boolean;
  creadoEn: string;
  actualizadoEn: string;
  passwordTemporal?: string | null;
  credencialTemporalExpiraEn?: string | null;
}

export interface CrearUsuarioRequest {
  nombre: string;
  email: string;
  password?: string;
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
