"""Target-blind diagnostics, using the deployed model's unchanged features."""
import atexit
import threading
import time

from .recognition import SignSessionManager, SignVerifier, get_recognizer


class DiagnosticSessions(SignSessionManager):
    def process_frame(self, sid, image_bytes, owner=None, frame_id=None):
        session = self._get(sid, owner)
        if session is None:
            return None
        with session.lock:
            if session.closed:
                return None
            session.last_seen = time.monotonic()
            if frame_id <= session.last_frame_id:
                return {"error": "stale_frame", "frameId": frame_id}
            session.last_frame_id = frame_id
            result = {"frameId": frame_id, "landmarks": [], "handedness": None,
                      "candidates": [], "stableLabel": None, "feedback": "model_unavailable",
                      "featureSchema": "legacy-v2-77", "modelMode": self.recognizer.mode}
            if self.recognizer.mode != "model":
                return result
            started = time.perf_counter()
            if session.tracker is None:
                session.tracker = self.recognizer.create_tracker()
            feature = self.recognizer.extract_landmarks(image_bytes, tracker=session.tracker,
                                                       diagnostics=result)
            extracted = time.perf_counter()
            ranked = self.recognizer.predict(feature, restrict_to=list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")) if feature is not None else []
            result["candidates"] = [{"label": str(label), "score": float(score)} for label, score in ranked[:3]]
            # Follow the top candidate, never the user's intended label. A candidate
            # change restarts the hold; completed holds continue until a change/gap.
            top = ranked[0][0] if ranked else None
            verifier = session.verifier
            if top != verifier.target or verifier.index:
                previous = verifier
                verifier = SignVerifier(top or "A", "letter")
                if top == previous.target and previous.index:
                    verifier.last_label = top
                    verifier.stable_since = previous.last_time - previous.HOLD_SECONDS
                    verifier.stable_count = previous.STABILITY
                    verifier.last_time = previous.last_time
                session.verifier = verifier
            state = verifier.update(ranked[0] if ranked else None,
                                    runner_up=ranked[1][1] if len(ranked) > 1 else 0,
                                    hand_present=feature is not None)
            result["feedback"] = "stable" if state["complete"] else state["feedback"]
            result["stableLabel"] = top if state["complete"] else None
            result["timingsMs"] = {"landmarks": round((extracted-started)*1000, 2),
                                   "classification": round((time.perf_counter()-extracted)*1000, 2)}
            return result


_manager = None
_lock = threading.Lock()


def get_diagnostics():
    global _manager
    with _lock:
        if _manager is None:
            _manager = DiagnosticSessions(get_recognizer(), max_sessions=8)
            atexit.register(_manager.close)
        return _manager
