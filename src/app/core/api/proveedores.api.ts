import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrearProveedorReq, ProveedorResp, PageResp } from './models';

@Injectable({ providedIn: 'root' })
export class ProveedoresApi {
  private http = inject(HttpClient);

  crear(req: CrearProveedorReq) {
    return this.http.post<ProveedorResp>('/api/v1/proveedores', req);
  }

  porId(id: number) {
    return this.http.get<ProveedorResp>(`/api/v1/proveedores/${id}`);
  }

  porIdentificacion(identificacion: string) {
    return this.http.get<ProveedorResp>(`/api/v1/proveedores`, { params: { identificacion } });
  }

  listar(args: { q?: string; activo?: boolean | null; limit: number; offset: number }) {
    const params: Record<string, string> = {
      q: (args.q ?? '').trim(),
      limit: String(args.limit),
      offset: String(args.offset),
    };

    if (args.activo !== null && args.activo !== undefined) {
      params['activo'] = String(args.activo); // "true"/"false"
    }

    return this.http.get<PageResp<ProveedorResp>>('/api/v1/proveedores', { params });
  }
}