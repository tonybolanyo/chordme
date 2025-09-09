# ChordMe - GitHub Copilot Coding Agent Instructions

ChordMe is a full-stack web application for managing lyrics and chords using the ChordPro format. The application consists of a React TypeScript frontend and a Python Flask backend with comprehensive testing.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build, and Test the Repository

**CRITICAL: All commands have been validated to work. NEVER CANCEL builds or tests - they complete in under 2 minutes.**

1. **Install all dependencies:**
   ```bash
   # Install root dependencies (2 seconds)
   npm install
   
   # Install frontend dependencies (15 seconds)
   cd frontend && npm install && cd ..
   
   # Install backend dependencies (30 seconds)
   cd backend && pip install -r requirements.txt && cd ..
   ```

2. **Setup backend configuration:**
   ```bash
   cd backend && cp config.template.py config.py && cd ..
   ```

3. **Build frontend (2 seconds - NEVER CANCEL):**
   ```bash
   cd frontend && npx vite build
   ```

4. **Run all tests (45 seconds total - NEVER CANCEL):**
   ```bash
   # Frontend tests: 8 seconds
   npm run test:frontend:run
   
   # Backend tests: 31 seconds (6 known failures, 147 pass)
   npm run test:backend
   
   # Integration tests: 2 seconds
   npm run test:integration
   
   # All tests combined
   npm run test:all
   ```

### Development Servers

**CRITICAL: Run in separate terminals. Backend must disable HTTPS for development.**

1. **Backend development server (Port 5000):**
   ```bash
   cd backend
   # Set HTTPS_ENFORCED = False in config.py for development
   FLASK_DEBUG=1 python run.py
   ```

2. **Frontend development server (Port 5173):**
   ```bash
   cd frontend && npm run dev
   ```

3. **Verify servers are running:**
   ```bash
   # Test backend health endpoint
   curl http://localhost:5000/api/v1/health
   
   # Test frontend accessibility
   curl -s http://localhost:5173/ | head -10
   ```

### Code Quality and Linting

**CRITICAL: Always run these before committing. All complete in under 5 seconds.**

```bash
# Frontend linting and formatting (2 seconds each)
cd frontend
npm run lint
npm run format:check
npx tsc --noEmit  # TypeScript check

# Lint fixes
npm run lint:fix
npm run format
```

## Validation

### Manual Testing Scenarios

**CRITICAL: Always test these complete user workflows after making changes:**

1. **User Registration Flow:**
   - Navigate to http://localhost:5173/#register
   - Fill in email, password, confirm password
   - Submit form and verify API communication
   - Expected: Either success or appropriate error message

2. **User Login Flow:**
   - Navigate to http://localhost:5173/#login  
   - Test with valid/invalid credentials
   - Verify JWT token handling

3. **Health Check Verification:**
   ```bash
   curl http://localhost:5000/api/v1/health
   # Expected response: {"message": "Service is running", "status": "ok"}
   ```

### Build Validation

**CRITICAL: Specific timeout values and warnings:**

- **Frontend build: 2 seconds max - NEVER CANCEL**
- **Frontend tests: 10 seconds max - NEVER CANCEL** 
- **Backend tests: 35 seconds max - NEVER CANCEL (6 known failures are normal)**
- **Integration tests: 5 seconds max - NEVER CANCEL**

### Known Issues to Expect

1. **Backend tests**: 6 tests fail (147 pass) - this is normal, do not attempt to fix
2. **TypeScript build**: `npm run build` fails due to test type errors - use `npx vite build` instead
3. **E2E tests**: Require Playwright browser installation which may fail in CI environments
4. **HTTPS enforcement**: Must be disabled for development (set `HTTPS_ENFORCED = False` in config.py)

## Repository Structure

