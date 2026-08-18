import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")

for d in (DATA_DIR, STATIC_DIR):
    os.makedirs(d, exist_ok=True)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
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
    # If the real detector cannot be loaded, return demo detections so the UI can be exercised.
    DETECT_DEMO_FALLBACK = os.environ.get("DETECT_DEMO_FALLBACK", "1") == "1"

    MIN_DECK_SIZE = int(os.environ.get("MIN_DECK_SIZE", "3"))
    VIDEO_QUIZ_LENGTH = int(os.environ.get("VIDEO_QUIZ_LENGTH", "3"))
    QUIZ_WORD_COUNT = int(os.environ.get("QUIZ_WORD_COUNT", "5"))
