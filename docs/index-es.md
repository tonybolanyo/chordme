---
layout: default
lang: es
title: Sitio de documentación de ChordMe
---

# Sitio de documentación de ChordMe

Este directorio contiene el manual de usuario completo para ChordMe, generado automáticamente y desplegado en GitHub Pages.

## Estructura de la documentación

### Documentación del usuario
- **[Comenzando](getting-started-es.html)** - Guía de instalación y configuración
- **[Guía del usuario](user-guide-es.html)** - Documentación completa de características
- **[Formato ChordPro](chordpro-format-es.html)** - Referencia del formato ChordPro
- **[Solución de problemas](troubleshooting-es.html)** - Problemas comunes y soluciones

### Documentación del desarrollador
- **[Guía del desarrollador](developer-guide-es.html)** - Contribución y desarrollo
- **[Referencia de la API](api-reference-es.html)** - Documentación completa de la API
- **[Documentación de la API](api-documentation-es.html)** - Detalles de implementación
- **[Guía de pruebas](testing-es.html)** - Configuración y pautas de pruebas

### Infraestructura y despliegue
- **[Guía de infraestructura](infrastructure-es.html)** - Despliegue en la nube con Terraform/CloudFormation
- **[Guía de despliegue](deployment-es.html)** - Estrategias de despliegue y automatización
- **[Netlify Railway Supabase](deployment-netlify-railway-supabase-es.html)** - Stack de despliegue recomendado

### Seguridad y cumplimiento
- **[Lista de verificación de seguridad](security-checklist-es.html)** - Pautas y mejores prácticas de seguridad
- **[Modelo de amenazas](threat-model-es.html)** - Análisis de amenazas de seguridad
- **[Auditoría final de seguridad](final-security-audit-report-es.html)** - Resultados de auditoría de seguridad

### Características de colaboración
- **[Arquitectura de edición colaborativa](collaborative-editing-architecture-es.html)** - Detalles técnicos de colaboración en tiempo real
- **[Integración de Firebase](firebase-integration-es.html)** - Configuración y setup de Firebase
- **[Integración de Google OAuth](google-oauth-integration-es.html)** - Configuración de autenticación

### Pruebas y aseguramiento de calidad
- **[Informe de cobertura de pruebas](collaboration-test-coverage-report-es.html)** - Métricas de pruebas de colaboración
- **[Integración de CodeCov](codecov-es.html)** - Análisis de cobertura de código

### Información del proyecto
- **[Registro de cambios](changelog-es.html)** - Historial de versiones y notas de lanzamiento
- **[Documentación de flujos de trabajo](workflows-documentation-es.html)** - Documentación del pipeline CI/CD
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