```
chordme/
├── .github/                    # GitHub Actions and workflows
│   ├── workflows/              # CI/CD pipelines (5+ workflow files)
│   └── copilot-instructions.md # This file
├── frontend/                   # React TypeScript application
│   ├── src/
│   │   ├── components/         # Reusable UI components  
│   │   ├── pages/             # Page-level components (Login, Register, Home)
│   │   ├── services/          # API service layer
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Utility functions (validation, JWT)
│   ├── package.json           # Frontend dependencies and scripts
│   └── vite.config.ts         # Vite configuration
├── backend/                    # Python Flask API
│   ├── chordme/               # Main application package
│   ├── tests/                 # Backend test suite (153 tests)
│   ├── requirements.txt       # Python dependencies
│   ├── config.py              # Configuration (copy from template)
│   ├── run.py                 # Development server entry point
│   └── pytest.ini            # Test configuration
├── integration-tests/          # API integration tests
├── e2e/                       # Playwright end-to-end tests
├── docs/                      # Documentation files
├── package.json               # Root package scripts
└── playwright.config.ts       # E2E test configuration
```

## Key Projects and Technologies

### Frontend Stack
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **Vitest** for testing with jsdom environment
- **ESLint + Prettier** for code quality
- **React Testing Library** for component testing

### Backend Stack  
- **Flask 3.1.1** with SQLAlchemy
- **JWT authentication** with bcrypt password hashing
- **pytest** with Flask test client
- **Swagger/Flasgger** for API documentation
- **SQLite** database (development)

### Testing Strategy
- **Frontend**: 218 tests covering components, services, utils
- **Backend**: 153 tests covering auth, API, security, ChordPro
- **Integration**: 6 tests for API endpoint integration  
- **E2E**: Playwright tests for complete user workflows

## Common Commands Reference

### Quick Commands (Frequent Usage)
```bash
# Start development (run in separate terminals)
npm run dev:backend    # Port 5000
npm run dev:frontend   # Port 5173

# Test commands  
npm run test:all                    # Run all tests (45 seconds)
npm run test:frontend:run           # Frontend only (8 seconds)
npm run test:backend               # Backend only (31 seconds)

# Build commands
cd frontend && npx vite build      # Frontend build (2 seconds)

# Code quality
npm run lint:frontend              # ESLint check
npm run format:frontend            # Prettier format
```

### Environment Setup
```bash
# Backend configuration for development
cd backend
cp config.template.py config.py
# Edit config.py: set HTTPS_ENFORCED = False
```

### API Endpoints (Validated)
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/register` - User registration  
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/validate-chordpro` - ChordPro validation

## Timing Expectations

**CRITICAL: Use these timeouts in your commands**

| Operation | Expected Time | Timeout Setting |
|-----------|---------------|-----------------|
| npm install (root) | 2 seconds | 30 seconds |
| npm install (frontend) | 15 seconds | 60 seconds |
| pip install (backend) | 30 seconds | 120 seconds |
| Frontend build | 2 seconds | 30 seconds |
| Frontend tests | 8 seconds | 60 seconds |
| Backend tests | 31 seconds | 120 seconds |
| Integration tests | 2 seconds | 30 seconds |
| Server startup | 5 seconds | 30 seconds |

## Troubleshooting

### Common Development Issues

1. **Port conflicts**: Frontend (5173) or Backend (5000) ports in use
   ```bash
   # Kill processes on ports
   lsof -ti:5173 | xargs kill -9
   lsof -ti:5000 | xargs kill -9
   ```

2. **HTTPS redirect issues**: Backend redirects to HTTPS
   ```bash
   # Solution: Edit backend/config.py
   HTTPS_ENFORCED = False
   ```

3. **Build failures**: TypeScript errors in npm run build
   ```bash
   # Solution: Use Vite directly
   cd frontend && npx vite build
   ```

4. **Test failures**: Some backend tests expected to fail
   ```bash
   # Expected: 6 failed, 147 passed - do not fix these
   ```

### Performance Notes
- Frontend hot reload is instant
- Backend auto-restart in debug mode  
- Database is in-memory SQLite for tests
- All builds and tests complete under 2 minutes total

## Final Validation Steps

**CRITICAL: Always run these before committing:**

1. **Build validation**: `cd frontend && npx vite build`
2. **Test validation**: `npm run test:all` 
3. **Lint validation**: `npm run lint:frontend`
4. **Manual validation**: Test login/registration flow in browser
5. **API validation**: `curl http://localhost:5000/api/v1/health`

**Success criteria**: All commands complete without blocking errors, servers start successfully, and user workflows function in browser.

