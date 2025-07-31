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

*For more information about using ChordMe, see the [User Guide](user-guide.md) and [API Reference](api-reference.md).*