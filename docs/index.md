---
layout: default
lang: en
title: ChordMe Documentation Site
---

# ChordMe Documentation Site

This directory contains the comprehensive user manual for ChordMe, automatically generated and deployed to GitHub Pages.

## Documentation Structure

- **[User Manual](README.html)** - Main documentation hub
- **[Getting Started](getting-started.html)** - Installation and setup guide
- **[User Guide](user-guide.html)** - Complete feature documentation
- **[ChordPro Format](chordpro-format.html)** - ChordPro format reference
- **[API Reference](api-reference.html)** - Complete API documentation
- **[Developer Guide](developer-guide.html)** - Contributing and development
- **[Troubleshooting](troubleshooting.html)** - Common issues and solutions
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