## Critical Completion Rules

**MANDATORY: Never finish work or mark tasks complete while tests are failing.**

When working on any part of the codebase:

1. **Frontend work**: ALL frontend tests MUST pass before completing work
   - Run `npm run test:frontend:run` to verify
   - Fix any failing tests before moving to next task
   - Zero test failures are required for Netlify deployment

2. **Backend work**: Backend tests MUST pass (6 known failures are acceptable)
   - Run `npm run test:backend` to verify
   - Target: 147+ passing tests, 6 known failures maximum
   - Any new failures beyond the 6 known failures must be fixed

3. **Integration work**: All integration tests MUST pass
   - Run `npm run test:integration` to verify
   - Zero test failures are required

4. **Full verification**: Before completing any task, run full test suite
   - Run `npm run test:all` for comprehensive validation
   - All test categories must meet their success criteria above

**Enforcement**: If any tests are failing beyond known acceptable failures:
- Do NOT mark work as complete
- Do NOT close issues or mark milestones as done
- Fix failing tests first, then continue with remaining work
- Report test failures clearly in progress updates

**Exception**: Only the 6 known backend test failures are acceptable. Any other test failures must be resolved before work completion.

## Documentation Standards and Requirements

**CRITICAL: All documentation MUST be created in both English and Spanish with proper Jekyll frontmatter.**

### Bilingual Documentation Requirements

When creating or modifying ANY documentation file, you MUST:

1. **Create both language versions:**
   - English: `filename.md`
   - Spanish: `filename-es.md`

2. **Use proper Jekyll frontmatter in ALL documentation files:**
   ```yaml
   ---
   layout: default
   lang: en  # or "es" for Spanish
   title: Your Document Title
   ---
   ```

3. **Include cross-language navigation links:**
   - English files: Add `**Cambiar idioma:** **English** | [Español](filename-es.md)` at bottom
   - Spanish files: Add `**Cambiar idioma:** [English](filename.md) | **Español**` at bottom

### Documentation Creation Workflow

**MANDATORY: Follow this exact process for ALL documentation changes:**

1. **Create English version first:**
   ```bash
   # Create new English documentation
   touch docs/your-feature.md
   ```

2. **Use this frontmatter template:**
   ```yaml
   ---
   layout: default
   lang: en
   title: Your Feature Documentation
   ---
   
   # Your Feature Documentation
   
   Your content here...
   
   ---
   
   **Cambiar idioma:** **English** | [Español](your-feature-es.md)
   ```

3. **Create Spanish version immediately:**
   ```bash
   # Create corresponding Spanish documentation
   touch docs/your-feature-es.md
   ```

4. **Use this Spanish frontmatter template:**
   ```yaml
   ---
   layout: default
   lang: es
   title: Documentación de Tu Funcionalidad
   ---
   
   # Documentación de Tu Funcionalidad
   
   Tu contenido aquí...
   
   ---
   
   **Cambiar idioma:** [English](your-feature.md) | **Español**
   ```

### Documentation Quality Validation

**CRITICAL: ALWAYS run these validation commands before committing:**

```bash
# Validate documentation structure and frontmatter
scripts/validate-docs.sh

# Validate all internal and external links
scripts/validate-links.sh

# Expected results:
# - All files have valid Jekyll frontmatter
# - All English files have corresponding Spanish versions
# - All cross-language links work correctly
# - No broken internal links (external link failures are warnings only)
```

**Link Validation Behavior:**
- **Internal link failures**: Will cause deployment to fail (exit code 1)
- **External link failures**: Will show warnings but NOT fail deployment (exit code 0)
- **Missing critical files**: Will cause deployment to fail (exit code 1)

This approach ensures documentation deployments aren't blocked by temporary external service outages while maintaining internal documentation integrity.

### Content Guidelines

**English Documentation:**
- Use clear, concise technical English
- Follow standard technical writing conventions
- Use sentence case for headings and labels
- Include code examples with proper syntax highlighting

**Spanish Documentation:**
- Use formal "usted" form for user-facing content
- Follow Spanish technical writing conventions
- Maintain consistent terminology across all Spanish docs
- Translate technical concepts appropriately (not literal translations)

