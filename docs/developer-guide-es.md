---
layout: default
lang: es
title: Guía del desarrollador
---

# Guía del desarrollador de ChordMe

Esta guía completa cubre todo lo que necesitas saber para contribuir al desarrollo de ChordMe, incluyendo configuración del entorno, arquitectura, estándares de codificación y proceso de contribución.

## Comenzando

### Prerrequisitos

Antes de comenzar el desarrollo, asegúrate de tener instalado:

- **Node.js 20+** - Para el desarrollo del frontend
- **Python 3.12+** - Para el desarrollo del backend
- **Git** - Para control de versiones
- **Un editor de código** - Recomendamos VS Code con las extensiones apropiadas

### Configuración del entorno

1. **Bifurca el repositorio** en GitHub
2. **Clona tu fork** localmente:
   ```bash
   git clone https://github.com/tu-usuario/chordme.git
   cd chordme
   ```
3. **Agrega el upstream** remoto:
   ```bash
   git remote add upstream https://github.com/tonybolanyo/chordme.git
   ```
4. **Instala las dependencias** siguiendo la [Guía de inicio](getting-started-es.md)

### Configuración del IDE

#### VS Code (Recomendado)

Instala estas extensiones:
- **Python** - Soporte para Python
- **Pylance** - Servidor de lenguaje Python
- **ES7+ React/Redux/React-Native snippets** - Snippets de React
- **TypeScript Importer** - Auto import para TypeScript
- **Prettier** - Formateador de código
- **ESLint** - Linter para JavaScript/TypeScript

Configuración recomendada (`.vscode/settings.json`):
```json
{
  "python.defaultInterpreterPath": "./backend/env/bin/python",
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## Arquitectura del proyecto

ChordMe sigue una arquitectura de microservicios con frontend y backend separados.

### Estructura del proyecto

```
chordme/
├── frontend/          # Aplicación React (TypeScript)
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Componentes de página
│   │   ├── hooks/         # Hooks personalizados
│   │   ├── services/      # Servicios API
│   │   ├── types/         # Definiciones TypeScript
│   │   └── utils/         # Funciones utilitarias
│   ├── public/            # Archivos estáticos
│   └── package.json
├── backend/           # API Flask (Python)
│   ├── chordme/
│   │   ├── models/        # Modelos de base de datos
│   │   ├── routes/        # Definiciones de rutas API
│   │   ├── services/      # Lógica de negocio
│   │   └── utils/         # Funciones utilitarias
│   ├── tests/             # Pruebas unitarias
│   └── requirements.txt
├── docs/              # Documentación Jekyll
├── e2e/               # Pruebas end-to-end
└── integration-tests/ # Pruebas de integración
```

### Tecnologías utilizadas

#### Frontend
- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript** - JavaScript tipado
- **Vite** - Herramienta de construcción
- **React Query** - Gestión del estado del servidor
- **React Router** - Enrutamiento
- **Tailwind CSS** - Framework CSS utilitario

#### Backend
- **Flask** - Framework web de Python
- **SQLAlchemy** - ORM de base de datos
- **Flask-JWT-Extended** - Autenticación JWT
- **Marshmallow** - Serialización/deserialización
- **Flask-CORS** - Soporte CORS
- **SQLite/PostgreSQL** - Base de datos

## Flujo de desarrollo

### Flujo de ramas

Utilizamos GitHub Flow con ramas de características:

1. **Crea una rama de característica** desde `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/mi-nueva-caracteristica
   ```

2. **Haz commits frecuentes** con mensajes descriptivos:
   ```bash
   git add .
   git commit -m "feat: agregar funcionalidad de transposición de acordes"
   ```

3. **Envía tu rama** y crea un Pull Request:
   ```bash
   git push origin feature/mi-nueva-caracteristica
   ```

### Mensajes de commit

Seguimos la [Convención de Commits Convencionales](https://www.conventionalcommits.org/):

- `feat:` - Nueva característica
- `fix:` - Corrección de error
- `docs:` - Cambios en documentación
- `style:` - Cambios de formato (sin afectar el código)
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar pruebas
- `chore:` - Tareas de mantenimiento

**Ejemplos:**
```bash
feat: agregar componente de selector de acordes
fix: corregir error de validación en formulario de canción
docs: actualizar guía de instalación
test: agregar pruebas unitarias para servicio de canciones
```

## Estándares de codificación

### Frontend (TypeScript/React)

#### Convenciones de nomenclatura
- **Componentes**: PascalCase (`SongEditor`, `ChordChart`)
- **Hooks**: camelCase con prefijo `use` (`useAuth`, `useSongs`)
- **Archivos**: kebab-case (`song-editor.tsx`, `chord-chart.tsx`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_SONG_LENGTH`)

