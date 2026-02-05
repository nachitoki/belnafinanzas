FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app
COPY scripts ./scripts

# Expose port (Cloud Run uses PORT env var)
ENV PORT=8080

# Run with uvicorn
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