### File Organization

**Documentation Location:** All documentation MUST go in `/docs/` directory

**File Naming Convention:**
- English: `feature-name.md` (lowercase, hyphen-separated)
- Spanish: `feature-name-es.md` (same name + `-es` suffix)

**Required Documentation Types:**
- User guides: How end-users interact with features
- Developer guides: Technical implementation details
- API documentation: Endpoint and integration details
- Troubleshooting: Common issues and solutions

### Cross-Language Linking Standards

**Internal Links:**
- English docs should link to English versions: `[User Guide](user-guide.md)`
- Spanish docs should link to Spanish versions: `[Guía del Usuario](user-guide-es.md)`
- Cross-language switcher links both versions

**External Links:**
- Use the same external URLs in both language versions
- Prefer English documentation for external technical resources
- Include Spanish resources when available and authoritative

### Jekyll Integration Requirements

**Frontmatter Fields (Required):**
- `layout: default` - Uses the default Jekyll layout
- `lang: en` or `lang: es` - Language identifier for proper rendering
- `title: Document Title` - Page title for SEO and navigation

**Jekyll Configuration:**
- All markdown files are automatically processed by Jekyll
- Language-specific navigation is configured in `_config.yml`
- Cross-language functionality is handled by Jekyll themes

### Validation Error Resolution

**Common Issues and Fixes:**

1. **Missing Spanish Translation:**
   ```bash
   # Error: "Missing Spanish version: filename-es.md"
   # Fix: Create the Spanish version
   cp docs/filename.md docs/filename-es.md
   # Then translate content and update frontmatter lang to "es"
   ```

2. **Invalid Frontmatter:**
   ```bash
   # Error: "Missing front matter"
   # Fix: Add proper frontmatter at the top of file
   ---
   layout: default
   lang: en
   title: Your Title
   ---
   ```

3. **Broken Cross-Language Links:**
   ```bash
   # Error: Link validation fails
   # Fix: Ensure both language versions exist and links are correct
   ```

### Documentation PR Checklist

**MANDATORY: Every PR with documentation changes MUST:**

- [ ] Include both English and Spanish versions of all new/modified docs
- [ ] Have proper Jekyll frontmatter in all markdown files
- [ ] Include cross-language navigation links
- [ ] Pass `scripts/validate-docs.sh` without errors
- [ ] Pass `scripts/validate-links.sh` with no broken internal links
- [ ] Follow established file naming conventions
- [ ] Include appropriate content for both technical and user audiences
- [ ] Maintain consistency with existing documentation style

### Testing Documentation Changes

**Local Jekyll Testing (Optional but Recommended):**
```bash
cd docs
bundle install  # First time only
bundle exec jekyll serve --host 0.0.0.0 --port 4000
# View at http://localhost:4000 to test Jekyll rendering
```

**Validation Commands (MANDATORY):**
```bash
# Run both validation scripts before committing
scripts/validate-docs.sh && scripts/validate-links.sh

# Expected output: All checks passed with warnings for external links only
```

**Important Notes:**
- Documentation validation (`validate-docs.sh`) must pass completely (exit code 0)
- Link validation (`validate-links.sh`) will pass if only external links fail (exit code 0)  
- Internal link failures will cause link validation to fail (exit code 1)
- External link failures show as warnings but don't block deployment

**Manual Testing Checklist:**
- [ ] Both language versions render correctly
- [ ] Cross-language links work in both directions  
- [ ] All internal links resolve correctly
- [ ] Content is accurate and complete in both languages
- [ ] Code examples work as documented

## API Documentation Deployment Troubleshooting

**CRITICAL: Common API documentation deployment issues and solutions:**

### Issue: Documentation Validation Errors
When API documentation deployment fails due to validation errors, follow these steps:

1. **Run validation script locally:**
   ```bash
   cd /path/to/repo
   scripts/validate-docs.sh
   ```

