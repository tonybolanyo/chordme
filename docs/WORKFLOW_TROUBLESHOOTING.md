# ChordMe Workflow Troubleshooting Guide

This guide provides step-by-step instructions for diagnosing and fixing workflow action errors in the ChordMe repository.

## Quick Diagnosis Checklist

### ✅ Issues Recently Fixed

1. **Frontend Build Errors** - TypeScript syntax errors resolved
2. **ESLint Failures** - Major type safety issues fixed (500+ errors reduced)
3. **Railway Deployment Syntax** - Empty run command fixed

### 🔍 Current Known Issues

1. **Missing Deployment Secrets** - Affects deployment workflows
2. **Backend Test Failures** - Some tests fail but don't block main functionality
3. **Import/Export Warnings** - Non-critical TypeScript module resolution warnings

## Deployment Secrets Configuration

### Required Secrets for GitHub Actions

To enable all deployment workflows, configure these secrets in your repository settings:

**Path:** Repository Settings → Secrets and variables → Actions → Repository secrets

#### Core Deployment Secrets

```yaml
# Railway (Backend Deployment)
RAILWAY_TOKEN: <your-railway-api-token>
RAILWAY_PRODUCTION_PROJECT_ID: <production-project-uuid>
RAILWAY_PRODUCTION_SERVICE_ID: <production-service-uuid>
RAILWAY_STAGING_PROJECT_ID: <staging-project-uuid>
RAILWAY_STAGING_SERVICE_ID: <staging-service-uuid>

# Netlify (Frontend Deployment)
NETLIFY_AUTH_TOKEN: <your-netlify-personal-access-token>
NETLIFY_SITE_ID: <your-netlify-site-id>
NETLIFY_SITE_NAME: <your-netlify-site-name>

# Vercel (Alternative Frontend)
VERCEL_TOKEN: <your-vercel-token>
VERCEL_ORG_ID: <your-vercel-organization-id>
VERCEL_PROJECT_ID: <your-vercel-project-id>

# Render (Alternative Backend)
RENDER_API_KEY: <your-render-api-key>
RENDER_SERVICE_ID: <production-service-id>
RENDER_GREEN_SERVICE_ID: <green-environment-service-id>
```

#### Database Secrets

```yaml
# Supabase (Primary Database)
SUPABASE_PRODUCTION_DATABASE_URL: postgresql://user:pass@host:5432/production_db
SUPABASE_STAGING_DATABASE_URL: postgresql://user:pass@host:5432/staging_db
```

#### Optional Enhancement Secrets

```yaml
# Code Coverage
CODECOV_TOKEN: <codecov-token-for-coverage-reporting>

# DNS & CDN
CLOUDFLARE_API_TOKEN: <cloudflare-api-token>
CLOUDFLARE_ZONE_ID: <dns-zone-identifier>

# Notifications
SLACK_WEBHOOK: <slack-webhook-url>
TEAMS_WEBHOOK: <microsoft-teams-webhook-url>
```

### Getting Secret Values

#### Railway Configuration

1. **Get Railway Token:**
   ```bash
   # Login to Railway
   railway login
   
   # Generate token at: https://railway.app/account/tokens
   # Copy the token value
   ```

2. **Get Project and Service IDs:**
   ```bash
   # List projects
   railway project list
   
   # Connect to project
   railway project connect <project-name>
   
   # Get project info (shows IDs)
   railway project info
   
   # List services
   railway service list
   ```

#### Netlify Configuration

1. **Get Netlify Token:**
   - Visit: https://app.netlify.com/user/applications#personal-access-tokens
   - Generate new access token
   - Copy the token value

2. **Get Site Information:**
   ```bash
   # Using Netlify CLI
   netlify sites:list
   
   # Or check in Netlify dashboard
   # Site settings → General → Site details
   ```

#### Supabase Database URLs

1. **Get Database Connection:**
   - Supabase Dashboard → Settings → Database
   - Copy connection string
   - Format: `postgresql://postgres:[password]@[host]:5432/postgres`

