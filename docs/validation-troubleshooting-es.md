---
layout: default
lang: es
title: Guía de Solución de Problemas de Validación ChordPro
---

# Guía de Solución de Problemas de Validación ChordPro

Esta guía te ayuda a diagnosticar y corregir problemas comunes con el sistema de validación ChordPro de ChordMe.

## Diagnóstico Rápido

### ¿Está Funcionando la Validación?

**Verifica estos indicadores:**
- ✅ La barra de estado muestra conteos de validación o "Sin problemas de validación"
- ✅ El resaltado de errores aparece cuando escribes contenido inválido
- ✅ Los tooltips al pasar el mouse muestran descripciones de errores
- ❌ Sin retroalimentación visual al escribir errores

Si la validación no funciona, ver [Validación No Responde](#validación-no-responde).

### Patrones de Error Comunes

#### Errores Rojos (Problemas Críticos)

**Notación de Acorde Inválida:**
```
[X] [123] [minúscula] [H]
```
**Corrección:** Usa notación de acordes estándar (A-G en mayúsculas o Do-Si)

**Problemas de Seguridad:**
```
<script>alert('test')</script>
```
**Corrección:** Elimina etiquetas script y HTML peligroso

**Directivas Malformadas:**
```
{incompleta {vacía: }
```
**Corrección:** Asegura formato apropiado `{directiva: valor}`

#### Advertencias Amarillas (Recomendaciones)

**Directivas Desconocidas:**
```
{directiva_personalizada: valor}
```
**Corrección:** Usa directivas ChordPro estándar o deshabilita modo estricto

**Desbalance de Llaves:**
```
[C [G] {titulo: test
```
**Corrección:** Balancea todas las llaves de apertura y cierre

**Errores Tipográficos Comunes:**
```
{titlo: Canción} {artis: Nombre}
```
**Corrección:** Verifica ortografía (`titulo`, `artista`)

## Solución de Problemas Detallada

### Validación No Responde

#### Síntomas
- No aparece resaltado de errores
- La barra de estado no se actualiza
- Sin tooltips en contenido inválido

#### Posibles Causas y Soluciones

**1. Validación Deshabilitada**
- **Verifica:** Barra de estado para interruptor de validación
- **Corrección:** Haz clic en el interruptor de validación para habilitar
- **Ubicación:** Parte inferior del editor, barra de estado de validación

**2. Errores de JavaScript**
- **Verifica:** Consola del desarrollador del navegador (F12)
- **Corrección:** Actualiza página, limpia caché, actualiza navegador
- **Busca:** Mensajes de error rojos que mencionen validación

**3. Compatibilidad del Navegador**
- **Verifica:** Versión del navegador y soporte de JavaScript
- **Corrección:** Actualiza a navegador moderno (Chrome 90+, Firefox 88+, Safari 14+)
- **Alternativa:** Prueba navegador diferente

**4. Problemas de Rendimiento**
- **Verifica:** Tamaño y complejidad del documento
- **Corrección:** Prueba primero con documento más pequeño
- **Solución:** Cambia a modo de validación "Mínimo"

### Reportes de Error Falsos

#### Síntomas
- Contenido ChordPro válido muestra errores
- Acordes correctos marcados como inválidos
- Directivas conocidas marcadas como desconocidas

#### Soluciones

**1. Verifica Nivel de Validación**
```
Configuración → Validación → Modo: Relajado
```
- El modo estricto es muy restrictivo
- El modo relajado permite más flexibilidad

**2. Desbalance de Idioma**
```
Contenido en español con validación en inglés:
[Do] [Re] [Mi] ← Puede mostrar como errores
```
- **Corrección:** Cambia idioma a español
- **Ubicación:** Selector de idioma o configuración de validación

**3. Directivas Personalizadas**
```
{estrofa1} {sección_personalizada}
```
- **Corrección:** Deshabilita modo estricto para directivas personalizadas
- **Alternativa:** Agrega reglas personalizadas en configuración

### Problemas de Rendimiento

#### Síntomas
- Respuesta lenta al escribir
- Resaltado de errores retrasado
- Navegador se congela durante validación

#### Soluciones

**1. Reduce Alcance de Validación**
```
Configuración → Validación → Verificaciones:
☑ Sintaxis de acordes (mantener)
☑ Seguridad (mantener)  
☐ Detección de errores tipográficos (deshabilitar)
☐ Elementos vacíos (deshabilitar)
```

**2. Cambia Modo de Validación**
```
Modo Estricto → Modo Relajado → Modo Mínimo
```
- Cada nivel reduce los requisitos de procesamiento

**3. Optimización de Documento**
```
Documento grande (5000+ líneas)
↓
Dividir en archivos más pequeños (500-1000 líneas cada uno)
```

**4. Rendimiento del Navegador**
- Cierra otras pestañas que usen memoria
- Limpia caché del navegador y reinicia
- Verifica memoria disponible del sistema

### Problemas Específicos de Idioma

#### Problemas de Notación de Acordes en Español

**Problema:** Acordes en español muestran como errores
```
[Do] [Re] [Mi] ← Subrayados rojos
```

**Soluciones:**
1. **Cambiar Idioma:**
   ```
   Selector de Idioma → Español
   ```

2. **Configuración Manual de Idioma:**
   ```
   Configuración de Validación → Idioma → Español
   ```

3. **Verifica Auto-Detección:**
   ```
   Configuración → Auto-detectar idioma: ☑ Habilitado
   ```

#### Problemas de Traducción

**Problema:** Mensajes de error en idioma incorrecto

**Soluciones:**
1. **Idioma del Navegador:**
   ```
   Configuración del Navegador → Idioma → Establecer idioma deseado
   ```

2. **Idioma de ChordMe:**
   ```
   Navegación Superior → Selector de Idioma
   ```

3. **Problemas de Caché:**
   ```
   Limpiar caché del navegador → Recargar página
   ```

### Problemas de Validación de Seguridad

#### Contenido Legítimo Marcado

**Problema:** HTML válido o texto marcado como riesgo de seguridad
```
Canción sobre <corazón> es marcada
```

**Soluciones:**
1. **Escapar Caracteres Especiales:**
   ```
   <corazón> → &lt;corazón&gt;
   ```

2. **Deshabilitar Verificación de Seguridad:**
   ```
   Configuración → Verificación de Seguridad: ☐ Deshabilitado
   ```
   ⚠️ **Advertencia:** Solo hazlo para contenido confiable

3. **Usar Notación Alternativa:**
   ```
   <corazón> → (corazón)
   [script] → [acorde-script]
   ```

### Depuración Avanzada

#### Habilitar Modo de Depuración

**Para Desarrollo/Pruebas:**
```javascript
// Abrir consola del navegador (F12)
localStorage.setItem('chordme-debug', 'true');
location.reload();
```

**La Información de Depuración Incluye:**
- Datos de tiempo de validación
- Registros detallados de errores
- Métricas de rendimiento
- Info de detección de idioma

#### Pruebas Manuales

**Probar Funcionalidad Básica:**
```
1. Escribir: [C] {titulo: Prueba}
   Esperado: Sin errores

2. Escribir: [X] {desconocido}
   Esperado: 2 errores resaltados

3. Pasar mouse sobre errores
   Esperado: Tooltip con descripción
```

**Probar Características de Idioma:**
```
1. Cambiar idioma a español
2. Escribir: [Do] [Re] [Mi]
   Esperado: Sin errores (auto-convertido)

3. Escribir: {titulo: Prueba}
   Esperado: Sin errores (alias reconocido)
```

### Resumen de Correcciones Comunes

| Problema | Corrección Rápida | Ubicación de Configuración |
|----------|------------------|----------------------------|
| Sin validación | Habilitar interruptor de validación | Barra de estado |
| Muchas advertencias | Cambiar a modo Relajado | Configuración → Modo |
| Errores de acordes españoles | Cambiar idioma a español | Selector de idioma |
| Rendimiento lento | Deshabilitar detección de errores tipográficos | Configuración → Verificaciones |
| Errores de directivas personalizadas | Deshabilitar modo estricto | Configuración → Modo Estricto |
| Falsos positivos de seguridad | Deshabilitar verificación de seguridad | Configuración → Seguridad |

### Obtener Ayuda Adicional

#### Antes de Contactar Soporte

**Reúne Esta Información:**
1. Nombre y versión del navegador
2. Contenido del documento (si es compartible)
3. Configuración de validación
4. Mensajes de error de consola (si los hay)
5. Pasos para reproducir el problema

#### Reportar Problemas

**Repositorio de GitHub:**
- Abrir issue con descripción detallada
- Incluir información de navegador/sistema
- Adjuntar capturas de pantalla si ayudan

**Foro de la Comunidad:**
- Buscar problemas similares primero
- Proporcionar contexto y ejemplos
- Ayudar a otros con problemas similares

#### Soluciones de Emergencia

**Si la validación está completamente rota:**
1. Deshabilitar toda validación: Configuración → Desactivar
2. Usar validador ChordPro externo temporalmente
3. Trabajar en modo de texto plano hasta arreglar
4. Guardar trabajo frecuentemente como respaldo

**Si el navegador es incompatible:**
1. Probar navegador diferente (Chrome, Firefox, Safari)
2. Usar versión móvil si está disponible
3. Descargar contenido para edición offline
4. Contactar soporte para info de compatibilidad

---

**Documentación Relacionada:**
- [Guía del Usuario - Validación ChordPro](user-guide-es.md#validación-de-chordpro)
- [Referencia de Formato ChordPro](chordpro-format-es.md)
- [Referencia de Reglas de Validación](validation-rules-reference-es.md)

**Idioma:** [English](validation-troubleshooting.md) | **Español**