2. **Common validation errors and fixes:**

   **Missing Spanish Translation:**
   - Error: `Missing Spanish version: filename-es.md`
   - Fix: Create Spanish translation following bilingual documentation requirements
   - Template: Copy English file, translate content, update frontmatter with `lang: es`

   **Missing Jekyll Frontmatter:**
   - Error: `Missing front matter`
   - Fix: Add proper frontmatter to all markdown files:
     ```yaml
     ---
     layout: default
     lang: en  # or "es" for Spanish
     title: Your Document Title
     ---
     ```

   **Jekyll Build Test Failure:**
   - Error: `Jekyll build: Failed` or `Bundle not available`
   - Root cause: Ruby/bundle dependencies not installed in environment
   - GitHub Actions solution: This is handled automatically in deploy workflows
   - Local fix (if needed): Install Ruby dependencies:
     ```bash
     sudo apt-get install ruby-dev ruby-bundler
     cd docs && bundle install --user-install
     ```

3. **Validation success criteria:**
   - All markdown files have valid Jekyll frontmatter
   - All English files have corresponding Spanish translations
   - Cross-language navigation links are present
   - Jekyll build test passes (or shows expected warnings about missing Ruby)

### Issue: Link Validation Errors
When link validation fails and blocks deployment:

1. **Run link validation locally:**
   ```bash
   cd /path/to/repo
   scripts/validate-links.sh
   ```

2. **Understanding link validation results:**
   - **Internal link failures**: Broken references to local `.md` files - MUST be fixed
   - **External link failures**: Unreachable external URLs - Shows warnings only
   - **Missing critical files**: Required documentation files missing - MUST be fixed

3. **Common fixes for internal link failures:**
   
   **Broken Internal Links:**
   ```bash
   # Example error: "firebase-integration.md -> ./FIRESTORE_SECURITY_RULES.md (missing)"
   # Fix: Update link to point to existing file
   # Change: [FIRESTORE_SECURITY_RULES.md](./FIRESTORE_SECURITY_RULES.md)
   # To: [Firestore Security Rules](firestore-security-rules.md)
   ```

   **Incorrect Path References:**
   ```bash
   # Example error: "docker-development.md -> docs/developer-guide.md (missing)"
   # Fix: Remove incorrect path prefix
   # Change: [Developer Guide](docs/developer-guide.md)
   # To: [Developer Guide](developer-guide.md)
   ```

4. **Link validation success criteria:**
   - All internal links point to existing files
   - All critical documentation files are present
   - External link failures are acceptable (show as warnings only)

### Issue: Deploy Workflow Failing
When `.github/workflows/deploy-api-docs.yml` or `update-api-docs.yml` fail:

1. **Check workflow logs for specific error**
2. **Common causes:**
   - Documentation validation failures (see above)
   - Backend generate_docs.py script issues
   - GitHub Pages permissions issues
   - Jekyll build failures in CI

3. **Prevention:**
   - Always run `scripts/validate-docs.sh` before committing documentation changes
   - Always run `scripts/validate-links.sh` to check for broken internal links
   - Ensure bilingual documentation requirements are met
   - Test API documentation generation locally before pushing
   - Fix any internal link failures immediately (external link failures are acceptable)

### Issue: API Documentation Generation Fails
When `backend/generate_docs.py` fails:

1. **Prerequisites for API docs generation:**
   ```bash
   cd backend
   cp config.template.py config.py
   # Edit config.py: set HTTPS_ENFORCED = False for development
   pip install -r requirements.txt
   ```

2. **Test generation locally:**
   ```bash
   cd backend
   python generate_docs.py
   ```

3. **Common issues:**
   - Backend dependencies not installed
   - Config file missing or incorrect
   - HTTPS enforcement preventing local testing
   - Flask app initialization errors

### Emergency Resolution Steps
If API documentation deployment is completely broken:

1. **Identify specific error in GitHub Actions logs**
2. **Fix validation issues first:** Run `scripts/validate-docs.sh` and resolve all errors
3. **Test Jekyll build:** Ensure documentation builds properly
4. **Verify workflow permissions:** GitHub Pages deployment requires proper permissions
5. **Rollback if needed:** Revert problematic documentation changes temporarily

**Success Criteria:**
- `scripts/validate-docs.sh` passes with minimal warnings
- GitHub Actions workflows complete successfully
- Documentation deploys to GitHub Pages without errors
- Both English and Spanish versions are accessible