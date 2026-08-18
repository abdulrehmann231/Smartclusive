from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from smartclusive.config import Config, STATIC_DIR
from smartclusive.models import db
from smartclusive.routes import api_bp

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(
        __name__,
        static_folder=STATIC_DIR,
        static_url_path="/mock",
    )
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    CORS(app, supports_credentials=True)
    db.init_app(app)

    @app.route("/")
    @app.route("/health")
    def index():
        return jsonify(
            {
                "service": "Smartclusive backend",
                "status": "ok",
                "api": "/api",
                "socketio": "/socket.io",
            }
        )

    app.register_blueprint(api_bp, url_prefix="/api")
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


if __name__ == "__main__":
    app = create_socketio_app()
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        allow_unsafe_werkzeug=True,
    )
