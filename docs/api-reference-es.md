---
layout: default
lang: es
title: Referencia de la API
---

# Referencia de la API de ChordMe

ChordMe proporciona una API REST completa para acceso programático a todas las funcionalidades. Esta documentación cubre todos los endpoints disponibles, métodos de autenticación y ejemplos de uso.

## URL base

```
https://api.chordme.app/api/v1
```

Para desarrollo local:
```
http://localhost:5000/api/v1
```

## Autenticación

ChordMe utiliza autenticación basada en tokens JWT (JSON Web Token).

### Obtener un token

**POST** `/auth/login`

```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Usar el token

Incluye el token en el header Authorization:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Endpoints de autenticación

### Registro de usuario

**POST** `/auth/register`

Crea una nueva cuenta de usuario.

**Cuerpo de la solicitud:**
```json
{
  "email": "nuevo@ejemplo.com",
  "password": "contraseña_segura123"
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 2,
    "email": "nuevo@ejemplo.com",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

**Errores posibles:**
- `400`: Datos de entrada inválidos
- `409`: El usuario ya existe

### Inicio de sesión

**POST** `/auth/login`

Autentica a un usuario y devuelve un token JWT.

Ver ejemplo en la sección de autenticación arriba.

**Errores posibles:**
- `400`: Datos de entrada inválidos
- `401`: Credenciales inválidas

### Cerrar sesión

**POST** `/auth/logout`

**Headers requeridos:** `Authorization: Bearer <token>`

Invalida el token actual.

**Respuesta exitosa (200):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

## Endpoints de canciones

### Listar canciones

**GET** `/songs`

**Headers requeridos:** `Authorization: Bearer <token>`

Recupera todas las canciones del usuario autenticado.

**Parámetros de consulta opcionales:**
- `page`: Número de página (por defecto: 1)
- `per_page`: Elementos por página (por defecto: 10, máx: 100)
- `search`: Búsqueda por título o artista
- `sort`: Campo de ordenamiento (`title`, `artist`, `created_at`)
- `order`: Orden de clasificación (`asc`, `desc`)

**Ejemplo de solicitud:**
```
GET /songs?page=1&per_page=20&search=amazing&sort=title&order=asc
```

**Respuesta exitosa (200):**
```json
{
  "songs": [
    {
      "id": 1,
      "title": "Amazing Grace",
      "artist": "John Newton",
      "content": "{title: Amazing Grace}\n{artist: John Newton}\n\n[G]Amazing grace...",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Obtener una canción

**GET** `/songs/{id}`

**Headers requeridos:** `Authorization: Bearer <token>`

Recupera una canción específica por ID.

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "title": "Amazing Grace",
  "artist": "John Newton",
  "content": "{title: Amazing Grace}\n{artist: John Newton}\n\n[G]Amazing grace how [C]sweet the sound...",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Errores posibles:**
- `404`: Canción no encontrada
- `403`: Sin permiso para acceder a esta canción

### Crear una canción

**POST** `/songs`

**Headers requeridos:** `Authorization: Bearer <token>`

Crea una nueva canción.

**Cuerpo de la solicitud:**
```json
{
  "title": "Mi nueva canción",
  "artist": "Mi banda",
  "content": "{title: Mi nueva canción}\n{artist: Mi banda}\n{key: C}\n\n[C]Letra de la canción aquí..."
}
```

**Respuesta exitosa (201):**
```json
{
  "id": 5,
  "title": "Mi nueva canción",
  "artist": "Mi banda",
  "content": "{title: Mi nueva canción}\n{artist: Mi banda}\n{key: C}\n\n[C]Letra de la canción aquí...",
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Errores posibles:**
- `400`: Datos de entrada inválidos
- `422`: Error de validación

### Actualizar una canción

**PUT** `/songs/{id}`

**Headers requeridos:** `Authorization: Bearer <token>`

Actualiza una canción existente.

**Cuerpo de la solicitud:**
```json
{
  "title": "Título actualizado",
  "artist": "Artista actualizado",
  "content": "Contenido actualizado en formato ChordPro..."
}
```

**Respuesta exitosa (200):**
```json
{
  "id": 5,
  "title": "Título actualizado",
  "artist": "Artista actualizado",
  "content": "Contenido actualizado en formato ChordPro...",
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:30:00Z"
}
```

**Errores posibles:**
- `400`: Datos de entrada inválidos
- `404`: Canción no encontrada
- `403`: Sin permiso para editar esta canción

### Eliminar una canción

**DELETE** `/songs/{id}`

**Headers requeridos:** `Authorization: Bearer <token>`

Elimina una canción existente.

**Respuesta exitosa (204):**
Sin contenido

**Errores posibles:**
- `404`: Canción no encontrada
- `403`: Sin permiso para eliminar esta canción

## Endpoints de usuario

### Obtener perfil de usuario

**GET** `/user/profile`

**Headers requeridos:** `Authorization: Bearer <token>`

Recupera información del perfil del usuario autenticado.

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "email": "usuario@ejemplo.com",
  "created_at": "2024-01-15T10:30:00Z",
  "song_count": 15,
  "last_login": "2024-01-15T14:00:00Z"
}
```

### Actualizar perfil de usuario

**PUT** `/user/profile`

**Headers requeridos:** `Authorization: Bearer <token>`

Actualiza información del perfil del usuario.

**Cuerpo de la solicitud:**
```json
{
  "email": "nuevo_email@ejemplo.com"
}
```

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "email": "nuevo_email@ejemplo.com",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T15:00:00Z"
}
```

### Cambiar contraseña

**PUT** `/user/password`

**Headers requeridos:** `Authorization: Bearer <token>`

Cambia la contraseña del usuario.

**Cuerpo de la solicitud:**
```json
{
  "current_password": "contraseña_actual",
  "new_password": "nueva_contraseña_segura"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Errores posibles:**
- `400`: Contraseña actual incorrecta
- `422`: Nueva contraseña no cumple requisitos

## Códigos de estado HTTP

La API utiliza códigos de estado HTTP estándar:

- `200 OK` - Solicitud exitosa
- `201 Created` - Recurso creado exitosamente
- `204 No Content` - Operación exitosa sin contenido de respuesta
- `400 Bad Request` - Solicitud malformada
- `401 Unauthorized` - Autenticación requerida o inválida
- `403 Forbidden` - Sin permiso para acceder al recurso
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto con el estado actual del recurso
- `422 Unprocessable Entity` - Error de validación
- `500 Internal Server Error` - Error del servidor

## Manejo de errores

Todos los errores devuelven un objeto JSON con detalles:

```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "details": {
    "field": "Información específica del error"
  }
}
```

### Errores de validación

```json
{
  "error": "Errores de validación",
  "code": "VALIDATION_ERROR",
  "details": {
    "title": "El título es requerido",
    "content": "El contenido no puede estar vacío"
  }
}
```

## Límites de velocidad

La API implementa límites de velocidad para prevenir abuso:

- **Autenticación**: 5 intentos por minuto por IP
- **Endpoints generales**: 100 solicitudes por minuto por usuario
- **Creación de contenido**: 20 solicitudes por minuto por usuario

Las respuestas incluyen headers de límite de velocidad:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642261200
```