### Workflow-Specific Secrets

#### Security Audit Workflow

No additional secrets required - uses GitHub's built-in security scanning.

#### API Documentation Deployment

Uses `GITHUB_TOKEN` (automatically provided) for GitHub Pages deployment.

## Common Error Solutions

### Frontend CI Failures

**Symptom:** ESLint errors about TypeScript types

**Solution:**
```bash
# Run locally to identify issues
cd frontend
npm run lint

# Fix automatically fixable issues
npm run lint:fix

# Check specific files mentioned in errors
npx eslint src/path/to/file.ts
```

### Backend Test Failures

**Symptom:** Tests fail during CI

**Investigation:**
```bash
# Run tests locally
cd backend
pip install -r requirements.txt
cp config.template.py config.py
FLASK_CONFIG=test_config python -m pytest tests/ -v

# Run specific failing test
python -m pytest tests/test_specific_module.py -v
```

**Common Issues:**
- Missing configuration files
- Database connection issues in test environment
- Dependency version mismatches

### Deployment Workflow Failures

**Symptom:** "Required secrets not configured"

**Solution:**
1. Check which secrets are missing in the workflow logs
2. Add missing secrets to repository settings
3. Verify secret names match exactly (case-sensitive)
4. Re-run the failed workflow

### Build Import/Export Warnings

**Symptom:** TypeScript warnings about missing exports

**Impact:** These are warnings only and don't prevent builds

**Optional Fix:**
- Check if the imported type actually exists in the source file
- Verify the import path is correct
- Add missing exports if needed

## Testing Workflow Fixes

### Local Testing

```bash
# Test frontend build
cd frontend
npm run build

# Test backend
cd backend
cp config.template.py config.py
python -m pytest tests/ -v --tb=short

# Test full suite
npm run test:all
```

### Workflow Testing

1. **Create test branch:**
   ```bash
   git checkout -b test-workflow-fix
   git commit --allow-empty -m "Test workflow"
   git push origin test-workflow-fix
   ```

2. **Monitor workflow results:**
   - Go to GitHub Actions tab
   - Check each workflow execution
   - Review logs for any remaining issues

## Emergency Procedures

### Disable Failing Workflows

If a workflow is consistently failing and blocking development:

1. **Temporary disable:**
   ```yaml
   # Add to workflow file
   on:
     workflow_dispatch: # Only manual triggers
   ```

2. **Skip specific steps:**
   ```yaml
   - name: Potentially failing step
     run: echo "Skipped for now"
     # Old command commented out
     # run: failing-command
   ```

### Quick Rollback

If deployment workflows deploy broken code:

1. **Use emergency rollback workflow:**
   - Go to Actions tab
   - Find "Emergency Rollback" workflow
   - Click "Run workflow"
   - Select previous working commit

2. **Manual rollback:**
   ```bash
   # Identify last working commit
   git log --oneline

   # Create rollback commit
   git revert <bad-commit-hash>
   git push origin main
   ```

## Monitoring and Maintenance

### Regular Health Checks

1. **Weekly review:**
   - Check Actions tab for failed workflows
   - Review security alerts
   - Update dependencies if needed

2. **Monthly maintenance:**
   - Update workflow action versions
   - Review and rotate secrets if needed
   - Test emergency procedures

### Contact Information

For issues not covered in this guide:

1. **Check existing issues:** [GitHub Issues](https://github.com/tonybolanyo/chordme/issues)
2. **Create new issue:** Use the bug report template
3. **Emergency contact:** Check repository README for maintainer contacts

## Success Criteria

After implementing fixes, you should see:

- ✅ Frontend builds complete without errors
- ✅ Major ESLint errors resolved (< 50 remaining)
- ✅ Deployment workflows reach secret configuration step
- ✅ Backend tests run (some known failures are acceptable)
- ✅ No syntax errors in workflow YAML files

Remember: Some warnings and non-critical test failures are normal and don't prevent the application from functioning properly.