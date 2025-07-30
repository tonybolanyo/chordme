from chordme.api import *
from chordme import app
import os

if __name__ == '__main__':
    # Get configuration from environment variables
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes', 'on')
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    
    # HTTPS configuration for development
    ssl_context = None
    if os.environ.get('FLASK_SSL_DEV', 'False').lower() in ('true', '1', 'yes', 'on'):
        # Enable HTTPS in development using adhoc SSL context
        # This creates a self-signed certificate for development only
        ssl_context = 'adhoc'
        print(f"Starting development server with HTTPS on https://{host}:{port}")
        print("Note: Using self-signed certificate. Browser will show security warning.")
    else:
        print(f"Starting development server on http://{host}:{port}")
    
    # Print HTTPS enforcement status
    with app.app_context():
        from chordme.https_enforcement import is_https_required
        https_status = "enabled" if is_https_required() else "disabled"
        print(f"HTTPS enforcement: {https_status}")
    
    app.run(
        debug=debug_mode, 
        host=host, 
        port=port,
        ssl_context=ssl_context
    )