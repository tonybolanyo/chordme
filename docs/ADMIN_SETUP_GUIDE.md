---
layout: default
lang: en
title: Admin Quick Setup Guide - Workflow Secrets
---

# Admin Quick Setup Guide - Workflow Secrets

## Essential Secrets to Configure

**Add these in GitHub Repository Settings → Secrets and variables → Actions:**

### 🚂 Railway (Backend Hosting)
```
RAILWAY_TOKEN=your_railway_api_token
RAILWAY_PRODUCTION_PROJECT_ID=project_uuid
RAILWAY_PRODUCTION_SERVICE_ID=service_uuid
RAILWAY_STAGING_PROJECT_ID=staging_project_uuid
RAILWAY_STAGING_SERVICE_ID=staging_service_uuid
```

**How to get these:**
1. Go to https://railway.app/account/tokens
2. Create new token → Copy value
3. In Railway dashboard: Settings → show project/service IDs

### 🌐 Netlify (Frontend Hosting)
```
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=site_id_string
NETLIFY_SITE_NAME=your_site_name
```

**How to get these:**
1. Netlify dashboard → User settings → Applications → New access token
2. Site settings → General → Site details (for Site ID)

### 🗄️ Database
```
SUPABASE_PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_STAGING_DATABASE_URL=postgresql://user:pass@host:5432/staging_db
```

**How to get these:**
1. Supabase dashboard → Settings → Database
2. Copy connection string

## Optional but Recommended

### 📊 Code Coverage
```
CODECOV_TOKEN=codecov_upload_token
```

## Testing Your Setup

1. **After adding secrets, trigger a workflow:**
   - Go to Actions tab
   - Select "Deploy to Railway" or "Deploy to Netlify"
   - Click "Run workflow"

2. **Check for success:**
   - Green checkmarks = working
   - Red X = check logs for missing secrets

## Common Issues

- **Secret names must match exactly** (case-sensitive)
- **No spaces in secret values**
- **Database URLs must include password**
- **Tokens must have correct permissions**

## Need Help?

- Check full guide: `docs/WORKFLOW_TROUBLESHOOTING.md`
- Create GitHub issue with "workflow" label
- Check Actions tab logs for specific error messages