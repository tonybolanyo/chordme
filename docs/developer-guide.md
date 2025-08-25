# ChordMe Developer Guide

This guide is for developers who want to contribute to ChordMe or understand its technical architecture.

## Architecture Overview

ChordMe is a full-stack web application with a clear separation between frontend and backend:

```
┌─────────────────┐    HTTP/REST API    ┌─────────────────┐
│   React Frontend │ ◄─────────────────► │  Flask Backend  │
│   (TypeScript)   │                     │    (Python)     │
└─────────────────┘                     └─────────────────┘
│                                                         │
│ • React 19                                              │
│ • TypeScript                             • Flask 3.1   │
│ • Vite                                   • SQLAlchemy  │
│ • ESLint/Prettier                        • JWT Auth    │
│ • Vitest                                 • Pytest      │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **React 19**: Modern React with latest features
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and development server
- **ESLint & Prettier**: Code quality and formatting
- **Vitest**: Testing framework
- **React Testing Library**: Component testing

### Backend
- **Flask 3.1**: Python web framework
- **SQLAlchemy**: Database ORM
- **Flask-CORS**: Cross-origin resource sharing
- **PyJWT**: JWT token handling
- **bcrypt**: Password hashing
- **Pytest**: Testing framework

### Development Tools
- **GitHub Actions**: CI/CD pipeline
- **Playwright**: End-to-end testing
- **Codecov**: Test coverage reporting

## Repository Structure

```
chordme/
├── .github/                    # GitHub Actions workflows
│   ├── workflows/
│   │   ├── ci.yml             # Main CI/CD pipeline
│   │   ├── frontend-ci.yml    # Frontend-specific CI
│   │   ├── backend-ci.yml     # Backend-specific CI
│   │   └── dependency-updates.yml
│   └── CI_CD_DOCUMENTATION.md
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # API service layer
│   │   ├── types/            # TypeScript definitions
│   │   └── utils/            # Utility functions
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   └── vite.config.ts        # Vite configuration
├── backend/                   # Flask backend
│   ├── chordme/              # Main application package
│   │   ├── models/           # SQLAlchemy models
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   ├── tests/                # Backend test suite
│   ├── requirements.txt      # Python dependencies
│   ├── config.template.py    # Configuration template
│   └── run.py               # Application entry point
├── docs/                     # Documentation
├── e2e/                      # End-to-end tests
├── integration-tests/        # Integration test suite
├── package.json              # Root package.json for scripts
└── README.md
```

## Development Setup

### Prerequisites

1. **Node.js 20+**: Download from [nodejs.org](https://nodejs.org/)
2. **Python 3.12+**: Download from [python.org](https://python.org/)
3. **Git**: Version control system

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/tonybolanyo/chordme.git
cd chordme

# Install root dependencies
npm install

# Setup frontend
cd frontend
npm install
cd ..

# Setup backend
cd backend
pip install -r requirements.txt
cp config.template.py config.py
cd ..
```

### Development Workflow

#### Running the Application

```bash
# Start both frontend and backend
npm run dev:frontend    # Terminal 1
npm run dev:backend     # Terminal 2

# Or individually
cd frontend && npm run dev         # Frontend only
cd backend && python run.py       # Backend only
```

#### Running Tests

```bash
# All tests
npm run test:all

# Frontend tests
npm run test:frontend
npm run test:frontend:coverage

# Backend tests
npm run test:backend
npm run test:backend:coverage

# End-to-end tests
npm run test:e2e

# Integration tests
npm run test:integration
```

#### Code Quality

```bash
# Frontend linting
npm run lint:frontend
cd frontend && npm run lint:fix

# Frontend formatting
npm run format:frontend
cd frontend && npm run format

# Type checking
cd frontend && npx tsc --noEmit
```

## Contributing Guidelines

### Code Style

#### Frontend (TypeScript/React)
- Use TypeScript for all new code
- Follow React functional component patterns
- Use hooks for state management
- Implement proper error boundaries
- Write comprehensive tests for components

#### Backend (Python/Flask)
- Follow PEP 8 style guidelines
- Use type hints where applicable
- Write comprehensive docstrings
- Implement proper error handling
- Write tests for all new functionality

### Git Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes with clear, descriptive commits
4. **Write** tests for new functionality
5. **Run** the full test suite
6. **Submit** a pull request with a clear description

### Commit Message Format

