import io
import os
import random
from typing import Optional, Tuple

from smartclusive.config import Config
from smartclusive.dictionary import get_dictionary
from smartclusive.images import fingerspelling_for, word_image
from smartclusive.translator import translate_en_to_id

_yolo = None


def _load_yolo():
    global _yolo
    if _yolo is not None:
        return _yolo
    try:
        from ultralytics import YOLO
        model_path = Config.YOLO_MODEL
        if not os.path.exists(model_path):
            # Ultralytics will auto-download by name if internet is available.
            pass
        _yolo = YOLO(model_path)
        return _yolo
    except Exception as exc:
        print(f"[object_detection] YOLO not available: {exc}")
        _yolo = False
        return None


def _best_yolo_detection(image_bytes: bytes) -> Optional[Tuple[str, float, dict]]:
    yolo = _load_yolo()
    if not yolo:
        return None
    try:
        import numpy as np
        arr = np.frombuffer(image_bytes, np.uint8)
        import cv2
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        results = yolo(img, verbose=False)
        if not results:
            return None
        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return None
        # Pick highest-confidence detection.
        confs = boxes.conf.cpu().numpy()
        best_idx = int(confs.argmax())
        cls_id = int(boxes.cls[best_idx])
        name = results[0].names[cls_id]
        conf = float(confs[best_idx])
        xyxy = boxes.xyxy[best_idx].cpu().numpy()
        h, w = img.shape[:2]
        x1, y1, x2, y2 = xyxy
        box = {
            "x": round(float(x1) / w, 4),
            "y": round(float(y1) / h, 4),
            "w": round(float(x2 - x1) / w, 4),
            "h": round(float(y2 - y1) / h, 4),
        }
        return name, conf, box
    except Exception as exc:
        print(f"[object_detection] YOLO inference failed: {exc}")
        return None


def _demo_detection() -> Optional[Tuple[str, float, dict]]:
    if not Config.DETECT_DEMO_FALLBACK:
        return None
    word = random.choice(get_dictionary().all())
    return word["english"], 0.85, {"x": 0.18, "y": 0.20, "w": 0.60, "h": 0.55}


def detect_object(image_bytes: bytes) -> dict:
    result = _best_yolo_detection(image_bytes)
    source = "dictionary"
    if result is None:
        result = _demo_detection()
        source = "demo" if result else None

    if result is None:
        return {"detected": False}

    english, confidence, box = result
    english = english.lower().strip()

    dic = get_dictionary().by_english(english)
    if dic:
        indonesian = dic["indonesian"]
        image = word_image(dic["english"], dic["emoji"], dic["hue"])
        source = "dictionary"
    else:
        indonesian = translate_en_to_id(english)
        image = word_image(english, "📝", 199)
        source = "translated"

    return {
        "detected": True,
        "box": box,
        "english": english,
        "indonesian": indonesian,
        "source": source,
        "confidence": round(confidence, 3),
        "fingerspelling": fingerspelling_for(english),
        "image": image,
    }
