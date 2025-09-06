---
layout: default
lang: es
title: Ejemplos de Filtrado
---

# Ejemplos de Filtrado de ChordMe

Esta guía proporciona ejemplos prácticos del sistema de filtrado avanzado de ChordMe, demostrando cómo usar diferentes técnicas de filtrado para encontrar exactamente lo que buscas.

## Filtros Básicos

### Por Género Musical

#### Rock Clásico
```
género:rock AND año:1960-1980
```
Encuentra canciones de rock de las décadas doradas.

#### Jazz Moderno
```
genre:jazz AND year:>1950 AND difficulty:>3
```
Jazz moderno con nivel intermedio-avanzado.

#### Folk Acústico
```
genre:folk AND instrumento:guitarra AND acordes_simples:true
```
Canciones folk para guitarra acústica con acordes básicos.

### Por Dificultad

#### Para Principiantes
```
dificultad:1-2 AND acordes_abiertos:true
```
Canciones fáciles con acordes abiertos básicos.

#### Nivel Intermedio
```
difficulty:3-4 AND NOT barre:true
```
Nivel intermedio sin acordes barré.

#### Desafío Avanzado
```
difficulty:5 OR acordes_complejos:true
```
Para músicos experimentados.

### Por Instrumento

#### Solo Guitarra
```
instrumento:guitarra AND (género:rock OR género:folk)
```
Canciones de rock o folk específicamente para guitarra.

#### Ukelele Hawaiano
```
instrument:ukulele AND estilo:hawaiano
```
Música tradicional hawaiana para ukelele.

#### Piano Clásico
```
instrumento:piano AND género:clásico
```
Repertorio clásico para piano.

## Filtros Musicales Avanzados

### Por Tonalidad y Progresiones

#### Tonalidades Fáciles para Guitarra
```
key:C OR key:G OR key:D OR key:A OR key:E
```
Tonalidades con acordes abiertos comunes.

#### Progresión I-V-vi-IV
```
progresión:"I-V-vi-IV" OR acordes:"C G Am F"
```
La progresión más popular de la música occidental.

#### Blues en Mi
```
key:E AND (género:blues OR progresión:blues)
```
Blues tradicional en Mi.

### Por Acordes Específicos

#### Canciones con Acordes de Séptima
```
acordes:*7 AND NOT acordes:maj7
```
Acordes de séptima dominante (excluye séptimas mayores).

#### Solo Acordes Mayores
```
acordes_tipo:mayor AND NOT acordes:*m
```
Canciones que usan únicamente acordes mayores.

#### Con Acordes Suspendidos
```
acordes:*sus2 OR acordes:*sus4
```
Canciones que incluyen acordes suspendidos.

### Por Características Técnicas

#### Sin Barré (Guitarra)
```
instrumento:guitarra AND barre:false
```
Ideal para guitarristas que aún no dominan el barré.

#### Capo en Trastes Altos
```
capo:>3 AND instrumento:guitarra
```
Canciones que requieren capo en posiciones altas.

#### Técnicas Especiales
```
técnica:fingerpicking OR técnica:strumming_pattern
```
Canciones con técnicas específicas de guitarra.

## Filtros Temporales y Metadata

### Por Época

#### Música de los 60s
```
año:1960-1969 AND (género:rock OR género:pop)
```
Rock y pop de la década de los 60.

#### Era Grunge (90s)
```
year:1990-1999 AND genre:grunge
```
Música grunge de los 90.

#### Música Contemporánea
```
year:>2000 AND popularidad:alta
```
Hits modernos populares.

### Por Artista y Banda

#### Discografía de los Beatles
```
artista:"The Beatles" ORDER BY year ASC
```
Todas las canciones de los Beatles ordenadas cronológicamente.

#### Cantautores Acústicos
```
categoría:cantautor AND instrumento:guitarra_acústica
```
Música de cantautores con guitarra acústica.

#### Bandas de Rock Latinoamericano
```
región:"América Latina" AND género:rock AND idioma:español
```
Rock en español de bandas latinoamericanas.

### Por Duración

#### Canciones Cortas (Radio)
```
duración:<3:30
```
Canciones de duración radiofónica.

#### Épicas Largas
```
duration:>6:00 AND (genre:progressive OR genre:metal)
```
Canciones largas de rock progresivo o metal.

#### Ideal para Práctica
```
duración:2:00-4:00 AND dificultad:1-3
```
Duración perfecta para sesiones de práctica.

## Filtros de Usuario y Colaboración

### Por Estado Personal

#### Mis Favoritas
```
favorita:true ORDER BY fecha_agregada DESC
```
Canciones marcadas como favoritas, más recientes primero.

#### En Proceso de Aprendizaje
```
estado:aprendiendo AND última_práctica:<7_días
```
Canciones que estás practicando actualmente.

#### Dominadas
```
estado:dominada AND calificación:>4
```
Canciones que ya tocas bien.

### Por Actividad Social

#### Populares en mi Red
```
popular_en:mis_amigos AND creada:última_semana
```
Canciones populares entre tus conexiones recientes.

#### Compartidas Conmigo
```
compartida_por:* AND no_vista:true
```
Nuevas canciones compartidas que no has revisado.

#### Para Jam Sessions
```
etiqueta:jam_session AND dificultad:2-4
```
Canciones apropiadas para tocar en grupo.

## Filtros Contextual y Situacional

### Por Ocasión

#### Para Fogata
```
ambiente:fogata OR etiqueta:campfire
```
Canciones perfectas para tocar alrededor del fuego.

