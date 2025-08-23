# ChordMe API Documentation

This directory contains the auto-generated API documentation for ChordMe.

## Files

- `swagger.json` - OpenAPI/Swagger specification
- `index.html` - Swagger UI interface

## Viewing Documentation

You can view the API documentation at: https://tonybolanyo.github.io/chordme/

## API Overview

ChordMe is a ChordPro song management application that provides:

- **Authentication**: User registration and login with JWT tokens
- **Song Management**: Create, read, update, and delete ChordPro songs
- **File Operations**: Upload/download songs as ChordPro files
- **Validation**: ChordPro content validation and analysis

## API Base URL

- Development: `http://localhost:5000/api/v1`
- Production: `https://your-domain.com/api/v1`

## Authentication

Most endpoints require authentication using JWT tokens:

```
Authorization: Bearer <your-jwt-token>
```

Get a token by registering and logging in through the `/auth/register` and `/auth/login` endpoints.

## Generated: 2025-08-23 19:49:31 UTC
