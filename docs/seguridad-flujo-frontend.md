# Seguridad frontend: flujo, rutas y roles

## Objetivo

Este documento define el comportamiento del frontend para autenticación, redirecciones y visibilidad por rol. Las etapas 2 a 7 implementan login, sesión, interceptor JWT y guards de sesión y rol. El backoffice funcional de usuarios sigue pendiente.

## Roles iniciales

- `ADMIN`: acceso funcional completo y futura administración de usuarios.
- `OPERADOR`: operación diaria sobre proveedores y muestras.
- `LECTOR`: acceso únicamente de consulta.

Los roles son fijos en esta fase. La interfaz puede ocultar navegación y acciones, pero el backend es siempre la autoridad definitiva.

## Pantalla de login

La aplicación tendrá una ruta pública:

```text
/login
```

La pantalla será independiente del shell privado y no mostrará menú lateral ni encabezado de las áreas operativas.

Elementos previstos:

- Identidad visual de la quesería.
- Campo de correo electrónico.
- Campo de contraseña con opción para mostrar u ocultar el contenido.
- Botón `Iniciar sesión`.
- Indicador de carga durante la solicitud.
- Validación de campos requeridos y formato de correo.
- Mensaje general para credenciales incorrectas.
- Diseño responsive mediante PrimeNG y Tailwind CSS.

No se contemplan todavía registro público, recuperación de contraseña, refresh token ni proveedores de identidad externos.

## Redirección posterior al login

### Acceso directo al login

Si el usuario abre `/login` directamente y se autentica correctamente, será dirigido a:

```text
/calidad/historico
```

Histórico es la página inicial común porque `ADMIN`, `OPERADOR` y `LECTOR` pueden consultarla.

### Intento de acceso a una ruta privada

Si un usuario sin sesión intenta abrir una ruta privada, el guard conservará el destino en `returnUrl`:

```text
/proveedores
  -> /login?returnUrl=/proveedores
  -> /proveedores
```

Después del login se regresará al destino original. Solo se aceptarán rutas internas de la aplicación; valores absolutos, protocolos o destinos externos serán descartados para evitar redirecciones abiertas.

### Usuario autenticado en `/login`

Un usuario con sesión válida que intente abrir `/login` será dirigido a `/calidad/historico`.

## Mapa de rutas

| Ruta | Pública | ADMIN | OPERADOR | LECTOR |
|---|---:|---:|---:|---:|
| `/login` | Sí | Redirige | Redirige | Redirige |
| `/proveedores` | No | Sí | Sí | Sí |
| `/calidad/cargar` | No | Sí | Sí | No |
| `/calidad/historico` | No | Sí | Sí | Sí |
| `/calidad/resumen` | No | Sí | Sí | Sí |
| `/admin/**` | No | Sí | No | No |

La ruta `/admin` ya está reservada para `ADMIN` y muestra temporalmente una pantalla informativa. La administración funcional de usuarios se implementará en la Etapa 8, cuando existan sus endpoints de backend.

## Navegación y acciones por rol

### ADMIN

Navegación visible:

- Proveedores.
- Cargar muestra.
- Histórico.
- Resumen.
- Administración de usuarios, cuando se implemente.

Acciones permitidas:

- Consultar información de negocio.
- Crear y editar proveedores.
- Activar y desactivar proveedores.
- Registrar muestras.
- Administrar usuarios y asignar exactamente un rol fijo por usuario.

### OPERADOR

Navegación visible:

- Proveedores.
- Cargar muestra.
- Histórico.
- Resumen.

Acciones permitidas:

- Consultar información de negocio.
- Crear y editar proveedores.
- Activar y desactivar proveedores.
- Registrar muestras.

No tendrá acceso a administración de usuarios.

### LECTOR

Navegación visible:

- Proveedores.
- Histórico.
- Resumen.

No verá:

- Cargar muestra.
- Administración de usuarios.
- Acciones para crear, editar, activar o desactivar proveedores.
- Acciones para registrar muestras.

La experiencia será de solo consulta.

## Respuestas de seguridad

### `401 Unauthorized`

Representa ausencia de sesión o token inválido/expirado.

Comportamiento implementado desde la Etapa 5:

- Limpiar la sesión local.
- Redirigir a `/login` cuando corresponda.
- Conservar una ruta interna segura como `returnUrl`.
- Evitar bucles cuando el propio login responda `401`.
- Enviar `Authorization: Bearer <token>` solo a peticiones protegidas del backend configurado.

### `403 Forbidden`

Representa un usuario autenticado que no tiene el rol requerido.

Comportamiento aplicado por los guards de rol:

- Mantener la sesión.
- No borrar el token.
- Mostrar un mensaje de permiso insuficiente.
- Redirigir a una ruta permitida, normalmente `/calidad/historico`, si la ruta completa está prohibida.

## Separación visual

El shell con menú y encabezado pertenece únicamente a las rutas privadas. `/login` se renderiza sin ese shell. Desde la Etapa 6, los guards impiden cargar rutas privadas sin sesión y evitan que un usuario autenticado vuelva al login.

## Decisiones para las siguientes etapas

- Etapa 2: modelos `LoginRequest`, `LoginResponse` y `UsuarioSesion`; `AuthApi` y `AuthService`.
- Etapa 3: componente y ruta `/login`.
- Etapa 4: mecanismo de almacenamiento, restauración de sesión y logout.
- Etapa 5: interceptor Bearer y tratamiento global de `401`.
- Etapa 6: guards de sesión y redirecciones implementados en las rutas privadas actuales.
- Etapa 7: guard de rol, ruta `/admin`, navegación por rol y acciones de proveedores restringidas en la interfaz.
- Etapa 8: interfaz de administración de usuarios.

La Etapa 4 adoptó `sessionStorage`: la sesión sobrevive a una recarga dentro de la misma pestaña, pero se elimina al cerrar la pestaña o el navegador. Se persisten el token, los datos públicos del usuario y su vencimiento; nunca la contraseña. Al restaurar, se valida la estructura y se descartan sesiones dañadas o expiradas. Esta elección reduce la persistencia frente a `localStorage`, aunque ambos mecanismos siguen expuestos ante XSS porque son accesibles desde JavaScript. No se usará NgRx por ahora; el estado de sesión se gestiona con Angular Signals y RxJS.

## Fuera de alcance

- Cambios en backend o endpoints.
- Refresh token.
- Autorización fina del backend.
- Recuperación de contraseña.
- Registro público.
- Multiquesería activa.
- Creación dinámica de roles.
- Deploy, commit o push.
