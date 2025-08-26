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

## Infrastructure as Code

ChordMe includes comprehensive infrastructure templates for cloud deployment:

### AWS Infrastructure (Terraform)

Deploy to AWS using Terraform for full infrastructure automation:

```bash
cd infrastructure/terraform/aws

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=production" \
               -var="db_password=YOUR_DB_PASSWORD" \
               -var="jwt_secret_key=YOUR_JWT_SECRET" \
               -var="flask_secret_key=YOUR_FLASK_SECRET" \
               -var="frontend_bucket_name=your-unique-bucket-name"

# Apply infrastructure
terraform apply
```

**Features:**
- **ECS Fargate**: Containerized backend with auto-scaling
- **RDS PostgreSQL**: Managed database with backups
- **S3 + CloudFront**: Static frontend hosting with CDN
- **Application Load Balancer**: High availability and SSL termination
- **VPC**: Secure network architecture with public/private subnets
- **Monitoring**: CloudWatch dashboards and alarms
- **Security**: IAM roles, security groups, and encryption

### AWS Infrastructure (CloudFormation)

Alternative CloudFormation template for AWS deployments:

```bash
cd infrastructure/cloudformation

# Deploy the stack
aws cloudformation create-stack \
  --stack-name chordme-production \
  --template-body file://chordme-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
               ParameterKey=DbPassword,ParameterValue=YOUR_DB_PASSWORD \
  --capabilities CAPABILITY_IAM
```

### Current Platform Configuration

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

### Automated Rollback (Recommended)

ChordMe now supports automated rollback procedures with multiple strategies:

#### 1. Emergency Rollback Workflow
For immediate rollback to a known good version:

```bash
# Trigger emergency rollback via GitHub Actions
# Go to Actions → "Emergency Rollback" → "Run workflow"
# Or use GitHub CLI:
gh workflow run emergency-rollback.yml \
  -f environment=production \
  -f rollback_to_tag=v1.0.0 \
  -f reason="Critical bug in payment processing"
```

#### 2. Blue-Green Deployment Rollback
Automatic rollback during blue-green deployments when validation fails:

- Deployment validation failure triggers automatic rollback
- Traffic is switched back to the previous (blue) environment
- Rollback is logged and stakeholders are notified

### Manual Rollback Procedures

#### 1. Platform-Specific Rollback

**Render (Backend):**
```bash
# Via Render API
curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
  -d '{"commitId": "PREVIOUS_COMMIT_SHA"}'

# Via Dashboard
# 1. Go to your service dashboard
# 2. Click "Deploy" → "Deploy previous commit"
# 3. Select the commit to rollback to
```

**Vercel (Frontend):**
```bash
# Via Vercel CLI
vercel --prod --token $VERCEL_TOKEN

# Via Dashboard
# 1. Go to your project dashboard
# 2. Find the previous deployment
# 3. Click "Promote to Production"
```

#### 2. Git-Based Rollback
```bash
# Create a rollback tag
git tag v1.0.1-rollback
git push origin main --tags

# This triggers the standard release workflow
```

## Monitoring

### Comprehensive Monitoring Stack

ChordMe includes comprehensive monitoring and observability:

#### Application Monitoring
- **Backend Health**: `/api/v1/health` endpoint with detailed status
- **Version Tracking**: `/api/v1/version` endpoint for deployment verification
- **Performance Metrics**: Response time, throughput, and error rates
- **Dependency Health**: Database connectivity and external service status

#### Infrastructure Monitoring (AWS)
- **ECS Metrics**: CPU, memory, task count, and service health
- **RDS Monitoring**: Database performance, connections, and query metrics
- **ALB Metrics**: Request count, response times, and error rates
- **CloudFront**: CDN performance and cache hit rates

#### Deployment Monitoring
- **Deployment Tests**: Automated smoke tests post-deployment
- **Integration Tests**: End-to-end validation of critical workflows
- **Performance Validation**: Response time and resource utilization checks
- **Security Scanning**: Automated security header and vulnerability checks

### Alerting and Notifications

#### Alert Channels
- **Slack Integration**: Real-time deployment and system alerts
- **Email Notifications**: Critical system failures and deployment results
- **GitHub Issues**: Automatic issue creation for failed deployments

#### Alert Triggers
- **High Response Times**: > 2 seconds for API endpoints
- **Error Rates**: > 5% error rate for 5 minutes
- **Resource Utilization**: > 80% CPU or memory for 10 minutes
- **Database Issues**: Connection failures or high latency
- **Deployment Failures**: Failed builds, tests, or rollbacks

### Platform-Specific Monitoring

#### Render (Backend)
- **Service Dashboard**: Monitor via Render dashboard or application logs
- **Log Aggregation**: Centralized logging with structured log format
- **Metrics API**: Custom metrics and monitoring integration

#### Vercel (Frontend)
- **Analytics Dashboard**: Monitor via Vercel analytics and performance metrics
- **Function Logs**: Serverless function execution and error tracking
- **Web Vitals**: Core Web Vitals and user experience metrics

### Health Check Endpoints

---

For questions or issues with deployment, please check the repository's issues page or create a new issue.