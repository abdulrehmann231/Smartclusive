import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO

from smartclusive.config import Config, STATIC_DIR
from smartclusive.models import db
from smartclusive.routes import api_bp

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def _frontend_dist_dir() -> str | None:
    """Return the built frontend dist directory if it exists, else None."""
    # Allow explicit override; default to ../frontend/dist relative to this file.
    override = os.environ.get("FRONTEND_DIST_DIR")
    if override:
        return override if os.path.isdir(override) else None
    default = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    )
    return default if os.path.isdir(default) else None


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(
        __name__,
        static_folder=STATIC_DIR,
        static_url_path="/mock",
    )
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    origins = app.config.get("CORS_ORIGINS", "*")
    if origins == "*":
        # Reflect the request origin so credentials (auth headers / cookies) work
        # while still allowing any frontend origin. A wildcard with credentials is
        # rejected by browsers, so we match every origin explicitly.
        CORS(app, supports_credentials=True, origins=r".*")
    else:
        CORS(app, origins=[o.strip() for o in origins.split(",") if o.strip()], supports_credentials=True)

    @app.after_request
    def ensure_cors_credentials(response):
        # Flask-CORS with a regex reflects the origin; make sure the credentials
        # header stays enabled for the reflected origin.
        if response.headers.get("Access-Control-Allow-Origin"):
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    db.init_app(app)

    @app.route("/health")
    def health():
        return jsonify(
            {
                "service": "Smartclusive backend",
                "status": "ok",
                "api": "/api",
                "socketio": "/socket.io",
            }
        )

    app.register_blueprint(api_bp, url_prefix="/api")

    # In production (or when FRONTEND_DIST_DIR is set), serve the built React app.
    dist_dir = _frontend_dist_dir()
    if dist_dir:

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path: str):
            # API and mock static routes are handled by Flask's blueprint/static_url_path,
            # so this catch-all only fires for missing non-API paths.
            file_path = os.path.join(dist_dir, path)
            if path and os.path.isfile(file_path):
                return send_from_directory(dist_dir, path)
            return send_from_directory(dist_dir, "index.html")

    return app


def create_socketio_app() -> Flask:
    # Delayed import so the plain HTTP app can run without the Socket.IO layer.
    from smartclusive.socket_events import register_socket

    app = create_app()
    socketio.init_app(app)
    register_socket(socketio)
    with app.app_context():
        db.create_all()
    return app


# Gunicorn entry point.
app = create_socketio_app()

if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        allow_unsafe_werkzeug=True,
    )
