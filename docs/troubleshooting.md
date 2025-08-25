---
layout: default
lang: en
title: ChordMe Troubleshooting Guide
---

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

## Collaboration and Sharing Issues

### Song Sharing Problems

#### "Share button not visible"
**Problem**: Cannot find the share button for a song.

**Solutions**:
1. **Check permissions**: Only owners and admin users can share songs
2. **Verify song ownership**: Ensure you're viewing your own songs, not shared songs
3. **Check user interface**: Share button appears as 📤 icon next to song title
4. **Refresh the page**: Sometimes UI state needs to be refreshed

```bash
# Check your permission level in the browser console
console.log('Current user songs:', userSongs);
console.log('User permissions:', userPermissions);
```

#### "User not found" when sharing
**Problem**: Error when trying to share with a user's email.

**Solutions**:
1. **Verify email address**: Double-check the email is typed correctly
2. **Confirm user exists**: Ask the user to register for ChordMe first
3. **Check for typos**: Copy and paste the email to avoid typing errors
4. **Try different email**: The user might have multiple email addresses

#### "Cannot share song with yourself"
**Problem**: Attempting to share a song with your own email address.

**Solution**:
- Use a different email address for the collaborator
- Verify you're not accidentally entering your own email

#### "Insufficient permissions to share"
**Problem**: Don't have the required permissions to share a song.

**Solutions**:
1. **Check your role**: Only owners and admin users can share songs
2. **Contact the owner**: Ask the song owner to grant you admin permissions
3. **Verify song access**: Ensure you have access to the song in question

### Permission Management Issues

#### "Access denied" errors
**Problem**: Cannot perform actions on shared songs.

**Solutions**:
1. **Check permission level**: Verify your permission badge next to the song title
   - 🔵 **Reader**: View-only access
   - 🟣 **Editor**: Can edit content
   - 🔴 **Admin**: Can manage sharing
   - 🔵 **Owner**: Full control
2. **Contact the owner**: Request higher permissions if needed
3. **Refresh permissions**: Log out and log back in to refresh permissions

#### "Permission changed" notifications
**Problem**: Unexpected notifications about permission changes.

**Solutions**:
1. **Check current permissions**: Look at permission badges in your song list
2. **Contact the owner**: Ask about recent permission changes
3. **Review notification details**: Check what specific permission was changed
4. **Update your workflow**: Adjust based on new permission level

#### "Cannot edit shared song"
**Problem**: Cannot modify content in a shared song.

**Solutions**:
1. **Verify edit permissions**: Ensure you have Editor, Admin, or Owner permissions
2. **Check real-time status**: Look for 🔄 indicator showing real-time editing is active
3. **Try refreshing**: Reload the page and try editing again
4. **Check for conflicts**: Another user might be editing the same section

### Real-Time Collaboration Issues

#### "Real-time editing not working"
**Problem**: Changes don't appear in real-time for other users.

**Solutions**:
1. **Check Firebase configuration**: Verify environment variables are set correctly
   ```bash
   # Check in browser console
   console.log('Firebase config:', firebaseConfig);
   ```
2. **Verify internet connection**: Ensure stable internet connectivity
3. **Check browser console**: Look for WebSocket connection errors
4. **Reload the page**: Refresh and try real-time editing again

#### "Conflicts not resolving automatically"
**Problem**: Edit conflicts aren't being resolved by the system.

**Solutions**:
1. **Manual resolution**: Use the conflict resolution dialog when it appears
2. **Check conflict complexity**: Some conflicts require manual intervention
3. **Coordinate with collaborators**: Communicate about who is editing what
4. **Edit smaller sections**: Make smaller, incremental changes to reduce conflicts

#### "Cursor positions not showing"
**Problem**: Can't see where other users are editing.

**Solutions**:
1. **Check real-time indicators**: Ensure 🔄 symbol is visible
2. **Verify collaborator presence**: Confirm other users are actively editing
3. **Browser compatibility**: Try a different browser (Chrome, Firefox, Safari)
4. **Clear browser cache**: Clear cache and cookies, then try again

#### "User presence indicators missing"
**Problem**: Cannot see who else is currently editing.

**Solutions**:
1. **Check Firestore connection**: Verify real-time database connectivity
2. **Refresh collaboration session**: Exit and re-enter the editing mode
3. **Verify permissions**: All users need at least read access to show presence
4. **Network issues**: Check for firewall or network restrictions

### Conflict Resolution Problems

#### "Merge dialog not appearing"
**Problem**: Expected conflict resolution dialog doesn't show.

**Solutions**:
1. **Check conflict severity**: Simple conflicts are resolved automatically
2. **Force conflict**: Try editing the exact same text simultaneously with another user
3. **Browser console**: Look for JavaScript errors preventing dialog display
4. **Popup blockers**: Disable popup blockers that might prevent modal dialogs

#### "Cannot choose merge option"
**Problem**: Conflict resolution options are not working.

