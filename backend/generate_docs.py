#!/usr/bin/env python3
"""
Script to generate API documentation files from Flask app.
This script runs the Flask app temporarily to extract Swagger JSON
and creates documentation files for GitHub Pages.
"""

import os
import sys
import json
import time
import signal
import requests
import subprocess
from pathlib import Path

def wait_for_server(url, timeout=30):
    """Wait for Flask server to be ready."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    return False

def generate_api_docs():
    """Generate API documentation files."""
    print("Starting API documentation generation...")
    
    # Set up paths
    backend_dir = Path(__file__).parent
    root_dir = backend_dir.parent
    docs_dir = root_dir / "docs"
    
    # Create docs directory
    docs_dir.mkdir(exist_ok=True)
    
    # Set environment variables
    env = os.environ.copy()
    env['FLASK_CONFIG'] = 'config'
    env['FLASK_HOST'] = '127.0.0.1'
    env['FLASK_PORT'] = '5555'  # Use different port to avoid conflicts
    
    # Start Flask server in background
    print("Starting Flask server...")
    process = subprocess.Popen(
        [sys.executable, 'run.py'],
        cwd=backend_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    server_url = "http://127.0.0.1:5555"
    
    try:
        # Wait for server to be ready
        if not wait_for_server(f"{server_url}/api/v1/health"):
            print("ERROR: Flask server failed to start")
            return False
        
        print("Flask server is ready, fetching API spec...")
        
        # Fetch Swagger JSON
        response = requests.get(f"{server_url}/apispec.json", timeout=10)
        if response.status_code != 200:
            print(f"ERROR: Failed to fetch API spec: {response.status_code}")
            return False
        
        swagger_json = response.json()
        
        # Save swagger.json
        swagger_file = docs_dir / "swagger.json"
        with open(swagger_file, 'w') as f:
            json.dump(swagger_json, f, indent=2)
        print(f"Generated: {swagger_file}")
        
        # Create index.html for GitHub Pages
        index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChordMe API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
    <style>
        html {{
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }}
        *, *:before, *:after {{
            box-sizing: inherit;
        }}
        body {{
            margin:0;
            background: #fafafa;
        }}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {{
            const ui = SwaggerUIBundle({{
                url: './swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            }});
        }};
    </script>
</body>
</html>"""
        
        index_file = docs_dir / "index.html"
        with open(index_file, 'w') as f:
            f.write(index_html)
        print(f"Generated: {index_file}")
        
        # Create README for docs
        readme_content = f"""---
layout: default
lang: en
title: ChordMe API Documentation
---

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

## Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}
"""
        
        readme_file = docs_dir / "README.md"
        with open(readme_file, 'w') as f:
            f.write(readme_content)
        print(f"Generated: {readme_file}")
        
        print("✅ API documentation generated successfully!")
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False
        
    finally:
        # Stop Flask server
        print("Stopping Flask server...")
        try:
            process.terminate()
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()

if __name__ == "__main__":
    success = generate_api_docs()
    sys.exit(0 if success else 1)