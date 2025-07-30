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