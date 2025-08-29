---
layout: default
lang: es
title: Diseño del panel y características de compartir
---

# Diseño del panel y características de compartir

Este documento describe el diseño mejorado del panel que separa las canciones en secciones distintas basadas en la propiedad y los permisos de compartir.

## Secciones del panel

### Mis canciones
- **Propósito**: Muestra canciones propiedad del usuario actual
- **Criterios**: Canciones donde `author_id` coincide con el ID del usuario actual
- **Características**:
  - Visualización de insignia de propietario
  - Capacidades completas de edición y compartir
  - Controles de ordenación (título, fecha de creación, última modificación)
  - Acciones de gestión de canciones (Ver, Editar, Descargar, Compartir, Eliminar)

### Compartidas conmigo
- **Propósito**: Muestra canciones que han sido compartidas con el usuario actual
- **Criterios**: Canciones donde el usuario tiene permisos de `read`, `edit`, o `admin` pero no es el propietario
- **Características**:
  - Insignias de nivel de permisos (Administrador, Editor, Lector)
  - Controles de filtrado basados en permisos
  - Controles de ordenación (título, fecha de creación, última modificación)
  - Acciones apropiadas según permisos (Ver siempre disponible, Editar/Compartir basado en nivel de permisos)

## Indicadores visuales

### Insignias de permisos
- **Propietario** (Azul): Control total sobre la canción
- **Administrador** (Rojo): Puede gestionar el compartir y editar contenido
- **Editor** (Morado): Puede editar el contenido de la canción
- **Lector** (Azul claro): Acceso solo de lectura

### Indicadores de colaboración
- **Conteo de colaboradores**: Muestra el número de usuarios con acceso ([SYMBOL] N)
- **Estado en tiempo real**: Indicador verde cuando la sincronización en tiempo real está activa ([READY] Tiempo real)

### Información de actividad
- **Última modificación**: Muestra el tiempo relativo desde la última actualización
- **Fecha de creación**: Disponible en las opciones de ordenación

## Filtrado y ordenación

### Controles de Mis canciones
- **Opciones de ordenación**:
  - Última modificación (predeterminado)
  - Título (alfabético)
  - Fecha de creación (más reciente primero)

### Controles de canciones compartidas
- **Opciones de filtro**:
  - Todos los permisos (predeterminado)
  - Solo acceso de administrador
  - Solo acceso de edición
  - Solo acceso de lectura
- **Opciones de ordenación**:
  - Última modificación (predeterminado)
  - Título (alfabético)
  - Fecha de creación (más reciente primero)

## Experiencia del usuario

### Estados vacíos
- **Mis canciones**: Mensaje alentador para crear la primera canción
- **Compartidas conmigo**: Mensaje informativo sobre esperar contenido compartido

### Características en tiempo real
- Actualizaciones automáticas cuando Firestore está disponible
- Indicadores de estado en tiempo real en los encabezados de sección
- Reflejo instantáneo de cambios de compartir

### Diseño responsivo
- Los controles solo aparecen cuando hay canciones presentes
- Estilo limpio y consistente
- Diseño amigable para móviles

## Implementación técnica

### Lógica de categorización de canciones
```typescript
// Determinar si la canción pertenece a "Mis canciones"
const getMySongs = (): Song[] => {
  return songs.filter(song => getUserPermission(song) === 'owner');
};

// Determinar si la canción pertenece a "Compartidas conmigo"  
const getSharedSongs = (): Song[] => {
  return songs.filter(song => {
    const permission = getUserPermission(song);
    return permission === 'read' || permission === 'edit' || permission === 'admin';
  });
};
```

### Verificación de permisos
```typescript
const getUserPermission = (song: Song): string => {
  const currentUser = localStorage.getItem('authUser');
  if (!currentUser) return 'none';
  
  try {
    const user = JSON.parse(currentUser);
    if (song.author_id === user.id) return 'owner';
    return song.user_permission || 'none';
  } catch {
    return 'none';
  }
};
```

### Disponibilidad de acciones
- **Ver**: Disponible para todas las canciones accesibles
- **Editar**: Disponible para propietario, administrador y permisos de edición
- **Compartir**: Disponible solo para propietario y permisos de administrador
- **Eliminar**: Disponible solo para propietarios (no se muestra en la sección compartida)
- **Descargar**: Disponible para todas las canciones accesibles

## Características de accesibilidad

- Etiquetas ARIA apropiadas para todos los controles
- Estructura HTML semántica
- Soporte de navegación por teclado
- Descripciones amigables para lectores de pantalla
- Jerarquía visual clara

## Cobertura de pruebas

- Lógica de categorización de canciones
- Visualización de insignias de permisos
- Funcionalidad de filtrado y ordenación
- Manejo de estados vacíos
- Visualización de indicador en tiempo real
- Disponibilidad de botones de acción basada en permisos

---

**Cambia idioma:** [English](dashboard-guide.md) | **Español**