---
layout: default
lang: es
title: Documentación de aplicación HTTPS
---

# Documentación de aplicación HTTPS

Este documento describe la funcionalidad de aplicación HTTPS implementada en la aplicación backend de ChordMe.

## Resumen

El sistema de aplicación HTTPS redirige automáticamente peticiones HTTP a HTTPS y agrega cabeceras de seguridad para asegurar que todo el tráfico API esté cifrado. Esto es crucial para proteger datos de usuario, tokens de autenticación y comunicaciones API.

## Características

### 1. Redirección automática HTTPS
- Las peticiones HTTP se redirigen automáticamente a HTTPS con estado 301 (Redirección permanente)
- Soporta varias configuraciones de proxy (X-Forwarded-Proto, X-Forwarded-SSL, etc.)
- Mantiene parámetros de consulta y rutas de petición durante redirección

### 2. Cabeceras HSTS (HTTP Strict Transport Security)
- Agrega automáticamente cabeceras HSTS a respuestas HTTPS
- Configurado con max-age de 1 año y directiva includeSubDomains
- Incluye directiva preload en producción para seguridad mejorada

### 3. Configuración flexible
- Configuración basada en entorno para diferentes escenarios de despliegue
- Detección automática basada en modo DEBUG/TESTING
- Opciones de anulación manual para requisitos específicos

### 4. Soporte de proxy y balanceador de carga
- Detecta terminación HTTPS a nivel de proxy/balanceador de carga
- Soporta cabeceras de proxy comunes usadas por principales proveedores de nube
- Funciona con configuraciones de proxy reverso

## Configuración

### Opciones de configuración

La aplicación HTTPS puede configurarse de tres maneras:

1. **Configuración de aplicación** (prioridad más alta)
2. **Variables de entorno** (prioridad media)  
3. **Detección automática** (prioridad más baja)

### Configuración de aplicación

Establecer en tu archivo de configuración (config.py):

```python
# Aplicación HTTPS explícita
HTTPS_ENFORCED = True   # Siempre aplicar HTTPS
HTTPS_ENFORCED = False  # Nunca aplicar HTTPS
HTTPS_ENFORCED = None   # Auto-detectar basado en entorno
```

### Variables de entorno

Establecer la variable de entorno `HTTPS_ENFORCED`:

```bash
# Habilitar aplicación HTTPS
export HTTPS_ENFORCED=true

# Deshabilitar aplicación HTTPS  
export HTTPS_ENFORCED=false

# Usar auto-detección (por defecto)
unset HTTPS_ENFORCED
```

Valores aceptados para habilitar: `true`, `True`, `1`, `yes`, `YES`, `on`, `ON`
Valores aceptados para deshabilitar: `false`, `False`, `0`, `no`, `NO`, `off`, `OFF`

### Detección automática

Cuando no se proporciona configuración explícita, la aplicación HTTPS está:
- **Habilitada** en modo producción (`DEBUG=False` y `TESTING=False`)
- **Deshabilitada** en modo desarrollo (`DEBUG=True`)
- **Deshabilitada** en modo pruebas (`TESTING=True`)

## Escenarios de despliegue

### Despliegue de producción

Para despliegues de producción, la aplicación HTTPS típicamente se habilita automáticamente:

```python
# Configuración de producción
DEBUG = False
TESTING = False
HTTPS_ENFORCED = None  # Auto-detectar (será True)
```

O explícitamente:

```python
# Configuración explícita de producción
HTTPS_ENFORCED = True
```

### Entorno de desarrollo

Para desarrollo, la aplicación HTTPS está deshabilitada por defecto para permitir pruebas más fáciles:

```python
# Configuración de desarrollo
DEBUG = True
HTTPS_ENFORCED = None  # Auto-detectar (será False)
```

#### HTTPS en desarrollo (Opcional)

Para probar comportamiento HTTPS en desarrollo:

1. **Instalar pyopenssl** (para certificados auto-firmados):
   ```bash
   pip install pyopenssl
   ```

2. **Habilitar HTTPS de desarrollo**:
   ```bash
   export FLASK_SSL_DEV=true
   export HTTPS_ENFORCED=true
   python run.py
   ```

3. **Acceder la aplicación**:
   ```
   https://localhost:5000
   ```
   Nota: El navegador mostrará advertencia de seguridad para certificado auto-firmado.

### Entorno de pruebas

En pruebas, la aplicación HTTPS está deshabilitada para evitar complicaciones de pruebas:

```python
# Configuración de pruebas
TESTING = True
HTTPS_ENFORCED = False  # Explícitamente deshabilitado para pruebas
```

## Configuración de proxy y balanceador de carga

### Cabeceras soportadas

El sistema detecta HTTPS a través de estas cabeceras:

- `X-Forwarded-Proto: https`
- `X-Forwarded-SSL: on`
- `X-Scheme: https`
- `HTTP_X_FORWARDED_PROTO: https`

### Configuraciones comunes

#### AWS Application Load Balancer
```
X-Forwarded-Proto: https
```

#### Nginx Reverse Proxy
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

#### Cloudflare
```
X-Forwarded-Proto: https
```

#### Apache Reverse Proxy
```apache
ProxyPreserveHost On
ProxyPass / http://backend:5000/
ProxyPassReverse / http://backend:5000/
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
```

## Cabeceras de seguridad

