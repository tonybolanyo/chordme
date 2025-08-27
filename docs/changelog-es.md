---
layout: default
lang: es
title: Registro de cambios de ChordMe
---

# Registro de cambios de ChordMe

Todos los cambios notables en ChordMe se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-27

### Agregado

#### Características principales
- **Soporte del formato ChordPro** - Análisis y renderizado completo del formato ChordPro
- **Gestión de canciones** - Crear, editar, eliminar y organizar canciones
- **Autenticación de usuario** - Sistema seguro de registro e inicio de sesión con tokens JWT
- **Diseño responsivo** - Diseño mobile-first que funciona en todos los dispositivos
- **Colaboración en tiempo real** - Edición en vivo y compartición con múltiples usuarios
- **Integración con Google OAuth** - Iniciar sesión con cuenta de Google
- **Historial de versiones** - Rastrear y restaurar versiones anteriores de canciones
- **Exportación a PDF** - Exportar canciones a formato PDF para imprimir y compartir

#### Interfaz de usuario
- **Frontend moderno en React** - Construido con React 19 y TypeScript
- **Editor ChordPro** - Resaltado de sintaxis y vista previa en tiempo real
- **Paleta de acordes** - Selector visual de acordes y herramientas de transposición
- **Tema oscuro/claro** - Alternar entre modos oscuro y claro
- **Soporte multiidioma** - Localización completa en inglés y español
- **Características de accesibilidad** - Interfaz compatible con WCAG 2.1 AA
- **Atajos de teclado** - Navegación y edición eficientes con atajos

#### API y Backend
- **API RESTful** - API REST integral para toda la funcionalidad
- **Backend Flask** - Servidor Python Flask con ORM SQLAlchemy
- **Documentación Swagger** - Documentación interactiva de la API
- **Características de seguridad** - Protección CORS, validación de entrada, limitación de velocidad
- **Integración de base de datos** - SQLite para desarrollo, PostgreSQL para producción
- **Integración con Google Drive** - Respaldo y sincronización de canciones en Google Drive

#### Características para desarrolladores
- **Soporte TypeScript** - Implementación completa de TypeScript en frontend
- **Pruebas integrales** - 575+ pruebas de backend, 218+ pruebas de frontend
- **Pruebas End-to-End** - Suite de pruebas E2E basada en Playwright
- **Pipeline CI/CD** - GitHub Actions para pruebas y despliegue
- **Soporte Docker** - Opciones de despliegue containerizado
- **Monitoreo de rendimiento** - Seguimiento y optimización de rendimiento integrados

#### Documentación
- **Guía del usuario** - Manual de usuario integral en inglés y español
- **Guía del desarrollador** - Pautas de contribución y configuración de desarrollo
- **Referencia de API** - Documentación completa de API con ejemplos
- **Primeros pasos** - Guía de configuración e instalación rápida
- **Solución de problemas** - Problemas comunes y soluciones
- **Pautas de accesibilidad** - Mejores prácticas y pruebas de accesibilidad

### Seguridad
- **Seguridad de autenticación** - Tokens JWT con generación y validación seguras
- **Validación de entrada** - Validación integral de todas las entradas del usuario
- **Protección CORS** - Configuración adecuada de Cross-Origin Resource Sharing
- **Prevención de inyección SQL** - Consultas parametrizadas y uso de ORM
- **Protección XSS** - Política de seguridad de contenido y sanitización de entrada
- **Limitación de velocidad** - Limitación de velocidad de API para prevenir abuso
- **Cabeceras de seguridad** - Configuración adecuada de cabeceras de seguridad
- **Registro de auditoría** - Registro integral de eventos relevantes para la seguridad

### Rendimiento
- **Optimización de frontend** - División de código y carga perezosa
- **Caché de backend** - Caché de respuestas para mejorar el rendimiento
- **Optimización de base de datos** - Consultas indexadas y esquema optimizado
- **Optimización de activos** - Activos estáticos minificados y comprimidos
- **Integración CDN** - Red de entrega de contenido para activos estáticos

### Infraestructura
- **GitHub Pages** - Despliegue automático de documentación
- **Despliegue Render** - Despliegue de producción en plataforma Render
- **Integración Vercel** - Despliegue de frontend y entornos de vista previa
- **Integración Firebase** - Características en tiempo real y autenticación
- **Integración Google Cloud** - APIs de Google e integración de servicios

### Pruebas
- **Pruebas unitarias** - Cobertura integral de pruebas unitarias para todos los componentes
- **Pruebas de integración** - Pruebas de integración de API y base de datos
- **Pruebas E2E** - Pruebas completas de flujo de trabajo del usuario con Playwright
- **Pruebas de seguridad** - Pruebas y validación de vulnerabilidades de seguridad
- **Pruebas de rendimiento** - Pruebas de carga y benchmarking de rendimiento
- **Pruebas de accesibilidad** - Pruebas automatizadas de accesibilidad

---

## Calendario de lanzamientos

### Características próximas (Planificadas)
- **Aplicaciones móviles** - Aplicaciones nativas para iOS y Android
- **Colaboración avanzada** - Seguimiento de cursor en tiempo real y resolución de conflictos
- **Importación/exportación de canciones** - Soporte para formatos adicionales (MusicXML, notación ABC)
- **Temas avanzados** - Creación y compartición de temas personalizados
- **Sistema de plugins** - Arquitectura de plugins extensible
- **Soporte offline** - Aplicación web progresiva con capacidades offline

### Historial de versiones

- **v1.0.0** (2024-01-27) - Lanzamiento inicial con características principales
- **v0.9.0** (2024-01-20) - Lanzamiento beta con características de colaboración
- **v0.8.0** (2024-01-15) - Lanzamiento alfa con exportación a PDF
- **v0.7.0** (2024-01-10) - Pre-alfa con integración de Google OAuth
- **v0.6.0** (2024-01-05) - Versión de desarrollo con edición en tiempo real
- **v0.5.0** (2024-01-01) - Versión de desarrollo inicial

---

**Cambia idioma:** [English](changelog.md) | **Español**

*Para las últimas actualizaciones y notas de lanzamiento, consulta nuestros [GitHub Releases](https://github.com/tonybolanyo/chordme/releases).*