## Ejemplos de uso

### Cliente JavaScript

```javascript
class ChordMeAPI {
  constructor(baseURL = 'http://localhost:5000/api/v1') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('chordme_token');
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    if (response.ok) {
      this.token = data.access_token;
      localStorage.setItem('chordme_token', this.token);
    }
    return data;
  }

  async getSongs() {
    const response = await fetch(`${this.baseURL}/songs`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    return response.json();
  }

  async createSong(songData) {
    const response = await fetch(`${this.baseURL}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(songData),
    });
    return response.json();
  }
}

// Uso
const api = new ChordMeAPI();
await api.login('usuario@ejemplo.com', 'contraseña');
const songs = await api.getSongs();
```

### Cliente Python

```python
import requests
import json

class ChordMeAPI:
    def __init__(self, base_url='http://localhost:5000/api/v1'):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            return data
        else:
            response.raise_for_status()
    
    def get_songs(self):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(f'{self.base_url}/songs', headers=headers)
        return response.json()
    
    def create_song(self, song_data):
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        response = requests.post(
            f'{self.base_url}/songs', 
            headers=headers, 
            json=song_data
        )
        return response.json()

# Uso
api = ChordMeAPI()
api.login('usuario@ejemplo.com', 'contraseña')
songs = api.get_songs()
```

---

**Cambia idioma:** [English](api-reference.md) | **Español**