#### Música Navideña
```
categoría:navidad OR temporada:diciembre
```
Repertorio para las fiestas navideñas.

#### San Valentín
```
tema:amor AND ambiente:romántico
```
Canciones románticas para ocasiones especiales.

### Por Estado de Ánimo

#### Energéticas y Positivas
```
ánimo:alegre AND tempo:>120
```
Música energética y de buen humor.

#### Melancólicas
```
mood:melancólico AND key:menor
```
Canciones en tonalidades menores para momentos reflexivos.

#### Relajantes
```
ambiente:relajante AND tempo:<80
```
Música tranquila para relajarse.

### Por Contexto de Interpretación

#### Para Presentaciones en Vivo
```
apropiada_para:vivo AND dificultad:<4
```
Canciones que funcionan bien en presentaciones en vivo.

#### Solo Acústico
```
formato:acústico AND instrumento_principal:guitarra
```
Perfectas para interpretación acústica individual.

#### Con Banda Completa
```
formato:banda_completa AND género:rock
```
Canciones que requieren banda completa.

## Combinaciones Complejas

### Búsquedas Multi-Criterio

#### Rock de los 70 para Guitarra Intermedia
```
(género:rock OR género:hard_rock) AND 
año:1970-1979 AND 
instrumento:guitarra AND 
dificultad:3-4 AND 
NOT barre:true
```

#### Jazz Estándares en Tonalidades de Guitarra
```
género:jazz AND 
categoría:standard AND 
(key:C OR key:G OR key:D OR key:A OR key:E OR key:Am OR key:Em) AND 
acordes_jazz:true
```

#### Folk Latino Acústico para Principiantes
```
(género:folk OR género:música_latina) AND 
instrumento:guitarra_acústica AND 
dificultad:1-2 AND 
idioma:español AND 
acordes_simples:true
```

### Filtros Estacionales

#### Repertorio de Verano
```
(tema:verano OR ambiente:playero OR temporada:verano) AND 
tempo:medio_alto AND 
ánimo:alegre
```

#### Música de Invierno
```
(tema:invierno OR ambiente:acogedor) AND 
tempo:lento_medio AND 
instrumento:guitarra_acústica
```

#### Primavera Romántica
```
temporada:primavera AND 
tema:amor AND 
dificultad:2-3 AND 
duración:3:00-5:00
```

## Filtros de Aprendizaje Progresivo

### Ruta de Aprendizaje para Guitarra

#### Nivel 1: Fundamentos
```
instrumento:guitarra AND 
dificultad:1 AND 
acordes_básicos:true AND 
(acordes:"C G Am F" OR acordes:"G D Em C")
```

#### Nivel 2: Expansión
```
instrumento:guitarra AND 
dificultad:2 AND 
(acordes:*7 OR acordes:*sus) AND 
NOT barre:true
```

#### Nivel 3: Barré y Técnicas
```
instrumento:guitarra AND 
dificultad:3 AND 
barre:true AND 
técnica:específica
```

#### Nivel 4: Avanzado
```
instrumento:guitarra AND 
dificultad:4-5 AND 
(técnica:fingerpicking OR acordes_complejos:true)
```

### Progresión por Género

#### Introducción al Blues
```
género:blues AND 
dificultad:1-2 AND 
progresión:blues_básica
```

#### Blues Intermedio
```
género:blues AND 
dificultad:3-4 AND 
(acordes:*7 OR técnica:bending)
```

#### Blues Avanzado
```
género:blues AND 
dificultad:5 AND 
(técnica:slide OR acordes_extendidos:true)
```

## Filtros de Análisis Musical

### Por Estructura Armónica

#### Canciones Modales
```
modalidad:dórico OR modalidad:mixolidio OR modalidad:lidio
```

#### Progresiones Descendentes
```
progresión_tipo:descendente AND análisis_armónico:disponible
```

#### Cambios de Tonalidad
```
modulación:true AND cambios_de_key:>1
```

### Por Elementos Rítmicos

#### Compases Compuestos
```
compás:6/8 OR compás:9/8 OR compás:12/8
```

#### Ritmos Sincopados
```
ritmo:sincopado AND género:(jazz OR latin OR funk)
```

#### Polirritmos
```
polirritmo:true AND dificultad:>3
```

## Consejos para Filtrado Efectivo

### Mejores Prácticas

1. **Comienza Simple**: Usa un filtro base y agrega criterios gradualmente
2. **Usa Paréntesis**: Para agrupar condiciones complejas
3. **Combina Inclusión y Exclusión**: Usa AND y NOT estratégicamente
4. **Aprovecha el Autocompletado**: Deja que el sistema sugiera valores

### Optimización de Búsquedas

1. **Filtros Específicos Primero**: Los filtros más selectivos al inicio
2. **Evita Negativos Excesivos**: Demasiados NOT pueden ser confusos
3. **Usa Rangos**: En lugar de múltiples valores individuales
4. **Guarda Filtros Frecuentes**: Para consultas que usas regularmente

### Solución de Problemas

1. **Sin Resultados**: Simplifica los filtros gradualmente
2. **Demasiados Resultados**: Agrega filtros más específicos
3. **Resultados Inesperados**: Verifica la sintaxis de operadores
4. **Rendimiento Lento**: Reduce el número de criterios complejos

---

**Idioma:** [English](filtering-examples.md) | **Español**

*Para más información sobre filtrado, consulte la [Guía de Filtrado Avanzado](advanced-filtering-guide-es.md) y la [Guía de Usuario de Búsqueda](search-user-guide-es.md).*