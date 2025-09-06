---
layout: default
lang: es
title: Referencia de Reglas de Validación
---

# Referencia de Reglas de Validación ChordPro

## Resumen

Este documento proporciona una referencia completa de todas las reglas de validación implementadas en el motor de validación ChordPro de ChordMe. Incluye descripciones detalladas, ejemplos y guías de solución para cada tipo de error.

## Categorías de Validación

### 1. Validación de Acordes

#### 1.1 Acorde Inválido
**Código**: `INVALID_CHORD`  
**Severidad**: Error  
**Descripción**: El acorde especificado no coincide con patrones de notación musical estándar.

**Ejemplos de errores**:
```
[Xyz]  // Notación no reconocida
[C#b]  // Combinación inválida de alteraciones
[Hm]   // Nota no estándar (excepto en sistema alemán)
```

**Soluciones**:
- Usar notación estándar: `[C]`, `[Dm]`, `[F#7]`
- Verificar alteraciones: `[C#]` o `[Db]`, no ambos
- Consultar tabla de acordes válidos

#### 1.2 Acorde Vacío
**Código**: `EMPTY_CHORD`  
**Severidad**: Error  
**Descripción**: Se encontraron brackets de acorde sin contenido.

**Ejemplo**:
```
[]  // Acorde vacío
```

**Solución**:
- Agregar notación de acorde: `[C]`
- O eliminar brackets vacíos

#### 1.3 Sugerencia de Acorde
**Código**: `CHORD_SUGGESTION`  
**Severidad**: Advertencia  
**Descripción**: El acorde puede tener una notación más estándar.

**Ejemplos**:
```
[Cmaj]     → [C] o [Cmaj7]
[Dmin]     → [Dm]
[G major] → [G]
```

### 2. Validación de Directivas

#### 2.1 Directiva Desconocida
**Código**: `UNKNOWN_DIRECTIVE`  
**Severidad**: Advertencia  
**Descripción**: La directiva no es reconocida en el estándar ChordPro.

**Ejemplos de errores**:
```
{unknown_directive}
{my_custom_tag}
{typo_in_name}
```

**Directivas válidas**:
```
{title: Mi Canción}
{artist: Artista}
{key: C}
{tempo: 120}
{capo: 2}
{start_of_chorus}
{end_of_chorus}
{start_of_verse}
{end_of_verse}
{comment: Notas}
{subtitle: Subtítulo}
{album: Álbum}
{year: 2024}
```

#### 2.2 Directiva Vacía
**Código**: `EMPTY_DIRECTIVE`  
**Severidad**: Error  
**Descripción**: Se encontraron llaves de directiva sin contenido.

**Ejemplo**:
```
{}  // Directiva vacía
```

**Solución**:
- Agregar directiva válida: `{title: Mi Canción}`
- O eliminar llaves vacías

#### 2.3 Error Tipográfico en Directiva
**Código**: `DIRECTIVE_TYPO`  
**Severidad**: Advertencia  
**Descripción**: La directiva puede contener un error tipográfico.

**Ejemplos comunes**:
```
{titel}      → {title}
{artiest}    → {artist}
{tempoo}     → {tempo}
{keey}       → {key}
{commment}   → {comment}
{subtittle}  → {subtitle}
```

### 3. Validación de Brackets

#### 3.1 Brackets Desbalanceados
**Código**: `BRACKET_MISMATCH`  
**Severidad**: Error  
**Descripción**: El número de brackets de apertura no coincide con los de cierre.

**Ejemplos**:
```
[C [G]     // Falta cierre para primer acorde
[C] G]     // Bracket de cierre extra
{title     // Falta cierre de directiva
title}     // Falta apertura de directiva
```

**Soluciones**:
- Verificar que cada `[` tenga su correspondiente `]`
- Verificar que cada `{` tenga su correspondiente `}`
- Usar herramientas de validación automática

#### 3.2 Brackets Anidados
**Código**: `NESTED_BRACKETS`  
**Severidad**: Advertencia  
**Descripción**: Se encontraron brackets anidados, lo cual no es estándar.

**Ejemplo**:
```
[C [Dm] G]  // Acordes anidados
```

**Solución**:
```
[C] [Dm] [G]  // Acordes separados
```

