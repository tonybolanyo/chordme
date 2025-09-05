---
layout: default
lang: es
title: Guía del usuario de ChordMe
---

# Guía del usuario de ChordMe

Esta guía cubre todas las características y funcionalidades disponibles en ChordMe para usuarios finales.

## Resumen

ChordMe proporciona una plataforma integral para gestionar canciones con letras y acordes. Ya seas músico, compositor o profesor de música, ChordMe ofrece las herramientas que necesitas para organizar y mostrar tu contenido musical.

## Autenticación de usuario

### Registro

Para comenzar a usar ChordMe, necesitas crear una cuenta:

1. Navega a la página de registro
2. Proporciona una dirección de correo electrónico válida
3. Crea una contraseña segura (se aplican requisitos mínimos)
4. Envía el formulario de registro
5. Recibirás un mensaje de éxito tras el registro exitoso

### Inicio de sesión

Después del registro, inicia sesión para acceder a tu biblioteca personal de canciones:

1. Ingresa tu correo electrónico y contraseña
2. Haz clic en el botón de inicio de sesión
3. Recibirás un token JWT para solicitudes autenticadas
4. El token maneja automáticamente tu sesión

### Seguridad de contraseñas

ChordMe implementa mejores prácticas de seguridad:

- **Hashing seguro**: Las contraseñas se almacenan usando hash bcrypt
- **Requisitos de contraseña**: Longitud mínima y complejidad
- **Autenticación basada en token**: Tokens JWT seguros para sesiones

## Gestión de canciones

### Crear canciones

Para agregar una nueva canción a tu biblioteca:

1. **Haz clic en "Nueva canción"** en el panel principal
2. **Completa los detalles de la canción**:
   - **Título**: El nombre de la canción
   - **Artista**: El intérprete o compositor
   - **Contenido**: Las letras y acordes en formato ChordPro
3. **Vista previa**: Usa la función de vista previa para verificar el formato
4. **Guardar**: Guarda la canción en tu biblioteca

### Editar canciones

Para modificar canciones existentes:

1. **Busca la canción** en tu biblioteca
2. **Haz clic en "Editar"** junto a la canción
3. **Realiza los cambios** necesarios
4. **Guarda los cambios** para actualizar la canción

### Eliminar canciones

Para eliminar canciones de tu biblioteca:

1. **Localiza la canción** que deseas eliminar
2. **Haz clic en "Eliminar"** (generalmente un icono de papelera)
3. **Confirma la eliminación** cuando se te solicite
4. La canción se eliminará permanentemente de tu biblioteca

### Organización de canciones

ChordMe ofrece varias formas de organizar tu colección de canciones:

- **Filtros de búsqueda**: Busca por título, artista o contenido
- **Ordenamiento**: Ordena por título, artista o fecha de creación
- **Categorización**: Organiza canciones por género o uso previsto

## Formato ChordPro

ChordMe usa el formato ChordPro estándar de la industria para representar letras y acordes.

### Conceptos básicos

- **Letras**: Texto sin formato para las letras de la canción
- **Acordes**: Rodeados por corchetes, ej. `[C]` `[Am]` `[F]`
- **Líneas de acordes**: Los acordes se colocan encima de las letras correspondientes

### Ejemplo básico

```
[C]Twinkle, twinkle, [F]little [C]star
[F]How I [C]wonder [G]what you [C]are
```

### Directivas avanzadas

ChordPro soporta varias directivas para estructura mejorada:

- `{title: Título de la canción}` - Establece el título de la canción
- `{artist: Nombre del artista}` - Especifica el artista
- `{key: C}` - Indica la tonalidad de la canción
- `{tempo: 120}` - Establece el tempo
- `{capo: 2}` - Indica la posición de la cejilla

### Secciones estructurales

Organiza tu canción usando etiquetas de sección:

- `{verse}` - Marca el inicio de una estrofa
- `{chorus}` - Indica el coro
- `{bridge}` - Denota una sección puente
- `{outro}` - Marca la sección final

Para más información detallada, consulta nuestra [guía del formato ChordPro](chordpro-format-es.md).

## Características de visualización

### Modo de visualización

ChordMe ofrece múltiples opciones de visualización:

- **Modo de edición**: Para crear y modificar canciones
- **Modo de rendimiento**: Optimizado para tocar en vivo
- **Modo de impresión**: Formateado para imprimir partituras

