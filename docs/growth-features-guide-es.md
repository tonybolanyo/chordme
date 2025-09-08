---
layout: default
lang: es
title: Guía de Funcionalidades de Crecimiento y Participación
---

# Guía de Funcionalidades de Crecimiento y Participación

ChordMe incluye funcionalidades integrales de crecimiento y participación diseñadas para fomentar la adopción de la plataforma, mejorar la retención de usuarios y crear una comunidad próspera de músicos.

## Resumen

El sistema de crecimiento y participación incluye:

- **Programa de Referidos**: Recompensar a los usuarios por invitar amigos
- **Sistema de Logros**: Desbloqueo progresivo de insignias y seguimiento de reputación
- **Desafíos Diarios**: Objetivos de práctica y tareas de desarrollo de habilidades
- **Compartir Social**: Compartir logros e hitos
- **Optimización de Incorporación**: Experiencia de usuario guiada con seguimiento de progreso
- **Marco de Pruebas A/B**: Optimizar experimentos de crecimiento
- **Integración de Marketing por Email**: Campañas de participación

## Programa de Referidos

### Cómo Funciona

1. **Generar Código de Referido**: Los usuarios crean códigos de referido únicos
2. **Compartir con Amigos**: Compartir códigos via redes sociales, email o enlaces directos
3. **Rastrear Referidos**: El sistema rastrea cuando los usuarios referidos se registran
4. **Ganar Recompensas**: Tanto el referidor como el usuario referido reciben puntos

### Endpoints de API

```javascript
// Generar un nuevo código de referido
POST /api/v1/growth/referrals/generate
{
  "campaign": "navidad-2024",
  "source": "email"
}

// Rastrear referido antes del registro
POST /api/v1/growth/referrals/track
{
  "referral_code": "ABC123XY",
  "email": "amigo@example.com"
}

// Completar referido después del registro
POST /api/v1/growth/referrals/complete
{
  "referral_code": "ABC123XY"
}

// Obtener estadísticas de referidos
GET /api/v1/growth/referrals/stats
```

### Recompensas de Referidos

- **Recompensa del Referidor**: 100 puntos por referido exitoso
- **Recompensa del Usuario Referido**: 50 puntos por registrarse
- **Período de Expiración**: Los códigos de referido expiran después de 30 días
- **Rastreo**: Atribución completa desde compartir hasta registro

## Sistema de Logros

### Categorías de Insignias

#### Insignias Comunes
- **Primera Publicación**: Hizo su primera publicación en el foro
- **Creador de Canciones**: Creó su primera canción
- **Iniciador de Práctica**: Completó primera sesión de práctica

#### Insignias Poco Comunes
- **Músico Activo**: Creó 5 canciones
- **Entusiasta de la Práctica**: 10 sesiones de práctica completadas
- **Miembro de la Comunidad**: Hizo 10 publicaciones en el foro

#### Insignias Raras
- **Compositor**: Creó 25 canciones
- **Maestro de la Práctica**: 50 sesiones de práctica completadas
- **Miembro Útil**: Recibió 25 votos útiles

#### Insignias Épicas
- **Creador Prolífico**: Creó 100 canciones
- **Leyenda de la Práctica**: 200 sesiones de práctica completadas
- **Líder de la Comunidad**: Alcanzó 500 puntos de reputación

#### Insignias Legendarias
- **Maestro de ChordMe**: Alcanzó el nivel máximo de reputación
- **Músico Definitivo**: Completó todos los desafíos disponibles

### Sistema de Reputación

Los usuarios ganan puntos de reputación a través de varias actividades:

- **Creación de Canciones**: 5 puntos por canción
- **Sesiones de Práctica**: 2 puntos por sesión
- **Participación en el Foro**: 1-10 puntos basado en actividad
- **Completar Desafíos**: 10-50 puntos por desafío
- **Éxito de Referidos**: 100 puntos por referido

### Endpoints de API

