import base64
import io
import json
import math
import os
import random
import secrets
from typing import Dict, List, Optional, Tuple

from smartclusive.config import Config

# Heavy CV/ML imports are deferred so the API can start even when they are not installed.
_cv = None
_mp = None
_mp_hands = None
_sklearn = None
_joblib = None
_np = None


def _import_cv():
    global _cv
    if _cv is None:
        import cv2
        _cv = cv2
    return _cv


def _import_mp():
    global _mp, _mp_hands
    if _mp is None:
        import mediapipe as mp
        _mp = mp
        _mp_hands = mp.solutions.hands
    return _mp, _mp_hands


def _import_sklearn():
    global _sklearn
    if _sklearn is None:
        import sklearn
        _sklearn = sklearn
    return _sklearn


def _import_joblib():
    global _joblib
    if _joblib is None:
        import joblib
        _joblib = joblib
    return _joblib


def _import_np():
    global _np
    if _np is None:
        import numpy as np
        _np = np
    return _np


def normalize_landmarks(pts: List[List[float]]) -> List[float]:
    """Translate to wrist origin and scale by max hand extent."""
    np = _import_np()
    pts = np.asarray(pts, dtype=np.float32).copy()
    pts -= pts[0]
    scale = np.linalg.norm(pts, axis=1).max()
    if scale > 1e-6:
        pts /= scale
    return pts.flatten().tolist()


def _cosine_similarity(a, b) -> float:
    np = _import_np()
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom < 1e-9:
        return 0.0
    return float(np.dot(a, b) / denom)


