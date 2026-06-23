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
ENV HF_HOME=/root/.cache/huggingface
RUN uv run python -c \
    "from sentence_transformers import SentenceTransformer; \
     SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Copy source last — source-only changes only invalidate this layer and below,
# leaving the expensive dep and model layers cached.
COPY apps/api/app ./app
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini .

# `uv run` on Linux calls execvp internally, replacing itself with uvicorn so
# uvicorn becomes PID 1 and receives SIGTERM directly (graceful shutdown).
# `exec` replaces sh with uv first; shell form is required for $PORT expansion.
CMD ["sh", "-c", "exec uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
