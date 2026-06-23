# Pin uv to a specific version — :latest silently upgrades, can bust the
# layer cache unexpectedly, and makes builds non-reproducible.
FROM ghcr.io/astral-sh/uv:0.11.23 AS uv

FROM python:3.14-slim

COPY --from=uv /uv /uvx /bin/

# UV_COMPILE_BYTECODE: pre-compile .py → .pyc at install time; faster imports.
# UV_LINK_MODE=copy: prevents hard-link failures across filesystems in Docker.
# UV_PYTHON_DOWNLOADS=0: use the system Python from the base image only.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Copy lockfiles explicitly so their content is part of Docker's layer cache
# key — when uv.lock changes, this layer and everything below it rebuilds.
COPY apps/api/pyproject.toml apps/api/uv.lock ./

# Install production dependencies. This layer is cached until uv.lock changes.
RUN uv sync --frozen --no-dev

# Pre-download embedding model into the image layer to avoid cold-start
# timeouts (~130 MB). HF_HOME makes the cache location explicit.
# Use the venv python directly — uv run would trigger a dev-dep sync here.
ENV HF_HOME=/root/.cache/huggingface
RUN .venv/bin/python -c \
    "from sentence_transformers import SentenceTransformer; \
     SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Copy source last — source-only changes only invalidate this layer and below,
# leaving the expensive dep and model layers cached.
COPY apps/api/app ./app
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini .

# Use the venv's uvicorn directly so there is no uv-run sync step at container
# startup — sync overhead causes Railway's health-check to time out and marks
# the deploy as failed even though the container recovers.
# PYTHONPATH=/app makes `app.main` importable (equivalent to what uv run adds).
# exec replaces sh so uvicorn is PID 1 and receives SIGTERM for graceful shutdown.
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
