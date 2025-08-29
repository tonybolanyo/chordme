---
layout: default
lang: es
title: Guía de despliegue
---

# Guía de despliegue de ChordMe

Este documento proporciona instrucciones completas para desplegar la aplicación ChordMe usando métodos de despliegue automatizado y manual.

## Descripción general

ChordMe consiste en dos componentes principales:
- **Frontend**: Aplicación React construida con Vite
- **Backend**: Servidor API Flask

## Opciones de despliegue

ChordMe soporta múltiples configuraciones de despliegue:

### [Target] Stack recomendado: Netlify + Railway + Supabase
- [PASSED] **Frontend**: Netlify (preferido) con despliegues automáticos
- [PASSED] **Backend**: Railway para hosting de contenedores escalable
- [PASSED] **Base de datos**: Supabase (PostgreSQL) con auth incorporado y características en tiempo real
- [PASSED] **CI/CD automatizado**: Flujos de trabajo de GitHub Actions para despliegue full-stack

### [READY] Stack alternativo: Vercel + Render + PostgreSQL
- [PASSED] **Frontend**: Vercel para hosting de frontend
- [PASSED] **Backend**: Render.com para hosting de backend
- [PASSED] **Base de datos**: PostgreSQL hosted (Render, Heroku, etc.)

### [SYMBOL] Stack empresarial: Infraestructura AWS como código
- [PASSED] **Despliegue AWS completo** usando Terraform
- [PASSED] **ECS Fargate** para backend contenerizado
- [PASSED] **S3 + CloudFront** para frontend
- [PASSED] **RDS PostgreSQL** para base de datos

---

## [Quick Start] Inicio rápido: Netlify + Railway + Supabase

### Prerrequisitos

1. **Cuentas requeridas:**
   - [GitHub](https://github.com) (para repositorio de código)
   - [Netlify](https://netlify.com) (para hosting de frontend)
   - [Railway](https://railway.app) (para hosting de backend)
   - [Supabase](https://supabase.com) (para base de datos)

2. **Herramientas CLI:**
   ```bash
   # Instalar CLIs necesarios
   npm install -g netlify-cli
   npm install -g @railway/cli
   npm install -g supabase
   ```

### Paso 1: Configurar base de datos (Supabase)

```bash
# 1. Crear nuevo proyecto en Supabase
# 2. Obtener URL de conexión y claves API
# 3. Ejecutar migraciones de base de datos
supabase migrate up
```

### Paso 2: Despliegue del backend (Railway)

```bash
# 1. Conectar repositorio a Railway
railway login
railway link

# 2. Configurar variables de entorno
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET_KEY="tu-clave-secreta-32-chars"
railway variables set FLASK_SECRET_KEY="tu-clave-flask-32-chars"

# 3. Desplegar
railway up
```

### Paso 3: Despliegue del frontend (Netlify)

```bash
# 1. Construir frontend
cd frontend
npm run build

# 2. Desplegar a Netlify
netlify deploy --prod --dir=dist
```

## [Config] Archivos de configuración

ChordMe incluye varios archivos de configuración para diferentes plataformas de despliegue:

### Configuración de Netlify (`netlify.toml`)
```toml
[build]
  command = "cd frontend && npm ci && npm run build"
  publish = "frontend/dist"

[build.environment]
  NODE_VERSION = "20"
  VITE_API_URL = "https://chordme-backend-production.up.railway.app"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Configuración de Railway (`railway.toml`)
```toml
[deploy]
  startCommand = "cd backend && python run.py"

[variables]
  PORT = { default = "5000" }
  FLASK_ENV = { default = "production" }
```

### Configuración de Vercel (`vercel.json`)
```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## [SYMBOL] Variables de entorno

### Variables de entorno del backend

```bash
# Configuración de base de datos
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/base_datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chordme
DB_USER=chordme_user
DB_PASS=secure_password

# Configuración de aplicación
FLASK_ENV=production
FLASK_SECRET_KEY=clave-secreta-flask-32-caracteres-minimo
JWT_SECRET_KEY=clave-secreta-jwt-32-caracteres-minimo
JWT_ACCESS_TOKEN_EXPIRES=3600

# Configuración de seguridad
HTTPS_ENFORCED=true
CORS_ORIGINS=https://tudominio.com,https://app.netlify.app

# Configuración de terceros
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
FIREBASE_PROJECT_ID=tu-proyecto-firebase
```

### Variables de entorno del frontend

```bash
# Configuración de API
VITE_API_URL=https://tu-backend.railway.app
VITE_API_VERSION=v1

# Configuración de Firebase
VITE_FIREBASE_API_KEY=tu-firebase-api-key
VITE_FIREBASE_PROJECT_ID=tu-proyecto-firebase
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com

# Configuración de Google OAuth
VITE_GOOGLE_CLIENT_ID=tu-google-client-id

# Configuración de entorno
VITE_NODE_ENV=production
VITE_APP_VERSION=1.0.0
```

### Secretos de despliegue (GitHub Actions)

```yaml
# Secretos requeridos en configuración de GitHub
NETLIFY_AUTH_TOKEN: "token-de-netlify"
NETLIFY_SITE_ID: "id-del-sitio-netlify"
RAILWAY_TOKEN: "token-de-railway"
SUPABASE_ACCESS_TOKEN: "token-de-supabase"
DOCKER_USERNAME: "usuario-docker-hub"
DOCKER_PASSWORD: "contraseña-docker-hub"
```

## [Tools] Scripts de despliegue manual

Use estos scripts para despliegue local:

### Despliegue full stack
```bash
# Desplegar todo (base de datos + backend + frontend)
./scripts/deployment/deploy-full-stack.sh production

# Desplegar a staging
./scripts/deployment/deploy-full-stack.sh staging
```

### Despliegue de componente individual
```bash
# Desplegar solo backend
./scripts/deployment/deploy-railway.sh production

# Desplegar solo frontend  
./scripts/deployment/deploy-netlify.sh production

# Ejecutar migraciones de base de datos
python database/migrate.py
```

## [READY] Comandos de despliegue

```bash
# Despliegue full stack
npm run deploy:production    # Desplegar todo a producción
npm run deploy:staging       # Desplegar todo a staging

# Despliegues individuales
npm run deploy:netlify       # Solo frontend (Netlify)
npm run deploy:railway       # Solo backend (Railway)
npm run migrate              # Solo migraciones de base de datos

# Verificaciones de salud
npm run health-check --frontend-url=https://app.netlify.app --backend-url=https://api.railway.app
```

## [SYMBOL] Estrategia de rollback

### Rollback automatizado (Recomendado)

Los despliegues incluyen rollback automatizado en caso de fallo:
- **Verificaciones de salud**: Fallan si la aplicación no responde
- **Rollback automático**: Revierte a la versión anterior
- **Notificaciones**: Slack/email cuando ocurre rollback

### Procedimientos de rollback manual

#### 1. Rollback específico de plataforma

**Netlify:**
```bash
# Listar despliegues
netlify api listSiteDeploys --site-id=SITE_ID

# Rollback a despliegue específico
netlify api restoreSiteDeploy --site-id=SITE_ID --deploy-id=DEPLOY_ID
```

**Railway:**
```bash
# Listar despliegues
railway status

# Rollback usando variable de entorno
railway variables set BACKEND_IMAGE_TAG=previous-version
```

#### 2. Rollback basado en Git
```bash
# Crear tag de rollback
git tag v1.0.1-rollback
git push origin main --tags

# Esto activa el flujo de trabajo de release estándar
```

---

**Cambiar idioma:** [English](deployment.md) | **Español**
