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
        try:
            sid = get_sign_sessions().start(target, kind, owner=request.sid)
        except ValueError as exc:
            return {"error": str(exc)}
        return {"sessionId": sid, "state": get_sign_sessions().state(sid, owner=request.sid)}

    @socketio.on("sign:frame")
    def handle_sign_frame(data):
        sid = (data or {}).get("sessionId")
        image_b64 = (data or {}).get("image")
        if not sid or not image_b64:
            return {"error": "missing_fields"}
        try:
            image_bytes = base64.b64decode(image_b64, validate=True)
        except Exception:
            return {"error": "invalid_image"}
        sessions = get_sign_sessions()
        try:
            state = sessions.process_frame(sid, image_bytes, owner=request.sid)
        except Exception as exc:
            print(f"[socket_events] sign frame processing failed: {exc}")
            return {"error": "processing_failed"}
        if state is None:
            return {"error": "session_not_found"}
        socketio.emit("sign:progress", state, room=request.sid)
        if state["complete"]:
            socketio.emit("sign:done", state, room=request.sid)
            sessions.stop(sid, owner=request.sid)
        return state

    @socketio.on("sign:stop")
    def handle_sign_stop(data):
        sid = (data or {}).get("sessionId")
        get_sign_sessions().stop(sid, owner=request.sid)
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
        # Legacy anonymous mode; signing sessions are isolated by connection ID.
        return True

    @socketio.on("disconnect")
    def handle_disconnect():
        sessions = get_sign_sessions()
        with sessions.lock:
            ids = [sid for sid, value in sessions.sessions.items() if value.owner == request.sid]
        for sid in ids:
            sessions.stop(sid, owner=request.sid)
