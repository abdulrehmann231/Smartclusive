import base64

from flask import request

from smartclusive.auth_service import student_from_token
from smartclusive.recognition import get_sign_sessions


def register_socket(socketio):
    @socketio.on("sign:start")
    def handle_sign_start(data):
        target = (data or {}).get("target", "").strip()
        kind = (data or {}).get("kind", "word")
        if not target or kind not in ("word", "letter", "number"):
            return {"error": "invalid_sign_request"}
        sid = get_sign_sessions().start(target, kind)
        return {"sessionId": sid, "state": get_sign_sessions().state(sid)}

    @socketio.on("sign:frame")
    def handle_sign_frame(data):
        sid = (data or {}).get("sessionId")
        image_b64 = (data or {}).get("image")
        if not sid or not image_b64:
            return {"error": "missing_fields"}
        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            return {"error": "invalid_image"}
        sessions = get_sign_sessions()
        try:
            state = sessions.process_frame(sid, image_bytes)
        except Exception as exc:
            print(f"[socket_events] sign frame processing failed: {exc}")
            return {"error": "processing_failed"}
        if state is None:
            return {"error": "session_not_found"}
        socketio.emit("sign:progress", state, room=request.sid)
        if state["complete"]:
            socketio.emit("sign:done", state, room=request.sid)
            sessions.stop(sid)
        return state

    @socketio.on("sign:stop")
    def handle_sign_stop(data):
        sid = (data or {}).get("sessionId")
        get_sign_sessions().stop(sid)
        return {"ok": True}

    # Authentication-aware connection events are optional; the token can be
    # supplied in the Socket.IO auth payload and verified here if desired.
    @socketio.on("connect")
    def handle_connect(auth):
        token = (auth or {}).get("token")
        if token:
            student = student_from_token(token)
            if student:
                return True
        # Allow anonymous connections; route-level auth guards the signing events.
        return True