```javascript
// Obtener progreso de logros
GET /api/v1/growth/achievements/progress

// La respuesta incluye:
{
  "reputation": {
    "total_score": 250,
    "level": 4,
    "level_name": "Regular",
    "badges_earned": [1, 5, 12]
  },
  "earned_badges": [...],
  "available_badges": [...],
  "progress_to_next_level": 65.5
}
```

## Desafíos Diarios

### Tipos de Desafíos

1. **Tiempo de Práctica**: Practicar por duración específica
2. **Precisión**: Lograr objetivos de precisión en la práctica
3. **Canción Nueva**: Crear o aprender canciones nuevas
4. **Compartir**: Compartir contenido con la comunidad
5. **Racha**: Mantener días consecutivos de actividad
6. **Maestría**: Completar desafíos de habilidades avanzadas

### Dificultad de Desafíos

- **Fácil**: Recompensa de 5-10 puntos, tareas simples
- **Medio**: Recompensa de 10-25 puntos, esfuerzo moderado
- **Difícil**: Recompensa de 25-50 puntos, objetivos desafiantes

### Endpoints de API

```javascript
// Obtener desafíos de hoy
GET /api/v1/growth/challenges/daily

// Obtener desafíos para fecha específica
GET /api/v1/growth/challenges/daily?date=2024-01-15

// Actualizar progreso del desafío
POST /api/v1/growth/challenges/{challengeId}/progress
{
  "value": 30  // Nuevo valor de progreso
}
```

## Optimización de Incorporación

### Pasos de Incorporación

1. **Configuración del Perfil**: Completar información del perfil de usuario
2. **Primera Canción**: Crear primera canción usando el editor ChordPro
3. **Guardar Canción**: Guardar y organizar primera canción
4. **Tutorial**: Completar tutorial interactivo
5. **Primer Acorde**: Aprender primer acorde o progresión de acordes
6. **Sesión de Práctica**: Completar primera sesión de práctica
7. **Interacción Social**: Participar en funcionalidades de la comunidad

### Seguimiento de Progreso

El sistema rastrea el porcentaje de completación y celebra hitos:

- **Primer Día**: Completar configuración inicial
- **Primera Semana**: Mantenerse activo por 7 días
- **Hitos de Racha**: Mantener rachas de 3, 7, 14, 30 días
- **Incorporación Completa**: Terminar todos los pasos de incorporación

### Endpoints de API

```javascript
// Obtener progreso de incorporación
GET /api/v1/growth/onboarding/progress

// Completar paso de incorporación
POST /api/v1/growth/onboarding/complete-step
{
  "step": "first_song_created"
}
```

## Marco de Pruebas A/B

### Tipos de Experimentos

- **Pruebas A/B**: Comparar dos variantes
- **Pruebas Multivariadas**: Probar múltiples variables
- **Banderas de Funcionalidades**: Despliegues graduales de funcionalidades

### Configuración de Experimentos

```javascript
{
  "name": "nuevo-flujo-incorporacion",
  "variants": ["control", "tour_guiado", "intro_video"],
  "traffic_allocation": {
    "control": 33,
    "tour_guiado": 33,
    "intro_video": 34
  },
  "success_criteria": {
    "primary_metric": "onboarding_completion",
    "min_improvement": 5.0
  }
}
```

### Endpoints de API

```javascript
// Obtener asignación de experimento
GET /api/v1/growth/experiments/{experimentName}/assignment

// La respuesta incluye variante y banderas de funcionalidades
{
  "experiment": "nuevo-flujo-incorporacion",
  "variant": "tour_guiado",
  "feature_flags": {
    "show_guided_tour": true,
    "tour_style": "spotlight"
  }
}
```

## Integración de Compartir Social

### Contenido Compartible

- **Insignias de Logros**: Compartir insignias ganadas en redes sociales
- **Celebraciones de Hitos**: Compartir hitos de incorporación
- **Completar Desafíos**: Compartir éxitos de desafíos diarios
- **Invitaciones de Referidos**: Compartir códigos y enlaces de referidos

