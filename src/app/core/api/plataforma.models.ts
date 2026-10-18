export type EstadoQueseria = 'ACTIVA' | 'INACTIVA';

export interface QueseriaPlataforma {
  id: number;
  nombre: string;
  razonSocial: string | null;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  estado: EstadoQueseria;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface QueseriasPage {
  items: QueseriaPlataforma[];
  page: number;
  size: number;
  total: number;
}

export interface DatosQueseria {
  nombre: string;
  razonSocial: string | null;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
}

export interface AltaQueseriaRequest extends DatosQueseria {
  nombreAdministrador: string;
  emailAdministrador: string;
}

export interface CredencialTemporal {
  passwordTemporal: string;
  credencialTemporalExpiraEn: string;
}

export interface AltaQueseriaResponse extends CredencialTemporal {
  queseria: QueseriaPlataforma;
  administradorId: number;
  administradorEmail: string;
}

export interface AdministradorQueseria {
  usuarioId: number;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface CredencialRegeneradaResponse extends CredencialTemporal {
  usuarioId: number;
  email: string;
}

export interface AdministradorPlataforma {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  creadoEn: string;
}

export interface AltaAdministradorPlataformaResponse extends CredencialTemporal {
  administrador: AdministradorPlataforma;
}