**Solutions**:
1. **Try different browser**: Switch to a different browser and test
2. **Disable browser extensions**: Extensions might interfere with conflict resolution
3. **Check JavaScript**: Ensure JavaScript is enabled in your browser
4. **Contact support**: Report the specific conflict scenario

#### "Changes lost during conflict"
**Problem**: Edits disappear after conflict resolution.

**Solutions**:
1. **Check version history**: Look for previous versions of your changes
2. **Undo/Redo**: Try using Ctrl+Z to undo recent changes
3. **Manual recovery**: Re-enter your changes if they were lost
4. **Backup practice**: Keep external backups of important changes

### Performance Issues

#### "Slow collaboration response"
**Problem**: Real-time updates are delayed or sluggish.

**Solutions**:
1. **Check internet speed**: Verify your connection speed is adequate
2. **Reduce concurrent users**: Limit the number of simultaneous editors
3. **Browser performance**: Close other tabs and applications
4. **Clear browser data**: Clear cache, cookies, and local storage

#### "High memory usage during collaboration"
**Problem**: Browser becomes slow during real-time editing sessions.

**Solutions**:
1. **Restart browser**: Close and reopen your browser
2. **Limit session length**: Take breaks from long editing sessions
3. **Update browser**: Ensure you're using the latest browser version
4. **Check extensions**: Disable unnecessary browser extensions

### Network and Connectivity Issues

#### "WebSocket connection failed"
**Problem**: Real-time features fail due to connection issues.

**Solutions**:
1. **Check firewall settings**: Ensure WebSocket connections are allowed
2. **Verify network configuration**: Check if corporate networks block WebSockets
3. **Try different network**: Switch to a different internet connection
4. **Contact IT support**: Ask about WebSocket policies in corporate environments

#### "Firestore access denied"
**Problem**: Cannot connect to Firebase/Firestore services.

**Solutions**:
1. **Check Firebase rules**: Verify security rules allow authenticated access
2. **Verify authentication**: Ensure you're properly logged in
3. **Check API keys**: Verify Firebase configuration is correct
4. **Review browser security**: Disable strict browser security if necessary

### Troubleshooting Tools and Diagnostics

#### Browser Developer Tools

**Console Checks**:
```javascript
// Check collaboration status
console.log('Collaboration active:', isCollaborationActive);
console.log('Real-time enabled:', isRealtimeEnabled);
console.log('Current user permissions:', userPermissions);

// Check Firebase connection
console.log('Firebase auth:', firebase.auth().currentUser);
console.log('Firestore connection:', firestore);

// Check WebSocket status
console.log('WebSocket ready state:', webSocket.readyState);
```

**Network Tab Monitoring**:
- Monitor WebSocket connections (ws:// or wss://)
- Check for failed Firestore requests
- Verify authentication token is being sent

#### API Testing

Test collaboration endpoints manually:

```bash
# Test sharing endpoint
curl -X POST http://localhost:5000/api/v1/songs/1/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_email":"test@example.com","permission_level":"edit"}'

# Test collaborators endpoint
curl -X GET http://localhost:5000/api/v1/songs/1/collaborators \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test permission update
curl -X PUT http://localhost:5000/api/v1/songs/1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_email":"test@example.com","permission_level":"admin"}'
```

#### Firebase Console Debugging

1. **Check Firestore data structure**:
   - Verify collaboration collections exist
   - Check document permissions and data format
   - Monitor real-time listeners

2. **Review security rules**:
   - Test rules in the Firebase console simulator
   - Verify authenticated users can read/write collaboration data

3. **Monitor usage metrics**:
   - Check read/write operation counts
   - Monitor concurrent connections
   - Review error logs

### Getting Help with Collaboration Issues

#### Self-Diagnosis Checklist

Before reporting collaboration issues:

- [ ] Verify you have appropriate permissions for the action
- [ ] Check that real-time indicators are showing (🔄 symbol)
- [ ] Confirm other users are actively collaborating
- [ ] Test with a simple example song and collaborator
- [ ] Check browser console for error messages
- [ ] Try the same actions in a different browser
- [ ] Verify internet connection is stable

#### Reporting Collaboration Bugs

When reporting collaboration issues, include:

1. **User permissions**: Your permission level and the permission levels of other collaborators
2. **Steps to reproduce**: Exact sequence of actions that cause the issue
3. **Expected vs actual behavior**: What should happen vs what actually happens
4. **Browser information**: Browser type, version, and any extensions
5. **Console errors**: Any JavaScript errors shown in browser console
6. **Network environment**: Corporate network, home network, mobile data, etc.
7. **Collaboration context**: Number of users, song size, editing patterns

#### Emergency Recovery Procedures

If collaboration features completely fail:

1. **Switch to offline editing**: Edit songs individually and merge manually
2. **Export current state**: Download songs to preserve current content
3. **Communicate externally**: Use email/chat to coordinate with collaborators
4. **Version control**: Keep manual backups of important changes
5. **Contact support**: Report critical issues immediately for priority assistance

---

*If you can't find a solution here, please open an issue on [GitHub](https://github.com/tonybolanyo/chordme/issues) with detailed information about your problem.*