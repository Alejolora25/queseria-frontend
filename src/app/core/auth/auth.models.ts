export type RolUsuario = 'ADMIN' | 'OPERADOR' | 'LECTOR';
export type RolSesion = RolUsuario | 'PLATFORM_ADMIN';
export type TipoUsuario = 'PLATAFORMA' | 'QUESERIA';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  roles: RolSesion[];
  queseriaId: number | null;
  nombreQueseria?: string | null;
  tipoUsuario: TipoUsuario | null;
  debeCambiarPassword: boolean;
}

export type UsuarioLogin = Omit<UsuarioSesion, 'tipoUsuario' | 'debeCambiarPassword'> &
  Partial<Pick<UsuarioSesion, 'tipoUsuario' | 'debeCambiarPassword'>>;

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: UsuarioLogin;
}

export interface CambioPasswordObligatoriaRequest {
  passwordActual: string;
  passwordNueva: string;
}

export interface CambioPasswordResponse {
  accessToken: string;
  expiresIn: number;
}

export interface SesionPersistida {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
  usuario: UsuarioSesion;
}
