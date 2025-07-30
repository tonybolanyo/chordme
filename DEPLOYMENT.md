# ChordMe Deployment Guide

This document provides comprehensive instructions for deploying the ChordMe application using automated and manual deployment methods.

## Overview

ChordMe consists of two main components:
- **Frontend**: React application built with Vite
- **Backend**: Flask API server

The deployment setup supports:
- ✅ Automated deployment via GitHub Actions on tag creation
- ✅ Manual deployment using release artifacts
- ✅ Render.com for backend hosting
- ✅ Vercel for frontend hosting

## Automated Deployment

### Prerequisites

1. **GitHub Repository Secrets**: Configure these secrets in your repository settings:
   - `RENDER_API_KEY`: Your Render API key
   - `RENDER_SERVICE_ID`: Your Render service ID
   - `VERCEL_TOKEN`: Your Vercel deployment token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

### Creating a Release

1. **Sync versions** (optional, but recommended):
   ```bash
   ./scripts/sync-version.sh 1.0.1
   git add .
   git commit -m "chore: bump version to 1.0.1"
   ```

2. **Create and push a tag**:
   ```bash
   git tag v1.0.1
   git push origin main --tags
   ```

3. **The GitHub Action will automatically**:
   - ✅ Update all package versions
   - ✅ Build frontend and backend
   - ✅ Deploy to Render (backend) and Vercel (frontend)
   - ✅ Create a GitHub release with deployment artifacts

### Manual Release Trigger

You can also trigger a release manually from GitHub Actions:

1. Go to your repository → Actions → "Release and Deploy"
2. Click "Run workflow"
3. Enter the tag name (e.g., `v1.0.1`)
4. Click "Run workflow"

## Manual Deployment

### Download Release Artifacts

1. Go to your repository's Releases page
2. Download the `chordme-X.X.X.zip` file
3. Extract the archive

### Backend Deployment (Render)

1. **Create a new Web Service on Render**:
   - Connect your GitHub repository
   - Set the root directory to `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `python run.py`

2. **Environment Variables**:
   ```
   SECRET_KEY=your-secret-key-here
   JWT_SECRET_KEY=your-jwt-secret-key-here
   DATABASE_URL=your-database-url-here
   FLASK_ENV=production
   ```

3. **Database Setup**:
   - Add a PostgreSQL database to your Render service
   - The DATABASE_URL will be automatically set

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy from the frontend directory**:
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Environment Variables**:
   - Set `VITE_API_URL` to your backend URL (e.g., `https://your-app.onrender.com`)

### Alternative Hosting Options

#### Backend Alternatives
- **Railway**: Similar to Render, supports the same configuration
- **Heroku**: Add a `Procfile` with `web: cd backend && python run.py`
- **DigitalOcean App Platform**: Use the provided `render.yaml` as reference

#### Frontend Alternatives
- **Netlify**: Drag and drop the `frontend/dist` folder
- **GitHub Pages**: Deploy the built files to `gh-pages` branch
- **AWS S3 + CloudFront**: Upload the `frontend/dist` folder

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Flask secret key for sessions | Yes | - |
| `JWT_SECRET_KEY` | JWT token signing key | Yes | - |
| `DATABASE_URL` | Database connection string | Yes | `sqlite:///chordme.db` |
| `FLASK_ENV` | Flask environment | No | `production` |
| `FLASK_CONFIG` | Configuration module name | No | `config` |

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API base URL | Yes | - |

## Version Management

The project maintains version synchronization across:
- Root `package.json`
- Frontend `package.json`
- Backend `version.py`

### Manual Version Update

Use the provided script:
```bash
./scripts/sync-version.sh 1.2.0
```

Or update manually:
1. Update root `package.json` version
2. Update `frontend/package.json` version
3. Update `backend/chordme/version.py` version

## Health Checks

### Backend
- Health endpoint: `GET /api/v1/health`
- Version endpoint: `GET /api/v1/version`

### Frontend
- Access the application in your browser
- Check browser console for errors

## Troubleshooting

### Common Issues

1. **Build failures**:
   - Check Node.js and Python versions
   - Verify all dependencies are listed in package.json/requirements.txt

2. **Deployment failures**:
   - Verify environment variables are set correctly
   - Check service logs in your hosting platform

3. **CORS issues**:
   - Ensure frontend `VITE_API_URL` points to the correct backend URL
   - Check backend CORS configuration

### Getting Help

1. Check the GitHub Actions logs for automated deployment issues
2. Review the hosting platform logs (Render/Vercel)
3. Verify environment variables match the requirements
4. Test the health endpoints to ensure services are running

## Security Considerations

- All secrets are managed through GitHub Secrets or hosting platform environment variables
- HTTPS is enforced for production deployments
- Security headers are automatically applied
- Database credentials are managed by the hosting platform

## Rollback Strategy

1. **Automated**: Create a new tag pointing to a previous commit
2. **Manual**: 
   - Render: Deploy from a previous commit in the dashboard
   - Vercel: Promote a previous deployment in the dashboard

## Monitoring

- **Backend**: Monitor via Render dashboard or application logs
- **Frontend**: Monitor via Vercel analytics or browser dev tools
- **Health checks**: Use the `/api/v1/health` endpoint for monitoring

---

For questions or issues with deployment, please check the repository's issues page or create a new issue.