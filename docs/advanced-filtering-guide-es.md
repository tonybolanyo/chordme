---
layout: default
lang: es
title: Guía de Filtrado Avanzado
---

# Guía de Filtrado Avanzado de ChordMe

## Resumen

ChordMe ofrece capacidades de filtrado avanzado que permiten a los usuarios buscar y organizar canciones usando múltiples criterios. Esta guía explica todas las opciones de filtrado disponibles y cómo usarlas efectivamente.

## Tipos de Filtros

### 1. Filtros de Texto Básicos

#### Búsqueda por Título
```
título: "Yesterday"
title:*beatles*
```

#### Búsqueda por Artista  
```
artista: "The Beatles"
artist:*dylan*
```

#### Búsqueda por Contenido
```
contenido: "acordes de guitarra"
content:*chord*
```

### 2. Filtros Musicales

#### Por Tonalidad
```
key:C
key:"D minor"
tonalidad:Em
```

#### Por Acordes Específicos
```
acordes: Cm7, F7, BbMaj7
chords: Am, F, C, G
contiene_acorde: Dm7
```

#### Por Tempo
```
tempo:120
tempo:>100
tempo:80-140
```

#### Por Métrica
```
compas: 4/4
time_signature: 3/4
métrica: 6/8
```

### 3. Filtros de Metadata

#### Por Género
```
género: rock
genre: *folk*
style: blues
```

#### Por Fecha
```
fecha: 2024
created:>2024-01-01
updated:<2024-06-01
```

#### Por Duración
```
duración: 3:30
duration:>4:00
length:<2:00
```

### 4. Filtros de Usuario

#### Por Propietario
```
propietario: juan@ejemplo.com
owner:*admin*
created_by: maría
```

#### Por Permisos
```
acceso: público
permissions: editar
shared_with: pedro@ejemplo.com
```

#### Por Estado
```
estado: borrador
status: publicado
visibility: privado
```

## Operadores Avanzados

### Operadores Lógicos

#### AND (por defecto)
```
género:rock artista:*beatles*
rock AND beatles
```

#### OR
```
género:rock OR género:pop
artista:dylan OR artista:cohen
```

#### NOT
```
género:rock NOT artista:metallica
-tempo:>140
```

### Operadores de Comparación

#### Rangos Numéricos
```
tempo:80-120
duración:2:00-5:00
created:2024-01-01..2024-12-31
```

#### Mayor/Menor Que
```
tempo:>100
duración:<4:00
created:>2024-06-01
```

#### Coincidencia Parcial
```
artista:*beatles*
título:*love*
contenido:*guitar*
```

### Operadores de Proximidad

#### Palabras Cercanas
```
"guitar solo" NEAR/3 "rock"
contenido: acordes CERCA/5 guitarra
```

#### Orden Específico
```
"verse chorus verse"
acordes: [Am, F, C, G]
```

## Filtros Predefinidos

### Por Dificultad
```
dificultad: principiante
difficulty: intermedio
level: avanzado
```

### Por Instrumento
```
instrumento: guitarra
instrument: piano
for: ukelele
```

### Por Idioma
```
idioma: español
language: english
lang: es
```

### Por Categoría
```
categoría: canciones_navideñas
category: worship
type: tutorial
```

## Filtros Dinámicos

### Acordes Comunes
```
acordes_comunes: C, G, Am, F
easy_chords: true
open_chords_only: true
```

### Progresiones de Acordes
```
progresión: I-V-vi-IV
progression: 1-5-6-4
chord_pattern: Am-F-C-G
```

### Análisis Musical
```
modalidad: mayor
mode: menor
scale: pentatónica
```

## Ejemplos Prácticos

### Encontrar Canciones para Principiantes
```
dificultad:principiante AND acordes_comunes:true AND tempo:<120
```

### Buscar Canciones de Rock en Do Mayor
```
género:rock AND tonalidad:C AND tempo:>100
```

### Encontrar Canciones Compartidas Recientemente
```
acceso:compartido AND updated:>2024-11-01
```

### Buscar Baladas con Acordes Específicos
```
género:balada AND acordes:Em,Am,C,G AND tempo:<80
```

### Encontrar Canciones Populares para Guitarra
```
instrumento:guitarra AND (género:pop OR género:rock) AND dificultad:intermedio
```

## Filtros Guardados

### Crear Filtros Personalizados
Los usuarios pueden guardar combinaciones de filtros frecuentemente usadas:

```javascript
// Ejemplo de filtro guardado
{
  nombre: "Mis Canciones de Rock",
  filtros: "género:rock AND propietario:yo",
  descripción: "Todas mis canciones de rock"
}
```

### Filtros Compartidos
Los filtros pueden compartirse entre usuarios:

```javascript
{
  nombre: "Canciones Fáciles de Guitarra",
  filtros: "instrumento:guitarra AND dificultad:principiante",
  público: true
}
```

## Consejos de Uso

### 1. Combinar Múltiples Filtros
- Usa paréntesis para agrupar condiciones complejas
- Combina filtros de texto con filtros musicales
- Usa rangos para filtros numéricos

### 2. Usar Autocompletado
- El sistema sugiere valores mientras escribes
- Tab para aceptar sugerencias
- Ctrl+Espacio para ver todas las opciones

### 3. Filtros Contextuales
- Los filtros cambian según el contexto
- Diferentes opciones en vistas de usuario vs. administrador
- Filtros específicos por tipo de contenido

### 4. Rendimiento
- Los filtros simples son más rápidos
- Usa filtros específicos antes que genéricos
- Evita filtros con muchos comodines

## Solución de Problemas

### Filtros que No Funcionan
1. **Verifica la sintaxis**: Asegúrate de usar la sintaxis correcta
2. **Revisa la ortografía**: Los nombres de campos son sensibles a mayúsculas
3. **Confirma los datos**: Verifica que los datos existan

### Rendimiento Lento
1. **Simplifica filtros**: Reduce la complejidad de las consultas
2. **Usa filtros específicos**: Evita búsquedas muy amplias
3. **Combina filtros eficientemente**: Usa AND antes que OR cuando sea posible

### Resultados Inesperados
1. **Revisa los operadores**: Asegúrate de usar los operadores correctos
2. **Verifica el contexto**: Confirma que tienes los permisos necesarios
3. **Prueba filtros simples**: Construye filtros complejos paso a paso

## Referencia Rápida

### Campos Disponibles
- `título/title` - Título de la canción
- `artista/artist` - Artista o compositor
- `género/genre` - Género musical
- `tonalidad/key` - Tonalidad de la canción
- `tempo` - Tempo en BPM
- `acordes/chords` - Acordes usados
- `duración/duration` - Duración de la canción
- `dificultad/difficulty` - Nivel de dificultad
- `instrumento/instrument` - Instrumento principal
- `idioma/language` - Idioma de la letra

### Operadores
- `AND` - Ambas condiciones deben cumplirse
- `OR` - Al menos una condición debe cumplirse  
- `NOT` - La condición no debe cumplirse
- `>`, `<`, `>=`, `<=` - Comparaciones numéricas
- `*` - Comodín para coincidencia parcial
- `""` - Búsqueda de frase exacta
- `()` - Agrupación de condiciones

---

**Idioma:** [English](advanced-filtering-guide.md) | **Español**

*Para más información sobre búsqueda, consulte la [Guía de Usuario de Búsqueda](search-user-guide-es.md) y la [Documentación del Motor de Búsqueda](search-engine-documentation-es.md).*