### HSTS (HTTP Strict Transport Security)

Cuando la aplicación HTTPS está habilitada, la siguiente cabecera se agrega a todas las respuestas:

**Modo producción:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Modo desarrollo:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Explicación de cabecera

- `max-age=31536000`: Aplicar HTTPS por 1 año (31,536,000 segundos)
- `includeSubDomains`: Aplicar a todos los subdominios
- `preload`: Elegible para listas de precarga HSTS del navegador (solo producción)

## Comportamiento de API

### Peticiones HTTP

Cuando la aplicación HTTPS está habilitada, las peticiones HTTP reciben:

**Estado:** `301 Moved Permanently`
**Ubicación:** `https://example.com/api/v1/endpoint`

Ejemplo:
```
GET http://api.example.com/api/v1/health
↓
301 Moved Permanently
Location: https://api.example.com/api/v1/health
```

### Peticiones HTTPS

Las peticiones HTTPS se procesan normalmente con cabeceras de seguridad adicionales:

```
GET https://api.example.com/api/v1/health
↓
200 OK
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Pruebas

### Pruebas manuales

Probar aplicación HTTPS manualmente:

```bash
# Probar redirección HTTP (debería devolver 301)
curl -I http://localhost:5000/api/v1/health

# Probar HTTPS (simular con cabecera)
curl -I -H "X-Forwarded-Proto: https" http://localhost:5000/api/v1/health
```

### Pruebas automatizadas

La suite de pruebas incluye pruebas integrales de aplicación HTTPS:

```bash
# Ejecutar pruebas de aplicación HTTPS
python -m pytest tests/test_https_enforcement_minimal.py -v
```

## Solución de problemas

### Problemas comunes

#### 1. Bucle de redirección
**Síntoma:** Redirecciones infinitas entre HTTP y HTTPS
**Causa:** Proxy no reenvía cabeceras correctas
**Solución:** Configurar proxy para enviar `X-Forwarded-Proto: https`

#### 2. HTTPS no aplicado
**Síntoma:** Peticiones HTTP no redirigidas a HTTPS
**Causa:** Aplicación HTTPS deshabilitada o mal configurada
**Solución:** Verificar configuración y variables de entorno

#### 3. Problemas HTTPS de desarrollo
**Síntoma:** No se puede acceder HTTPS en desarrollo
**Causa:** pyopenssl faltante o SSL mal configurado
**Solución:** Instalar pyopenssl y verificar variables de entorno

### Depuración

Habilitar registro de depuración para solucionar problemas de aplicación HTTPS:

```python
import logging
logging.basicConfig(level=logging.INFO)

# Verificar configuración
with app.app_context():
    from chordme.https_enforcement import is_https_required
    print(f"HTTPS enforcement: {is_https_required()}")
```

### Verificación de configuración

Verificar tu configuración:

```python
from chordme import app

with app.app_context():
    print(f"DEBUG: {app.config.get('DEBUG')}")
    print(f"TESTING: {app.config.get('TESTING')}")
    print(f"HTTPS_ENFORCED: {app.config.get('HTTPS_ENFORCED')}")
```

## Mejores prácticas

### Despliegue de producción

1. **Usar variables de entorno** para configuración
2. **Configurar balanceador de carga** para terminar SSL/TLS
3. **Establecer cabeceras de proxy apropiadas** para detección HTTPS
4. **Probar comportamiento de redirección** antes de ir en vivo
5. **Monitorear cumplimiento HSTS** usando herramientas de desarrollador del navegador

### Flujo de trabajo de desarrollo

1. **Deshabilitar aplicación HTTPS** para desarrollo local
2. **Probar comportamiento HTTPS** en entorno de staging
3. **Usar archivos de configuración** específicos del entorno
4. **Documentar requisitos de configuración** para el equipo

### Consideraciones de seguridad

1. **Siempre usar HTTPS** en producción
2. **Configurar HSTS apropiadamente** para prevenir ataques de degradación
3. **Probar configuraciones de proxy** para evitar bypasses de seguridad
4. **Monitorear bucles de redirección** que podrían impactar disponibilidad
5. **Mantener certificados SSL/TLS** actualizados

## Ejemplos de configuración

### Despliegue Docker

```dockerfile
# Dockerfile
ENV HTTPS_ENFORCED=true
ENV FLASK_DEBUG=false
EXPOSE 5000
```

### Docker Compose con Nginx

```yaml
# docker-compose.yml
version: '3'
services:
  nginx:
    image: nginx
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
  
  backend:
    build: .
    environment:
      - HTTPS_ENFORCED=true
    expose:
      - "5000"
```

### Despliegue Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chordme-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: HTTPS_ENFORCED
          value: "true"
```

## Ejemplos de integración

### Integración frontend

Cuando la aplicación HTTPS está habilitada, asegurar que el código frontend use URLs HTTPS:

```javascript
// Configuración frontend
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.example.com' 
  : 'http://localhost:5000';
```

### Configuración de cliente API

Configurar clientes API para seguir redirecciones:

```python
# Ejemplo Python requests
import requests
session = requests.Session()
session.max_redirects = 3  # Seguir redirecciones HTTPS
```

```javascript
// Ejemplo JavaScript fetch
fetch(url, {
  redirect: 'follow'  // Seguir redirecciones HTTPS
})
```