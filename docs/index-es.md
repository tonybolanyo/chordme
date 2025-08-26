---
layout: default
lang: es
title: Sitio de documentación de ChordMe
---

# Sitio de documentación de ChordMe

Este directorio contiene el manual de usuario completo para ChordMe, generado automáticamente y desplegado en GitHub Pages.

## Estructura de la documentación

- **[Manual de usuario](README-es.html)** - Centro principal de documentación
- **[Comenzando](getting-started-es.html)** - Guía de instalación y configuración
- **[Guía del usuario](user-guide-es.html)** - Documentación completa de características
- **[Formato ChordPro](chordpro-format-es.html)** - Referencia del formato ChordPro
- **[Referencia de la API](api-reference-es.html)** - Documentación completa de la API
- **[Guía del desarrollador](developer-guide-es.html)** - Contribución y desarrollo
- **[Solución de problemas](troubleshooting-es.html)** - Problemas comunes y soluciones
- **[Documentación Swagger de la API](swagger.html)** - Documentación interactiva de la API

## Configuración de GitHub Pages

Esta documentación se despliega automáticamente en GitHub Pages usando Jekyll.

### Tema

La documentación usa un tema limpio y profesional optimizado para documentación técnica.

### Actualizaciones automáticas

La documentación se actualiza automáticamente cuando:
- Se crean nuevas etiquetas (releases)
- Se hacen cambios en la rama principal
- Se ejecuta manualmente el workflow

### Dominio personalizado

La documentación está disponible en: `https://tonybolanyo.github.io/chordme/`

## Contribuir a la documentación

Para mejorar la documentación:

1. Edita los archivos markdown en el directorio `docs/`
2. Prueba localmente usando Jekyll: `bundle exec jekyll serve`
3. Envía un pull request con tus cambios
4. La documentación se desplegará automáticamente después de la fusión

## Desarrollo local

Para ejecutar el sitio de documentación localmente:

```bash
# Instalar dependencias
gem install bundler jekyll
bundle install

# Servir localmente
bundle exec jekyll serve

# Abrir http://localhost:4000
```

---

*Esta documentación se mantiene y actualiza automáticamente con cada versión de ChordMe.*

**Cambia idioma:** [English](index.md) | **Español**