### Personalización

Personaliza cómo se muestran tus canciones:

- **Tamaño de fuente**: Ajusta para mejor legibilidad
- **Espaciado de acordes**: Controla la posición de los acordes
- **Esquemas de color**: Elige diferentes temas visuales

## Integración API

ChordMe proporciona una API RESTful completa para integración con herramientas externas.

### Casos de uso comunes

- **Importar canciones**: Importar en lote desde otras aplicaciones
- **Exportar biblioteca**: Hacer respaldo de tu colección de canciones
- **Integración de terceros**: Conectar con otras herramientas musicales

Para documentación detallada de la API, consulta nuestra [Referencia de la API](api-reference-es.md).

## Validación de ChordPro

ChordMe incluye un sistema integral de validación en tiempo real que te ayuda a escribir notación ChordPro correcta y detectar errores comunes mientras editas.

### Descripción General

El sistema de validación proporciona:

- **Detección de errores en tiempo real** mientras escribes
- **Resaltado de errores en línea** con severidad codificada por colores
- **Tooltips interactivos al pasar el mouse** con descripciones detalladas de errores
- **Sugerencias de corrección rápida** para errores comunes
- **Barra de estado de validación** con resúmenes de errores
- **Soporte multilingüe** para mensajes de error

### Tipos de Errores

#### Validación de Acordes

El sistema valida la sintaxis de notación de acordes:

**Ejemplos Válidos:**
```
[Do] [Re] [Mi] [Fa] [Sol] [La] [Si]
[C] [G] [Am] [F] [C7] [Dm9] [G/B] [F#m]
```

**Ejemplos Inválidos:**
```
[X] [123] [minuscula] [H] [cb]
```

**Problemas Comunes:**
- **Acordes en minúscula**: Usa `[C]` no `[c]`
- **Nombres de acorde inválidos**: Mantente en la notación estándar (A-G o Do-Si)
- **Notación alemana**: Usa `[B]` en lugar de `[H]`
- **Acordes vacíos**: No uses `[]`

#### Validación de Directivas

El sistema verifica la sintaxis de directivas y reconoce errores tipográficos comunes:

**Ejemplos Válidos:**
```
{titulo: Título de la Canción}
{artista: Nombre del Artista}
{inicio_coro}
{fin_estrofa}
```

**Ejemplos Inválidos:**
```
{titlo: Ortografía Incorrecta}
{directiva_desconocida}
{incompleta
```

**Problemas Comunes:**
- **Errores tipográficos**: `{titlo}` debería ser `{titulo}`
- **Directivas desconocidas**: Verifica la ortografía y documentación
- **Sintaxis incompleta**: Falta llave de cierre `}`
- **Directivas vacías**: No uses `{}`

#### Coincidencia de Llaves

El validador asegura que las llaves estén emparejadas correctamente:

**Ejemplos Desbalanceados:**
```
[C [G] {titulo: test
[Am] llave faltante}
```

**Corregir asegurándose que:**
- Cada `[` tenga su `]` correspondiente
- Cada `{` tenga su `}` correspondiente
- Las llaves no se superpongan o aniden incorrectamente

#### Validación de Seguridad

El sistema detecta contenido potencialmente peligroso:

**Patrones Bloqueados:**
```
<script>alert('xss')</script>
<iframe src="malicious.com">
javascript:void(0)
```

**Por Qué Es Importante:**
- Previene ataques de inyección de scripts
- Protege contra contenido malicioso
- Asegura compartición segura de canciones

### Indicadores Visuales

#### Resaltado de Errores

Los errores se resaltan con diferentes colores:

- **Subrayado rojo**: Errores críticos que rompen la sintaxis ChordPro
- **Subrayado amarillo**: Advertencias para contenido cuestionable
- **Subrayado azul**: Avisos informativos y sugerencias

#### Tooltips al Pasar el Mouse

Pasa el mouse sobre errores resaltados para ver:

- **Descripción del error**: Qué está mal con la sintaxis
- **Sugerencias de corrección**: Cómo corregir el problema
- **Ejemplos**: Patrones de uso correcto
- **Ubicación**: Información de línea y columna

#### Barra de Estado

La barra de estado de validación muestra:

