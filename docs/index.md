---
layout: default
lang: en
title: ChordMe Documentation Site
---

# ChordMe Documentation Site

This directory contains the comprehensive user manual for ChordMe, automatically generated and deployed to GitHub Pages.

## Documentation Structure

### User Documentation
- **[Getting Started](getting-started.html)** - Installation and setup guide
- **[User Guide](user-guide.html)** - Complete feature documentation
- **[ChordPro Format](chordpro-format.html)** - ChordPro format reference
- **[Troubleshooting](troubleshooting.html)** - Common issues and solutions

### Developer Documentation
- **[Developer Guide](developer-guide.html)** - Contributing and development
- **[API Reference](api-reference.html)** - Complete API documentation
- **[API Documentation](api-documentation.html)** - Implementation details
- **[Testing Guide](testing.html)** - Testing setup and guidelines
- **[Backend Testing](backend-testing.html)** - Backend automated testing documentation
- **[ChordPro Support](chordpro-support.html)** - ChordPro format implementation details

### Infrastructure & Deployment
- **[Infrastructure Guide](infrastructure.html)** - Cloud deployment with Terraform/CloudFormation
- **[Deployment Guide](deployment.html)** - Deployment strategies and automation
- **[Netlify Railway Supabase](deployment-netlify-railway-supabase.html)** - Recommended deployment stack

### Security & Compliance
- **[Security Checklist](security-checklist.html)** - Security guidelines and best practices
- **[Threat Model](threat-model.html)** - Security threat analysis
- **[Final Security Audit](final-security-audit-report.html)** - Security audit results
- **[Backend Security Summary](backend-security-summary.html)** - Backend security enhancements overview
- **[Password Security](password-security.html)** - Secure password storage implementation
- **[Security Improvements](security-improvements.html)** - Login and registration security improvements
- **[HTTPS Enforcement](https-enforcement.html)** - HTTPS enforcement documentation
- **[Backend Security Audit](backend-security-audit.html)** - Backend security audit report

### Collaboration Features
- **[Collaborative Editing Architecture](collaborative-editing-architecture.html)** - Real-time collaboration technical details
- **[Firebase Integration](firebase-integration.html)** - Firebase setup and configuration
- **[Google OAuth Integration](google-oauth-integration.html)** - Authentication setup

### Testing & Quality Assurance
- **[Test Coverage Report](collaboration-test-coverage-report.html)** - Collaboration testing metrics
- **[CodeCov Integration](codecov.html)** - Code coverage analysis

### Project Information
- **[Changelog](changelog.html)** - Version history and release notes
- **[Workflows Documentation](workflows-documentation.html)** - CI/CD pipeline documentation
- **[Swagger API Documentation](swagger.html)** - Interactive API documentation

## GitHub Pages Configuration

This documentation is automatically deployed to GitHub Pages using Jekyll.

### Theme

The documentation uses a clean, professional theme optimized for technical documentation.

### Automatic Updates

Documentation is automatically updated when:
- New tags are created (releases)
- Changes are pushed to the main branch
- Manual workflow dispatch

### Custom Domain

The documentation is available at: `https://tonybolanyo.github.io/chordme/`

## Contributing to Documentation

To improve the documentation:

1. Edit the markdown files in the `docs/` directory
2. Test locally using Jekyll: `bundle exec jekyll serve`
3. Submit a pull request with your changes
4. Documentation will be automatically deployed after merge

## Local Development

To run the documentation site locally:

```bash
# Install dependencies
gem install bundler jekyll
bundle install

# Serve locally
bundle exec jekyll serve

# Open http://localhost:4000
```

---

*This documentation is automatically maintained and updated with each release of ChordMe.*