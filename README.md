# Frontend de Quesería

Aplicación Angular 20 que consume el único backend modular de Quesería.

## Qué ofrece

- **Administración de plataforma:** gestiona queserías, sus administradores
  iniciales y las cuentas `PLATFORM_ADMIN`. No muestra datos privados de
  clientes.
- **Área operativa:** administra proveedores y usuarios de la quesería,
  registra muestras y analíticas de leche, y consulta históricos y resúmenes.
- **Producción:** administra productos, insumos, subproductos y operarios;
  abre y edita lotes, registra finalización o pérdida total, muestra cálculos,
  correcciones auditadas e indicadores.

La interfaz usa menús y formularios adaptables a móvil. La identidad y la
quesería provienen del backend; ninguna solicitud operativa envía un
`queseriaId` elegido por el navegador.

## Requisitos

- Node.js compatible con Angular 20.
- Dependencias instaladas mediante `npm ci`.
- Backend local disponible en `http://localhost:8080`.

## Desarrollo local

```powershell
npm ci
npm start
```

La aplicación queda disponible en `http://localhost:4200`. La URL del backend
local está definida en `src/environments/environment.ts`.

## Construcción de producción

```powershell
npm run build
```

Los artefactos se generan en `dist/queseria-frontend`. La URL productiva está en
`src/environments/environment.production.ts`.

El hostname productivo contiene el nombre histórico `calidad-leche-service`
porque identifica el servicio desplegado en Render; no representa un módulo ni
una carpeta actual del backend.

## Pruebas

```powershell
npm run test:headless
```

## Acceso y navegación

El usuario `PLATFORM_ADMIN` entra a `/plataforma`. Desde allí puede consultar,
crear, editar, activar y desactivar queserías; consultar sus administradores y
regenerar una credencial temporal con motivo; y gestionar administradores de
plataforma. La contraseña temporal se muestra únicamente al crearla o
regenerarla. Un administrador de quesería continúa entrando al área operativa,
sin acceso a este panel. Si se pierde el acceso a una cuenta de plataforma,
otro administrador activo puede regenerar su credencial; el procedimiento de
último recurso está en el [README del backend](../../backend/README.md).

| Rol | Interfaz disponible |
| --- | --- |
| `ADMIN` | Usuarios, catálogos y operaciones de su quesería; correcciones auditadas de lotes cerrados. |
| `OPERADOR` | Consulta catálogos y registra, edita y cierra lotes; no administra usuarios ni catálogos. |
| `LECTOR` | Consulta Proveedores, Calidad, Producción e indicadores; sin acciones de escritura. |

El cambio de una contraseña temporal es obligatorio antes de entrar al área
operativa o administrativa. Si la quesería está inactiva o el backend revoca el
JWT, se cierra la sesión. El frontend oculta acciones sin permiso; el backend
vuelve a validar todos los permisos y el ámbito de quesería.

## Pantallas operativas

- `/proveedores`: búsqueda, alta, edición y estado de proveedores.
- `/calidad/cargar`, `/calidad/historico` y `/calidad/resumen`: registro de
  muestras, analíticas e indicadores de leche.
- `/admin/usuarios`: cuentas y roles de la quesería, solo para `ADMIN`.
- `/produccion`: resumen; `/produccion/catalogos/:tipo`: productos, insumos,
  subproductos y operarios; `/produccion/nueva`: apertura; `/produccion/en-proceso`
  y `/produccion/lotes`: trabajo e histórico; `/produccion/producciones/:id`:
  detalle, cierre, pérdida o corrección según rol y estado.

La sección `/produccion` pertenece al área operativa y admite `ADMIN`,
`OPERADOR` y `LECTOR`; nunca a `PLATFORM_ADMIN`. Su vista inicial consulta el
resumen de Producción. Los contratos de catálogos y lotes están en
`src/app/core/api/produccion.models.ts` y `produccion.api.ts`. La quesería se
obtiene en el backend desde el token; las solicitudes Angular no la envían.
Para mostrar cifras locales, la base de trabajo debe tener aplicadas las
migraciones V10 y V11. Los formularios de catálogos y lotes ya están disponibles.

En **Producción → Catálogos** se administran productos, insumos, subproductos
y operarios. `ADMIN` puede crear, editar, activar y desactivar; `OPERADOR` y
`LECTOR` consultan y filtran. Cada catálogo ofrece búsqueda, estado y
paginación, con tarjetas en móvil. Desactivar un elemento conserva su
información en los lotes históricos.

`ADMIN` y `OPERADOR` pueden abrir lotes desde **Nuevo lote** y retomar su
edición desde **En proceso**. El formulario busca opciones activas con
paginación, admite varios proveedores y cero o más insumos, y calcula una
vista previa de litros y kg esperados. La edición mantiene los nombres y
referencias históricos ya guardados aunque se desactiven después de abrir el
lote; la fecha y el código permanecen fijos. La API confirma los resultados
guardados. `LECTOR` no ve enlaces de escritura. Las pantallas de cierre,
pérdida, corrección auditada e histórico están disponibles.

## Despliegue

Vercel construye la rama `main` para producción. Su URL de backend se define en
`src/environments/environment.production.ts` y apunta al servicio Render. Los
commits y cambios locales no despliegan nada por sí solos; un push a la rama
conectada activa el despliegue automático. El backend y su base deben estar
compatibles antes de publicar cambios de frontend que dependan de rutas nuevas.