### Plataformas Soportadas

- **Twitter**: Anuncios de logros y compartir referidos
- **Facebook**: Celebraciones de hitos e invitaciones a la comunidad
- **LinkedIn**: Logros musicales profesionales

### Ejemplo de Uso

```javascript
import { growthService } from './services/growthService';

// Compartir logro en Twitter
growthService.shareAchievement(badge, 'twitter');

// Generar y compartir enlace de referido
const link = growthService.generateReferralLink(referralCode);
```

## Integración Frontend

### Componentes React

```javascript
import { 
  DailyChallenges, 
  ReferralProgram, 
  AchievementProgress 
} from './components/Growth';

// Mostrar desafíos diarios
<DailyChallenges className="mb-6" />

// Mostrar programa de referidos
<ReferralProgram className="mb-6" />

// Mostrar progreso de logros
<AchievementProgress className="mb-6" />
```

### Uso del Servicio de Crecimiento

```javascript
import { growthService } from './services/growthService';

// Verificar referido en URL
const referralCode = growthService.extractReferralFromUrl();
if (referralCode) {
  await growthService.trackReferral(referralCode, userEmail);
}

// Completar paso de incorporación
await growthService.completeOnboardingStep('first_song_created');

// Actualizar progreso del desafío
await growthService.updateChallengeProgress(challengeId, newValue);
```

## Analítica y Métricas

### Métricas Clave Rastreadas

- **Tasa de Conversión de Referidos**: Porcentaje de referidos que se registran
- **Tasa de Completar Desafíos**: Participación en desafíos diarios
- **Embudo de Incorporación**: Tasas de completación paso a paso
- **Mejora de Retención**: Impacto en la retención de usuarios
- **Aumento de Participación**: Crecimiento de usuarios activos

### Indicadores de Éxito

- **Adquisición de Usuarios**: 25% de aumento por referidos
- **Retención**: 40% de mejora en retención de 30 días
- **Participación**: 60% de aumento en usuarios activos diarios
- **Crecimiento de Comunidad**: 200% de aumento en participación del foro

## Mejores Prácticas

### Para Desarrolladores

1. **Despliegue Gradual**: Usar pruebas A/B para nuevas funcionalidades
2. **Monitoreo de Rendimiento**: Rastrear tiempos de respuesta de API
3. **Manejo de Errores**: Degradación elegante para funcionalidades de crecimiento
4. **Integración de Analítica**: Rastreo integral de eventos

### Para Usuarios

1. **Compartir Auténticamente**: Los mensajes de referido personales funcionan mejor
2. **Establecer Objetivos Alcanzables**: Comenzar con desafíos diarios fáciles
3. **Celebrar Hitos**: Compartir logros con la comunidad
4. **Mantener Consistencia**: La participación regular mejora la experiencia

## Solución de Problemas

### Problemas Comunes

1. **Referido No Rastreando**: Asegúrese de que las cookies estén habilitadas
2. **Desafío No Actualizando**: Verificar conectividad de red
3. **Insignias No Apareciendo**: Limpiar caché del navegador
4. **Fallas al Compartir**: Verificar permisos de redes sociales

### Códigos de Error

- `REFERRAL_EXPIRED`: El código de referido ha expirado
- `CHALLENGE_NOT_FOUND`: ID de desafío inválido
- `EXPERIMENT_INACTIVE`: La prueba A/B no está activa
- `INSUFFICIENT_PERMISSIONS`: El usuario carece de permisos requeridos

## Límites de Tasa de API

- **Generación de Referidos**: 5 solicitudes por hora
- **Actualizaciones de Progreso**: 30 solicitudes por minuto
- **Recuperación de Estadísticas**: 60 solicitudes por hora
- **Asignación de Experimentos**: 100 solicitudes por hora

---

**Cambiar idioma:** [English](growth-features-guide.md) | **Español**