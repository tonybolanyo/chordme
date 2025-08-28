---
layout: default
lang: es
title: Implementación de documentación de API
---

# Implementación de documentación de API

Este documento describe la implementación de la documentación de la API para ChordMe usando Swagger/OpenAPI.

## Descripción general

La documentación de la API de ChordMe se genera automáticamente desde el código de la aplicación Flask usando [Flasgger](https://github.com/flasgger/flasgger), que crea especificaciones Swagger/OpenAPI 2.0.

## Componentes

### 1. Integración del backend

**Archivo**: `backend/chordme/__init__.py`

- Configura Flasgger con plantilla Swagger completa
- Define modelos de datos (Usuario, Canción, Error, Éxito)
- Configura Swagger UI en `/apidocs/`
- Proporciona especificación API en `/apispec.json`

**Archivo**: `backend/chordme/api.py`

- Cadenas de documentación mejoradas con especificaciones Swagger YAML
- Documentación completa de endpoints incluyendo:
  - Parámetros y cuerpos de petición
  - Esquemas de respuesta y códigos de estado
  - Requisitos de autenticación
  - Información de limitación de velocidad

### 2. Generación de documentación

**Archivo**: `backend/generate_docs.py`

Script automatizado que:
- Inicia servidor Flask temporalmente
- Obtiene especificación Swagger JSON
- Genera archivos de documentación estática:
  - `docs/swagger.json` - Especificación OpenAPI
  - `docs/index.html` - Interfaz Swagger UI
  - `docs/README.md` - Descripción general de documentación

**Uso**:
```bash
cd backend
python generate_docs.py
```

### 3. Flujos de trabajo de GitHub Actions

**Archivo**: `.github/workflows/update-api-docs.yml`

Se activa en:
- Push a rama principal
- Pull requests a rama principal
- Cambios en archivos relacionados con API

Acciones:
- Instala dependencias
- Genera documentación
- Confirma cambios (en push)
- Sube artefactos (en PR)

**Archivo**: `.github/workflows/deploy-api-docs.yml`

Se activa en:
- Push a rama principal con cambios en docs
- Ejecución manual de flujo de trabajo

Acciones:
- Construye sitio Jekyll desde docs
- Despliega a GitHub Pages

### 4. Configuración de GitHub Pages

**Archivo**: `docs/_config.yml`

- Configura tema Jekyll
- Establece metadatos apropiados
- Habilita plugins requeridos

## Acceso a documentación de API

- **Desarrollo**: http://localhost:5000/apidocs/
- **Producción**: https://tonybolanyo.github.io/chordme/

## Endpoints documentados

### Autenticación
- `POST /api/v1/auth/register` - Registro de usuario
- `POST /api/v1/auth/login` - Inicio de sesión de usuario

### Sistema
- `GET /api/v1/health` - Verificación de salud
- `GET /api/v1/csrf-token` - Generación de token CSRF

### Canciones
- `GET /api/v1/songs` - Listar canciones del usuario
- `POST /api/v1/songs` - Crear nueva canción
- `GET /api/v1/songs/{id}` - Obtener canción específica
- `PUT /api/v1/songs/{id}` - Actualizar canción
- `DELETE /api/v1/songs/{id}` - Eliminar canción
- `GET /api/v1/songs/{id}/download` - Descargar archivo de canción
- `POST /api/v1/songs/validate-chordpro` - Validar contenido ChordPro
- `POST /api/v1/songs/transpose-chordpro` - Transponer contenido ChordPro

## Modelos de datos

### Usuario
- `id` (entero): ID de usuario
- `email` (cadena): Dirección de correo electrónico
- `created_at` (fecha/hora): Timestamp de creación de cuenta

### Canción
- `id` (entero): ID de canción
- `title` (cadena): Título de canción
- `content` (cadena): Contenido ChordPro
- `author_id` (entero): ID de usuario propietario
- `created_at` (fecha/hora): Timestamp de creación
- `updated_at` (fecha/hora): Timestamp de última actualización
- `shared_with` (array): Lista de IDs de usuario que tienen acceso a esta canción
- `permissions` (objeto): Mapeo de IDs de usuario a niveles de permisos ("read", "edit", "admin")
- `share_settings` (cadena): Configuración de visibilidad ("private", "public", "link-shared")

### Modelos de respuesta
- `Success`: Envoltorio de respuesta de éxito estándar
- `Error`: Envoltorio de respuesta de error estándar

## Modelo de compartición

### Descripción general

La API de ChordMe soporta capacidades completas de compartición de canciones con controles de permisos granulares y características de colaboración en tiempo real.

### Niveles de permisos

- **read**: El usuario puede ver el contenido de la canción y descargarlo
- **edit**: El usuario puede ver y modificar el contenido de la canción en tiempo real
- **admin**: El usuario puede ver, modificar y gestionar configuraciones de compartición
- **owner**: Control completo sobre canción y compartición (asignado automáticamente)

### Configuraciones de compartición

- **private**: La canción solo es accesible para el propietario y usuarios explícitamente compartidos
- **public**: La canción es accesible para todos los usuarios autenticados (característica futura)
- **link-shared**: La canción es accesible vía enlaces compartibles (característica futura)

### Flujo de trabajo de compartición

1. **Crear una canción**: La canción comienza como privada por defecto
2. **Compartir con usuarios**: Use POST `/songs/{id}/share` para agregar colaboradores
3. **Modificar permisos**: Use PUT `/songs/{id}/permissions` para actualizar niveles de acceso
4. **Monitorear colaboración**: Use GET `/songs/{id}/collaborators` para ver todos los usuarios
5. **Remover acceso**: Use DELETE `/songs/{id}/share/{user_id}` para revocar acceso

### Características de colaboración en tiempo real

Cuando la integración con Firebase está habilitada, la API soporta:

- **Transformación operacional**: Edición concurrente libre de conflictos
- **Seguimiento de cursor en vivo**: Compartición de posición de cursor en tiempo real
- **Gestión de presencia**: Estado de usuario activo e indicadores
- **Resolución automática de conflictos**: Fusión inteligente de ediciones simultáneas
- **Gestión de sesiones**: Ciclo de vida de sesión de edición colaborativa

### Endpoints de API para colaboración

#### Endpoints principales de compartición

- `POST /api/v1/songs/{id}/share` - Compartir canción con usuario
- `GET /api/v1/songs/{id}/collaborators` - Listar todos los colaboradores
- `PUT /api/v1/songs/{id}/permissions` - Actualizar permisos de usuario
- `DELETE /api/v1/songs/{id}/share/{user_id}` - Remover acceso de colaborador
- `GET /api/v1/songs/shared` - Listar canciones compartidas con usuario actual

#### Endpoints de sesión en tiempo real

- `POST /api/v1/collaboration/{song_id}/start` - Iniciar sesión de colaboración
- `GET /api/v1/collaboration/{song_id}/status` - Obtener estado de sesión
- `POST /api/v1/collaboration/{song_id}/operations` - Enviar operaciones de texto
- `GET /api/v1/collaboration/{song_id}/cursors` - Obtener posiciones de cursor
- `POST /api/v1/collaboration/{song_id}/presence` - Actualizar presencia de usuario

### Validación de permisos

La API implementa verificación de permisos jerárquica:

1. **Owner**: Tiene todos los permisos automáticamente
2. **Admin**: Puede realizar acciones de propietario excepto transferir propiedad
3. **Edit**: Puede modificar contenido y ver metadatos
4. **Read**: Solo puede ver y descargar contenido

La validación del lado del servidor asegura:
- Todas las operaciones verifican permisos de usuario antes de la ejecución
- Los cambios de permisos se registran para propósitos de auditoría
- Los usuarios no pueden escalar sus propios permisos
- Los permisos de propietario no pueden ser removidos o transferidos

### Indexación de base de datos

La consulta eficiente se soporta a través de índices en:
- `author_id`: Búsqueda rápida de canciones propias del usuario
- `share_settings`: Filtrado eficiente por nivel de visibilidad
- La consulta de campos JSON puede variar por implementación de base de datos

## Autenticación

La mayoría de endpoints requieren autenticación JWT:
```
Authorization: Bearer <jwt-token>
```

Obtenga tokens a través de los endpoints de autenticación.

## Pruebas

### Funcionalidad Swagger
```bash
cd backend
python test_swagger.py
```

### Cobertura de API
```bash
cd backend
python test_api_coverage.py
```

## Mantenimiento

La documentación se actualiza automáticamente cuando:
1. Los endpoints de API son modificados
2. Las cadenas de documentación son actualizadas
3. Los modelos son cambiados
4. GitHub Actions detecta cambios en archivos relevantes

Para actualizar manualmente la documentación:
1. Ejecute `python generate_docs.py` en el directorio backend
2. Confirme los cambios en el directorio `docs/`
3. GitHub Actions manejará el despliegue a GitHub Pages

## Mejoras futuras

1. **OpenAPI 3.0**: Actualizar de Swagger 2.0 a OpenAPI 3.0
2. **Ejemplos interactivos**: Agregar más ejemplos interactivos en Swagger UI
3. **Versionado de API**: Documentar múltiples versiones de API si es necesario
4. **Colección Postman**: Generar colección Postman desde especificación OpenAPI
5. **Generación SDK**: Auto-generar SDKs de cliente desde la especificación

---

**Cambiar idioma:** [English](api-documentation.md) | **Español**