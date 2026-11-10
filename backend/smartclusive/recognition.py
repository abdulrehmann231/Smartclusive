import json
import math
import os
import random
import secrets
import atexit
import threading
import time
from dataclasses import dataclass, field
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


def compute_palm_features(pts: List[List[float]]) -> List[float]:
    """Compute palm orientation and finger geometry features.
    
    Landmark indices (MediaPipe):
      0: wrist
      1-4: thumb (CMC, MCP, IP, Tip)
      5-8: index (MCP, PIP, DIP, Tip)
      9-12: middle (MCP, PIP, DIP, Tip)
      13-16: ring (MCP, PIP, DIP, Tip)
      17-20: pinky (MCP, PIP, DIP, Tip)
    """
    np = _import_np()
    pts = np.asarray(pts, dtype=np.float32)
    
    wrist = pts[0]
    index_mcp = pts[5]
    middle_mcp = pts[9]
    ring_mcp = pts[13]
    pinky_mcp = pts[17]
    
    # Palm normal: cross product of wrist->index_mcp and wrist->pinky_mcp
    v1 = index_mcp - wrist
    v2 = pinky_mcp - wrist
    palm_normal = np.cross(v1, v2)
    palm_norm = np.linalg.norm(palm_normal)
    if palm_norm > 1e-6:
        palm_normal /= palm_norm
    
    # Palm features (3): normal vector direction
    palm_fx, palm_fy, palm_fz = palm_normal.tolist()
    
    # Palm angle: angle between palm normal and z-axis (camera direction)
    palm_angle = abs(palm_fz)  # 1 = facing camera, 0 = facing sideways
    
    # Finger curl: distance from fingertip to MCP / distance from MCP to wrist
    # Higher = more curled
    def finger_curl(tip_idx, mcp_idx):
        tip = pts[tip_idx]
        mcp = pts[mcp_idx]
        tip_dist = np.linalg.norm(tip - mcp)
        mcp_dist = np.linalg.norm(mcp - wrist)
        if mcp_dist < 1e-6:
            return 0.0
        return float(tip_dist / mcp_dist)
    
    thumb_curl = finger_curl(4, 2)   # thumb tip to thumb MCP
    index_curl = finger_curl(8, 5)
    middle_curl = finger_curl(12, 9)
    ring_curl = finger_curl(16, 13)
    pinky_curl = finger_curl(20, 17)
    
    # Thumb position relative to index: helps distinguish S (thumb across) from A (thumb side)
    thumb_tip = pts[4]
    index_mcp = pts[5]
    thumb_to_index = thumb_tip - index_mcp
    thumb_x = float(thumb_to_index[0])  # negative = thumb is to the right (for right hand)
    thumb_y = float(thumb_to_index[1])  # negative = thumb is above index MCP
    
    # Finger spread: angle between adjacent fingers
    def finger_spread(mcp1_idx, mcp2_idx):
        v1 = pts[mcp1_idx] - wrist
        v2 = pts[mcp2_idx] - wrist
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        return float(np.clip(cos_angle, -1, 1))
    
    spread_index_middle = finger_spread(5, 9)
    spread_middle_ring = finger_spread(9, 13)
    spread_ring_pinky = finger_spread(13, 17)
    
    return [
        palm_fx, palm_fy, palm_fz,  # palm normal direction (3)
        palm_angle,                   # palm facing camera (1)
        thumb_curl, index_curl, middle_curl, ring_curl, pinky_curl,  # finger curl (5)
        thumb_x, thumb_y,            # thumb position relative to index (2)
        spread_index_middle, spread_middle_ring, spread_ring_pinky,  # finger spread (3)
    ]


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
                if getattr(self.model, "n_features_in_", None) != 77:
                    raise ValueError("ASL model requires the legacy 77-feature schema")
                if set(self.classes) != set(self.model.classes_):
                    raise ValueError("ASL model and label file do not match")
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
            vec = [rng.uniform(-1, 1) for _ in range(77)]  # 63 landmarks + 14 palm features
            norm = math.sqrt(sum(v * v for v in vec))
            if norm > 0:
                vec = [v / norm for v in vec]
            self.templates[label] = [vec]
        self.mode = "demo"

    def create_tracker(self):
        _, mp_hands = _import_mp()
        return mp_hands.Hands(
            static_image_mode=False, max_num_hands=1,
            min_detection_confidence=0.5, min_tracking_confidence=0.5,
        )

    def extract_landmarks(self, image_bytes: bytes, tracker=None, diagnostics=None) -> Optional[List[float]]:
        """Run MediaPipe Hands on a frame and return a normalized 77-D feature vector.
        
        Features (77 total):
          - 63: normalized landmark coordinates (21 points × 3)
          - 14: palm orientation and geometry features
            - palm_normal (3): direction of palm surface
            - palm_angle (1): how much palm faces camera
            - finger_curl (5): curl amount per finger
            - thumb_position (2): thumb tip relative to index MCP
            - finger_spread (3): angles between adjacent fingers
        """
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

        owned = tracker is None
        if owned:
            tracker = mp_hands.Hands(
                static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5,
            )
        try:
            res = tracker.process(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
            if not res.multi_hand_landmarks:
                return None
            hand = res.multi_hand_landmarks[0]
            handed = (res.multi_handedness[0].classification[0].label
                      if res.multi_handedness else "Right")
            pts = [[lm.x, lm.y, lm.z] for lm in hand.landmark]
            if diagnostics is not None:
                diagnostics.update(landmarks=[point[:] for point in pts],
                                   handedness=handed)
            if handed == "Left":
                for point in pts:
                    point[0] = -point[0]
            # Preserve the feature contract of the existing v2 model.
            return normalize_landmarks(pts) + compute_palm_features(pts)
        finally:
            if owned:
                tracker.close()

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
    """Verify predictions without using the expected answer to rank candidates."""

    STABILITY = 3
    CONFIDENCE_THRESHOLD = Config.ASL_CONFIDENCE_THRESHOLD
    MARGIN_THRESHOLD = Config.ASL_MARGIN_THRESHOLD
    HOLD_SECONDS = 0.25
    MAX_GAP_SECONDS = 1.0
    RELEASE_SECONDS = 0.15

    def __init__(self, target: str, kind: str):
        import re
        self.target = re.sub(r"[^A-Z0-9]", "", target.upper())
        if not self.target:
            raise ValueError("invalid_sign_request")
        self.kind = kind
        self.units = list(self.target)
        self.index = 0
        self.stable_count = 0
        self.last_label = None
        self.stable_since = None
        self.last_time = None
        self.release_since = None
        self.release_count = 0
        self.needs_release = False
        self.feedback = "ready"
        self.candidates = []

    def expected(self):
        return self.units[self.index] if self.index < len(self.units) else None

    def _reset_stability(self):
        self.stable_count = 0
        self.last_label = None
        self.stable_since = None

    def update(self, top_prediction, *, runner_up=0.0, now=None, hand_present=None):
        now = time.monotonic() if now is None else now
        if self.index >= len(self.units):
            return self.state()
        if self.last_time is not None and now <= self.last_time:
            return self.state()
        if self.last_time is not None and now - self.last_time > self.MAX_GAP_SECONDS:
            self._reset_stability()
            self.release_since = None
            self.release_count = 0
        self.last_time = now
        if hand_present is None:
            hand_present = top_prediction is not None
        if self.needs_release:
            self._reset_stability()
            self.feedback = "release_hand"
            if not hand_present:
                if self.release_since is None:
                    self.release_since = now
                self.release_count += 1
                if self.release_count >= 2 and now - self.release_since >= self.RELEASE_SECONDS:
                    self.needs_release = False
                    self.feedback = "ready"
            else:
                self.release_since = None
                self.release_count = 0
            return self.state()
        if top_prediction is None:
            self._reset_stability()
            self.feedback = "no_hand" if not hand_present else "uncertain"
            return self.state()
        label, confidence = top_prediction
        if (not math.isfinite(confidence) or not math.isfinite(runner_up)
                or confidence < self.CONFIDENCE_THRESHOLD
                or confidence - runner_up < self.MARGIN_THRESHOLD):
            self._reset_stability()
            self.feedback = "uncertain"
            return self.state()
        if label != self.expected():
            self._reset_stability()
            self.feedback = "different_sign"
            return self.state()
        if label != self.last_label:
            self._reset_stability()
            self.last_label = label
            self.stable_since = now
        self.stable_count += 1
        self.feedback = "hold"
        if self.stable_count >= self.STABILITY and now - self.stable_since >= self.HOLD_SECONDS:
            self.index += 1
            self._reset_stability()
            self.needs_release = self.expected() == label
            self.feedback = "complete" if self.expected() is None else (
                "release_hand" if self.needs_release else "accepted")
        return self.state()

    def state(self):
        return {
            "matched": self.units[:self.index], "expected": self.expected(),
            "complete": self.index >= len(self.units), "target": self.target,
            "feedback": self.feedback, "candidates": self.candidates,
        }


@dataclass
class SignSession:
    verifier: SignVerifier
    owner: object = None
    tracker: object = None
    last_seen: float = field(default_factory=time.monotonic)
    last_frame_id: int = -1
    closed: bool = False
    lock: object = field(default_factory=threading.RLock)

    def close(self):
        with self.lock:
            self.closed = True
            if self.tracker is not None:
                self.tracker.close()
                self.tracker = None


class SignSessionManager:
    def __init__(self, recognizer=None, *, max_sessions=32, ttl_seconds=120):
        self.recognizer = recognizer or ASLRecognizer()
        self.sessions = {}
        self.lock = threading.RLock()
        self.max_sessions = max_sessions
        self.ttl_seconds = ttl_seconds

    def _prune(self):
        now = time.monotonic()
        with self.lock:
            for sid, session in list(self.sessions.items()):
                if session.lock.acquire(blocking=False):
                    try:
                        if now - session.last_seen > self.ttl_seconds:
                            session.close()
                            self.sessions.pop(sid, None)
                    finally:
                        session.lock.release()

    def start(self, target, kind, owner=None):
        verifier = SignVerifier(target, kind)
        self._prune()
        with self.lock:
            if len(self.sessions) >= self.max_sessions:
                raise ValueError("too_many_sign_sessions")
            sid = "sign-" + secrets.token_hex(16)
            self.sessions[sid] = SignSession(verifier, owner=owner)
            return sid

    def _get(self, sid, owner):
        self._prune()
        with self.lock:
            session = self.sessions.get(sid)
            return session if session is not None and session.owner == owner else None

    def process_frame(self, sid, image_bytes, owner=None, frame_id=None):
        session = self._get(sid, owner)
        if session is None:
            return None
        with session.lock:
            if session.closed:
                return None
            session.last_seen = time.monotonic()
            verifier = session.verifier
            if frame_id is not None and frame_id <= session.last_frame_id:
                return verifier.state()
            if frame_id is not None:
                session.last_frame_id = frame_id
            if verifier.expected() is None:
                return verifier.state()
            if self.recognizer.mode != "model":
                verifier.feedback = "model_unavailable"
                return verifier.state()
            started = time.perf_counter()
            if session.tracker is None:
                session.tracker = self.recognizer.create_tracker()
            feature = self.recognizer.extract_landmarks(image_bytes, tracker=session.tracker)
            extracted = time.perf_counter()
            ranked = []
            if feature is not None:
                # Restrict only by letter/digit task, never by the expected answer.
                digits = verifier.kind == "number" or verifier.expected().isdigit()
                allowed = list("0123456789" if digits else "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
                ranked = self.recognizer.predict(feature, restrict_to=allowed)
            verifier.candidates = [{"label": str(label), "score": float(score)}
                                   for label, score in ranked[:3]]
            state = verifier.update(
                ranked[0] if ranked else None,
                runner_up=ranked[1][1] if len(ranked) > 1 else 0.0,
                hand_present=feature is not None,
            )
            state["timingsMs"] = {
                "landmarks": round((extracted - started) * 1000, 2),
                "classification": round((time.perf_counter() - extracted) * 1000, 2),
            }
            if state["complete"] and session.tracker is not None:
                session.tracker.close()
                session.tracker = None
            return state

    def state(self, sid, owner=None):
        session = self._get(sid, owner)
        if session is None:
            return None
        with session.lock:
            return None if session.closed else session.verifier.state()

    def stop(self, sid, owner=None):
        with self.lock:
            session = self.sessions.get(sid)
            if session is None or session.owner != owner:
                return
            self.sessions.pop(sid, None)
        session.close()

    def close(self):
        with self.lock:
            sessions = list(self.sessions.values())
            self.sessions.clear()
        for session in sessions:
            session.close()


_recognizer: Optional[ASLRecognizer] = None
_session_manager: Optional[SignSessionManager] = None
_singleton_lock = threading.RLock()


def get_recognizer() -> ASLRecognizer:
    global _recognizer
    with _singleton_lock:
        if _recognizer is None:
            _recognizer = ASLRecognizer()
    return _recognizer


def get_sign_sessions() -> SignSessionManager:
    global _session_manager
    with _singleton_lock:
        if _session_manager is None:
            _session_manager = SignSessionManager(get_recognizer())
            atexit.register(_session_manager.close)
    return _session_manager
