FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY *.py ./

# Create directories for logs and results
RUN mkdir -p /app/logs /results

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV RESULTS_DIR="/results"
ENV MAX_REQUESTS=10
ENV WINDOW_MINUTES=60

# Keep container running for MCP connections
CMD ["tail", "-f", "/dev/null"]