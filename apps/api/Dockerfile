# Pin uv to a specific version — :latest silently upgrades, can bust the
# layer cache unexpectedly, and makes builds non-reproducible.
FROM ghcr.io/astral-sh/uv:0.11.23 AS uv

FROM python:3.14-slim

COPY --from=uv /uv /uvx /bin/

# UV_COMPILE_BYTECODE: pre-compile .py → .pyc at install time; ~20% faster
#   imports on cold start.
# UV_LINK_MODE=copy: required when the uv cache mount and the venv target
#   are on different filesystems (common in Docker).
# UV_PYTHON_DOWNLOADS=0: use the system Python from the base image only.
# UV_NO_DEV=1: skip the [dev] dependency group.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0 \
    UV_NO_DEV=1

WORKDIR /app

# Install dependencies with BuildKit cache mount so packages are not
# re-downloaded from PyPI when the lockfile hasn't changed.
# Bind mounts make the lockfiles available without baking them into the layer.
# --no-install-project: install deps only; source code isn't present yet.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=apps/api/uv.lock,target=uv.lock \
    --mount=type=bind,source=apps/api/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

# Pre-download embedding model into the image layer to avoid cold-start
# timeouts (~130 MB). HF_HOME makes the cache location explicit.
# Call the venv Python directly (not via `uv run`) to avoid uv's implicit
# re-sync, which would otherwise pull in dev dependencies at build time.
ENV HF_HOME=/root/.cache/huggingface
RUN /app/.venv/bin/python -c \
    "from sentence_transformers import SentenceTransformer; \
     SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Copy source last — source-only changes skip the expensive dep + model layers.
COPY apps/api/app ./app
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini .

# `uv run` on Linux calls execvp internally, replacing itself with uvicorn so
# uvicorn becomes PID 1 and receives SIGTERM directly (graceful shutdown).
# Shell form is required for $PORT expansion; `exec` replaces sh with uv first.
CMD ["sh", "-c", "exec uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