- **Conteo de errores**: Número de errores críticos encontrados
- **Conteo de advertencias**: Número de advertencias detectadas
- **Configuración de validación**: Acceso rápido a configuración
- **Mensaje sin problemas**: Cuando el contenido es válido

### Configuración de Validación

#### Acceso a Configuración

Haz clic en el ícono de engranaje en la barra de estado de validación para acceder a:

- **Rigurosidad de validación**: Elige entre estricto, relajado o mínimo
- **Interruptores de verificación**: Habilita/deshabilita tipos específicos de validación
- **Opciones de seguridad**: Configura nivel de verificación de seguridad
- **Configuración de idioma**: Selecciona idioma de validación

#### Niveles de Validación

**Modo Estricto:**
- Valida todas las directivas contra el estándar ChordPro conocido
- Reporta directivas desconocidas como advertencias
- Aplica convenciones de formato apropiadas
- Mejor para cumplimiento con especificación ChordPro

**Modo Relajado (Predeterminado):**
- Permite directivas personalizadas sin advertencias
- Se enfoca en errores críticos de sintaxis
- Equilibra validación con flexibilidad
- Mejor para la mayoría de usuarios

**Modo Mínimo:**
- Solo verifica errores críticos de sintaxis
- Impacto mínimo en rendimiento
- Enfoque muy permisivo
- Mejor para documentos grandes o sistemas antiguos

#### Verificaciones Configurables

Activa/desactiva tipos específicos de validación:

- **Sintaxis de acordes**: Valida notación de acordes
- **Formato de directivas**: Verifica sintaxis de directivas
- **Coincidencia de llaves**: Asegura que las llaves estén emparejadas
- **Elementos vacíos**: Marca `{}` y `[]` vacíos
- **Detección de errores tipográficos**: Verifica errores tipográficos comunes en directivas
- **Escaneo de seguridad**: Detecta contenido potencialmente peligroso

### Soporte de Idiomas

#### Idiomas Soportados

- **Inglés**: Validación completa con mensajes de error en inglés
- **Español**: Traducción completa al español y soporte para notación de acordes en español

#### Notación de Acordes en Español

El validador reconoce la notación de acordes en español:

**Notación Española:**
```
[Do] [Re] [Mi] [Fa] [Sol] [La] [Si]
[dom] [rem] [mim] [fam] [solm] [lam] [sim]
```

**Conversión Automática:**
- Los acordes en español se convierten automáticamente a notación estándar
- La validación procede con el estándar internacional
- Los mensajes de error aparecen en el idioma seleccionado

#### Directivas en Español

Se reconocen alias de directivas en español:

```
{titulo: Título de Canción}   → {title: Song Title}
{artista: Nombre Artista}     → {artist: Artist Name}
{coro}                        → {chorus}
{estrofa}                     → {verse}
```

#### Cambiar Idioma

Para cambiar el idioma de validación:

1. Usa el selector de idioma en la navegación superior
2. O cambia en el panel de configuración de validación
3. Los mensajes de error se actualizan inmediatamente
4. Las reglas específicas del idioma se activan automáticamente

### Características de Rendimiento

#### Validación con Rebote

- **Rebote de 300ms**: La validación espera pausas en la escritura
- **Sin interferencia al escribir**: Nunca bloquea tu entrada
- **Experiencia fluida**: Las actualizaciones se sienten instantáneas pero no se retrasan

#### Procesamiento Eficiente

- **Algoritmos optimizados**: Validación rápida incluso para documentos grandes
- **Eficiente en memoria**: Uso mínimo de memoria y sin fugas
- **Procesamiento en segundo plano**: Nunca bloquea el hilo de la UI

#### Soporte para Documentos Grandes

El validador maneja:

- **Documentos de 1000+ líneas**: Valida en menos de 100ms
- **10,000+ acordes**: Procesa eficientemente
- **Anidación compleja**: Maneja estructuras profundas de estrofa/coro
- **Contenido multilingüe**: Soporta contenido en varios idiomas

### Navegación de Errores

#### Clic para Navegar

- **Haz clic en indicadores de error** para saltar a la ubicación del error
- **Posicionamiento del cursor**: Coloca automáticamente el cursor en el error
- **Resaltado de selección**: Muestra el alcance exacto del error

#### Atajos de Teclado

