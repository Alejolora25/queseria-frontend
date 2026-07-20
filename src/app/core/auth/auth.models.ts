export type RolUsuario = 'ADMIN' | 'OPERADOR' | 'LECTOR';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  roles: RolUsuario[];
  queseriaId: number | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: UsuarioSesion;
}

export interface SesionPersistida {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
  usuario: UsuarioSesion;
}