#### Estructura de componentes
```tsx
import React from 'react';
import { SongData } from '../types/song';

interface SongEditorProps {
  song?: SongData;
  onSave: (song: SongData) => void;
  onCancel: () => void;
}

export const SongEditor: React.FC<SongEditorProps> = ({
  song,
  onSave,
  onCancel,
}) => {
  // Hooks primero
  const [title, setTitle] = useState(song?.title || '');
  const [content, setContent] = useState(song?.content || '');

  // Funciones de manejo de eventos
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, content });
  };

  // Renderizado
  return (
    <form onSubmit={handleSubmit}>
      {/* JSX aquí */}
    </form>
  );
};
```

#### Hooks personalizados
```tsx
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Song } from '../types/song';

export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const data = await apiService.getSongs();
        setSongs(data.songs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, []);

  return { songs, loading, error, refetch: fetchSongs };
};
```

### Backend (Python/Flask)

#### Convenciones de nomenclatura
- **Clases**: PascalCase (`SongModel`, `UserService`)
- **Funciones/variables**: snake_case (`get_user_songs`, `song_data`)
- **Constantes**: UPPER_SNAKE_CASE (`DATABASE_URL`, `JWT_SECRET_KEY`)
- **Archivos**: snake_case (`song_routes.py`, `user_model.py`)

#### Estructura de rutas
```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from chordme.models.song import Song
from chordme.schemas.song import SongSchema
from chordme.services.song_service import SongService

songs_bp = Blueprint('songs', __name__)
song_schema = SongSchema()
songs_schema = SongSchema(many=True)

@songs_bp.route('', methods=['GET'])
@jwt_required()
def get_songs():
    """Obtener todas las canciones del usuario."""
    user_id = get_jwt_identity()
    
    try:
        songs = SongService.get_user_songs(user_id)
        return jsonify({
            'songs': songs_schema.dump(songs)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@songs_bp.route('', methods=['POST'])
@jwt_required()
def create_song():
    """Crear una nueva canción."""
    user_id = get_jwt_identity()
    
    try:
        song_data = song_schema.load(request.json)
        song = SongService.create_song(user_id, song_data)
        return jsonify(song_schema.dump(song)), 201
    except ValidationError as e:
        return jsonify({'errors': e.messages}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

#### Modelos de base de datos
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from chordme.database import db

class Song(db.Model):
    __tablename__ = 'songs'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    artist = Column(String(255))
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    user = relationship('User', back_populates='songs')
    
    def __repr__(self):
        return f'<Song {self.title} by {self.artist}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'artist': self.artist,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
```

## Pruebas

### Estrategia de pruebas

ChordMe utiliza una estrategia de pruebas en múltiples capas:

1. **Pruebas unitarias** - Funciones y componentes individuales
2. **Pruebas de integración** - Interacciones entre componentes
3. **Pruebas end-to-end** - Flujos de usuario completos

### Pruebas del frontend

Utilizamos **Jest** y **React Testing Library**:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SongEditor } from '../components/SongEditor';

describe('SongEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza correctamente sin canción', () => {
    render(
      <SongEditor onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contenido/i)).toBeInTheDocument();
  });

  it('guarda una canción al enviar', async () => {
    render(
      <SongEditor onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Canción de prueba' }
    });
    
    fireEvent.change(screen.getByLabelText(/contenido/i), {
      target: { value: '[C]Contenido de prueba' }
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Canción de prueba',
        content: '[C]Contenido de prueba'
      });
    });
  });
});
```

### Pruebas del backend

Utilizamos **pytest** y **Flask-Testing**:

```python
import pytest
from flask import json

