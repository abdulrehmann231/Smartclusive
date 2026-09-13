import logging
import os

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")

for d in (DATA_DIR, STATIC_DIR):
    os.makedirs(d, exist_ok=True)


class Config:
    _secret = os.environ.get("SECRET_KEY", "")
    if not _secret:
        if os.environ.get("FLASK_ENV") == "production" or os.environ.get("RENDER"):
            raise RuntimeError("SECRET_KEY must be set in production")
        _secret = "dev-secret-change-me"
        logger.warning("Using default SECRET_KEY; set SECRET_KEY env var in production")
    SECRET_KEY = _secret
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(DATA_DIR, 'smartclusive.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ASL recognizer assets (produced by train_asl_landmarks.ipynb)
    ASL_MODEL_PATH = os.environ.get(
        "ASL_MODEL_PATH", os.path.join(DATA_DIR, "asl_landmark_model_v2.joblib")
    )
    ASL_LABELS_PATH = os.environ.get(
        "ASL_LABELS_PATH", os.path.join(DATA_DIR, "labels_v2.json")
    )
    ASL_TEMPLATES_PATH = os.environ.get(
        "ASL_TEMPLATES_PATH", os.path.join(DATA_DIR, "asl_templates.json")
    )

    # CORS: comma-separated list of allowed origins. Defaults to "*" for local dev.
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

    # Object detection
    YOLO_MODEL = os.environ.get("YOLO_MODEL", "yolov8n.pt")
    # If the real detector cannot find anything, return demo detections only when explicitly enabled.
    # The default is false so users see an honest "not classified" message instead of a fake label.
    DETECT_DEMO_FALLBACK = os.environ.get("DETECT_DEMO_FALLBACK", "0") == "1"

    MIN_DECK_SIZE = int(os.environ.get("MIN_DECK_SIZE", "3"))
    VIDEO_QUIZ_LENGTH = int(os.environ.get("VIDEO_QUIZ_LENGTH", "3"))
    QUIZ_WORD_COUNT = int(os.environ.get("QUIZ_WORD_COUNT", "5"))
