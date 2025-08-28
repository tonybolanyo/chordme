---
layout: default
lang: es
title: Guía de pruebas
---

# Guía de pruebas de ChordMe

Este documento describe la configuración de pruebas para la aplicación ChordMe.

## Descripción general de las pruebas

El proyecto ahora incluye infraestructura completa de pruebas:

1. **Pruebas unitarias del frontend** - Pruebas para componentes React usando Vitest y React Testing Library
2. **Pruebas unitarias del backend** - Pruebas existentes basadas en pytest para endpoints de la API Flask
3. **Pruebas de integración** - Pruebas que verifican la funcionalidad de la API con peticiones HTTP reales
4. **Pruebas de extremo a extremo** - Pruebas de Playwright que prueban el flujo completo de la aplicación

## Ejecutar pruebas

### Pruebas unitarias del frontend
```bash
# Ejecutar pruebas en modo observación
npm run test:frontend

# Ejecutar pruebas una vez
npm run test:frontend:run

# Desde el directorio frontend
cd frontend
npm test
```

### Pruebas unitarias del backend
```bash
# Ejecutar pruebas del backend
npm run test:backend

# Desde el directorio backend
cd backend
FLASK_CONFIG=test_config python -m pytest tests/ -v
```

### Pruebas de integración
```bash
# Ejecutar pruebas de integración (requiere servidor backend ejecutándose)
npm run test:integration

# Desde el directorio integration-tests
cd integration-tests
python -m pytest -v
```

### Pruebas de extremo a extremo
```bash
# Ejecutar pruebas E2E (requiere frontend y backend ejecutándose)
npm run test:e2e

# Desde el directorio raíz
npx playwright test
```

### Ejecutar todas las pruebas
```bash
npm run test:all
```

## Estructura de pruebas

### Pruebas del frontend (`frontend/src/`)
- `App.test.tsx` - Pruebas para el componente principal App
- `components/Layout/Layout.test.tsx` - Pruebas para el componente Layout
- `components/Header/Header.test.tsx` - Pruebas para el componente Header
- `test/setup.ts` - Configuración y setup de pruebas

### Pruebas del backend (`backend/tests/`)
- Suite de pruebas completa con más de 153 casos de prueba
- Pruebas para autenticación, gestión de canciones, carga/descarga de archivos, características de seguridad
- Usa pytest y pytest-flask

### Pruebas de integración (`integration-tests/`)
- `test_api_integration.py` - Prueba endpoints de API con peticiones HTTP reales
- Prueba flujos de registro, inicio de sesión, creación de canciones
- Valida respuestas de API y manejo de errores

### Pruebas E2E (`e2e/`)
- Pruebas de Playwright para funcionalidad completa del usuario
- Prueba flujos de trabajo completos de la aplicación
- Incluye pruebas de autenticación, gestión de canciones, características colaborativas

## Cobertura

### Estadísticas completas de la suite de pruebas

**Frontend (React + TypeScript)**
- **218 pruebas** - componentes, servicios, utilidades
- **Cobertura**: 85%+ objetivo (forzado por CI)
- **Tecnologías**: Vitest, React Testing Library, jsdom

**Backend (Flask + Python)**
- **153 pruebas** - API, autenticación, seguridad, ChordPro
- **Cobertura**: 85%+ objetivo (forzado por CI)
- **Tecnologías**: pytest, Flask-Testing, Factory Boy

**Integración**
- **6 pruebas** - integración de endpoints de API
- **Cobertura**: flujos de trabajo críticos de usuario
- **Tecnologías**: pytest, requests

**E2E (Extremo a extremo)**
- **15+ escenarios** - flujos de trabajo completos de usuario
- **Cobertura**: casos de uso principales
- **Tecnologías**: Playwright, TypeScript

### Flujos de trabajo críticos probados

1. **Autenticación de usuario**
   - Registro con validación de email
   - Inicio de sesión con JWT
   - Protección de rutas y autorización

