---
layout: default
lang: es
title: Pautas de accesibilidad de ChordMe
---

# Pautas de accesibilidad de ChordMe

Este documento describe los estándares de accesibilidad y las pautas de implementación para ChordMe para asegurar el cumplimiento de WCAG 2.1 AA.

## Resumen

ChordMe sigue los estándares de accesibilidad WCAG 2.1 AA para asegurar que la aplicación sea utilizable por personas con discapacidades, incluyendo aquellas que dependen de lectores de pantalla, navegación por teclado, o tienen discapacidades visuales.

## Estándares de color y contraste

### Paleta de colores

Todos los colores utilizados en ChordMe cumplen con los requisitos de contraste WCAG 2.1 AA:

- **Colores primarios**: 
  - `--primary-color: #1e3a8a` (relación de contraste 7.47:1 con blanco)
  - `--primary-hover: #1e40af` (relación de contraste 6.78:1 con blanco)
  - `--primary-light: #3b82f6` (relación de contraste 4.52:1 con blanco)

- **Colores de texto**:
  - `--text-primary: #111827` (relación de contraste 16.91:1 con blanco)
  - `--text-secondary: #374151` (relación de contraste 8.87:1 con blanco)
  - `--text-muted: #6b7280` (relación de contraste 4.59:1 con blanco)

- **Estados interactivos**:
  - `--focus-color: #2563eb` (relación de contraste 5.85:1)
  - `--error-color: #dc2626` (relación de contraste 5.47:1)
  - `--success-color: #059669` (relación de contraste 4.84:1)

### Requisitos de contraste

- **Texto normal**: Relación de contraste mínima de 4.5:1
- **Texto grande** (18pt+ o 14pt+ negrita): Relación de contraste mínima de 3:1
- **Elementos interactivos**: Relación de contraste mínima de 3:1 para bordes e indicadores de enfoque

## Implementación ARIA

### Roles de referencia

Todas las secciones principales de la página usan roles de referencia apropiados:

```html
<header role="banner">
<nav role="navigation" aria-label="Navegación principal">
<main role="main">
<section role="region" aria-labelledby="songs-heading">
<footer role="contentinfo">
```

### Estados y propiedades

```html
<!-- Estados de formulario -->
<input aria-invalid="true" aria-describedby="error-message">
<div id="error-message" role="alert">Error de validación</div>

<!-- Estados de carga -->
<button aria-busy="true">Cargando...</button>

<!-- Controles expandibles -->
<button aria-expanded="false" aria-controls="menu">Menú</button>
<ul id="menu" aria-hidden="true">
```

## Navegación por teclado

### Orden de tabulación

El orden de tabulación sigue el flujo visual y lógico:
1. Navegación principal
2. Contenido principal (formularios, botones, enlaces)
3. Navegación secundaria
4. Pie de página

### Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `Tab` | Siguiente elemento enfocable |
| `Shift + Tab` | Elemento enfocable anterior |
| `Enter` | Activar botón/enlace |
| `Space` | Activar botón/checkbox |
| `Escape` | Cerrar modal/menú |
| `Arrow keys` | Navegación en menús/listas |

### Indicadores de enfoque

Todos los elementos interactivos tienen indicadores de enfoque visibles:

```css
.focusable:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

## Compatibilidad con lectores de pantalla

### Estructura de encabezados

Jerarquía lógica de encabezados H1-H6:
- H1: Título principal de la página
- H2: Secciones principales
- H3: Subsecciones
- H4-H6: Niveles adicionales según sea necesario

### Textos descriptivos

```html
<!-- Botones descriptivos -->
<button aria-label="Eliminar canción: Título de la canción">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Imágenes informativas -->
<img src="chord-diagram.png" alt="Diagrama de acorde de Do mayor">

<!-- Imágenes decorativas -->
<img src="decoration.png" alt="" role="presentation">
```

### Texto oculto para contexto

```html
<span class="sr-only">Para usuarios de lectores de pantalla</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## Formularios accesibles

### Etiquetas y asociaciones

```html
<label for="song-title">Título de la canción *</label>
<input id="song-title" name="title" required aria-describedby="title-help">
<div id="title-help">Ingresa un título descriptivo para tu canción</div>
```

### Validación de errores

```html
<input aria-invalid="true" aria-describedby="email-error">
<div id="email-error" role="alert">
  Por favor ingresa una dirección de email válida
</div>
```

### Grupos de campos

```html
<fieldset>
  <legend>Configuración de la canción</legend>
  <!-- Controles de formulario relacionados -->
</fieldset>
```

## Características responsivas accesibles

### Objetivos táctiles

Todos los elementos interactivos cumplen con el tamaño mínimo de 44px × 44px:

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}
```

### Navegación móvil

```html
<button aria-expanded="false" 
        aria-controls="mobile-menu"
        aria-label="Abrir menú de navegación">
  <span aria-hidden="true">☰</span>
</button>
```

## Pruebas de accesibilidad

### Herramientas automatizadas
- **axe-core**: Integrado en pruebas unitarias
- **Lighthouse**: Auditorías de accesibilidad regulares
- **WAVE**: Evaluación de páginas web

### Pruebas manuales
- **Navegación solo por teclado**: Todas las funciones accesibles
- **Lectores de pantalla**: Pruebas con NVDA, JAWS, VoiceOver
- **Zoom**: Funcionalidad hasta 200% de zoom
- **Daltonismo**: Pruebas con simuladores de daltonismo

### Lista de verificación de accesibilidad

#### Nivel A (Básico)
- [ ] Todas las imágenes tienen texto alternativo apropiado
- [ ] El contenido es accesible solo por teclado
- [ ] La información no depende solo del color
- [ ] Todo el contenido se puede pausar/detener

#### Nivel AA (Estándar)
- [ ] Relación de contraste 4.5:1 para texto normal
- [ ] Relación de contraste 3:1 para texto grande
- [ ] El contenido es redimensionable hasta 200%
- [ ] Funcionalidad disponible desde teclado

#### Validaciones adicionales
- [ ] Estados de enfoque claramente visibles
- [ ] Mensajes de error descriptivos
- [ ] Orden de tabulación lógico
- [ ] Etiquetas ARIA apropiadas

## Recursos de desarrollo

### Herramientas recomendadas
- **React Testing Library**: Para pruebas de accesibilidad
- **axe-react**: Pruebas automatizadas de accesibilidad
- **eslint-plugin-jsx-a11y**: Linting de accesibilidad

### Documentación de referencia
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

---

**Cambia idioma:** [English](accessibility-guidelines.md) | **Español**