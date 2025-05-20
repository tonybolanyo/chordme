from . import app


@app.route('/api/v1/health', methods=['GET'])
def health():
    """
    Health check endpoint.
    """
    return {
        'status': 'ok',
        'message': 'Service is running'
    }, 200