# ChordMe Troubleshooting Guide

This guide helps you resolve common issues when using or developing ChordMe.

## Installation and Setup Issues

### Node.js and npm Issues

#### "npm command not found"
**Problem**: Node.js is not installed or not in PATH.

**Solution**:
1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Verify installation: `node --version` and `npm --version`
3. Restart your terminal after installation

#### "Node version incompatible"
**Problem**: ChordMe requires Node.js 20+.

**Solution**:
```bash
# Check current version
node --version

# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download latest from nodejs.org
```

#### "npm install fails with permission errors"
**Problem**: Permission denied during npm install.

**Solution**:
```bash
# Option 1: Use npx
npx npm install

# Option 2: Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Option 3: Use different npm prefix
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Python and pip Issues

#### "python command not found"
**Problem**: Python is not installed or not in PATH.

**Solution**:
1. Install Python 3.12+ from [python.org](https://python.org/)
2. On some systems, use `python3` instead of `python`
3. Verify: `python --version` or `python3 --version`

#### "pip install fails"
**Problem**: Dependencies can't be installed.

**Solution**:
```bash
# Update pip first
python -m pip install --upgrade pip

# Use user install if permissions issue
pip install --user -r requirements.txt

# Or use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### "Virtual environment activation fails"
**Problem**: Can't activate Python virtual environment.

**Solution**:
```bash
# Linux/Mac
python -m venv venv
source venv/bin/activate

# Windows Command Prompt
python -m venv venv
venv\Scripts\activate.bat

# Windows PowerShell
python -m venv venv
venv\Scripts\Activate.ps1

# If PowerShell script execution is disabled
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Git and Repository Issues

#### "Repository not found"
**Problem**: Can't clone the repository.

**Solution**:
```bash
# Ensure you have the correct URL
git clone https://github.com/tonybolanyo/chordme.git

# If you have SSH keys set up
git clone git@github.com:tonybolanyo/chordme.git

# Check Git installation
git --version
```

#### "Permission denied (publickey)"
**Problem**: SSH key authentication fails.

**Solution**:
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to SSH agent: `ssh-add ~/.ssh/id_ed25519`
3. Add public key to GitHub account
4. Or use HTTPS instead: `git clone https://github.com/tonybolanyo/chordme.git`

## Development Server Issues

### Frontend Development Server

#### "Port 5173 already in use"
**Problem**: Vite development server can't start.

**Solution**:
```bash
# Find and kill process using port 5173
lsof -ti:5173 | xargs kill -9  # Linux/Mac
netstat -ano | findstr :5173   # Windows (then kill PID)

# Or use different port
cd frontend
npm run dev -- --port 3000
```

#### "Module not found" errors
**Problem**: Frontend dependencies are missing or corrupted.

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear npm cache if still issues
npm cache clean --force
npm install
```

#### "TypeScript compilation errors"
**Problem**: TypeScript type checking fails.

**Solution**:
```bash
cd frontend
npx tsc --noEmit  # Check for type errors

# Common fixes:
# 1. Update type definitions
npm install --save-dev @types/node @types/react @types/react-dom

# 2. Check tsconfig.json configuration
# 3. Restart TypeScript server in VS Code: Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

### Backend Development Server

#### "Port 5000 already in use"
**Problem**: Flask server can't start on port 5000.

**Solution**:
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9  # Linux/Mac
netstat -ano | findstr :5000   # Windows (then kill PID)

# Or set different port
cd backend
export PORT=5001  # Linux/Mac
set PORT=5001     # Windows
python run.py
```

#### "ModuleNotFoundError"
**Problem**: Python modules not found.

**Solution**:
```bash
cd backend
pip install -r requirements.txt

# If using virtual environment, ensure it's activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Check Python path
python -c "import sys; print(sys.path)"
```

#### "Database errors"
**Problem**: SQLAlchemy database connection issues.

**Solution**:
```bash
cd backend
# Delete and recreate database
rm -f chordme.db

# Initialize database
python -c "
from chordme import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"
```

#### "Configuration file not found"
**Problem**: Backend config.py missing.

**Solution**:
```bash
cd backend
cp config.template.py config.py

