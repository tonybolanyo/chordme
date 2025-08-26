---
layout: default
lang: es
title: Guía de manejo de errores
---

# Guía de manejo de errores

Esta guía cubre el sistema integral de manejo de errores en ChordMe, incluyendo formatos de respuesta de error, manejo de errores del lado del cliente, mecanismos de reintento y resolución de problemas.

## Formato de respuesta de error

ChordMe utiliza un formato de respuesta de error estandarizado que proporciona información estructurada sobre errores, incluyendo códigos de error, categorías y orientación de reintento.

### Respuesta de error estándar

Todos los errores de API siguen esta estructura:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje de error amigable para el usuario",
    "category": "error_category",
    "retryable": true|false,
    "details": { /* Detalles adicionales en modo de depuración */ }
  }
}
```

### Respuesta de error heredada

Para compatibilidad con versiones anteriores, algunos errores pueden usar el formato heredado:

```json
{
  "status": "error",
  "error": "Cadena de mensaje de error"
}
```

## Categorías de errores

Los errores se categorizan para ayudar con el manejo y la experiencia del usuario:

### Errores de validación (`validation`)
- **Reintentable**: `false`
- **Códigos comunes**: `INVALID_EMAIL`, `INVALID_PASSWORD`, `MISSING_REQUIRED_FIELD`
- **Estado HTTP**: 400
- **Descripción**: Datos de entrada inválidos o faltantes

### Errores de autenticación (`authentication`)
- **Reintentable**: `false`
- **Códigos comunes**: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `TOKEN_EXPIRED`
- **Estado HTTP**: 401
- **Descripción**: Problemas de autenticación de usuario

### Errores de autorización (`authorization`)
- **Reintentable**: `false`
- **Códigos comunes**: `ACCESS_DENIED`, `INSUFFICIENT_PERMISSIONS`
- **Estado HTTP**: 403
- **Descripción**: Usuario autenticado pero sin permisos

### Errores de no encontrado (`not_found`)
- **Reintentable**: `false`
- **Códigos comunes**: `USER_NOT_FOUND`, `SONG_NOT_FOUND`, `ENDPOINT_NOT_FOUND`
- **Estado HTTP**: 404
- **Descripción**: Recurso solicitado no existe

### Errores de conflicto (`conflict`)
- **Reintentable**: `false`
- **Códigos comunes**: `EMAIL_ALREADY_EXISTS`, `RESOURCE_CONFLICT`
- **Estado HTTP**: 409
- **Descripción**: Conflicto con el estado actual del recurso

### Limitación de velocidad (`rate_limit`)
- **Reintentable**: `true`
- **Códigos comunes**: `RATE_LIMIT_EXCEEDED`
- **Estado HTTP**: 429
- **Descripción**: Demasiadas solicitudes en un período de tiempo

### Errores del servidor (`server_error`)
- **Reintentable**: `true`
- **Códigos comunes**: `INTERNAL_SERVER_ERROR`, `DATABASE_ERROR`, `SERVICE_UNAVAILABLE`
- **Estado HTTP**: 500-503
- **Descripción**: Problemas internos del servidor

### Errores de red (`network`)
- **Reintentable**: `true`
- **Códigos comunes**: `NETWORK_ERROR`, `TIMEOUT_ERROR`
- **Estado HTTP**: 0
- **Descripción**: Problemas de conectividad de red

## Manejo de errores del frontend

ChordMe proporciona manejo integral de errores del lado del cliente con límites de error globales, sistemas de notificación y mecanismos de reintento.

### Contexto de error

El contexto de error proporciona gestión global del estado de error:

```typescript
import { useError } from '../contexts/ErrorContext';

function MyComponent() {
  const { addError, addNotification, isRetryableError } = useError();
  
  // Agregar un error
  addError({
    message: 'Algo salió mal',
    code: 'NETWORK_ERROR',
    category: 'network',
    retryable: true
  });
  
  // Agregar una notificación
  addNotification({
    message: 'Operación completada exitosamente',
    type: 'info'
  });
}
```

### Límite de error

Envuelve tu aplicación con el límite de error para capturar errores de React:

```typescript
import ErrorBoundary from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <TuAplicacion />
    </ErrorBoundary>
  );
}
```

### Sistema de notificación

Las notificaciones muestran automáticamente errores y mensajes de estado:

```typescript
// Los errores se muestran automáticamente cuando se agregan
addError({ message: 'Error de red', retryable: true });

// Las notificaciones pueden mostrarse manualmente
addNotification({ 
  message: 'Datos guardados', 
  type: 'success',
  duration: 3000 
});
```

### Mecanismos de reintento

Los errores reintentables incluyen automáticamente opciones de reintento:

```typescript
// Reintentos automáticos para errores de red
const response = await apiCall({
  retries: 3,
  backoff: 'exponential'
});

// Reintentos manuales a través de la interfaz de usuario
<ErrorBoundary retryable onRetry={handleRetry}>
  <ComponenteConError />
