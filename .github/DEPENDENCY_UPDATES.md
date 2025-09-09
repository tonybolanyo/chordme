# Dependency Updates Workflow

This document explains how the dependency updates workflow works and how to resolve common issues.

## How it Works

The `dependency-updates.yml` workflow automatically:
1. Updates frontend npm dependencies 
2. Updates backend Python dependencies using pip-compile
3. Creates pull requests for the changes

## GitHub Actions Permissions Issue

If the workflow fails with "GitHub Actions is not permitted to create or approve pull requests", you have two options:

### Option 1: Create a Personal Access Token (Recommended)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with the following permissions:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
3. Add the token as a repository secret named `PAT_TOKEN`:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `PAT_TOKEN`
   - Value: Your personal access token

### Option 2: Manual PR Creation

If PR creation fails, the workflow will still push the dependency updates to branches:
- Frontend updates: `update-frontend-dependencies` branch
- Backend updates: `update-backend-dependencies` branch

You can manually create PRs from these branches.

## Workflow Schedule

The workflow runs:
- Every Monday at 9 AM UTC (scheduled)
- Manually via workflow dispatch

## Dependencies Updated

### Frontend
- All npm packages to latest compatible versions
- Security vulnerability fixes (high-severity only)

### Backend  
- All Python packages using pip-compile for compatibility
- Dependencies are pinned to specific versions in requirements.txt

## Troubleshooting

### Frontend Issues
- If npm update fails, check for breaking changes in package.json
- Audit fixes are applied only for high-severity vulnerabilities

### Backend Issues
- If pip-compile fails, check for conflicting version requirements
- The workflow creates requirements.in from requirements.txt if it doesn't exist

### Permission Issues
- See the "GitHub Actions Permissions Issue" section above
- The workflow uses `continue-on-error: true` so it won't completely fail

## Manual Testing

To test dependency updates locally:

```bash
# Frontend
cd frontend
npm update
npm audit fix --audit-level=high

# Backend
cd backend
pip install pip-tools
pip-compile --upgrade requirements.in
```