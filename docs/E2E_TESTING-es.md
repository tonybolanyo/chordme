---
layout: default
lang: es
title: Documentación de la suite de pruebas End-to-End de ChordMe
---

# Documentación de la suite de pruebas End-to-End de ChordMe

## Resumen

Este documento proporciona documentación integral para la suite de pruebas end-to-end (E2E) de la aplicación ChordMe. La suite de pruebas cubre todos los flujos de trabajo críticos del usuario y la funcionalidad para asegurar que la aplicación funcione correctamente desde la perspectiva del usuario.

## Arquitectura de pruebas

### Framework de pruebas
- **Framework**: Playwright con TypeScript
- **Ejecutor de pruebas**: Playwright Test Runner
- **Navegador**: Chromium (Chrome)
- **Configuración**: `playwright.config.ts`

### Estructura del proyecto
```
e2e/
├── tests/
│   ├── auth.spec.ts          # Pruebas de autenticación
│   ├── songs.spec.ts         # Gestión de canciones
│   ├── chordpro.spec.ts      # Funcionalidad ChordPro
│   └── navigation.spec.ts    # Navegación y UI
├── fixtures/
│   ├── test-data.ts          # Datos de prueba
│   └── page-objects.ts       # Objetos de página
└── utils/
    ├── helpers.ts            # Funciones de ayuda
    └── constants.ts          # Constantes de prueba
```

## Casos de prueba cubiertos

### 1. Autenticación de usuario
- **Registro de usuario**: Crear nueva cuenta con validación
- **Inicio de sesión**: Autenticación con credenciales válidas
- **Validación de errores**: Manejo de credenciales incorrectas
- **Cierre de sesión**: Terminación de sesión y limpieza de estado

### 2. Gestión de canciones
- **Crear canción**: Añadir nuevas canciones con metadatos
- **Editar canción**: Modificar canciones existentes
- **Eliminar canción**: Remover canciones con confirmación
- **Buscar canciones**: Funcionalidad de búsqueda y filtrado

### 3. Funcionalidad ChordPro
- **Validación de sintaxis**: Verificar formato ChordPro correcto
- **Renderizado**: Mostrar canciones formateadas correctamente
- **Editores**: Funcionalidad de editor en tiempo real
- **Exportación**: Exportar canciones en diferentes formatos

### 4. Interfaz de usuario y navegación
- **Navegación responsiva**: Pruebas en diferentes tamaños de pantalla
- **Accesibilidad**: Verificar cumplimiento WCAG
- **Formularios**: Validación y envío de formularios
- **Componentes interactivos**: Modales, menús desplegables, botones

## Configuración de ejecución

### Requisitos previos
```bash
# Instalar dependencias
npm install

# Instalar navegadores Playwright
npx playwright install
```

### Comandos de ejecución
```bash
# Ejecutar todas las pruebas E2E
npm run test:e2e

# Ejecutar pruebas en modo headed (con UI)
npm run test:e2e:headed

# Ejecutar pruebas específicas
npx playwright test auth.spec.ts

# Ejecutar en modo debug
npx playwright test --debug
```

### Variables de entorno
```bash
# Configuración del entorno de prueba
E2E_BASE_URL=http://localhost:5173
E2E_API_URL=http://localhost:5000
E2E_HEADLESS=true
E2E_TIMEOUT=30000
```

## Estrategias de prueba

### Datos de prueba
- **Usuarios de prueba**: Cuentas dedicadas para E2E
- **Canciones de ejemplo**: Datos de muestra para validación
- **Limpieza**: Automatización de limpieza post-prueba

### Esperas inteligentes
```typescript
// Esperar por elementos visibles
await page.waitForSelector('[data-testid="song-list"]');

// Esperar por respuestas de API
await page.waitForResponse('/api/v1/songs');

// Esperar por navegación
await page.waitForURL('/dashboard');
```

### Manejo de estados
- **Autenticación**: Reutilización de sesiones entre pruebas
- **Estado de aplicación**: Configuración y limpieza automatizada
- **Datos de prueba**: Aislamiento entre ejecuciones

## Reportes y métricas

### Reportes de resultados
- **HTML Reporter**: Reporte visual detallado
- **JSON Reporter**: Datos estructurados para CI/CD
- **JUnit Reporter**: Integración con herramientas de CI

### Métricas de rendimiento
- **Tiempo de carga**: Medición de tiempos de respuesta
- **Interactividad**: Tiempo hasta primer click
- **Renderizado**: Métricas de pintura y diseño

### Capturas de pantalla
- **En fallos**: Capturas automáticas en errores
- **Pasos críticos**: Documentación visual de flujos
- **Comparación**: Pruebas de regresión visual

## Mejores prácticas

### Escritura de pruebas
1. **Descriptivo**: Nombres de pruebas claros y específicos
2. **Independiente**: Cada prueba es autónoma
3. **Repetible**: Resultados consistentes en múltiples ejecuciones
4. **Rápido**: Optimización para tiempo de ejecución

### Selectores robustos
```typescript
// Usar data-testid para elementos críticos
await page.click('[data-testid="create-song-button"]');

// Evitar selectores CSS frágiles
await page.click('text=Crear canción'); // Más robusto

// Combinar múltiples estrategias
await page.click('button:has-text("Guardar"):visible');
```

### Gestión de errores
```typescript
// Manejo gracioso de errores
try {
  await page.click('[data-testid="optional-element"]');
} catch (error) {
  console.log('Elemento opcional no encontrado, continuando...');
}

// Verificaciones con timeouts
await expect(page.locator('[data-testid="success-message"]'))
  .toBeVisible({ timeout: 10000 });
```

## Integración CI/CD

### GitHub Actions
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### Pipeline de pruebas
1. **Construcción**: Build de aplicación frontend y backend
2. **Inicio**: Arranque de servicios en modo de prueba
3. **Ejecución**: Ejecución de suite completa E2E
4. **Reporte**: Generación y publicación de resultados
5. **Limpieza**: Terminación de servicios y limpieza

## Solución de problemas

### Problemas comunes
- **Timeouts**: Aumentar tiempos de espera para elementos lentos
- **Selectores**: Elementos no encontrados debido a cambios de UI
- **Estado**: Contaminación entre pruebas
- **Rendimiento**: Pruebas lentas en CI

### Herramientas de debug
- **Playwright Inspector**: Debug visual paso a paso
- **Trace Viewer**: Análisis detallado de ejecuciones
- **Screenshots**: Capturas en puntos de fallo
- **Video**: Grabación de ejecuciones completas

---

**Cambia idioma:** [English](E2E_TESTING.md) | **Español**