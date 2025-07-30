#!/usr/bin/env python3
"""
Comprehensive test for API documentation coverage.
Verifies that all important endpoints are documented in Swagger.
"""

import json
from pathlib import Path

def test_api_coverage():
    """Test that all important API endpoints are documented."""
    print("Testing API documentation coverage...")
    
    docs_dir = Path(__file__).parent.parent / "docs"
    swagger_file = docs_dir / "swagger.json"
    
    if not swagger_file.exists():
        print("❌ swagger.json not found")
        return False
    
    with open(swagger_file) as f:
        swagger_data = json.load(f)
    
    paths = swagger_data.get('paths', {})
    
    # Define expected endpoints
    expected_endpoints = [
        # System endpoints
        ('/health', ['get']),
        ('/csrf-token', ['get']),
        
        # Authentication endpoints
        ('/auth/register', ['post']),
        ('/auth/login', ['post']),
        
        # Song management endpoints
        ('/songs', ['get', 'post']),
        ('/songs/{song_id}', ['get', 'put', 'delete']),
        ('/songs/{song_id}/download', ['get']),
        ('/songs/validate-chordpro', ['post']),
    ]
    
    missing_endpoints = []
    incomplete_endpoints = []
    
    for endpoint, methods in expected_endpoints:
        # Handle path parameters in Swagger format
        swagger_endpoint = endpoint.replace('{song_id}', '{song_id}')
        
        if swagger_endpoint not in paths:
            missing_endpoints.append(endpoint)
            continue
        
        endpoint_data = paths[swagger_endpoint]
        
        for method in methods:
            if method not in endpoint_data:
                incomplete_endpoints.append(f"{endpoint} {method.upper()}")
                continue
            
            method_data = endpoint_data[method]
            
            # Check for essential documentation elements
            if 'summary' not in method_data:
                incomplete_endpoints.append(f"{endpoint} {method.upper()} (missing summary)")
            
            if 'description' not in method_data:
                incomplete_endpoints.append(f"{endpoint} {method.upper()} (missing description)")
            
            if 'responses' not in method_data:
                incomplete_endpoints.append(f"{endpoint} {method.upper()} (missing responses)")
            
            if 'tags' not in method_data:
                incomplete_endpoints.append(f"{endpoint} {method.upper()} (missing tags)")
    
    # Check definitions
    definitions = swagger_data.get('definitions', {})
    expected_definitions = ['User', 'Song', 'Error', 'Success']
    missing_definitions = [d for d in expected_definitions if d not in definitions]
    
    # Report results
    success = True
    
    if missing_endpoints:
        print(f"❌ Missing endpoints: {missing_endpoints}")
        success = False
    
    if incomplete_endpoints:
        print(f"❌ Incomplete documentation: {incomplete_endpoints}")
        success = False
    
    if missing_definitions:
        print(f"❌ Missing definitions: {missing_definitions}")
        success = False
    
    if success:
        print("✅ All expected endpoints are documented")
        print(f"✅ Found {len(paths)} documented endpoints")
        print(f"✅ Found {len(definitions)} data definitions")
        
        # Show endpoint coverage
        print("\n📋 Documented endpoints:")
        for path, methods in paths.items():
            method_list = list(methods.keys())
            print(f"  {path}: {', '.join(method_list).upper()}")
        
        print("\n📋 Data definitions:")
        for def_name in definitions.keys():
            print(f"  {def_name}")
    
    return success

if __name__ == "__main__":
    import sys
    success = test_api_coverage()
    sys.exit(0 if success else 1)