Use conventional commit messages:

```
type(scope): brief description

- feat: new features
- fix: bug fixes
- docs: documentation changes
- style: formatting, missing semicolons, etc.
- refactor: code restructuring without functionality changes
- test: adding or modifying tests
- chore: maintenance tasks
```

Examples:
```
feat(api): add ChordPro validation endpoint
fix(frontend): resolve chord display alignment issue
docs(readme): update installation instructions
test(backend): add authentication endpoint tests
```

## Architecture Deep Dive

### Frontend Architecture

#### Component Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── ChordProEditor/
│   │   ├── ChordProEditor.tsx
│   │   ├── ChordProEditor.test.tsx
│   │   └── ChordProEditor.module.css
│   ├── ChordProViewer/
│   └── Forms/
├── pages/
│   ├── Home/
│   ├── Login/
│   ├── Register/
│   └── SongEditor/
├── services/
│   ├── api.ts              # API client
│   ├── auth.ts             # Authentication service
│   └── storage.ts          # Local storage utilities
├── types/
│   └── index.ts            # TypeScript type definitions
└── utils/
    ├── chordpro.ts         # ChordPro parsing utilities
    └── validation.ts       # Form validation helpers
```

#### State Management

ChordMe uses React's built-in state management:

- **useState**: Component-level state
- **useReducer**: Complex state logic
- **useContext**: Shared application state
- **Custom hooks**: Reusable stateful logic

#### API Integration

```typescript
// services/api.ts
class ApiService {
  private baseURL = import.meta.env.VITE_API_BASE_URL;
  private token: string | null = null;

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async getSongs(): Promise<SongResponse[]> {
    const response = await fetch(`${this.baseURL}/songs`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}
```

### Backend Architecture

#### Application Structure

```python
# chordme/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app(config_name='config'):
    app = Flask(__name__)
    app.config.from_object(config_name)
    
    db.init_app(app)
    CORS(app)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.songs import songs_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(songs_bp, url_prefix='/api/v1/songs')
    
    return app
```

#### Database Models

```python
# chordme/models/user.py
from chordme import db
from datetime import datetime
import bcrypt

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    songs = db.relationship('Song', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )
```

#### API Routes

```python
# chordme/routes/songs.py
from flask import Blueprint, request, jsonify
from chordme.models.song import Song
from chordme.utils.auth import token_required
from chordme import db

songs_bp = Blueprint('songs', __name__)

@songs_bp.route('', methods=['GET'])
@token_required
def get_songs(current_user):
    songs = Song.query.filter_by(user_id=current_user.id).all()
    return jsonify({
        'status': 'success',
        'data': {'songs': [song.to_dict() for song in songs]}
    })

@songs_bp.route('', methods=['POST'])
@token_required
def create_song(current_user):
    data = request.get_json()
    song = Song(
        title=data['title'],
        content=data['content'],
        user_id=current_user.id
    )
    db.session.add(song)
    db.session.commit()
    return jsonify({
        'status': 'success',
        'data': {'song': song.to_dict()}
    }), 201
```

## PDF Export System

The PDF export feature provides professional-quality sheet music generation from ChordPro content using server-side rendering.

### Architecture Overview

The PDF export system consists of three main components:

1. **PDF Generation Utility** (`backend/chordme/pdf_generator.py`)
2. **API Endpoint** (`/api/v1/songs/{id}/export/pdf`)
3. **Frontend Integration** (modal dialog and API service)

### PDF Generation Utility

#### ChordProPDFGenerator Class

The core PDF generation is handled by the `ChordProPDFGenerator` class:

```python
from chordme.pdf_generator import ChordProPDFGenerator

# Initialize with custom options
generator = ChordProPDFGenerator(
    paper_size='a4',  # 'a4', 'letter', 'legal'
    orientation='portrait'  # 'portrait', 'landscape'
)

# Generate PDF from ChordPro content
pdf_bytes = generator.generate_pdf(
    content=chordpro_content,
    title="Song Title",
    artist="Artist Name"
)
```

#### Key Features

- **ChordPro Parsing**: Extracts title, artist, key, tempo, and song sections
- **Chord Positioning**: Places chords accurately above lyrics with proper alignment
- **Section Handling**: Supports verses, choruses, bridges with clear labeling
- **Customizable Layout**: Multiple paper sizes and orientations
- **Professional Styling**: Clean typography optimized for musicians

#### PDF Template Structure

The PDF generator creates documents with this structure:

```
┌─────────────────────────────┐
│ Song Title (centered, large) │
│ by Artist Name (centered)    │
│ Key: G | Tempo: 120 BPM     │
│                             │
│ Verse 1                     │
│ C       G       Am      F   │
│ Hello   world   this is test│
│                             │
│ Chorus                      │
│ F       C       G       Am  │
│ Chorus  lyrics  go     here │
│                             │
│ (additional sections...)     │
└─────────────────────────────┘
```

### API Implementation

#### Endpoint Definition

```python
@app.route('/api/v1/songs/<int:song_id>/export/pdf', methods=['GET'])
@auth_required
@validate_positive_integer('song_id')
@rate_limit(max_requests=5, window_seconds=60)
@security_headers
def export_song_pdf(song_id):
    """Export song as PDF with customizable options."""
```

#### Query Parameters

- `paper_size`: Paper size ('a4', 'letter', 'legal')
- `orientation`: Page orientation ('portrait', 'landscape')
- `title`: Override song title in PDF
- `artist`: Override artist name in PDF

#### Example API Usage

```bash
# Basic export
GET /api/v1/songs/123/export/pdf

# With custom options
GET /api/v1/songs/123/export/pdf?paper_size=letter&orientation=landscape&title=Custom%20Title&artist=Custom%20Artist
```

#### Response Format

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="song-title.pdf"

[PDF binary content]
```

### Frontend Integration

#### API Service Method

```typescript
// services/api.ts
async exportSongAsPDF(
  id: string,
  options: {
    paperSize?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    title?: string;
    artist?: string;
  } = {}
): Promise<void> {
  // Implementation handles query parameters and file download
}
```

#### PDF Export Modal

The `PDFExportModal` component provides:

- Paper size selection
- Orientation options
- Title/artist overrides
- Export progress indication
- Error handling

#### Usage Example

```tsx
import { PDFExportModal } from '../components';

// In component
const [showPDFModal, setShowPDFModal] = useState(false);
const [isExporting, setIsExporting] = useState(false);

const handlePDFExport = async (options: PDFExportOptions) => {
  setIsExporting(true);
  try {
    await apiService.exportSongAsPDF(song.id, options);
    setShowPDFModal(false);
  } catch (error) {
    // Handle error
  } finally {
    setIsExporting(false);
  }
};
```

### Customization Options

#### Adding New Paper Sizes

1. Update `PAPER_SIZES` dictionary in `pdf_generator.py`:
```python
PAPER_SIZES = {
    'letter': letter,
    'a4': A4,
    'legal': legal,
    'tabloid': (792, 1224),  # Add new size
}
```

2. Update validation in API endpoint
3. Update frontend dropdown options

#### Modifying PDF Styling

The PDF generator uses ReportLab's styling system:

```python
# Custom title style
title_style = ParagraphStyle(
    'CustomTitle',
    fontSize=20,           # Font size
    spaceAfter=16,         # Space after element
    alignment=TA_CENTER,   # Text alignment
    textColor=blue,        # Text color
    fontName='Helvetica-Bold'  # Font family
)
```

#### Chord Layout Customization

Modify the `_format_chord_line` method to adjust chord positioning:

```python
def _format_chord_line(self, chords, lyrics):
    # Custom chord spacing logic
    chord_spacing = 2  # Minimum spaces between chords
    # Implementation here...
```

### Error Handling

The PDF export system includes comprehensive error handling:

```python
# Backend error scenarios
- Invalid paper size/orientation
- Missing song or insufficient permissions
- PDF generation failures
- Rate limiting violations

# Frontend error handling
- Network connectivity issues
- Authentication failures
- Server errors with user-friendly messages
- Loading states during export
```

### Performance Considerations

- **Rate Limiting**: 5 PDF exports per minute per user
- **Caching**: Generated PDFs could be cached for identical parameters
- **Memory Management**: Large documents handled efficiently
- **File Size**: Optimized PDF output without unnecessary bloat

### Testing Coverage

#### Unit Tests (24 test cases)
- PDF generator utility functions
- ChordPro parsing accuracy
- Styling and layout verification
- Error condition handling

#### Integration Tests (15 test cases)
- API endpoint functionality
- Authentication and permissions
- Parameter validation
- File download verification

#### E2E Tests (15 test scenarios)
- Complete user workflow
- Modal interaction
- Download validation
- Error scenario testing

## Testing Strategy

### Frontend Testing

#### Unit Tests
```typescript
// components/ChordProEditor/ChordProEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChordProEditor } from './ChordProEditor';

describe('ChordProEditor', () => {
  it('renders editor with initial content', () => {
    render(<ChordProEditor initialContent="" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('updates content on text change', () => {
    const onContentChange = jest.fn();
    render(<ChordProEditor onContentChange={onContentChange} />);
    
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: '[C]Test' } });
    
    expect(onContentChange).toHaveBeenCalledWith('[C]Test');
  });
});
```

#### Integration Tests
```typescript
// pages/SongEditor/SongEditor.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SongEditor } from './SongEditor';
import * as apiService from '../../services/api';

jest.mock('../../services/api');

describe('SongEditor', () => {
  it('saves song successfully', async () => {
    const mockSaveSong = jest.fn().mockResolvedValue({ id: 1 });
    (apiService.saveSong as jest.Mock) = mockSaveSong;

    render(<SongEditor />);
    
    // Fill form and submit
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockSaveSong).toHaveBeenCalled();
    });
  });
});
```

### Backend Testing

#### Unit Tests
```python
# tests/test_models.py
import pytest
from chordme.models.user import User

def test_user_password_hashing():
    user = User(email='test@example.com')
    user.set_password('testpassword')
    
    assert user.check_password('testpassword')
    assert not user.check_password('wrongpassword')
    assert user.password_hash != 'testpassword'
```

#### API Tests
```python
# tests/test_auth.py
import pytest
from chordme import create_app, db

@pytest.fixture
def app():
    app = create_app('test_config')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

def test_user_registration(client):
    response = client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'testpassword123'
    })
    
    assert response.status_code == 201
    assert response.json['status'] == 'success'
    assert 'user' in response.json['data']
```

### End-to-End Testing

```typescript
// e2e/song-management.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and edit a song', async ({ page }) => {
  // Login
  await page.goto('/');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');

  // Create song
  await page.click('[data-testid="new-song-button"]');
  await page.fill('[data-testid="song-title"]', 'Test Song');
  await page.fill('[data-testid="song-content"]', '[C]Test content');
  await page.click('[data-testid="save-button"]');

  // Verify song was created
  await expect(page.locator('text=Test Song')).toBeVisible();
});
```

## Database Design

### Schema Overview

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Songs table
CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200),
    key VARCHAR(10),
    capo INTEGER DEFAULT 0,
    tempo INTEGER,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Indexes for performance
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_users_email ON users(email);
```

### Migration Strategy

```python
# migrations/001_initial_schema.py
from chordme import db

def upgrade():
    db.create_all()

def downgrade():
    db.drop_all()
```

## Deployment

### Development Environment

```bash
# Environment variables
export FLASK_ENV=development
export FLASK_DEBUG=1
export VITE_API_BASE_URL=http://localhost:5000

# Start services
npm run dev:backend    # Port 5000
npm run dev:frontend   # Port 5173
```

### Production Environment

```bash
# Build frontend
cd frontend
npm run build

# Configure backend
cd backend
export FLASK_ENV=production
export DATABASE_URL=postgresql://user:pass@host:port/db
export JWT_SECRET_KEY=your-production-secret

# Run with gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### Docker Deployment

```dockerfile
# Dockerfile.frontend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

```dockerfile
# Dockerfile.backend
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/chordme
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:5000

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: chordme
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**: Use React.lazy() for route-based splitting
2. **Bundle Analysis**: Regular analysis with `npm run build -- --analyze`
3. **Asset Optimization**: Optimize images and static assets
4. **Caching**: Implement proper browser caching strategies

### Backend Optimization

1. **Database Indexing**: Proper indexes on frequently queried columns
2. **Query Optimization**: Use SQLAlchemy query optimization techniques
3. **Caching**: Implement Redis caching for frequent operations
4. **Connection Pooling**: Configure proper database connection pooling

## Security Considerations

### Authentication & Authorization
- JWT tokens with appropriate expiration
- Secure password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on authentication endpoints

### Data Protection
- HTTPS enforcement in production
- SQL injection prevention through ORM
- XSS protection through proper output encoding
- CSRF protection for state-changing operations

### API Security
- Input validation on all endpoints
- Proper error handling without information leakage
- Rate limiting and throttling
- CORS configuration for production

## Troubleshooting Common Issues

### Development Setup Issues

#### Node.js Version Conflicts
```bash
# Use nvm to manage Node.js versions
nvm install 20
nvm use 20
```

#### Python Virtual Environment
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Database Connection Issues
```bash
# Reset database
cd backend
rm -f chordme.db
python -c "from chordme import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
```

### Build Issues

#### Frontend Build Failures
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit
```

### Testing Issues

#### Test Database Setup
```bash
cd backend
export FLASK_CONFIG=test_config
python -m pytest tests/ -v
```

#### E2E Test Failures
```bash
# Install Playwright browsers
npx playwright install --with-deps
```

## Resources

### Documentation
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Tools
- [VS Code Extensions](https://code.visualstudio.com/docs/languages/typescript)
- [GitHub CLI](https://cli.github.com/)
- [Postman](https://www.postman.com/) for API testing

### Community
- [GitHub Discussions](https://github.com/tonybolanyo/chordme/discussions)
- [Issue Tracker](https://github.com/tonybolanyo/chordme/issues)

---

## Collaboration Feature Implementation

This section provides comprehensive guidelines for developers working on collaboration features in ChordMe.

### Architecture Overview

The collaboration system is built on several key components:

```
Frontend (React)           Backend (Flask)         External Services
┌─────────────────┐        ┌──────────────────┐    ┌──────────────────┐
│ Collaboration   │        │ Sharing API      │    │ Firebase         │
│ Hooks & Context │◄──────►│ Permission Mgmt  │    │ Firestore        │
│                 │        │ User Management  │    │ Real-time DB     │
├─────────────────┤        ├──────────────────┤    ├──────────────────┤
│ UI Components   │        │ JWT Auth         │    │ WebSocket        │
│ - Sharing Modal │        │ Rate Limiting    │    │ Connections      │
│ - Notifications │        │ Security Headers │    │ Presence System  │
│ - Indicators    │        │ CSRF Protection  │    │ Operation Store  │
└─────────────────┘        └──────────────────┘    └──────────────────┘
```

### Backend Implementation Guidelines

#### Database Models

The sharing system uses JSON fields to store collaboration data efficiently:

```python
# chordme/models/song.py
class Song(db.Model):
    # Collaboration fields
    shared_with = db.Column(db.JSON, default=lambda: [])  # List of user IDs
    permissions = db.Column(db.JSON, default=lambda: {})  # user_id -> permission_level
    share_settings = db.Column(db.String(20), default='private')  # private/public/link-shared
    
