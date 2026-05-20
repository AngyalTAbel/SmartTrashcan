FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

# Install dependencies into system python
COPY pyproject.toml uv.lock .python-version ./
RUN uv pip install --system paho-mqtt>=2.1.0

# Copy app sources
COPY . .

CMD ["python", "main.py"]