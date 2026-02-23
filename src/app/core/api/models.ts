export type EstadoEval = 'ACEPTABLE' | 'ALERTA' | 'RECHAZAR' | 'INFO' | 'SIN_DATO';

export interface ApiErrorBody {
  error: string;
  message: string;
  fields?: Record<string, string[]>;
}

// ===== Proveedores =====
export interface ProveedorResp {
  id: number;
  nombre: string;
  tipoIdentificacion: string;
  identificacion: string;
  activo: boolean;
}

export interface CrearProveedorReq {
  nombre: string;
  tipoIdentificacion: string;
  identificacion: string;
}

// ===== Muestras =====
export interface ComposicionReq {
  grasa: number;
  proteina: number;
  lactosa?: number | null;
  solidosTotales: number;
}

export interface FisicoQuimicoReq {
  densidad: number;      // g/mL
  acidezDornic: number;  // °D
  temperaturaC: number;  // °C
}

export interface HigieneReq {
  ufcBacterias?: number | null;
  ccSomaticas?: number | null;
}

export interface CrearMuestraReq {
  proveedorId: number;
  fechaMuestra: string; // OffsetDateTime ISO (con -05:00)
  volumenLitros?: number | null;
  precioLitro?: number | null;
  observaciones?: string | null;
  composicion: ComposicionReq;
  fisicoQuimico: FisicoQuimicoReq;
  higiene?: HigieneReq | null;
  sng?: number | null;
  aguaPct?: number | null;
}

export interface ResultadoParametroResp {
  estado: EstadoEval;
  mensajes: string[];
}

export interface EvaluacionResp {
  porParametro: Record<string, ResultadoParametroResp>;
}

export interface MuestraResp {
  id: number;
  proveedorId: number;
  fechaMuestra: string;

  volumenLitros: number;
  precioLitro?: number | null;
  observaciones?: string | null;

  grasa: number;
  proteina: number;
  lactosa?: number | null;
  solidosTotales: number;

  densidad: number;
  acidezDornic: number;
  temperaturaC: number;

  ufcBacterias: number;
  ccSomaticas: number;

  evaluacion?: EvaluacionResp | null; // en histórico viene null
}

export interface PageResp<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ===== Analíticas =====
export interface ResumenProveedorResp {
  promedios: {
    grasa: number | null;
    proteina: number | null;
    solidosTotales: number | null;
    sng: number | null;
    kpi: number | null;
  };
  distribucionEstados: {
    ACEPTABLE: number;
    ALERTA: number;
    RECHAZAR: number;
    totalEstados: number;
  };
}

// ===== Btn Ver Analítica =====
export interface AnaliticaMuestraDocResp {
  id: string;
  sampleId: number;
  proveedorId: number;
  timestamp: string; // Instant ISO
  hashBase?: string | null;
  flags?: string[] | null;
  kpiCalidad?: number | null;

  base?: {
    grasa?: number | null;
    proteina?: number | null;
    lactosa?: number | null;
    solidosTotales?: number | null;
    densidad?: number | null;
    acidezDornic?: number | null;
    temperaturaC?: number | null;
    sng?: number | null;
    aguaPct?: number | null;
  } | null;

  evaluacion?: {
    porParametro?: Record<
      string,
      {
        estado?: string | null; // ACEPTABLE | ALERTA | RECHAZAR | INFO | SIN_DATO
        mensajes?: string[] | null;
      }
    > | null;
  } | null;
}