    def add_shared_user(self, user_id, permission_level):
        """Add or update a user's sharing permissions."""
        if self.shared_with is None:
            self.shared_with = []
        if self.permissions is None:
            self.permissions = {}
            
        if user_id not in self.shared_with:
            self.shared_with.append(user_id)
        
        self.permissions[str(user_id)] = permission_level
        db.session.commit()
    
    def get_user_permission(self, user_id):
        """Get a user's permission level for this song."""
        if user_id == self.author_id:
            return 'owner'
        if self.permissions and str(user_id) in self.permissions:
            return self.permissions[str(user_id)]
        return None
```

#### Permission Validation

Use decorators for consistent permission checking:

```python
# chordme/permission_helpers.py
def require_song_permission(required_permission='read'):
    """Decorator to check song access permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            song_id = kwargs.get('song_id')
            song = Song.query.filter_by(id=song_id).first()
            if not song:
                return create_error_response("Song not found", 404)
            
            user_permission = song.get_user_permission(g.current_user_id)
            permission_hierarchy = {
                'read': ['read', 'edit', 'admin', 'owner'],
                'edit': ['edit', 'admin', 'owner'],
                'admin': ['admin', 'owner'],
                'owner': ['owner']
            }
            
            if user_permission not in permission_hierarchy.get(required_permission, []):
                return create_error_response("Insufficient permissions", 403)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

### Frontend Implementation Guidelines

#### Context and State Management

Use React Context for collaboration state:

```typescript
// src/contexts/CollaborationContext.tsx
const CollaborationContext = createContext<{
  state: CollaborationState;
  startCollaboration: (songId: string) => Promise<void>;
  shareSong: (songId: string, email: string, permission: string) => Promise<void>;
} | null>(null);

export const useCollaboration = (songId?: string) => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  
  return context;
};
```

#### Component Design Patterns

**Modal Components**: Use controlled components with proper accessibility:

```typescript
// src/components/SongSharingModal/SongSharingModal.tsx
export const SongSharingModal: React.FC<SongSharingModalProps> = ({
  songId,
  isOpen,
  onClose,
  userPermission
}) => {
  // Form state management
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [isLoading, setIsLoading] = useState(false);
  
  // Accessibility and keyboard handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal content with proper ARIA labels */}
      </div>
    </div>
  );
};
```

### Testing Guidelines

#### Backend Testing Patterns

```python
# tests/test_collaboration_endpoints.py
class TestSongSharingEndpoints:
    @pytest.fixture
    def sample_song(self, users_and_tokens):
        """Create a sample song with collaborators for testing."""
        owner = users_and_tokens['owner']
        song = Song(
            title='Collaborative Song',
            content='{title: Test}\n[C]Content',
            author_id=owner['user'].id
        )
        db.session.add(song)
        db.session.commit()
        return song
    
    def test_share_song_success(self, test_client, users_and_tokens, sample_song):
        """Test successful song sharing."""
        response = test_client.post(f'/api/v1/songs/{sample_song.id}/share',
                                  json={'user_email': 'test@example.com', 'permission_level': 'edit'},
                                  headers=users_and_tokens['owner']['headers'])
        assert response.status_code == 200
```

#### Frontend Testing Patterns

```typescript
// src/components/SongSharingModal/SongSharingModal.test.tsx
describe('SongSharingModal', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <CollaborationProvider>
        {component}
      </CollaborationProvider>
    );
  };
  
  it('validates email before sharing', async () => {
    renderWithProvider(<SongSharingModal {...defaultProps} />);
    
    const emailInput = screen.getByLabelText('Collaborator Email:');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const shareButton = screen.getByText('Share Song', { selector: 'button' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });
});
```

### Security Best Practices

1. **Server-side Validation**: Always validate permissions on the backend
2. **Rate Limiting**: Implement rate limits for sharing endpoints
3. **Input Sanitization**: Validate and sanitize all user inputs
4. **Audit Logging**: Log all sharing activities for security audits
5. **CSRF Protection**: Use CSRF tokens for state-changing operations

### Performance Considerations

1. **Database Indexing**: Index shared_with and permissions fields for faster queries
2. **Caching**: Cache collaborator data to reduce database load
3. **Pagination**: Use pagination for large collaborator lists
4. **Debouncing**: Debounce real-time updates to prevent excessive API calls
5. **Optimistic Updates**: Use optimistic UI updates for better user experience

### Error Handling Patterns

1. **Graceful Degradation**: Fall back when real-time features are unavailable
2. **User-Friendly Messages**: Provide clear, actionable error messages
3. **Automatic Retry**: Implement retry logic for transient failures
4. **Logging**: Log errors with appropriate detail for debugging
5. **Status Codes**: Use proper HTTP status codes for different error types

## Version History and Undo/Redo Implementation

ChordMe implements a comprehensive version control system for songs, combining local undo/redo functionality with persistent server-side version history.

### Data Schema

#### SongVersion Model

```python
class SongVersion(db.Model):
    __tablename__ = 'song_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    song = db.relationship('Song', backref=db.backref('versions', lazy=True, order_by='SongVersion.created_at.desc()'))
    user = db.relationship('User', backref='song_versions')
    
    # Composite unique constraint
    __table_args__ = (db.UniqueConstraint('song_id', 'version_number', name='unique_song_version'),)
```

**Key Design Decisions:**
- **Complete Snapshots**: Each version stores the full song state (title + content)
- **Sequential Numbering**: Version numbers increment per song (1, 2, 3...)
- **User Tracking**: Each version records who made the change
- **Immutable History**: Versions are never modified after creation

### Backend Implementation

#### Automatic Version Creation

```python
def create_version_snapshot(song, user_id):
    """Create a version snapshot of a song before modification."""
    # Get the next version number for this song
    latest_version = SongVersion.query.filter_by(song_id=song.id)\
                                     .order_by(SongVersion.version_number.desc())\
                                     .first()
    
    next_version_number = (latest_version.version_number + 1) if latest_version else 1
    
    # Create the version snapshot
    version = SongVersion(
        song_id=song.id,
        version_number=next_version_number,
        title=song.title,
        content=song.content,
        user_id=user_id
    )
    
    db.session.add(version)
    return version
```

**Integration Points:**
- Called automatically in `update_song()` endpoint before applying changes
- Called before `restore_version()` to preserve current state
- Respects database transactions for consistency

#### API Endpoints

Three new endpoints provide version history functionality:

1. **GET `/songs/{id}/versions`**: List all versions (newest first)
2. **GET `/songs/{id}/versions/{version_id}`**: Get specific version details
3. **POST `/songs/{id}/restore/{version_id}`**: Restore to previous version

**Permission Validation:**
- All endpoints respect existing song permission system
- Version access requires read permission to the song
- Version restoration requires edit permission to the song

### Frontend Implementation

#### Undo/Redo State Management

```typescript
interface UndoRedoState {
  title: string;
  content: string;
}

interface UndoRedoHook {
  currentState: UndoRedoState;
  canUndo: boolean;
  canRedo: boolean;
  setState: (state: UndoRedoState) => void;
  undo: () => UndoRedoState | null;
  redo: () => UndoRedoState | null;
  clearHistory: () => void;
}
```

**Key Features:**
- **Real-time Tracking**: Changes tracked as user types
- **Stack-based Storage**: Undo stack for previous states, redo stack for forward states
- **Branching Logic**: Redo stack cleared when new changes made after undo
- **Session Scope**: History maintained during editing session only

#### Component Architecture

```
Home.tsx
├── UndoRedoControls
│   ├── Undo Button (Ctrl+Z)
│   ├── Redo Button (Ctrl+Y)
│   └── History Button
└── HistoryPanel (Modal)
    ├── Current Version Display
    ├── Version List
    │   ├── Version Item
    │   │   ├── Version Info
    │   │   ├── Preview Button
    │   │   └── Restore Button
    │   └── Content Preview (expandable)
    └── Loading/Error States
```

#### Service Layer

```typescript
class VersionHistoryService {
  async getVersions(songId: string | number): Promise<SongVersion[]>
  async getVersion(songId: string | number, versionId: string | number): Promise<SongVersion>
  async restoreVersion(songId: string | number, versionId: string | number): Promise<void>
  formatVersionForDisplay(version: SongVersion): DisplayFormat
}
```

### Integration with Existing Features

#### Real-time Collaboration

- Version creation respects collaboration permissions
- External changes trigger conflict resolution before version creation
- Collaborative edits create versions attributed to the modifying user

#### Conflict Resolution

```typescript
const handleAcceptExternalChanges = () => {
  if (realtimeEditingSong) {
    const newState = {
      title: realtimeEditingSong.title,
      content: realtimeEditingSong.content,
    };
    setEditSongData(newState);
    undoRedo.setState(newState); // Update undo/redo state
    setHasExternalChanges(false);
    setShowConflictDialog(false);
  }
};
```

### Performance Considerations

1. **Database Indexing**: Index shared_with and permissions fields for faster queries
2. **Caching**: Cache collaborator data to reduce database load
3. **Pagination**: Use pagination for large collaborator lists
4. **Debouncing**: Debounce real-time updates to prevent excessive API calls
5. **Optimistic Updates**: Use optimistic UI updates for better user experience

### Error Handling Patterns

1. **Graceful Degradation**: Fall back when real-time features are unavailable
2. **User-Friendly Messages**: Provide clear, actionable error messages
3. **Automatic Retry**: Implement retry logic for transient failures
4. **Logging**: Log errors with appropriate detail for debugging
5. **Status codes**: Use proper HTTP status codes for different error types

#### Version-Specific Considerations

- **Storage Efficiency**: Consider compression for large song content
- **Retention Policy**: Implement policies for old version cleanup if needed
- **Backup Integration**: Ensure versions are included in backup strategies
- **Migration Strategy**: Plan for schema changes affecting version data

### Testing Strategy

#### Backend Tests
- Model validation and constraints
- API endpoint functionality  
- Permission enforcement
- Error handling

#### Frontend Tests
- Undo/redo state management
- Component rendering and interactions
- Service layer API communication
- Keyboard shortcut handling

#### Integration Tests
- End-to-end version creation workflow
- Permission validation across user boundaries
- Conflict resolution with version creation

---

*For more information about using ChordMe, see the [User Guide](user-guide.md) and [API Reference](api-reference.md).*