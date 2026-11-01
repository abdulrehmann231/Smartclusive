# Smartclusive backend image.
# Works on Railway (uses $PORT) and Hugging Face Spaces (defaults to 7860, runs as UID 1000).

FROM python:3.11-slim

# System libraries required by opencv / mediapipe (libGL, glib).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (required by Hugging Face Spaces, harmless elsewhere).
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt

COPY . .
RUN python scripts/generate_lesson_videos.py \
    && chown -R user:user /app

USER user

EXPOSE 7860

# Single worker: each gunicorn worker loads its own copy of torch/YOLO/mediapipe.
CMD gunicorn -w 1 --timeout 120 -b 0.0.0.0:${PORT:-7860} app:app
