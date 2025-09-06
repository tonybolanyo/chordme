---
layout: default
lang: es
title: Guía del Usuario de Búsqueda de ChordMe
---

# Guía del Usuario de Búsqueda de ChordMe

## Comenzando con la Búsqueda

El potente motor de búsqueda de ChordMe te ayuda a encontrar canciones rápidamente usando técnicas de búsqueda simples o avanzadas. Ya sea que busques una canción específica, explores música por género, o busques canciones con progresiones de acordes particulares, nuestra búsqueda te tiene cubierto.

## Búsqueda Básica

### Búsqueda de Texto Simple
Simplemente escribe lo que buscas en el cuadro de búsqueda:

```
beatles
yesterday
hotel california
imagine
```

### Búsqueda por Categorías

#### Por Título de Canción
```
título:yesterday
title:imagine
t:hotel california
```

#### Por Artista
```
artista:beatles
artist:"bob dylan"
a:metallica
```

#### Por Álbum
```
álbum:"abbey road"
album:revolver
```

#### Por Género
```
género:rock
genre:pop
g:folk
```

## Búsqueda Musical

### Búsqueda por Tonalidad
```
tonalidad:C
key:"G major"
k:Am
```

### Búsqueda por Acordes
```
acordes:C,G,Am,F
chords:"Em Am C G"
c:Dm7,G7,Cmaj7
```

### Búsqueda por Progresión de Acordes
```
progresión:I-V-vi-IV
progression:"C G Am F"
p:1-5-6-4
```

### Búsqueda por Tempo
```
tempo:120
tempo:>100
tempo:80-140
t:lento
```

## Búsqueda Avanzada

### Operadores Booleanos

#### AND (por defecto)
```
beatles rock
artist:dylan AND genre:folk
acordes:C AND tonalidad:C
```

#### OR
```
genre:rock OR genre:pop
artist:beatles OR artist:stones
tempo:fast OR tempo:medium
```

#### NOT
```
genre:rock NOT artist:metallica
-tempo:slow
NOT difficulty:expert
```

### Búsqueda con Comodines
```
beat*          # Encuentra "beatles", "beat it", etc.
*california    # Encuentra "hotel california", etc.
*love*         # Encuentra cualquier cosa con "love"
```

### Búsqueda por Frases
```
"here comes the sun"
"hotel california"
"bohemian rhapsody"
```

### Rangos y Comparaciones
```
year:1960-1970        # Canciones de los 60s
tempo:>120           # Tempo mayor a 120 BPM
duration:<3:00       # Canciones menores a 3 minutos
difficulty:1-3       # Dificultad principiante a intermedio
```

## Filtros Avanzados

### Panel de Filtros
Accede al panel de filtros avanzados con `Ctrl+Shift+F` o haciendo clic en el icono de filtro.

#### Filtros Musicales
- **Tonalidad**: C, D, E, F, G, A, B (mayores y menores)
- **Tempo**: Lento (<60), Medio (60-120), Rápido (>120)
- **Compás**: 4/4, 3/4, 6/8, etc.
- **Capo**: Canciones que requieren capo

#### Filtros de Dificultad
- **Principiante**: Acordes básicos abiertos
- **Intermedio**: Algunos barré, acordes de séptima
- **Avanzado**: Barré completo, acordes complejos
- **Experto**: Técnicas avanzadas

#### Filtros de Contenido
- **Con letras**: Canciones con letra completa
- **Instrumental**: Solo acordes, sin letra
- **Idioma**: Español, inglés, etc.
- **Longitud**: Corta (<3min), Media (3-5min), Larga (>5min)

#### Filtros de Usuario
- **Mis canciones**: Solo canciones que has creado
- **Favoritas**: Canciones marcadas como favoritas
- **Recientes**: Canciones vistas recientemente
- **Compartidas**: Canciones compartidas contigo

## Búsqueda Personalizada

### Filtros Guardados
Guarda combinaciones de filtros que uses frecuentemente:

```javascript
// Ejemplo de filtro guardado
{
  nombre: "Rock Clásico de los 70s",
  filtros: "genre:rock AND year:1970-1979",
  público: false
}
```

### Búsquedas Recientes
El sistema recuerda tus últimas 10 búsquedas para acceso rápido.

### Autocompletado Inteligente
- **Sugerencias de artistas** mientras escribes
- **Completado de títulos** basado en tu biblioteca
- **Sugerencias de acordes** para búsqueda musical
- **Corrección automática** de errores tipográficos

## Resultados de Búsqueda

### Visualización de Resultados

#### Vista de Lista
- **Título**: Nombre de la canción
- **Artista**: Intérprete o compositor
- **Información musical**: Tonalidad, tempo, acordes principales
- **Metadatos**: Duración, dificultad, fecha agregada

#### Vista de Tarjetas
- **Imagen destacada**: Artwork del álbum o imagen personalizada
- **Información resumida**: Datos clave de la canción
- **Acciones rápidas**: Reproducir, editar, compartir

#### Vista de Tabla
- **Columnas ordenables**: Título, artista, tonalidad, tempo, etc.
- **Filtros por columna**: Filtrar directamente en la tabla
- **Selección múltiple**: Para operaciones en lote

### Ordenamiento
```
Relevancia          # Mejor coincidencia (por defecto)
Alfabético         # A-Z por título
Artista            # A-Z por nombre de artista
Fecha agregada     # Más recientes primero
Popularidad        # Más reproducidas primero
Dificultad         # De principiante a experto
Tempo              # De lento a rápido
```

### Exportar Resultados
- **Formato CSV**: Para análisis en hoja de cálculo
- **Formato PDF**: Lista imprimible de canciones
- **Formato M3U**: Lista de reproducción para players
- **Formato JSON**: Para integración con otras apps

