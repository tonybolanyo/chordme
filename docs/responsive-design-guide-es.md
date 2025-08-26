---
layout: default
lang: es
title: Guía de estilo de diseño responsivo de ChordMe
---

# Guía de estilo de diseño responsivo de ChordMe

## Resumen

ChordMe implementa un sistema de diseño responsivo integral con enfoque móvil primero que asegura una experiencia de usuario óptima en todos los tipos de dispositivos y tamaños de pantalla.

## Filosofía de diseño

### Enfoque móvil primero
- CSS está escrito con dispositivos móviles como objetivo principal
- Mejora progresiva para pantallas más grandes usando consultas de medios `min-width`
- Se priorizan las interacciones táctiles

### Sistema de puntos de quiebre

| Punto de quiebre | Ancho | Dispositivos objetivo |
|------------------|-------|-----------------------|
| `xs` | 320px+ | Teléfonos pequeños |
| `sm` | 480px+ | Teléfonos grandes |
| `md` | 768px+ | Tabletas |
| `lg` | 1024px+ | Escritorios pequeños |
| `xl` | 1200px+ | Escritorios grandes |

## Arquitectura CSS

### Propiedades personalizadas
```css
:root {
  /* Puntos de quiebre */
  --breakpoint-xs: 320px;
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1200px;
  
  /* Escala de espaciado */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
}
```

### Tipografía responsiva

| Tamaño de pantalla | Tamaño base de fuente | Altura de línea |
|--------------------|----------------------|-----------------|
| Móvil              | 14px                 | 1.4             |
| Tableta+           | 16px                 | 1.5             |
| Escritorio         | 16px                 | 1.6             |

## Comportamiento de componentes

### Navegación del encabezado
```
Móvil (< 768px):
├── Logo (centrado)
├── Botón de menú hamburguesa
└── Panel de navegación deslizable

Escritorio (≥ 768px):
├── Logo (izquierda)
└── Navegación horizontal (derecha)
```

### Diseño del demo ChordPro
```
Móvil/Tableta (< 1024px):
├── Instrucciones
├── Controles del editor
├── Área de texto del editor
├── Salida renderizada
└── Paleta de acordes

Escritorio (≥ 1024px):
├── Instrucciones
├── Área del editor (izquierda)
│   ├── Controles
│   ├── Área de texto
│   └── Salida renderizada
└── Paleta de acordes (derecha, fija)
```

## Características de accesibilidad

Todos los elementos interactivos cumplen con las pautas de objetivos táctiles WCAG 2.1 (mínimo 44px × 44px)
- Estructura HTML semántica apropiada con roles de referencia
- Etiquetas ARIA para navegación móvil e interacciones complejas
- Organización de contenido amigable para lectores de pantalla con jerarquía de encabezados apropiada
- Soporte de navegación por teclado para todos los elementos interactivos
- Relaciones de contraste de color que cumplen con los estándares WCAG 2.1 AA (4.5:1 para texto normal, 3:1 para texto grande)
- Indicadores de foco claramente visibles para usuarios de teclado
- Anuncios de lector de pantalla para cambios de contenido dinámico

## Implementación práctica

### Consultas de medios principales
```css
/* Móvil primero */
.component {
  /* Estilos móviles */
}

/* Tableta y arriba */
@media (min-width: 768px) {
  .component {
    /* Estilos de tableta */
  }
}

/* Escritorio y arriba */
@media (min-width: 1024px) {
  .component {
    /* Estilos de escritorio */
  }
}
```

### Sistema de grilla
```css
.container {
  width: 100%;
  padding: 0 var(--space-md);
  margin: 0 auto;
  max-width: 1200px;
}

.grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .grid-md-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Lista de verificación de pruebas

### Pruebas manuales
- [ ] Navegación y usabilidad en dispositivos móviles
- [ ] Legibilidad del texto en todas las resoluciones
- [ ] Funcionalidad táctil en tablets
- [ ] Diseño de escritorio en pantallas grandes
- [ ] Verificar usabilidad de formularios en todos los tamaños de pantalla

### Pruebas automatizadas
- Pruebas unitarias para funciones de utilidad responsivas
- Pruebas E2E para comportamiento específico de viewport
- Pruebas de regresión visual para puntos de quiebre de diseño

## Consideraciones de rendimiento

- Propiedades personalizadas CSS para cálculos responsivos eficientes
- JavaScript mínimo para detección de viewport
- Carga progresiva de características específicas para móviles
- Manejo optimizado de eventos táctiles

## Mejoras futuras

- Navegación inferior para móvil (si es necesario)
- Soporte de gestos para interacciones móviles
- Diseños avanzados específicos para tabletas
- Características de aplicación móvil PWA

---

**Cambia idioma:** [English](responsive-design-guide.md) | **Español**