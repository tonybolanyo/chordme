---
layout: default
lang: es
title: Solución de problemas
---

# Solución de problemas de ChordMe

Esta guía te ayudará a resolver problemas comunes que puedes encontrar al usar o desarrollar ChordMe.

## Problemas de instalación

### Problemas con Node.js

#### Error: "node: command not found"

**Causa:** Node.js no está instalado o no está en el PATH.

**Solución:**
1. Instala Node.js desde [nodejs.org](https://nodejs.org/)
2. Verifica la instalación:
   ```bash
   node --version
   npm --version
   ```
3. Si el problema persiste, reinicia tu terminal

#### Error: "npm install" falla con errores de permisos

**Causa:** Problemas de permisos con npm global.

**Solución:**
```bash
# Opción 1: Usar un gestor de versiones de Node
# Instalar nvm (Linux/Mac)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Opción 2: Configurar directorio global de npm
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

#### Error: Versión de Node.js no compatible

**Causa:** ChordMe requiere Node.js 20 o superior.

**Solución:**
```bash
# Actualizar usando nvm
nvm install 20
nvm use 20

# O descargar la última versión desde nodejs.org
```

### Problemas con Python

#### Error: "python: command not found"

**Causa:** Python no está instalado o no está configurado correctamente.

**Solución:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.12 python3.12-pip python3.12-venv

# macOS (usando Homebrew)
brew install python@3.12

# Verificar instalación
python3 --version
pip3 --version
```

#### Error: "pip install" falla con errores de permisos

**Causa:** Instalación en directorios del sistema sin permisos.

**Solución:**
```bash
# Usar entorno virtual (recomendado)
cd backend
python3 -m venv env
source env/bin/activate  # Linux/Mac
# o
env\Scripts\activate  # Windows

pip install -r requirements.txt
```

#### Error: "ModuleNotFoundError" después de la instalación

**Causa:** Módulos instalados en el entorno incorrecto.

**Solución:**
```bash
# Verificar que estás en el entorno virtual correcto
which python
which pip

# Reinstalar dependencias en el entorno virtual
pip install -r requirements.txt

# Verificar instalación
pip list
```

### Problemas con Git

#### Error: "Permission denied (publickey)"

**Causa:** Claves SSH no configuradas correctamente.

**Solución:**
```bash
# Generar nueva clave SSH
ssh-keygen -t ed25519 -C "tu_email@ejemplo.com"

# Agregar clave al agente SSH
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Agregar clave pública a GitHub
cat ~/.ssh/id_ed25519.pub
# Copiar y pegar en GitHub Settings > SSH Keys
```

## Problemas de base de datos

### Error: "sqlite3.OperationalError: no such table"

**Causa:** Base de datos no inicializada.

**Solución:**
```bash
cd backend
python app.py init-db
```

### Error: "UNIQUE constraint failed"

**Causa:** Intentando crear un registro duplicado.

**Solución:**
```bash
# Resetear base de datos (¡CUIDADO: elimina todos los datos!)
cd backend
python app.py reset-db
python app.py init-db
```

### Error: Base de datos bloqueada

**Causa:** Múltiples procesos accediendo a SQLite simultáneamente.

**Solución:**
```bash
# Detener todos los procesos de ChordMe
pkill -f "python app.py"
pkill -f "npm run dev"

# Reiniciar la aplicación
npm run dev
```

### Migración de base de datos falla

**Causa:** Cambios incompatibles en el esquema.

**Solución:**
```bash
# Hacer respaldo de datos primero
cd backend
python -c "
import sqlite3
import csv
conn = sqlite3.connect('chordme.db')
cursor = conn.cursor()
cursor.execute('SELECT * FROM songs')
with open('songs_backup.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerows(cursor.fetchall())
conn.close()
"

# Resetear base de datos
python app.py reset-db
python app.py init-db

# Restaurar datos manualmente si es necesario
```

## Problemas de autenticación

### Error: "Invalid token"

**Causa:** Token JWT expirado o inválido.

**Solución:**
1. Cerrar sesión y volver a iniciar sesión
2. Limpiar el almacenamiento local del navegador:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
3. Reiniciar la aplicación

### Error: "User not found"

**Causa:** Usuario eliminado o base de datos resetada.

**Solución:**
1. Registrar nuevamente el usuario
2. Verificar que la base de datos está inicializada:
   ```bash
   cd backend
   python app.py init-db
   ```

### Problema: Inicio de sesión lento

**Causa:** Algoritmo de hash bcrypt con rounds muy altos.

**Solución:**
```python
# En backend/chordme/models/user.py
# Reducir rounds de bcrypt para desarrollo
password_hash = bcrypt.generate_password_hash(password, rounds=4)
```

## Problemas de red y API

### Error: "Network Error" o "Failed to fetch"

**Causa:** Backend no está ejecutándose o problemas de CORS.

**Solución:**
1. Verificar que el backend está ejecutándose:
   ```bash
   curl http://localhost:5000/api/v1/health
   ```
2. Verificar configuración de CORS en `backend/app.py`:
   ```python
   CORS(app, origins=['http://localhost:3000'])
   ```
3. Reiniciar ambos servicios:
   ```bash
   npm run dev
   ```

### Error: "Port already in use"

**Causa:** Puerto ocupado por otro proceso.

**Solución:**
```bash
# Encontrar proceso usando el puerto
lsof -ti:3000  # Para puerto 3000
lsof -ti:5000  # Para puerto 5000

# Terminar proceso
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:5000)

# O usar puertos diferentes
# Frontend: VITE_PORT=3001 npm run dev
# Backend: FLASK_RUN_PORT=5001 python app.py
```

### Error: "CORS policy" en el navegador

**Causa:** Política CORS mal configurada.

**Solución:**
```python
# En backend/app.py
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[
    'http://localhost:3000',  # Desarrollo
    'https://tu-dominio.com'  # Producción
])
```

## Problemas del frontend

### Error: "Module not found"

**Causa:** Dependencia no instalada o ruta incorrecta.

**Solución:**
```bash
cd frontend
npm install

# Verificar que la dependencia está listada
npm list

# Reinstalar si es necesario
rm -rf node_modules package-lock.json
npm install
```

### Error: Compilación de TypeScript falla

**Causa:** Errores de tipos o configuración incorrecta.

**Solución:**
```bash
# Verificar errores de tipos
cd frontend
npm run type-check

# Verificar configuración de TypeScript
cat tsconfig.json

# Reiniciar servidor de desarrollo
npm run dev
```

### Problema: Aplicación lenta en desarrollo

**Causa:** Muchos re-renders o dependencias pesadas.

**Solución:**
1. Usar React Developer Tools para identificar re-renders
2. Optimizar componentes con `React.memo`:
   ```tsx
   export const SongItem = React.memo(({ song }) => {
     return <div>{song.title}</div>;
   });
   ```
3. Usar `useMemo` para cálculos costosos:
   ```tsx
   const processedSongs = useMemo(() => {
     return songs.filter(song => song.title.includes(searchTerm));
   }, [songs, searchTerm]);
   ```

### Error: "Hydration mismatch" (si usas SSR)

**Causa:** Diferencias entre renderizado del servidor y cliente.

**Solución:**
```tsx
// Usar useEffect para contenido específico del cliente
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;

return <ClientOnlyComponent />;
```

## Problemas del backend

### Error: "ImportError: No module named..."

**Causa:** Dependencia no instalada en el entorno virtual.

**Solución:**
```bash
cd backend
source env/bin/activate  # Activar entorno virtual
pip install -r requirements.txt

# Verificar dependencias instaladas
pip list
```

### Error: "Flask application failed to start"

**Causa:** Error en la configuración o dependencias.

**Solución:**
```bash
cd backend
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py

# Ver logs detallados para identificar el problema
```

### Problema: API responde lentamente

**Causa:** Consultas de base de datos ineficientes.

**Solución:**
1. Agregar índices a la base de datos:
   ```python
   # En los modelos
   class Song(db.Model):
       title = Column(String(255), index=True)
       user_id = Column(Integer, ForeignKey('users.id'), index=True)
   ```
2. Optimizar consultas:
   ```python
   # Usar eager loading
   songs = Song.query.options(joinedload(Song.user)).all()
   ```
3. Implementar paginación:
   ```python
   songs = Song.query.paginate(page=1, per_page=20)
   ```

### Error: "500 Internal Server Error"

**Causa:** Error no manejado en el código.

**Solución:**
1. Verificar logs del servidor
2. Agregar manejo de errores:
   ```python
   @app.errorhandler(500)
   def internal_error(error):
       return jsonify({'error': 'Error interno del servidor'}), 500
   ```
3. Usar try-catch en rutas:
   ```python
   @app.route('/api/songs')
   def get_songs():
       try:
           songs = Song.query.all()
           return jsonify(songs)
       except Exception as e:
           app.logger.error(f'Error getting songs: {e}')
           return jsonify({'error': 'Error obteniendo canciones'}), 500
   ```

## Problemas de rendimiento

### Aplicación lenta en general

**Soluciones:**

1. **Optimizar base de datos:**
   ```sql
   -- Agregar índices
   CREATE INDEX idx_songs_user_id ON songs(user_id);
   CREATE INDEX idx_songs_title ON songs(title);
   ```

2. **Implementar caché:**
   ```python
   from flask_caching import Cache
   
   cache = Cache(app, config={'CACHE_TYPE': 'simple'})
   
   @cache.memoize(timeout=300)
   def get_user_songs(user_id):
       return Song.query.filter_by(user_id=user_id).all()
   ```

3. **Optimizar frontend:**
   ```tsx
   // Lazy loading de componentes
   const SongEditor = lazy(() => import('./SongEditor'));
   
   // Virtualización para listas largas
   import { FixedSizeList as List } from 'react-window';
   ```

### Problema: Alto uso de memoria

**Soluciones:**

1. **Limitar consultas de base de datos:**
   ```python
   # Usar paginación
   songs = Song.query.paginate(page=1, per_page=50)
   ```

2. **Limpiar referencias en React:**
   ```tsx
   useEffect(() => {
     return () => {
       // Limpiar listeners, timers, etc.
     };
   }, []);
   ```

## Problemas de despliegue

### Error: "Build failed"

**Causa:** Errores de compilación o dependencias faltantes.

**Solución:**
```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar variables de entorno
cat .env

# Build con logs detallados
npm run build -- --verbose
```

### Error: "Database connection failed" en producción

**Causa:** String de conexión incorrecta o base de datos no disponible.

**Solución:**
```python
# Verificar variables de entorno
import os
print(os.environ.get('DATABASE_URL'))

# Configurar conexión con retry
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

engine = create_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    connect_args={
        'check_same_thread': False,
        'timeout': 20
    }
)
```

### Problema: SSL/HTTPS en producción

**Solución:**
```python
# Configurar Flask para HTTPS
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Usar reverse proxy (nginx)
```

## Herramientas de depuración

### Logs útiles

```bash
# Backend logs
cd backend
tail -f app.log

# Frontend logs (en el navegador)
# Abrir Developer Tools > Console

# Sistema logs
journalctl -f  # Linux
tail -f /var/log/system.log  # macOS
```

### Comandos de diagnóstico

```bash
# Verificar servicios
ps aux | grep python
ps aux | grep node

# Verificar puertos
netstat -tlnp | grep :3000
netstat -tlnp | grep :5000

# Verificar conectividad
curl -I http://localhost:3000
curl -I http://localhost:5000/api/v1/health

# Verificar espacio en disco
df -h

# Verificar memoria
free -h
```

## Contacto y soporte

Si no puedes resolver tu problema con esta guía:

1. **Busca en issues existentes** en el repositorio de GitHub
2. **Crea un nuevo issue** con:
   - Descripción detallada del problema
   - Pasos para reproducirlo
   - Información del entorno
   - Logs relevantes
3. **Únete a la comunidad** para obtener ayuda de otros desarrolladores

---

**Cambia idioma:** [English](troubleshooting.md) | **Español**