# Edit config.py with your settings
# Ensure SECRET_KEY and JWT_SECRET_KEY are set
```

## Runtime Issues

### Authentication Problems

#### "Invalid credentials" when logging in
**Problem**: Login fails with correct credentials.

**Solutions**:
1. **Check password**: Ensure caps lock is off, check special characters
2. **Clear browser data**: Clear cookies and local storage
3. **Check backend logs**: Look for authentication errors in terminal
4. **Reset user**: Drop and recreate user table if in development

```bash
# Reset development database
cd backend
rm -f chordme.db
python -c "
from chordme import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
"
```

#### "Token expired" errors
**Problem**: JWT token has expired.

**Solutions**:
1. **Login again**: Token expires after configured time
2. **Check token expiration**: Look at JWT_EXPIRATION_DELTA in config
3. **Implement token refresh**: Add automatic token refresh in frontend

#### "CORS errors" in browser
**Problem**: Cross-origin requests blocked.

**Solution**:
```python
# In backend config or app initialization
from flask_cors import CORS

# Allow all origins in development
CORS(app, origins="*")

# Or specific origins in production
CORS(app, origins=["http://localhost:5173", "https://yourdomain.com"])
```

### API Issues

#### "404 Not Found" for API endpoints
**Problem**: API routes not accessible.

**Solutions**:
1. **Check URL**: Ensure using correct base URL (http://localhost:5000/api/v1)
2. **Verify backend is running**: Check if Flask server is up
3. **Check route registration**: Ensure blueprints are registered correctly
4. **Check network**: Try curl or Postman to test API directly

```bash
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/v1/songs
```

#### "500 Internal Server Error"
**Problem**: Server-side errors.

**Solutions**:
1. **Check backend logs**: Look at terminal running Flask server
2. **Enable debug mode**: Set FLASK_DEBUG=1 in environment
3. **Check database connection**: Ensure database is accessible
4. **Validate request data**: Check if sending correct JSON format

### Frontend Issues

#### "White screen" or "Page not loading"
**Problem**: React application not rendering.

**Solutions**:
1. **Check browser console**: Look for JavaScript errors
2. **Check network tab**: Ensure API calls are successful
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Check environment variables**: Ensure VITE_API_BASE_URL is set

#### "ChordPro not displaying correctly"
**Problem**: Song formatting appears broken.

**Solutions**:
1. **Check ChordPro syntax**: Validate using the API validation endpoint
2. **Inspect element**: Check if CSS styles are applied correctly
3. **Test with simple content**: Try basic ChordPro to isolate issue

```javascript
// Test ChordPro validation
fetch('/api/v1/songs/validate-chordpro', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    content: '{title: Test}\n[C]Test [G]lyrics'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Database Issues

### SQLite Issues (Development)

#### "Database is locked"
**Problem**: SQLite database file is locked.

**Solution**:
```bash
# Kill all processes using the database
lsof chordme.db  # See which processes are using it
kill -9 <PID>    # Kill the processes

# Or delete and recreate database
cd backend
rm -f chordme.db
python -c "from chordme import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
```

#### "Table doesn't exist"
**Problem**: Database schema not created.

**Solution**:
```bash
cd backend
python -c "
from chordme import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print('All tables created successfully')
"
```

### PostgreSQL Issues (Production)

#### "Connection refused"
**Problem**: Can't connect to PostgreSQL database.

**Solutions**:
1. **Check if PostgreSQL is running**: `sudo service postgresql status`
2. **Check connection parameters**: Verify DATABASE_URL
3. **Check firewall**: Ensure port 5432 is open
4. **Check user permissions**: Ensure database user has correct permissions

```bash
# Test PostgreSQL connection
psql -h localhost -U username -d databasename

# Check PostgreSQL status
sudo systemctl status postgresql
```

## Testing Issues

### Frontend Tests

#### "Tests fail to run"
**Problem**: Vitest or test setup issues.

**Solution**:
```bash
cd frontend
# Reinstall test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Check test configuration in vite.config.ts
# Ensure test environment is set up correctly
```

#### "Component tests fail"
**Problem**: React Testing Library issues.

**Solution**:
```javascript
// Ensure proper test setup
// In src/setupTests.ts
import '@testing-library/jest-dom';

// In vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
```

### Backend Tests

#### "Pytest command not found"
**Problem**: Pytest not installed or not in PATH.

**Solution**:
```bash
cd backend
pip install pytest pytest-flask pytest-cov
python -m pytest tests/ -v
```

#### "Test database issues"
**Problem**: Tests interfere with each other.

**Solution**:
```python
# In conftest.py or test files
@pytest.fixture
def app():
    app = create_app('test_config')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()
```

### End-to-End Tests

#### "Playwright tests fail"
**Problem**: E2E tests not running.

**Solution**:
```bash
# Install Playwright browsers
npx playwright install --with-deps

# Check if both servers are running
npm run dev:frontend  # Terminal 1
npm run dev:backend   # Terminal 2

# Run E2E tests
npm run test:e2e
```

## Performance Issues

### Slow Application Performance

#### "Slow API responses"
**Problem**: Backend responds slowly.

**Solutions**:
1. **Check database queries**: Add logging to identify slow queries
2. **Add database indexes**: Index frequently queried columns
3. **Optimize Python code**: Profile with cProfile
4. **Check system resources**: Monitor CPU and memory usage

```python
# Add query logging in development
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

#### "Slow frontend rendering"
**Problem**: React app feels sluggish.

**Solutions**:
1. **Check bundle size**: Use `npm run build -- --analyze`
2. **Implement code splitting**: Use React.lazy() for routes
3. **Optimize re-renders**: Use React.memo() and useMemo()
4. **Check for memory leaks**: Use browser dev tools profiler

### High Memory Usage

#### "Node.js memory issues"
**Problem**: Frontend build process runs out of memory.

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### "Python memory issues"
**Problem**: Backend consumes too much memory.

**Solutions**:
1. **Check for memory leaks**: Use memory profiling tools
2. **Optimize database queries**: Avoid loading unnecessary data
3. **Use pagination**: Limit large result sets
4. **Configure connection pooling**: Limit database connections

## Production Deployment Issues

### Build Issues

#### "Frontend build fails"
**Problem**: `npm run build` fails.

**Solution**:
```bash
cd frontend
# Clear cache and dependencies
rm -rf node_modules package-lock.json dist
npm install
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### "Backend deployment fails"
**Problem**: Production server won't start.

**Solutions**:
1. **Check Python version**: Ensure production Python matches development
2. **Install dependencies**: `pip install -r requirements.txt`
3. **Set environment variables**: Configure production settings
4. **Check file permissions**: Ensure proper file access

### Environment Configuration

#### "Environment variables not loaded"
**Problem**: Configuration not applied in production.

**Solution**:
```bash
# Check environment variables
echo $FLASK_ENV
echo $DATABASE_URL
echo $JWT_SECRET_KEY

# Set in production environment
export FLASK_ENV=production
export DATABASE_URL=postgresql://user:pass@host:port/db
export JWT_SECRET_KEY=your-secure-secret
```

#### "HTTPS/SSL issues"
**Problem**: SSL certificate or HTTPS configuration problems.

**Solutions**:
1. **Check certificate validity**: Use SSL checker tools
2. **Configure reverse proxy**: Set up nginx or Apache correctly
3. **Update CORS settings**: Allow HTTPS origins
4. **Force HTTPS**: Redirect HTTP to HTTPS

## Getting Help

### Self-Diagnosis Steps

1. **Check the logs**: Always start by examining console/terminal output
2. **Reproduce the issue**: Try to create minimal reproduction steps
3. **Check documentation**: Review relevant sections of this manual
4. **Search existing issues**: Look through GitHub issues for similar problems
5. **Test in isolation**: Try to isolate the problem to specific components

### Reporting Issues

When reporting issues, include:

1. **Environment information**:
   - Operating system and version
   - Node.js and npm versions
   - Python and pip versions
   - Browser type and version (for frontend issues)

2. **Steps to reproduce**:
   - Exact commands run
   - Expected vs. actual behavior
   - Error messages (full text)

3. **Context**:
   - What you were trying to accomplish
   - Any recent changes to your setup
   - Whether it worked before

### Diagnostic Commands

Use these commands to gather system information:

```bash
# System information
node --version
npm --version
python --version
pip --version
git --version

# ChordMe specific
cd frontend && npm list --depth=0
cd backend && pip list

# Process information
ps aux | grep node
ps aux | grep python
lsof -i :5000
lsof -i :5173

# Network diagnostics
curl http://localhost:5000/api/v1/health
curl -I http://localhost:5173
```

### Community Resources

- **GitHub Issues**: [Report bugs and request features](https://github.com/tonybolanyo/chordme/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/tonybolanyo/chordme/discussions)
- **Documentation**: Check other sections of this manual
- **Stack Overflow**: Search for general React/Flask/TypeScript issues

---

*If you can't find a solution here, please open an issue on [GitHub](https://github.com/tonybolanyo/chordme/issues) with detailed information about your problem.*