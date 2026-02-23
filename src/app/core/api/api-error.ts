import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from './models';

export function parseApiError(err: unknown): { status?: number; message: string; fields?: Record<string, string[]> } {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiErrorBody> | string | null;

    if (body && typeof body === 'object') {
      return {
        status: err.status,
        message: body.message ?? err.message ?? 'Error',
        fields: body.fields,
      };
    }

    return {
      status: err.status,
      message: typeof body === 'string' ? body : err.message ?? 'Error',
    };
  }

  return { message: 'Error inesperado' };
}