## Consejos de Búsqueda

### Estrategias Efectivas

#### 1. Comienza Simple
```
# En lugar de:
artist:"The Beatles" AND genre:rock AND year:1960-1970

# Comienza con:
beatles rock
```

#### 2. Usa Filtros Progresivamente
1. Búsqueda inicial: `rock`
2. Agregar filtro: `+ year:1970s`
3. Refinar: `+ tempo:medium`
4. Finalizar: `+ difficulty:intermediate`

#### 3. Aprovecha el Autocompletado
- Usa `Tab` para aceptar sugerencias
- `Ctrl+Space` para ver todas las opciones
- `Escape` para cerrar sugerencias

#### 4. Búsqueda Musical
```
# Para encontrar canciones en Do Mayor con acordes simples:
key:C difficulty:beginner

# Para progresiones de blues:
progression:blues OR chords:"E A B7"

# Para canciones lentas y románticas:
tempo:slow genre:ballad
```

### Atajos de Teclado

#### Navegación
```
/              # Activar búsqueda rápida
Ctrl+K         # Barra de búsqueda
F              # Panel de filtros
Escape         # Limpiar búsqueda
```

#### En Resultados
```
Enter          # Abrir canción seleccionada
Espacio        # Previsualizar canción
↑↓             # Navegar resultados
Ctrl+A         # Seleccionar todos
```

#### Filtros
```
Ctrl+Shift+F   # Filtros avanzados
Alt+1-9        # Filtros rápidos predefinidos
Ctrl+S         # Guardar filtros actuales
Ctrl+L         # Cargar filtros guardados
```

## Búsqueda por Voz

### Activación
- Haz clic en el icono del micrófono
- Usa el atajo `Ctrl+Shift+V`
- Di "Hey ChordMe" (si está habilitado)

### Comandos de Voz
```
"Buscar Yesterday de The Beatles"
"Encuentra canciones de rock de los 70"
"Muestra mis canciones en Do Mayor"
"Buscar acordes de Fa Mayor"
"Filtrar por tempo rápido"
```

### Idiomas Soportados
- **Español**: Reconocimiento nativo
- **Inglés**: Totalmente soportado
- **Spanglish**: Mezcla de ambos idiomas

## Búsqueda Móvil

### Interfaz Táctil
- **Deslizar hacia abajo**: Activar búsqueda
- **Tocar y mantener**: Opciones de filtro
- **Pellizcar**: Cambiar vista de resultados

### Búsqueda Offline
- **Caché local**: Últimas 100 búsquedas
- **Sincronización**: Al reconectar a internet
- **Favoritos**: Siempre disponibles offline

## Solución de Problemas

### Sin Resultados

#### Verificar Ortografía
- Usa autocompletado para evitar errores
- Prueba búsquedas similares
- Usa comodines: `beat*` en lugar de `beatles`

#### Simplificar Búsqueda
```
# En lugar de:
artist:"The Beatles" AND album:"Abbey Road" AND year:1969

# Prueba:
beatles abbey road
```

#### Revisar Filtros
- Verifica que no haya filtros muy restrictivos
- Limpia filtros con `Escape`
- Usa "Mostrar todos" para empezar de nuevo

### Resultados Inesperados

#### Verificar Operadores
```
# Esto busca canciones CON "rock" Y "metal":
rock metal

# Esto busca canciones con "rock" O "metal":
rock OR metal
```

#### Revisar Contexto
- Asegúrate de estar en la sección correcta
- Verifica permisos de acceso
- Confirma filtros de usuario activos

### Rendimiento Lento

#### Optimizar Búsquedas
- Usa filtros específicos primero
- Evita demasiados comodines
- Limita rangos de fechas amplios

#### Limpiar Caché
```javascript
// En consola del desarrollador
localStorage.clear();
location.reload();
```

## Configuración Avanzada

### Preferencias de Búsqueda
```json
{
  "searchPreferences": {
    "defaultOperator": "AND",
    "autoComplete": true,
    "searchHistory": true,
    "maxResults": 50,
    "fuzzySearch": true,
    "voiceSearch": true
  }
}
```

### Configuración de Filtros
```json
{
  "filterConfig": {
    "rememberFilters": true,
    "defaultFilters": ["difficulty:1-3"],
    "quickFilters": [
      { "name": "Mis Favoritas", "filter": "favorites:true" },
      { "name": "Rock Clásico", "filter": "genre:rock year:1960-1980" }
    ]
  }
}
```

## API de Búsqueda

### Endpoints Principales
```typescript
// Búsqueda básica
GET /api/search?q=beatles

// Búsqueda avanzada
POST /api/search/advanced
{
  "query": "rock",
  "filters": {
    "genre": ["rock", "alternative"],
    "year": { "min": 1970, "max": 1990 },
    "difficulty": { "max": 3 }
  }
}

// Autocompletado
GET /api/search/suggest?q=beat

// Filtros disponibles
GET /api/search/filters
```

### Respuesta de Ejemplo
```json
{
  "query": "beatles rock",
  "total": 156,
  "page": 1,
  "results": [
    {
      "id": "song_123",
      "title": "Come Together",
      "artist": "The Beatles",
      "album": "Abbey Road",
      "key": "Dm",
      "tempo": 85,
      "difficulty": 2,
      "relevance": 0.95
    }
  ],
  "facets": {
    "genre": {"rock": 89, "pop": 67},
    "year": {"1960s": 45, "1970s": 111},
    "difficulty": {"1": 23, "2": 78, "3": 55}
  }
}
```

---

**Idioma:** [English](search-user-guide.md) | **Español**

*Para más información sobre búsqueda, consulte la [Documentación del Motor de Búsqueda](search-engine-documentation-es.md) y la [Guía de Filtrado Avanzado](advanced-filtering-guide-es.md).*