import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AuthFeedbackService } from './auth-feedback.service';

describe('AuthFeedbackService', () => {
  let service: AuthFeedbackService;

  beforeEach(() => service = TestBed.inject(AuthFeedbackService));
  afterEach(() => service.dismiss());

  it('publishes and dismisses permission feedback', () => {
    service.permissionDenied();
    expect(service.feedback()).toEqual({
      title: 'Permiso insuficiente',
      detail: 'No tienes permisos para realizar esta acción.',
    });
    service.dismiss();
    expect(service.feedback()).toBeNull();
  });

  it('automatically clears expired-session feedback', fakeAsync(() => {
    service.sessionExpired();
    expect(service.feedback()?.title).toBe('Sesión finalizada');
    tick(6000);
    expect(service.feedback()).toBeNull();
  }));
});
