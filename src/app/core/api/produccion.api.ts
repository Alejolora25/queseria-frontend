import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AbrirProduccionRequest, CorregirFinalizadaRequest, CorregirPerdidaRequest,
  DetalleProduccion, EditarProduccionRequest,
  FiltroCatalogoProduccion, FiltroLotesProduccion, FinalizarProduccionRequest,
  InsumoProduccion, InsumoRequest, LoteProduccion, OperarioProduccion,
  OperarioRequest, PaginaProduccion, ProductoProduccion, ProductoRequest,
  RegistrarPerdidaTotalRequest, ResumenGeneralProduccion, ResumenLoteProduccion,
  SubproductoProduccion, SubproductoRequest,
} from './produccion.models';

@Injectable({ providedIn: 'root' })
export class ProduccionApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/produccion';

  listarProductos(filtro: FiltroCatalogoProduccion = {}) {
    return this.listarCatalogo<ProductoProduccion>('productos', filtro);
  }
  consultarProducto(id: number) {
    return this.consultarCatalogo<ProductoProduccion>('productos', id);
  }
  crearProducto(datos: ProductoRequest) {
    return this.http.post<ProductoProduccion>(`${this.base}/productos`, datos);
  }
  actualizarProducto(id: number, datos: ProductoRequest) {
    return this.http.put<ProductoProduccion>(`${this.base}/productos/${id}`, datos);
  }
  cambiarEstadoProducto(id: number, activo: boolean) {
    return this.cambiarEstadoCatalogo<ProductoProduccion>('productos', id, activo);
  }

  listarInsumos(filtro: FiltroCatalogoProduccion = {}) {
    return this.listarCatalogo<InsumoProduccion>('insumos', filtro);
  }
  consultarInsumo(id: number) {
    return this.consultarCatalogo<InsumoProduccion>('insumos', id);
  }
  crearInsumo(datos: InsumoRequest) {
    return this.http.post<InsumoProduccion>(`${this.base}/insumos`, datos);
  }
  actualizarInsumo(id: number, datos: InsumoRequest) {
    return this.http.put<InsumoProduccion>(`${this.base}/insumos/${id}`, datos);
  }
  cambiarEstadoInsumo(id: number, activo: boolean) {
    return this.cambiarEstadoCatalogo<InsumoProduccion>('insumos', id, activo);
  }

  listarSubproductos(filtro: FiltroCatalogoProduccion = {}) {
    return this.listarCatalogo<SubproductoProduccion>('subproductos', filtro);
  }
  consultarSubproducto(id: number) {
    return this.consultarCatalogo<SubproductoProduccion>('subproductos', id);
  }
  crearSubproducto(datos: SubproductoRequest) {
    return this.http.post<SubproductoProduccion>(`${this.base}/subproductos`, datos);
  }
  actualizarSubproducto(id: number, datos: SubproductoRequest) {
    return this.http.put<SubproductoProduccion>(`${this.base}/subproductos/${id}`, datos);
  }
  cambiarEstadoSubproducto(id: number, activo: boolean) {
    return this.cambiarEstadoCatalogo<SubproductoProduccion>('subproductos', id, activo);
  }

  listarOperarios(filtro: FiltroCatalogoProduccion = {}) {
    return this.listarCatalogo<OperarioProduccion>('operarios', filtro);
  }
  consultarOperario(id: number) {
    return this.consultarCatalogo<OperarioProduccion>('operarios', id);
  }
  crearOperario(datos: OperarioRequest) {
    return this.http.post<OperarioProduccion>(`${this.base}/operarios`, datos);
  }
  actualizarOperario(id: number, datos: OperarioRequest) {
    return this.http.put<OperarioProduccion>(`${this.base}/operarios/${id}`, datos);
  }
  cambiarEstadoOperario(id: number, activo: boolean) {
    return this.cambiarEstadoCatalogo<OperarioProduccion>('operarios', id, activo);
  }

  abrir(datos: AbrirProduccionRequest) {
    return this.http.post<LoteProduccion>(`${this.base}/producciones`, datos);
  }
  listar(filtro: FiltroLotesProduccion = {}) {
    const params: Record<string, string> = {
      page: String(filtro.page ?? 0), size: String(filtro.size ?? 20),
    };
    for (const clave of ['desde', 'hasta', 'estado', 'productoId', 'proveedorId',
      'codigoLote', 'operarioId'] as const) {
      const valor = filtro[clave];
      if (valor !== null && valor !== undefined && valor !== '') {
        params[clave] = String(valor);
      }
    }
    return this.http.get<PaginaProduccion<ResumenLoteProduccion>>(
      `${this.base}/producciones`, { params });
  }
  consultar(id: number) {
    return this.http.get<DetalleProduccion>(`${this.base}/producciones/${id}`);
  }
  editar(id: number, datos: EditarProduccionRequest) {
    return this.http.put<LoteProduccion>(`${this.base}/producciones/${id}`, datos);
  }
  finalizar(id: number, datos: FinalizarProduccionRequest) {
    return this.http.patch<LoteProduccion>(`${this.base}/producciones/${id}/finalizar`, datos);
  }
  registrarPerdidaTotal(id: number, datos: RegistrarPerdidaTotalRequest) {
    return this.http.patch<LoteProduccion>(`${this.base}/producciones/${id}/perdida-total`, datos);
  }
  corregirFinalizada(id: number, datos: CorregirFinalizadaRequest) {
    return this.http.patch<LoteProduccion>(`${this.base}/producciones/${id}/corregir-finalizada`, datos);
  }
  corregirPerdida(id: number, datos: CorregirPerdidaRequest) {
    return this.http.patch<LoteProduccion>(`${this.base}/producciones/${id}/corregir-perdida`, datos);
  }
  resumen(periodo: { desde?: string | null; hasta?: string | null } = {}) {
    const params: Record<string, string> = {};
    if (periodo.desde) params['desde'] = periodo.desde;
    if (periodo.hasta) params['hasta'] = periodo.hasta;
    return this.http.get<ResumenGeneralProduccion>(`${this.base}/resumen`, { params });
  }

  private listarCatalogo<T>(tipo: string, filtro: FiltroCatalogoProduccion) {
    const params: Record<string, string> = {
      q: (filtro.q ?? '').trim(), page: String(filtro.page ?? 0),
      size: String(filtro.size ?? 20),
    };
    if (filtro.estado) params['estado'] = filtro.estado;
    return this.http.get<PaginaProduccion<T>>(`${this.base}/${tipo}`, { params });
  }

  private consultarCatalogo<T>(tipo: string, id: number) {
    return this.http.get<T>(`${this.base}/${tipo}/${id}`);
  }

  private cambiarEstadoCatalogo<T>(tipo: string, id: number, activo: boolean) {
    return this.http.patch<T>(`${this.base}/${tipo}/${id}/${activo ? 'activar' : 'desactivar'}`, {});
  }
}