### 4. Validación de Seguridad

#### 4.1 Etiquetas Script
**Código**: `SCRIPT_TAG`  
**Severidad**: Error  
**Descripción**: Se detectaron etiquetas `<script>` que representan un riesgo de seguridad.

**Ejemplo**:
```
<script>alert('hack')</script>
```

**Solución**: Eliminar todo código JavaScript

#### 4.2 Protocolo JavaScript
**Código**: `JAVASCRIPT_PROTOCOL`  
**Severidad**: Error  
**Descripción**: Se detectó uso del protocolo `javascript:` en enlaces.

**Ejemplo**:
```
javascript:alert('hack')
```

**Solución**: Usar enlaces normales: `https://ejemplo.com`

#### 4.3 Manejadores de Eventos
**Código**: `EVENT_HANDLER`  
**Severidad**: Error  
**Descripción**: Se detectaron manejadores de eventos HTML peligrosos.

**Ejemplos**:
```
onclick="alert('hack')"
onload="malicious()"
onerror="hack()"
```

**Solución**: Eliminar todos los manejadores de eventos

#### 4.4 Etiquetas Iframe
**Código**: `IFRAME_TAG`  
**Severidad**: Error  
**Descripción**: Se detectaron etiquetas `<iframe>` que pueden ser un riesgo de seguridad.

**Solución**: Eliminar etiquetas iframe

#### 4.5 Etiquetas Object/Embed
**Código**: `OBJECT_TAG` / `EMBED_TAG`  
**Severidad**: Error  
**Descripción**: Se detectaron etiquetas que pueden ejecutar contenido externo.

**Solución**: Eliminar etiquetas object y embed

#### 4.6 Caracteres Especiales
**Código**: `SPECIAL_CHARS`  
**Severidad**: Advertencia  
**Descripción**: Alta concentración de caracteres especiales que pueden indicar contenido malicioso.

**Solución**: Revisar y reducir uso de caracteres especiales innecesarios

### 5. Validación de Formato

#### 5.1 Estructura de Sección
**Código**: `SECTION_STRUCTURE`  
**Severidad**: Advertencia  
**Descripción**: Las secciones no están correctamente estructuradas.

**Estructura recomendada**:
```
{start_of_verse}
Contenido del verso
{end_of_verse}

{start_of_chorus}  
Contenido del coro
{end_of_chorus}
```

#### 5.2 Espaciado Inconsistente
**Código**: `INCONSISTENT_SPACING`  
**Severidad**: Info  
**Descripción**: El espaciado entre elementos no es consistente.

**Buenas prácticas**:
```
[C]      [F]      [G]     // Espaciado consistente
Mi texto con acordes
```

#### 5.3 Líneas Vacías Excesivas
**Código**: `EXCESSIVE_BLANK_LINES`  
**Severidad**: Info  
**Descripción**: Demasiadas líneas vacías consecutivas.

**Recomendación**: Máximo 2 líneas vacías consecutivas

### 6. Validación de Idioma

#### 6.1 Idioma de Acordes
**Código**: `CHORD_LANGUAGE_MISMATCH`  
**Severidad**: Advertencia  
**Descripción**: Mezcla de sistemas de notación de acordes.

**Sistemas válidos**:
- **Inglés**: C, D, E, F, G, A, B
- **Latino**: Do, Re, Mi, Fa, Sol, La, Si  
- **Alemán**: C, D, E, F, G, A, H

**Solución**: Usar un sistema consistente en toda la canción

#### 6.2 Caracteres No ASCII
**Código**: `NON_ASCII_CHARS`  
**Severidad**: Info  
**Descripción**: Uso de caracteres especiales que pueden causar problemas de compatibilidad.

**Caracteres problemáticos**:
```
"texto"   → "texto"  // Comillas curvas
—         → -        // Guión largo
…         → ...      // Puntos suspensivos
```

## Configuración de Validación

### Niveles de Severidad

#### Error (Error)
- **Color**: Rojo
- **Icono**: ❌ 
- **Acción**: Debe corregirse
- **Bloquea**: Puede bloquear guardado en modo estricto