from chordme.app import create_app
from chordme.database import db
from chordme.models.user import User
from chordme.models.song import Song

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Crear usuario de prueba
    user_data = {
        'email': 'test@example.com',
        'password': 'testpassword123'
    }
    client.post('/api/v1/auth/register', 
                data=json.dumps(user_data),
                content_type='application/json')
    
    # Iniciar sesión
    response = client.post('/api/v1/auth/login',
                          data=json.dumps(user_data),
                          content_type='application/json')
    
    token = json.loads(response.data)['access_token']
    return {'Authorization': f'Bearer {token}'}

def test_create_song(client, auth_headers):
    """Prueba la creación de una canción."""
    song_data = {
        'title': 'Canción de prueba',
        'artist': 'Artista de prueba',
        'content': '[C]Contenido de prueba'
    }
    
    response = client.post('/api/v1/songs',
                          data=json.dumps(song_data),
                          content_type='application/json',
                          headers=auth_headers)
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['title'] == song_data['title']
    assert data['artist'] == song_data['artist']

def test_get_songs(client, auth_headers):
    """Prueba la obtención de canciones del usuario."""
    response = client.get('/api/v1/songs', headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'songs' in data
    assert isinstance(data['songs'], list)
```

### Ejecutar pruebas

```bash
# Pruebas del frontend
cd frontend
npm test

# Pruebas del backend
cd backend
pytest

# Pruebas con cobertura
cd backend
pytest --cov=chordme

# Pruebas end-to-end
npm run test:e2e
```

## Guías de contribución

### Pull Requests

1. **Asegúrate de que las pruebas pasen**:
   ```bash
   npm run test
   cd backend && pytest
   ```

2. **Ejecuta linting**:
   ```bash
   npm run lint
   cd backend && flake8
   ```

3. **Actualiza la documentación** si es necesario

4. **Escribe una descripción clara** del PR explicando:
   - Qué problema resuelve
   - Cómo lo resuelve
   - Cualquier cambio que rompa compatibilidad

### Revisión de código

Todos los PRs requieren revisión antes de ser fusionados. Los revisores verificarán:

- **Funcionalidad** - El código hace lo que dice
- **Calidad** - Sigue los estándares del proyecto
- **Pruebas** - Tiene cobertura de pruebas adecuada
- **Documentación** - Cambios documentados apropiadamente

### Reportar errores

Al reportar errores, incluye:

1. **Descripción clara** del problema
2. **Pasos para reproducir** el error
3. **Comportamiento esperado** vs comportamiento actual
4. **Información del entorno** (OS, navegador, versión)
5. **Capturas de pantalla** si es aplicable

### Solicitudes de características

Para nuevas características:

1. **Abre un issue** primero para discutir
2. **Explica el caso de uso** y beneficio
3. **Proporciona mockups** si es una característica de UI
4. **Considera la complejidad** y mantenibilidad

## Herramientas de desarrollo

### Comandos útiles

```bash
# Desarrollo
npm run dev              # Iniciar ambos servicios
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend

# Pruebas
npm test                 # Todas las pruebas
npm run test:unit        # Pruebas unitarias
npm run test:e2e         # Pruebas end-to-end

# Linting y formato
npm run lint             # Linting
npm run format           # Formatear código
npm run type-check       # Verificación de tipos TypeScript

# Base de datos
cd backend
python app.py init-db    # Inicializar BD
python app.py reset-db   # Resetear BD
```

### Depuración

#### Frontend
- Usa las **React Developer Tools** para inspeccionar componentes
- **Console.log** para depuración rápida
- **Debugger** de VS Code para puntos de interrupción

#### Backend
- Usa **Flask Debug Mode** para recarga automática
- **pdb** para depuración interactiva:
  ```python
  import pdb; pdb.set_trace()
  ```
- **Logs** estructurados para seguimiento

## Guía de despliegue

### Construcción para producción

```bash
# Frontend
cd frontend
npm run build

# Backend (no requiere construcción específica)
cd backend
pip freeze > requirements.txt
```

### Variables de entorno

Configura estas variables para producción:

```bash
# Backend
FLASK_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=https://your-domain.com

# Frontend
VITE_API_URL=https://api.your-domain.com
VITE_APP_ENV=production
```

### Dockerización

```dockerfile
# Dockerfile del backend
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

---

**Cambia idioma:** [English](developer-guide.md) | **Español**