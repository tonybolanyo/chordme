# Ejecutar ChordMe Localmente con Docker

Esta guía explica cómo ejecutar ChordMe localmente usando Docker Compose, sin dependencias de la nube o servidor. Esta es la forma más fácil de comenzar con el desarrollo de ChordMe.

## Requisitos Previos

- **Docker** versión 20.10 o posterior
- **Docker Compose** versión 2.0 o posterior

### Instalar Docker

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Windows
Descarga e instala [Docker Desktop para Windows](https://docs.docker.com/desktop/install/windows-install/)

#### macOS
Descarga e instala [Docker Desktop para Mac](https://docs.docker.com/desktop/install/mac-install/)

Verificar instalación:
```bash
docker --version
docker compose version
```

## Inicio Rápido (5 minutos)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tonybolanyo/chordme.git
cd chordme
```

### 2. Iniciar Todos los Servicios
```bash
docker compose up -d
```

Este comando:
- Construye las imágenes Docker (solo la primera vez, toma 2-3 minutos)
- Inicia la base de datos PostgreSQL con inicialización automática
- Inicia la API backend Flask
- Inicia la aplicación frontend React

### 3. Acceder a la Aplicación

Una vez que todos los servicios están en ejecución (esperar unos 30-60 segundos):

- **Frontend**: http://localhost:5173
- **API Backend**: http://localhost:5000
- **Verificación de Salud de API**: http://localhost:5000/api/v1/health
- **Base de Datos**: localhost:5432 (credenciales: postgres/password)

### 4. Detener Servicios

```bash
docker compose down
```

Para eliminar todos los datos (base de datos y archivos subidos):
```bash
docker compose down -v
```

## ¿Qué se Instala Automáticamente?

Cuando ejecutas `docker compose up`, Docker:

1. **Base de Datos (PostgreSQL 15)**
   - Crea una base de datos PostgreSQL llamada `chordme`
   - Ejecuta automáticamente todas las migraciones de base de datos en orden
   - Configura tablas: usuarios, canciones, colecciones, etc.
   - Crea índices y políticas de seguridad

2. **Backend (API Flask)**
   - Instala dependencias de Python
   - Configura la aplicación Flask
   - Se conecta a la base de datos
   - Inicia el servidor API en el puerto 5000

3. **Frontend (React + Vite)**
   - Instala dependencias de Node.js
   - Inicia el servidor de desarrollo con recarga automática
   - Se conecta a la API backend
   - Sirve la aplicación en el puerto 5173

## Flujo de Trabajo de Desarrollo

### Realizar Cambios en el Código

Todos los cambios de código se detectan y aplican automáticamente:

#### Cambios en Frontend
- Edita archivos en `frontend/src/`
- El navegador se actualiza automáticamente (recarga de módulo en caliente)
- No se requiere reconstrucción

#### Cambios en Backend
- Edita archivos en `backend/chordme/`
- Flask se reinicia automáticamente
- No se requiere reconstrucción

### Ver Registros (Logs)

```bash
# Todos los servicios
docker compose logs -f

# Servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Verificar Estado de Servicios

```bash
docker compose ps
```

### Reiniciar Servicios

```bash
# Reiniciar todos los servicios
docker compose restart

# Reiniciar servicio específico
docker compose restart backend
docker compose restart frontend
```

### Acceder a Shells de Servicios

```bash
# Shell del backend
docker compose exec backend bash

# Shell del frontend
docker compose exec frontend sh

# Shell de la base de datos
docker compose exec db psql -U postgres -d chordme
```

### Ejecutar Pruebas

```bash
# Pruebas del backend
docker compose exec backend pytest tests/ -v

# Pruebas del frontend (si están configuradas)
docker compose exec frontend npm run test
```

## Configuración

### Variables de Entorno

La configuración predeterminada funciona de inmediato. Para personalizar, crea un archivo `.env` en la raíz del proyecto:

```bash
# Copiar la plantilla de entorno Docker
cp .env.docker .env

# Editar con tus configuraciones preferidas
nano .env
```

Valores predeterminados:
- Base de datos: `chordme`
- Usuario: `postgres`
- Contraseña: `password` (⚠️ ¡Cambiar en producción!)
- Puerto backend: `5000`
- Puerto frontend: `5173`

### Mapeo de Puertos Personalizado

Para usar puertos diferentes, edita `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3000:5173"  # Acceder en http://localhost:3000
  
  backend:
    ports:
      - "8000:5000"  # Acceder en http://localhost:8000
```

## Tareas Comunes

### Operaciones de Base de Datos

#### Ver Datos de la Base de Datos
```bash
# Conectar a la base de datos
docker compose exec db psql -U postgres -d chordme

# Dentro de psql:
\dt              # Listar tablas
\d users         # Describir tabla de usuarios
SELECT * FROM users;
```

#### Reiniciar Base de Datos
```bash
# Detener y eliminar todos los datos
docker compose down -v

# Iniciar desde cero
docker compose up -d
```

#### Respaldar Base de Datos
```bash
docker compose exec db pg_dump -U postgres chordme > backup.sql
```

#### Restaurar Base de Datos
```bash
docker compose exec -T db psql -U postgres chordme < backup.sql
```

### Solución de Problemas

#### Los Servicios No Inician

1. **Verificar que Docker esté en ejecución:**
   ```bash
   docker info
   ```

2. **Verificar conflictos de puertos:**
   ```bash
   # Linux/Mac
   lsof -i :5000
   lsof -i :5173
   lsof -i :5432
   
   # Windows
   netstat -ano | findstr :5000
   netstat -ano | findstr :5173
   netstat -ano | findstr :5432
   ```

3. **Limpiar y reiniciar:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

#### Errores de Conexión a Base de Datos

```bash
# Verificar si la base de datos está saludable
docker compose exec db pg_isready -U postgres -d chordme

# Ver registros de la base de datos
docker compose logs db

# Esperar a que la base de datos esté lista (puede tomar 30-60 segundos)
docker compose exec backend python -c "from chordme import create_app; app = create_app(); print('DB Connected')"
```

#### Backend No Responde

```bash
# Verificar salud del backend
curl http://localhost:5000/api/v1/health

# Ver registros del backend
docker compose logs backend

# Reiniciar backend
docker compose restart backend
```

#### Frontend No Carga

```bash
# Verificar contenedor del frontend
docker compose ps frontend

# Ver registros del frontend
docker compose logs frontend

# Reiniciar frontend
docker compose restart frontend
```

#### Necesidad de Reconstruir Imágenes

```bash
# Reconstruir todas las imágenes
docker compose build

# Reconstruir servicio específico
docker compose build backend
docker compose build frontend

# Reconstruir y reiniciar
docker compose up -d --build
```

## Limpieza Completa

Para eliminar todo completamente:

```bash
# Detener y eliminar contenedores, redes, volúmenes
docker compose down -v

# Eliminar imágenes (opcional)
docker compose down --rmi all -v

# Eliminar todos los recursos Docker sin usar (opcional, ¡con cuidado!)
docker system prune -a --volumes
```

## Despliegue en Producción

⚠️ **¡El archivo docker-compose.yml está configurado solo para desarrollo!**

Para producción:

1. Usa `docker-compose.prod.yml`
2. Establece contraseñas fuertes
3. Habilita HTTPS
4. Usa gestión de secretos de grado de producción
5. Configura estrategias de respaldo adecuadas
6. Configura monitoreo y registro

Consulta [docker-compose.prod.yml](../docker-compose.prod.yml) para la configuración de producción.

## Recursos Adicionales

- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Docker Compose](https://docs.docker.com/compose/)
- [Guía del Desarrollador ChordMe](developer-guide-es.md)
- [Documentación de API ChordMe](api-reference-es.md)

## Obtener Ayuda

Si encuentras problemas:

1. Consulta la sección [Solución de Problemas](#solución-de-problemas) anterior
2. Revisa los registros: `docker compose logs`
3. Abre un issue en GitHub con:
   - Salida de `docker compose version`
   - Salida de `docker compose ps`
   - Registros relevantes de `docker compose logs`

---

**Referencia Rápida**

```bash
# Iniciar todo
docker compose up -d

# Detener todo
docker compose down

# Ver registros
docker compose logs -f

# Verificar estado
docker compose ps

# Reconstruir y reiniciar
docker compose up -d --build

# Limpieza completa
docker compose down -v
```
