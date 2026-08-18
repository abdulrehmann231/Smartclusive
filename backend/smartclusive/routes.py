import base64
import random
import secrets

from flask import Blueprint, request, jsonify

from smartclusive.auth_service import (
    get_auth_token,
    login_student,
    logout_student,
    register_student,
    require_student,
)
from smartclusive.config import Config
from smartclusive.deck_service import add_to_deck, eligible_words, get_deck
from smartclusive.dictionary import get_dictionary
from smartclusive.images import fingerspelling_for, word_image
from smartclusive.object_detection import detect_object
from smartclusive.quiz_service import finish_quiz, record_answer, start_quiz
from smartclusive.recognition import get_sign_sessions
from smartclusive.video_service import complete_video, list_videos, record_video_quiz_result

api_bp = Blueprint("api", __name__)


def _card_id() -> str:
    return "c-" + secrets.token_hex(4)


# ---------------- Auth ----------------

@api_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not name or not email or not password:
        return jsonify({"error": "missing_fields"}), 400
    result, err = register_student(name, email, password)
    if err:
        return jsonify({"error": err}), 409
    return jsonify(result), 201


@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "missing_fields"}), 400
    result, err = login_student(email, password)
    if err:
        return jsonify({"error": err}), 401
    return jsonify(result), 200


@api_bp.route("/auth/logout", methods=["POST"])
def logout():
    logout_student(get_auth_token())
    return jsonify({"ok": True}), 200


@api_bp.route("/auth/me", methods=["GET"])
def me():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    return jsonify({"student": student.to_dict()}), 200


# ---------------- Deck ----------------

@api_bp.route("/deck", methods=["GET"])
def deck_get():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    return jsonify({"words": get_deck(student)}), 200


@api_bp.route("/deck", methods=["POST"])
def deck_add():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    english = data.get("english", "").strip()
    indonesian = data.get("indonesian", "").strip()
    if not english or not indonesian:
        return jsonify({"error": "missing_fields"}), 400
    result = add_to_deck(student, indonesian, english)
    return jsonify(result), 200


# ---------------- Word cards ----------------

@api_bp.route("/cards/next", methods=["GET"])
def next_card():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    correct = random.choice(get_dictionary().all())
    return jsonify({
        "cardId": _card_id(),
        "indonesian": correct["indonesian"],
        "options": get_dictionary().card_options_for(correct),
    }), 200


@api_bp.route("/cards/guess", methods=["POST"])
def guess_card():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    indonesian = data.get("indonesian", "").strip()
    option_id = data.get("optionId", "").strip()
    correct_word = get_dictionary().by_indonesian(indonesian)
    if not correct_word:
        return jsonify({"error": "card_not_found"}), 404

    guessed_english = option_id.replace("opt-", "") if option_id.startswith("opt-") else option_id
    guessed_word = get_dictionary().by_english(guessed_english)
    revealed_image = word_image(
        guessed_english,
        guessed_word["emoji"] if guessed_word else "❓",
        guessed_word["hue"] if guessed_word else 0,
    )
    is_correct = guessed_english.lower() == correct_word["english"].lower()
    if is_correct:
        return jsonify({
            "correct": True,
            "revealedImage": revealed_image,
            "correctOptionId": f"opt-{correct_word['english']}",
            "fingerspelling": fingerspelling_for(correct_word["english"]),
        }), 200
    return jsonify({"correct": False, "revealedImage": revealed_image}), 200


# ---------------- Object detection ----------------

@api_bp.route("/detect", methods=["POST"])
def detect():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "missing_image"}), 400
    image_bytes = file.read()
    result = detect_object(image_bytes)
    if not result.get("detected"):
        return jsonify({"detected": False}), 200

    english = result["english"]
    already = any(
        w["english"].lower() == english.lower()
        for w in eligible_words(student)
    )
    return jsonify({
        "detected": True,
        "box": result["box"],
        "english": result["english"],
        "indonesian": result["indonesian"],
        "source": result["source"],
        "fingerspelling": result["fingerspelling"],
        "alreadyInDeck": already,
    }), 200


# ---------------- Quiz ----------------

@api_bp.route("/quiz/start", methods=["POST"])
def quiz_start():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    mode = request.args.get("mode") or (request.get_json(silent=True) or {}).get("mode")
    if not mode:
        return jsonify({"error": "missing_mode"}), 400
    result, err = start_quiz(student, mode)
    if err:
        payload = {"error": err[0]}
        if err[0] == "deck_too_small":
            payload["needed"] = err[2]
        return jsonify(payload), err[1]
    return jsonify(result), 200


@api_bp.route("/quiz/<quiz_id>/answer", methods=["POST"])
def quiz_answer(quiz_id: str):
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    item_id = data.get("itemId")
    correct = data.get("correct")
    if item_id is None or correct is None:
        return jsonify({"error": "missing_fields"}), 400
    result, err = record_answer(student, quiz_id, item_id, correct)
    if err:
        return jsonify({"error": err[0]}), err[1]
    return jsonify(result), 200


@api_bp.route("/quiz/<quiz_id>/finish", methods=["POST"])
def quiz_finish(quiz_id: str):
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    result, err = finish_quiz(student, quiz_id)
    if err:
        return jsonify({"error": err[0]}), err[1]
    return jsonify(result), 200


# ---------------- Videos ----------------

@api_bp.route("/videos", methods=["GET"])
def videos_list():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    return jsonify({"videos": list_videos(student)}), 200


@api_bp.route("/videos/<video_id>/complete", methods=["POST"])
def videos_complete(video_id: str):
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    result, err = complete_video(student, video_id)
    if err:
        return jsonify({"error": err[0]}), err[1]
    return jsonify(result), 200


@api_bp.route("/videos/<video_id>/quiz-result", methods=["POST"])
def videos_quiz_result(video_id: str):
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    record_video_quiz_result(student, video_id, data)
    return jsonify({"ok": True}), 200


# ---------------- Signing (REST fallback for development / testing) ----------------

@api_bp.route("/sign/start", methods=["POST"])
def sign_start():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    target = data.get("target", "").strip()
    kind = data.get("kind", "word")
    if not target or kind not in ("word", "letter", "number"):
        return jsonify({"error": "invalid_sign_request"}), 400
    sid = get_sign_sessions().start(target, kind)
    return jsonify({"sessionId": sid, "state": get_sign_sessions().state(sid)}), 200


@api_bp.route("/sign/frame", methods=["POST"])
def sign_frame():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    sid = data.get("sessionId")
    image_b64 = data.get("image")
    if not sid or not image_b64:
        return jsonify({"error": "missing_fields"}), 400
    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        return jsonify({"error": "invalid_image"}), 400
    state = get_sign_sessions().process_frame(sid, image_bytes)
    if state is None:
        return jsonify({"error": "session_not_found"}), 404
    return jsonify(state), 200


@api_bp.route("/sign/state", methods=["GET"])
def sign_state():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    sid = request.args.get("sessionId")
    state = get_sign_sessions().state(sid)
    if state is None:
        return jsonify({"error": "session_not_found"}), 404
    return jsonify(state), 200


@api_bp.route("/sign/stop", methods=["POST"])
def sign_stop():
    student, err = require_student()
    if err:
        return jsonify({"error": err[0]}), err[1]
    data = request.get_json(silent=True) or {}
    sid = data.get("sessionId")
    get_sign_sessions().stop(sid)
    return jsonify({"ok": True}), 200