- **Navegación Tab**: Muévete entre elementos de validación
- **Enter**: Activa sugerencias de corrección de errores
- **Escape**: Cierra tooltips y paneles de error

### Mejores Prácticas

#### Escribir ChordPro Válido

1. **Comienza con metadatos**:
   ```
   {titulo: Título de Canción}
   {artista: Nombre del Artista}
   {key: C}
   ```

2. **Usa notación de acordes apropiada**:
   ```
   [C] [G] [Am] [F]  ✓ Correcto
   [c] [g] [am] [f]  ✗ Incorrecto
   ```

3. **Estructura con directivas**:
   ```
   {inicio_estrofa}
   [C]Contenido de estrofa aquí
   {fin_estrofa}
   ```

4. **Incluye comentarios útiles**:
   ```
   # Cejilla en el 3er traste
   # Tempo moderado
   ```

#### Corregir Errores Comunes

**Para errores de acordes:**
1. Verifica la ortografía del nombre del acorde (solo A-G o Do-Si)
2. Usa letras mayúsculas
3. Verifica extensiones de acordes (7, 9, sus, etc.)
4. Verifica formato de acorde con bajo: `[C/G]`

**Para errores de directivas:**
1. Verifica la ortografía de directivas en la documentación
2. Asegura sintaxis apropiada: `{directiva: valor}`
3. Empareja llaves de apertura y cierre
4. Usa directivas ChordPro conocidas

**Para desbalance de llaves:**
1. Cuenta llaves de apertura y cierre
2. Usa características de emparejamiento de llaves del editor
3. Verifica llaves superpuestas o anidadas
4. Asegura que cada acorde y directiva esté cerrada apropiadamente

### Solución de Problemas

#### Validación No Funciona

**Posibles causas:**
- Validación deshabilitada en configuración
- Errores de JavaScript en la consola del navegador
- Documento grande causando problemas de rendimiento
- Problemas de compatibilidad del navegador

**Soluciones:**
1. Verifica el interruptor de validación en la barra de estado
2. Actualiza la página e intenta de nuevo
3. Limpia el caché y cookies del navegador
4. Actualiza a una versión moderna del navegador
5. Contacta soporte si los problemas persisten

#### Problemas de Rendimiento

**Si la validación se siente lenta:**
1. Cambia a modo de validación "Mínimo"
2. Deshabilita verificaciones de validación innecesarias
3. Divide documentos grandes en archivos más pequeños
4. Verifica rendimiento y uso de memoria del navegador

#### Falsos Positivos

**Si el validador reporta errores incorrectos:**
1. Verifica nivel de validación (prueba modo "Relajado")
2. Verifica sintaxis ChordPro contra documentación
3. Usa reglas personalizadas para requisitos especiales
4. Reporta problemas persistentes al soporte

#### Problemas de Idioma

**Si las traducciones son incorrectas:**
1. Verifica configuración de idioma del navegador
2. Verifica selector de idioma de ChordMe
3. Limpia caché del navegador y recarga
4. Reporta errores de traducción al soporte

## Consejos y mejores prácticas

### Creación de canciones

1. **Usa nomenclatura consistente** para artistas y títulos
2. **Sigue las convenciones de ChordPro** para mejor formato
3. **Incluye metadatos** como tonalidad y tempo cuando sea relevante
4. **Organiza con secciones** para canciones más largas

### Gestión de biblioteca

1. **Búsquedas regulares** para mantener la biblioteca organizada
2. **Usa nombres descriptivos** para fácil identificación
3. **Respalda regularmente** tu colección usando la API
4. **Categoriza por género** o caso de uso para acceso rápido

### Rendimiento

1. **Practica el modo de visualización** antes de presentaciones
2. **Ajusta el tamaño de fuente** para condiciones de iluminación
3. **Prepara listas de reproducción** para conjuntos de canciones
4. **Ten respaldos** de canciones importantes

## Solución de problemas

### Problemas comunes

- **Problemas de inicio de sesión**: Verifica las credenciales y la conectividad
- **Errores de formato**: Revisa la sintaxis de ChordPro
- **Problemas de rendimiento**: Limpia el caché del navegador
- **Problemas de guardado**: Asegúrate de tener una conexión estable

Para soluciones detalladas, consulta nuestra [Guía de solución de problemas](troubleshooting-es.md).

---

**Cambia idioma:** [English](user-guide.md) | **Español**