#### Advertencia (Warning)  
- **Color**: Naranja
- **Icono**: ⚠️
- **Acción**: Se recomienda corregir
- **Bloquea**: No bloquea operaciones

#### Información (Info)
- **Color**: Azul
- **Icono**: ℹ️
- **Acción**: Sugerencia de mejora
- **Bloquea**: No afecta funcionalidad

### Configuraciones de Usuario

#### Modo Estricto
```json
{
  "strictMode": true,
  "blockOnErrors": true,
  "showWarnings": true,
  "showInfo": false
}
```

#### Modo Permisivo
```json
{
  "strictMode": false,
  "blockOnErrors": false,  
  "showWarnings": true,
  "showInfo": true
}
```

#### Configuración Personalizada
```json
{
  "rules": {
    "chord_validation": true,
    "directive_validation": true,
    "bracket_matching": true,
    "security_check": true,
    "typo_detection": false,
    "format_suggestions": false
  }
}
```

## API de Validación

### Estructura de Respuesta

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

interface ValidationError {
  code: string;           // Código de error
  message: string;        // Mensaje descriptivo
  messageEs: string;      // Mensaje en español
  line: number;          // Número de línea
  column: number;        // Número de columna
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;   // Sugerencia de corrección
  category: string;      // Categoría de error
}
```

### Ejemplo de Uso

```typescript
import { validateChordPro } from './validation';

const content = `{title: Mi Canción}
[C] Esta es mi [G] canción
[Xyz] Acorde inválido`;

const result = validateChordPro(content);

if (!result.isValid) {
  result.errors.forEach(error => {
    console.log(`Error en línea ${error.line}: ${error.message}`);
  });
}
```

## Mensajes de Error Localizados

### Español
```json
{
  "INVALID_CHORD": "Notación de acorde inválida: \"{{chord}}\"",
  "EMPTY_CHORD": "Se encontró notación de acorde vacía []",
  "UNKNOWN_DIRECTIVE": "Directiva desconocida: \"{{directive}}\"",
  "BRACKET_MISMATCH": "Corchetes desbalanceados: {{open}} apertura, {{close}} cierre",
  "SCRIPT_TAG": "Las etiquetas script no están permitidas",
  "TYPO_SUGGESTION": "Posible error tipográfico: \"{{typo}}\""
}
```

### Inglés
```json
{
  "INVALID_CHORD": "Invalid chord notation: \"{{chord}}\"",
  "EMPTY_CHORD": "Found empty chord notation []",
  "UNKNOWN_DIRECTIVE": "Unknown directive: \"{{directive}}\"",
  "BRACKET_MISMATCH": "Mismatched brackets: {{open}} opening, {{close}} closing",
  "SCRIPT_TAG": "Script tags are not allowed",
  "TYPO_SUGGESTION": "Possible typo: \"{{typo}}\""
}
```

## Mejores Prácticas

### Para Usuarios

1. **Validación Regular**: Activa validación automática mientras escribes
2. **Modo Progresivo**: Comienza con modo permisivo, avanza a estricto
3. **Atención a Colores**: Rojo = crítico, naranja = importante, azul = opcional
4. **Sugerencias**: Usa las sugerencias automáticas cuando estén disponibles

### Para Desarrolladores

1. **Mensajes Claros**: Proporciona mensajes de error descriptivos
2. **Sugerencias Útiles**: Incluye sugerencias de corrección cuando sea posible
3. **Contexto**: Proporciona información de línea y columna
4. **Internacionalización**: Soporte para múltiples idiomas en mensajes

## Solución de Problemas

### Problemas Comunes

#### Demasiados Errores
- Verificar configuración de validación
- Usar modo permisivo temporalmente
- Corregir errores por categoría

#### Validación Lenta
- Deshabilitar validación en tiempo real para documentos grandes
- Usar validación manual (F8)
- Reducir frecuencia de validación automática

#### Falsos Positivos
- Revisar configuración de reglas
- Reportar problemas para mejorar algoritmos
- Usar excepciones para casos especiales

---

**Idioma:** [English](validation-rules-reference.md) | **Español**

*Para más información sobre validación, consulte la [Guía de Solución de Problemas de Validación](validation-troubleshooting-es.md) y la [Guía del Usuario](user-guide-es.md#validación-de-chordpro).*