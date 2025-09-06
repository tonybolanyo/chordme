# Backend Dockerfile for ChordMe
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

# Copy application code
COPY . .

# Copy config template if config.py doesn't exist
RUN if [ ! -f config.py ]; then cp config.template.py config.py; fi

# Expose port
EXPOSE 5000

# Use gunicorn for production-ready server
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]