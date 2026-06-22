FROM python:3.14-slim

# Install uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY apps/api/pyproject.toml apps/api/uv.lock ./

# Install production dependencies only
RUN uv sync --frozen --no-dev

# Pre-download embedding model to avoid cold-start timeout (~130 MB, cached in layer)
RUN uv run python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Copy application source
COPY apps/api/app ./app
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini .

CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
