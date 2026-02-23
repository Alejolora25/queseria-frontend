import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CrearMuestraReq, MuestraResp, PageResp } from './models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MuestrasApi {
  private http = inject(HttpClient);

  crear(body: CrearMuestraReq): Observable<MuestraResp> {
    return this.http.post<MuestraResp>('/api/v1/muestras', body);
  }

  historico(params: {
    proveedorId: number;
    desde: string;  // OffsetDateTime ISO
    hasta: string;  // OffsetDateTime ISO
    limit: number;
    offset: number;
  }): Observable<PageResp<MuestraResp>> {
    const httpParams = new HttpParams()
      .set('proveedorId', params.proveedorId)
      .set('desde', params.desde)
      .set('hasta', params.hasta)
      .set('limit', params.limit)
      .set('offset', params.offset);

    return this.http.get<PageResp<MuestraResp>>('/api/v1/muestras', { params: httpParams });
  }
}