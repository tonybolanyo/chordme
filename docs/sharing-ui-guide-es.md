---
layout: default
lang: es
title: Guía de implementación de la interfaz de compartir canciones
---

# Guía de implementación de la interfaz de compartir canciones

Este documento proporciona una guía integral de las características de la interfaz de compartir canciones implementadas en ChordMe.

## Resumen

El sistema de compartir permite a los propietarios de canciones y administradores colaborar con otros usuarios otorgándoles diferentes niveles de acceso a las canciones. La implementación incluye notificaciones en tiempo real, gestión intuitiva de permisos y características integrales de accesibilidad.

## Características implementadas

### 1. Modal de compartir canción
- **Propósito**: Interfaz principal para gestionar colaboraciones de canciones
- **Acceso**: Disponible para propietarios de canciones y usuarios con permisos de administrador
- **Ubicación**: Accesible a través del botón "Compartir" en las tarjetas de canciones

#### Componentes clave:
- **Formulario de invitar colaborador**
  - Entrada de dirección de email con validación
  - Selector de nivel de permisos (Leer, Editar, Administrador)
  - Validación inteligente de formulario (botón deshabilitado hasta que se ingrese email)

- **Gestión de colaboradores actuales**
  - Lista de todos los usuarios con acceso a la canción
  - Insignias de permisos mostrando el nivel de acceso de cada usuario
  - Edición de permisos en línea vía menú desplegable
  - Revocación de acceso con un clic con confirmación

### 2. Integración de página de inicio
- **Botón Compartir**: Visible solo para canciones donde el usuario tiene permisos de propietario o administrador
- **Insignias de permisos**: Indicadores visuales mostrando el nivel de acceso del usuario
  - 🔵 **Propietario**: Control total (insignia azul)
  - 🔴 **Administrador**: Puede gestionar compartir (insignia roja)
  - 🟣 **Editor**: Puede editar contenido (insignia morada)
  - 🔵 **Lector**: Acceso solo de lectura (insignia azul claro)
- **Indicadores de colaboración**: Muestra el número de colaboradores (👥 N)

### 3. Notificaciones en tiempo real
- **Invitaciones de compartir**: Notificaciones instantáneas cuando se otorga acceso
- **Cambios de permisos**: Alertas cuando se modifican los niveles de acceso
- **Revocación de acceso**: Confirmación cuando se quita el acceso

### 4. Gestión de permisos
- **Niveles de acceso**:
  - **Leer**: Solo visualización de canciones
  - **Editar**: Ver y modificar contenido de canciones
  - **Administrador**: Gestionar compartir, editar contenido
  - **Propietario**: Control total (no puede ser transferido a través de la interfaz)

### 5. Características de accesibilidad
- **Navegación por teclado**: Soporte completo para todos los elementos interactivos
- **Lectores de pantalla**: Etiquetas ARIA y texto descriptivo
- **Contraste de color**: Cumple con las pautas WCAG 2.1
- **Indicadores de enfoque**: Estados de enfoque claramente visibles

## Implementación técnica

### Componentes clave
```typescript
// Componente principal del modal
export function SharingModal({ song, onClose, onUpdate }: SharingModalProps)

// Formulario de invitación
function InviteCollaboratorForm({ songId, onInvite }: InviteFormProps)

// Lista de colaboradores
function CollaboratorsList({ collaborators, onUpdate, onRemove }: CollaboratorsProps)

// Insignias de permisos
function PermissionBadge({ permission }: { permission: Permission })
```

### Integración de API
```typescript
// Endpoints principales
POST /api/v1/songs/{id}/share     // Invitar colaborador
PUT /api/v1/songs/{id}/share      // Actualizar permisos
DELETE /api/v1/songs/{id}/share   // Revocar acceso
GET /api/v1/songs/{id}/collaborators // Obtener colaboradores
```

### Gestión de estado
```typescript
// Hooks de gestión de estado
const { shareWithUser, updatePermission, revokeAccess } = useSongSharing(songId);
const { collaborators, loading, error } = useCollaborators(songId);
```

## Validación y manejo de errores

### Validación de entrada
- **Email**: Formato de email válido y requerido
- **Permisos**: Selección de nivel de permiso válido
- **Duplicados**: Previene invitaciones duplicadas

### Manejo de errores
- **Email no encontrado**: Mensaje claro cuando el usuario no existe
- **Permisos insuficientes**: Error cuando el usuario no puede compartir
- **Errores de red**: Reintentos automáticos y mensajes informativos

## Cobertura de pruebas

### Pruebas unitarias
- Renderización de componentes del modal de compartir
- Validación del formulario de invitación
- Lógica de actualización de permisos
- Confirmación de revocación de acceso

### Pruebas de integración
- Flujo completo de compartir canciones
- Sincronización de estado en tiempo real
- Manejo de errores de API

### Pruebas de accesibilidad
- Navegación por teclado
- Compatibilidad con lectores de pantalla
- Contraste de color
- Estados de enfoque

## Mejoras futuras

### Características planeadas
- **Compartir por enlace**: URLs compartibles con acceso temporal
- **Comentarios**: Sistema de comentarios en canciones compartidas
- **Historial de actividad**: Registro de todas las acciones de compartir
- **Notificaciones por email**: Alertas por email para invitaciones y cambios

### Optimizaciones técnicas
- **Carga diferida**: Carga bajo demanda de listas de colaboradores
- **Caché**: Almacenamiento en caché de datos de permisos
- **Optimización de rendimiento**: Reducir re-renderizaciones innecesarias

## Seguridad y privacidad

### Medidas de seguridad
- **Validación del lado del servidor**: Todos los permisos verificados en el backend
- **Sanitización de entrada**: Todos los inputs validados y sanitizados
- **Control de acceso**: Verificación de permisos antes de cada operación

### Consideraciones de privacidad
- **Datos mínimos**: Solo se comparte información esencial
- **Revocación**: Acceso completamente removido al revocar permisos
- **Auditoría**: Registro de todas las acciones de compartir para seguridad

---

**Cambia idioma:** [English](sharing-ui-guide.md) | **Español**