</ErrorBoundary>
```

## Resolución de problemas

### Escenarios de error comunes

#### "Tu sesión ha expirado. Por favor, inicia sesión nuevamente"
- **Causa**: El token JWT ha expirado
- **Solución**: 
  1. Haz clic en el enlace de inicio de sesión
  2. Vuelve a ingresar tus credenciales
  3. Tu sesión se renovará

#### "Error de red. Por favor, verifica tu conexión y vuelve a intentar"
- **Causa**: Problemas de conexión a Internet o servidor no disponible
- **Solución**:
  1. Verifica tu conexión a Internet
  2. Espera un momento y vuelve a intentar
  3. Si el problema persiste, el servicio puede estar temporalmente inactivo

#### "Demasiadas solicitudes. Por favor, inténtalo más tarde"
- **Causa**: Limitación de velocidad para prevenir abuso
- **Solución**:
  1. Espera unos minutos antes de intentar nuevamente
  2. Reduce la frecuencia de tus solicitudes

#### "Email o contraseña inválidos"
- **Causa**: Credenciales de inicio de sesión incorrectas
- **Solución**:
  1. Verifica dos veces tu dirección de email
  2. Verifica tu contraseña (revisa el bloqueo de mayúsculas)
  3. Usa la opción "Olvidé mi contraseña" si es necesario

#### "Ya existe una cuenta con este email"
- **Causa**: Intentando registrarse con un email ya utilizado
- **Solución**:
  1. Usa la opción de inicio de sesión en su lugar
  2. Usa la función "Olvidé mi contraseña" si no recuerdas la contraseña
  3. Contacta soporte si crees que esto es un error

### Pasos de recuperación de errores

1. **Verifica los mensajes de error**: Lee cuidadosamente el mensaje de error para orientación
2. **Intenta soluciones simples**: Actualiza la página, verifica la conexión a Internet
3. **Usa opciones de reintento**: Para errores reintentables, usa el botón de reintentar
4. **Limpia datos del navegador**: Limpia caché y cookies si los problemas persisten
5. **Contacta soporte**: Proporciona detalles del error si el problema continúa

### Depuración para desarrolladores

#### Verificación de detalles de error

En modo de desarrollo, los errores incluyen información adicional de depuración:

```typescript
// Error con detalles de depuración
{
  "status": "error",
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Error interno del servidor",
    "category": "server_error",
    "retryable": true,
    "details": {
      "stack": "...",
      "query": "...",
      "timestamp": "..."
    }
  }
}
```

#### Registro de errores

Los errores se registran automáticamente en diferentes niveles:

```typescript
// Registro automático basado en categoría
console.error('Error de red:', error); // network errors
console.warn('Error de validación:', error); // validation errors
console.info('Error reintentable:', error); // retryable errors
```

#### Pruebas de escenarios de error

Usa las utilidades de prueba para simular errores:

```typescript
// Pruebas del frontend
import { createApiError, createNetworkError } from '../contexts/ErrorContext';

// Pruebas del backend
from chordme.utils import create_error_response
response = create_error_response("Error de prueba", error_code="TEST_ERROR")
```

## Mejores prácticas

### Para usuarios

1. **Lee los mensajes de error**: Los mensajes de error están diseñados para ser útiles - léelos cuidadosamente
2. **Prueba soluciones simples primero**: Verifica tu conexión a Internet, actualiza la página
3. **No reintentes repetidamente**: La aplicación reintentará automáticamente cuando sea apropiado
4. **Contacta soporte**: Si los errores persisten, contacta soporte con los detalles del error

### Para desarrolladores

1. **Usa errores estructurados**: Siempre usa códigos de error y categorías para nuevos errores
2. **Proporciona mensajes amigables**: Los mensajes de error deben ser accionables para los usuarios
3. **Registra apropiadamente**: Registra suficientes detalles para depuración sin exponer datos sensibles
4. **Prueba escenarios de error**: Incluye casos de error en tus pruebas
5. **Maneja reintentos con gracia**: Implementa retroceso exponencial para operaciones reintentables

## Referencia de códigos de error

| Código | Categoría | HTTP | Reintentable | Descripción |
|--------|-----------|------|-------------|-------------|
| `INVALID_EMAIL` | validation | 400 | No | Formato de email inválido |
| `INVALID_PASSWORD` | validation | 400 | No | Contraseña no cumple requisitos |
| `MISSING_REQUIRED_FIELD` | validation | 400 | No | Campo requerido faltante |
| `INVALID_CREDENTIALS` | authentication | 401 | No | Email o contraseña incorrectos |
| `ACCOUNT_LOCKED` | authentication | 401 | No | Cuenta bloqueada por seguridad |
| `TOKEN_EXPIRED` | authentication | 401 | No | Token de sesión expirado |
| `ACCESS_DENIED` | authorization | 403 | No | Acceso denegado |
| `INSUFFICIENT_PERMISSIONS` | authorization | 403 | No | Permisos insuficientes |
| `USER_NOT_FOUND` | not_found | 404 | No | Usuario no encontrado |
| `SONG_NOT_FOUND` | not_found | 404 | No | Canción no encontrada |
| `ENDPOINT_NOT_FOUND` | not_found | 404 | No | Endpoint de API no encontrado |
| `EMAIL_ALREADY_EXISTS` | conflict | 409 | No | Email ya registrado |
| `RESOURCE_CONFLICT` | conflict | 409 | No | Conflicto de recurso detectado |
| `RATE_LIMIT_EXCEEDED` | rate_limit | 429 | Sí | Demasiadas solicitudes |
| `INTERNAL_SERVER_ERROR` | server_error | 500 | Sí | Error interno inesperado del servidor |
| `DATABASE_ERROR` | server_error | 503 | Sí | Base de datos temporalmente no disponible |
| `SERVICE_UNAVAILABLE` | server_error | 503 | Sí | Servicio temporalmente no disponible |
| `NETWORK_ERROR` | network | 0 | Sí | Problema de conectividad de red |
| `TIMEOUT_ERROR` | network | 0 | Sí | Tiempo de espera de solicitud agotado |

Este sistema integral de manejo de errores asegura una mejor experiencia de usuario y depuración más fácil para los desarrolladores.

---

**Cambia idioma:** [English](error-handling-guide.md) | **Español**