2. **Gestión de canciones**
   - Crear, leer, actualizar, eliminar canciones
   - Validación y transposición de ChordPro
   - Carga y descarga de archivos

3. **Características colaborativas**
   - Compartir canciones con permisos
   - Edición en tiempo real
   - Resolución de conflictos

4. **Seguridad**
   - Validación de entrada
   - Protección CSRF
   - Prevención de inyección SQL

### Métricas de calidad de pruebas

- **Tiempo de ejecución**: <2 minutos para suite completa
- **Estabilidad**: 99%+ tasa de aprobación
- **Mantenibilidad**: Pruebas modulares con patrones reutilizables
- **Cobertura**: 85%+ tanto para frontend como backend

## Requisitos de cobertura actualizados y estándares

### Umbrales de cobertura (Forzados por CI)

**Frontend (React + TypeScript)**
- **Líneas**: 85% mínimo
- **Funciones**: 85% mínimo
- **Ramas**: 80% mínimo
- **Declaraciones**: 85% mínimo

**Backend (Flask + Python)**
- **Líneas**: 85% mínimo
- **Funciones**: 85% mínimo
- **Ramas**: 80% mínimo

### Ejecución de informes de cobertura

```bash
# Cobertura del frontend
cd frontend
npm run test:coverage

# Cobertura del backend
cd backend
python -m pytest --cov=chordme --cov-report=html --cov-report=xml

# Informes combinados
npm run test:all:coverage
```

### Forzado de cobertura

- **Integración CI**: GitHub Actions verifican automáticamente la cobertura en PRs
- **Fallos de construcción**: Las construcciones **FALLARÁN** si la cobertura cae por debajo de los umbrales (85% backend, 85% frontend)
- **Integración Codecov**: Seguimiento detallado de cobertura y reporte con notificaciones de fallo
- **Informes de cobertura**: Generados para todas las solicitudes de pull con desglose detallado

### Mejoras recientes de cobertura de pruebas

- **Validación ChordPro**: 95% cobertura de funciones de parsing
- **Autenticación JWT**: 90% cobertura de flujos de autenticación
- **Compartición de canciones**: 88% cobertura de lógica de permisos
- **API de colaboración**: 85% cobertura de características en tiempo real

### Agregar nuevas pruebas

```bash
# Pruebas del frontend
cd frontend/src/components/MyComponent
touch MyComponent.test.tsx

# Pruebas del backend
cd backend/tests
touch test_my_feature.py

# Pruebas de integración
cd integration-tests
touch test_my_integration.py

# Pruebas E2E
cd e2e
touch my-feature.spec.ts
```

### Pautas de calidad de pruebas

1. **Principio AAA**: Organizar (Arrange), Actuar (Act), Afirmar (Assert)
2. **Nombres descriptivos**: `should_return_error_when_invalid_chordpro_syntax`
3. **Aislamiento**: Cada prueba debe ser independiente
4. **Datos de prueba**: Usar factories y fixtures para datos consistentes
5. **Mocking**: Mock dependencias externas (APIs, servicios)
6. **Aserciones específicas**: Verificar comportamiento específico, no solo que no falle

### Herramientas de monitoreo de cobertura

- **Codecov.io**: Análisis de cobertura automatizado
- **GitHub Actions**: Verificación de cobertura en CI
- **Reportes HTML**: Visualización detallada de cobertura
- **Informes Delta**: Seguimiento de cambios de cobertura en PRs

### Depuración de fallos de pruebas

```bash
# Ejecutar prueba específica
npm run test:frontend -- MyComponent.test.tsx

# Modo depuración con output detallado
cd backend
python -m pytest tests/test_specific.py -v -s

# Ejecutar con depurador
cd backend
python -m pytest tests/test_specific.py --pdb
```

### Requisitos de documentación

- Todas las nuevas características requieren pruebas
- Los casos límite deben estar documentados
- Los fallos de pruebas deben incluir contexto
- Los datos de rendimiento deben registrarse para pruebas críticas

---

**Cambiar idioma:** [English](testing.md) | **Español**