class ASLRecognizer:
    """Loads the trained landmark classifier if present, otherwise falls back to KNN templates."""

    def __init__(self):
        self.mode = "demo"  # 'model' | 'knn' | 'demo'
        self.model = None
        self.classes: List[str] = []
        self.templates: Dict[str, List[List[float]]] = {}
        self._load()

    def _load(self):
        # 1. Try trained scikit-learn model.
        if os.path.exists(Config.ASL_MODEL_PATH) and os.path.exists(Config.ASL_LABELS_PATH):
            try:
                self.model = _import_joblib().load(Config.ASL_MODEL_PATH)
                with open(Config.ASL_LABELS_PATH, "r") as f:
                    self.classes = sorted(json.load(f))
                self.mode = "model"
                return
            except Exception as exc:  # pragma: no cover
                print(f"[recognition] failed to load trained model: {exc}")

        # 2. Try user-supplied KNN templates.
        if os.path.exists(Config.ASL_TEMPLATES_PATH):
            try:
                with open(Config.ASL_TEMPLATES_PATH, "r") as f:
                    self.templates = json.load(f)
                self.classes = sorted(self.templates.keys())
                self.mode = "knn"
                return
            except Exception as exc:  # pragma: no cover
                print(f"[recognition] failed to load templates: {exc}")

        # 3. Deterministic synthetic templates so the API never crashes.
        print("[recognition] no model/templates found; using deterministic demo recognizer")
        self.classes = [chr(ord("A") + i) for i in range(26)] + [str(i) for i in range(10)]
        rng = random.Random(42)
        for label in self.classes:
            vec = [rng.uniform(-1, 1) for _ in range(63)]
            norm = math.sqrt(sum(v * v for v in vec))
            if norm > 0:
                vec = [v / norm for v in vec]
            self.templates[label] = [vec]
        self.mode = "demo"

    def extract_landmarks(self, image_bytes: bytes) -> Optional[List[float]]:
        """Run MediaPipe Hands on a frame and return a normalized 63-D feature vector."""
        try:
            cv2 = _import_cv()
            np = _import_np()
            mp, mp_hands = _import_mp()
            arr = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        except Exception as exc:
            print(f"[recognition] extraction failed: {exc}")
            return None

        if arr is None:
            return None

        try:
            with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands:
                res = hands.process(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
                if not res.multi_hand_landmarks:
                    return None
                hand = res.multi_hand_landmarks[0]
                handed = (
                    res.multi_handedness[0].classification[0].label
                    if res.multi_handedness
                    else "Right"
                )
                pts = [[lm.x, lm.y, lm.z] for lm in hand.landmark]
                if handed == "Left":
                    for p in pts:
                        p[0] = -p[0]
                return normalize_landmarks(pts)
        except Exception as exc:
            print(f"[recognition] MediaPipe processing failed: {exc}")
            return None

    def predict(self, feature: List[float], restrict_to: Optional[List[str]] = None) -> List[Tuple[str, float]]:
        """Return top predictions as (label, confidence/probability)."""
        candidates = restrict_to or self.classes

        if self.mode == "model" and self.model is not None:
            np = _import_np()
            X = np.asarray(feature, dtype=np.float32).reshape(1, -1)
            proba = self.model.predict_proba(X)[0]
            order = np.argsort(proba)[::-1]
            class_list = list(self.model.classes_)
            return [
                (class_list[i], float(proba[i]))
                for i in order
                if class_list[i] in candidates
            ]

        # KNN / demo: average cosine similarity per class.
        scores: Dict[str, float] = {}
        for label in candidates:
            templates = self.templates.get(label, [])
            if not templates:
                continue
            scores[label] = sum(_cosine_similarity(feature, t) for t in templates) / len(templates)
        return sorted(scores.items(), key=lambda x: x[1], reverse=True)

    def recognize(self, image_bytes: bytes, restrict_to: Optional[List[str]] = None) -> Optional[Tuple[str, List[Tuple[str, float]]]]:
        feature = self.extract_landmarks(image_bytes)
        if feature is None:
            return None
        preds = self.predict(feature, restrict_to=restrict_to)
        if not preds:
            return None
        return preds[0][0], preds


class SignVerifier:
    """Stateful letter-by-letter / digit-by-digit verifier with a temporal stability gate."""

    STABILITY = 3
    CONFIDENCE_THRESHOLD = 0.55

    def __init__(self, target: str, kind: str):
        import re
        self.target = re.sub(r"[^A-Z0-9]", "", target.upper())
        self.kind = kind  # 'word' | 'letter' | 'number'
        self.units = list(self.target)
        self.index = 0
        self.stable_count = 0
        self.last_label: Optional[str] = None

    def expected(self) -> Optional[str]:
        return self.units[self.index] if self.index < len(self.units) else None

    def _matches_expected(self, label: str) -> bool:
        exp = self.expected()
        if exp is None:
            return False
        return label.upper() == exp

    def update(self, top_prediction: Optional[Tuple[str, float]]) -> dict:
        if top_prediction is None:
            self.stable_count = 0
            self.last_label = None
            return self.state()

        label, confidence = top_prediction
        if confidence < self.CONFIDENCE_THRESHOLD:
            self.stable_count = 0
            self.last_label = None
            return self.state()

        if label == self.last_label and self._matches_expected(label):
            self.stable_count += 1
        else:
            self.last_label = label
            self.stable_count = 1

        if self.stable_count >= self.STABILITY:
            self.index += 1
            self.stable_count = 0
            self.last_label = None

        return self.state()

    def state(self) -> dict:
        return {
            "matched": self.units[: self.index],
            "expected": self.expected(),
            "complete": self.index >= len(self.units),
            "target": self.target,
        }


class SignSessionManager:
    def __init__(self, recognizer: Optional[ASLRecognizer] = None):
        self.recognizer = recognizer or ASLRecognizer()
        self.sessions: Dict[str, SignVerifier] = {}

    def _sid(self) -> str:
        return "sign-" + secrets.token_hex(6)

    def start(self, target: str, kind: str) -> str:
        sid = self._sid()
        self.sessions[sid] = SignVerifier(target, kind)
        return sid

    def _restrict_for(self, verifier: SignVerifier) -> Optional[List[str]]:
        exp = verifier.expected()
        if exp is None:
            return None
        if verifier.kind == "number" or exp.isdigit():
            return [str(i) for i in range(10)]
        if verifier.kind == "letter" or exp.isalpha():
            return [chr(ord("A") + i) for i in range(26)]
        return None

    def process_frame(self, sid: str, image_bytes: bytes) -> Optional[dict]:
        verifier = self.sessions.get(sid)
        if verifier is None:
            return None
        restrict = self._restrict_for(verifier)
        feature = self.recognizer.extract_landmarks(image_bytes)
        if feature is None:
            top = None
        else:
            ranked = self.recognizer.predict(feature, restrict_to=restrict)
            top = ranked[0] if ranked else None
        return verifier.update(top)

    def state(self, sid: str) -> Optional[dict]:
        v = self.sessions.get(sid)
        return v.state() if v else None

    def stop(self, sid: str) -> None:
        self.sessions.pop(sid, None)


_recognizer: Optional[ASLRecognizer] = None
_session_manager: Optional[SignSessionManager] = None


def get_recognizer() -> ASLRecognizer:
    global _recognizer
    if _recognizer is None:
        _recognizer = ASLRecognizer()
    return _recognizer


def get_sign_sessions() -> SignSessionManager:
    global _session_manager
    if _session_manager is None:
        _session_manager = SignSessionManager(get_recognizer())
    return _session_manager
