# Deploy Smartclusive to Render

This guide deploys Smartclusive as two Render services:

1. **`smartclusive-api`** — Python web service running the Flask backend.
2. **`smartclusive-web`** — Static site serving the built React frontend.

The frontend talks to the backend via `VITE_API_URL`.

## Quick deploy (Render Blueprint)

1. Push this repo to GitHub (or GitLab).
2. In the Render dashboard, click **New + → Blueprint** and select this repo.
3. Render reads `render.yaml` and creates:
   - A free PostgreSQL database (`smartclusive-db`).
   - The backend web service.
   - The frontend static site.
4. Once deployed, open the **static site URL** (`smartclusive-web`) to use the app.

> **Note:** If `VITE_API_URL` is not resolved automatically from the backend service, set it manually in the static site environment to the backend service URL (e.g. `https://smartclusive-api.onrender.com`).

## Manual deploy

### 1. Backend web service

Create a new **Web Service** in Render:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Runtime | `Python 3` |
| Build command | `pip install -r requirements.txt && python scripts/generate_lesson_videos.py` |
| Start command | `gunicorn -w 2 -b 0.0.0.0:$PORT app:app` |

Add environment variables:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11` (required — the pinned dependencies do not build on Python 3.14) |
| `SECRET_KEY` | Generate a strong random string |
| `DATABASE_URL` | Use Render PostgreSQL (Internal Database URL) |
| `DETECT_DEMO_FALLBACK` | `1` (set to `0` when a real YOLO model is available) |
| `CORS_ORIGINS` | Your frontend URL, e.g. `https://smartclusive-web.onrender.com` |

Create a **PostgreSQL** database in Render and copy its **Internal Database URL** into `DATABASE_URL`.

The build command also generates placeholder MP4 lesson videos. Replace `backend/static/letters.mp4` and `backend/static/numbers.mp4` with real ASL lesson videos when available.

### 2. Frontend static site

Create a new **Static Site** in Render:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

Add environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | Your backend URL, e.g. `https://smartclusive-api.onrender.com` |

After the first deploy, the static site builds with the backend URL embedded and is served from Render's CDN.

## Single-service deploy (simpler, no CORS needed)

If you prefer one Render service that serves both frontend and backend:

1. Create a **Web Service** with root directory `.` (repo root).
2. Use a Dockerfile or a custom build script that:
   - Installs Node.js and Python dependencies.
   - Runs `cd frontend && npm install && npm run build`.
   - Runs `cd backend && python scripts/generate_lesson_videos.py`.
3. Set `FRONTEND_DIST_DIR=frontend/dist`.
4. Start command: `cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app`.

The backend will then serve the built frontend at `/` and the API at `/api`.

## Health check

Visit `https://<your-backend-url>/health` to confirm the API is running. You should see:

```json
{
  "service": "Smartclusive backend",
  "status": "ok",
  "api": "/api",
  "socketio": "/socket.io"
}
```

## Troubleshooting

### `Failed to build 'Pillow'` or similar build errors

Render may default to Python 3.14, which is too new for the pinned dependencies (`Pillow==10.0.1`, `torch==2.1.0`, etc.). The repo includes `backend/.python-version` (3.11.9), but if Render still picks 3.14, explicitly set the environment variable:

```
PYTHON_VERSION=3.11
```

Then redeploy.

## Production notes

- **Socket.IO:** The frontend currently uses the REST fallback for sign recognition, so WebSocket support is optional. If you want native WebSockets, run gunicorn with a gevent/eventlet worker (add the worker to `requirements.txt`).
- **Object detection:** The default `DETECT_DEMO_FALLBACK=1` returns demo detections so the capture flow works without a heavy YOLO model. Set to `0` and upload `yolov8n.pt` for real detection.
- **ASL model:** To enable real sign recognition, upload `asl_landmark_model.joblib` and `labels.json` to `backend/data/`. Without them, the backend uses deterministic demo templates.
- **Videos:** The build command generates placeholder lesson videos. Replace them in `backend/static/` with real ASL lesson MP4s when available.
