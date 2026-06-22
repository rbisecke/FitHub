#!/bin/sh
# Pre-download the embedding model at build time so the first /coach request
# doesn't hit a 30-60 second cold-start timeout downloading ~130 MB.
uv run python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"
