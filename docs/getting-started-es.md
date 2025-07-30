---
layout: default
lang: es
title: Comenzando con ChordMe
---

# Comenzando con ChordMe

Esta guía te ayudará a configurar y ejecutar ChordMe en tu máquina local.

## Requisitos previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- **Node.js 20+** - Para ejecutar el frontend
- **Python 3.12+** - Para ejecutar el backend
- **npm** - Para gestionar las dependencias del frontend
- **pip** - Para gestionar las dependencias de Python
- **Git** - Para clonar el repositorio

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/tonybolanyo/chordme.git
cd chordme
```

### 2. Instalar dependencias

#### Dependencias raíz
```bash
npm install
```

#### Dependencias del frontend
```bash
cd frontend
npm install
cd ..
```

#### Dependencias del backend
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Configurar el backend

```bash
cd backend
cp config.template.py config.py
# Edita config.py con tu configuración si es necesario
```

### 4. Inicializar la base de datos

```bash
cd backend
python app.py init-db
cd ..
```

### 5. Ejecutar la aplicación

#### Opción 1: Ejecutar tanto frontend como backend (recomendado)
```bash
npm run dev
```

Esto iniciará:
- Backend en `http://localhost:5000`
- Frontend en `http://localhost:3000`

#### Opción 2: Ejecutar por separado

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Verificación de la instalación

1. Abre tu navegador y visita `http://localhost:3000`
2. Deberías ver la página de inicio de ChordMe
3. Prueba registrar una nueva cuenta de usuario
4. Prueba crear una nueva canción

## Siguientes pasos

Una vez que tengas ChordMe ejecutándose:

- Consulta la [Guía del usuario](user-guide-es.md) para aprender sobre todas las características
- Lee sobre el [formato ChordPro](chordpro-format-es.md) para escribir canciones
- Explora la [Referencia de la API](api-reference-es.md) para integración

## Solución de problemas

Si encuentras problemas durante la instalación:

1. **Problemas con Node.js**: Asegúrate de usar Node.js 20 o superior
2. **Problemas con Python**: Asegúrate de usar Python 3.12 o superior
3. **Problemas de puerto**: Asegúrate de que los puertos 3000 y 5000 estén disponibles
4. **Errores de base de datos**: Ejecuta `python app.py init-db` desde el directorio backend

Para más soluciones detalladas, consulta nuestra [Guía de solución de problemas](troubleshooting-es.md).

---

**Cambia idioma:** [English](getting-started.md) | **Español**