/** Contratos del módulo operativo de Producción. Los IDs son numéricos. */
export type EstadoCatalogoProduccion = 'ACTIVO' | 'INACTIVO';
export type EstadoProduccion = 'EN_PROCESO' | 'FINALIZADA' | 'PERDIDA_TOTAL';
export type UnidadInsumo = 'kg' | 'g' | 'L' | 'ml' | 'unidad';
export type UnidadSubproducto = 'kg' | 'L';

export interface PaginaProduccion<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface FiltroCatalogoProduccion {
  q?: string;
  estado?: EstadoCatalogoProduccion | null;
  page?: number;
  size?: number;
}

interface CatalogoBase {
  id: number;
  nombre: string;
  estado: EstadoCatalogoProduccion;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface ProductoProduccion extends CatalogoBase {
  descripcion: string | null;
  rendimientoEsperadoLPorKg: number;
}

export interface InsumoProduccion extends CatalogoBase { unidad: UnidadInsumo; }
export interface SubproductoProduccion extends CatalogoBase { unidad: UnidadSubproducto; }
export type OperarioProduccion = CatalogoBase;

export interface ProductoRequest {
  nombre: string;
  descripcion?: string | null;
  rendimientoEsperadoLPorKg: number;
}

export interface InsumoRequest { nombre: string; unidad: UnidadInsumo; }
export interface SubproductoRequest { nombre: string; unidad: UnidadSubproducto; }
export interface OperarioRequest { nombre: string; }

export interface AporteRequest {
  proveedorId: number;
  litros: number;
  observacion?: string | null;
}

export interface InsumoLoteRequest { insumoId: number; cantidad: number; }
export interface SubproductoLoteRequest { subproductoId: number; cantidad: number; }

/** La quesería, el actor y el código de lote se obtienen o generan en el servidor. */
export interface AbrirProduccionRequest {
  productoId: number;
  fechaProduccion: string;
  operarioId: number;
  aportes: AporteRequest[];
  insumos?: InsumoLoteRequest[];
  rendimientoEsperadoLPorKg?: number | null;
  observaciones?: string | null;
}

export interface EditarProduccionRequest {
  productoId: number;
  operarioId: number;
  aportes: AporteRequest[];
  insumos?: InsumoLoteRequest[];
  rendimientoEsperadoLPorKg?: number | null;
  observaciones?: string | null;
}

export interface FinalizarProduccionRequest {
  kgReales: number;
  bloques?: number | null;
  pesoPromedioBloqueKg?: number | null;
  subproductos?: SubproductoLoteRequest[];
  observaciones?: string | null;
}

export interface RegistrarPerdidaTotalRequest {
  motivo: string;
  observaciones?: string | null;
}

export interface CorregirFinalizadaRequest {
  productoId: number;
  operarioId: number;
  aportes: AporteRequest[];
  insumos: InsumoLoteRequest[];
  subproductos: SubproductoLoteRequest[];
  rendimientoEsperadoLPorKg: number;
  kgReales: number;
  bloques?: number | null;
  pesoPromedioBloqueKg?: number | null;
  observaciones?: string | null;
  motivoCorreccion: string;
}

export interface CorregirPerdidaRequest {
  motivoCorreccion: string;
  motivoPerdida: string;
  observaciones?: string | null;
}

export interface AporteProduccion {
  queseriaId: number;
  proveedorId: number;
  proveedorNombre: string;
  litros: number;
  observacion: string | null;
}

export interface InsumoUtilizado {
  queseriaId: number;
  insumoId: number;
  insumoNombre: string;
  unidad: 'KG' | 'G' | 'L' | 'ML' | 'UNIDAD';
  cantidad: number;
}

export interface SubproductoObtenido {
  queseriaId: number;
  subproductoId: number;
  subproductoNombre: string;
  unidad: 'KG' | 'L';
  cantidad: number;
}

export interface ResultadoProduccion {
  litrosTotales: number;
  kgEsperados: number;
  kgReales: number | null;
  rendimientoRealLPorKg: number | null;
  diferenciaKg: number | null;
  diferenciaPorcentaje: number | null;
  bloques: number | null;
  pesoPromedioBloqueKg: number | null;
}

export interface InstantaneaProduccion {
  id: number;
  codigoLote: string;
  fechaProduccion: string;
  estado: EstadoProduccion;
  productoId: number;
  productoNombre: string;
  operarioId: number;
  operarioNombre: string;
  rendimientoEsperadoLPorKg: number;
  aportes: AporteProduccion[];
  insumos: InsumoUtilizado[];
  subproductos: SubproductoObtenido[];
  resultado: ResultadoProduccion;
  observaciones: string | null;
  motivoPerdida: string | null;
}

export interface LoteProduccion extends InstantaneaProduccion {
  creadoPorUsuarioId: number;
  actualizadoPorUsuarioId: number;
  cerradoPorUsuarioId: number | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaCierre: string | null;
}

export interface CorreccionProduccion {
  id: number;
  actorUsuarioId: number;
  fecha: string;
  motivo: string;
  antes: InstantaneaProduccion;
  despues: InstantaneaProduccion;
}

export interface DetalleProduccion {
  produccion: LoteProduccion;
  correcciones: CorreccionProduccion[];
}

export interface ResumenLoteProduccion {
  id: number;
  queseriaId: number;
  codigoLote: string;
  fechaProduccion: string;
  estado: EstadoProduccion;
  productoId: number;
  productoNombre: string;
  operarioId: number;
  operarioNombre: string;
  litrosTotales: number;
  kgEsperados: number;
  kgReales: number | null;
  fechaCierre: string | null;
}

export interface FiltroLotesProduccion {
  desde?: string | null;
  hasta?: string | null;
  estado?: EstadoProduccion | null;
  productoId?: number | null;
  proveedorId?: number | null;
  codigoLote?: string | null;
  operarioId?: number | null;
  page?: number;
  size?: number;
}

export interface IndicadoresProduccion {
  totalLotes: number;
  enProceso: number;
  finalizadas: number;
  perdidasTotales: number;
  litrosTodosEstados: number;
  kgEsperadosTodosEstados: number;
  litrosFinalizados: number;
  kgEsperadosFinalizados: number;
  kgRealesFinalizados: number;
  diferenciaKgFinalizados: number;
}

export interface DistribucionProductoProduccion {
  productoId: number;
  productoNombre: string;
  totalLotes: number;
  enProceso: number;
  finalizadas: number;
  perdidasTotales: number;
  litrosTodosEstados: number;
  kgEsperadosTodosEstados: number;
  kgRealesFinalizados: number;
}

export interface ResumenGeneralProduccion {
  periodo: { desde: string | null; hasta: string | null };
  indicadores: IndicadoresProduccion;
  rendimientoGlobalRealLPorKg: number | null;
  distribucionPorProducto: DistribucionProductoProduccion[];
}
