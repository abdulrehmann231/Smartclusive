import random
import secrets
from typing import Optional

from smartclusive.config import Config
from smartclusive.models import db, DeckWord
from smartclusive.deck_service import eligible_words, bump_mastery
from smartclusive.dictionary import get_dictionary


_active_quizzes: dict = {}


def _quiz_id() -> str:
    return "quiz-" + secrets.token_hex(6)


def _item_id() -> str:
    return "q-" + secrets.token_hex(4)


def start_quiz(student, mode: str) -> tuple:
    words = eligible_words(student)
    if len(words) < Config.MIN_DECK_SIZE:
        return None, ("deck_too_small", 422, Config.MIN_DECK_SIZE - len(words))

    items = []
    if mode == "sign_word":
        chosen = words[: Config.QUIZ_WORD_COUNT]
        random.shuffle(chosen)
        for w in chosen:
            items.append({"id": _item_id(), "kind": "word", "prompt": w["english"].upper()})
    elif mode == "sign_letter":
        letters = list({ch for w in words for ch in w["english"].upper() if ch.isalpha()})
        random.shuffle(letters)
        for l in letters[: Config.QUIZ_WORD_COUNT]:
            items.append({"id": _item_id(), "kind": "letter", "prompt": l})
    elif mode == "sign_number":
        nums = [str(random.randint(0, 9)) for _ in range(Config.QUIZ_WORD_COUNT)]
        for n in nums:
            items.append({"id": _item_id(), "kind": "number", "prompt": n})
    else:
        return None, ("invalid_mode", 400, None)

    quiz_id = _quiz_id()
    _active_quizzes[quiz_id] = {
        "student_id": student.id,
        "mode": mode,
        "items": items,
        "results": {},
    }
    return {"quizId": quiz_id, "items": items}, None


def record_answer(student, quiz_id: str, item_id: str, correct: bool) -> tuple:
    quiz = _active_quizzes.get(quiz_id)
    if not quiz or quiz["student_id"] != student.id:
        return None, ("quiz_not_found", 404)
    quiz["results"][item_id] = bool(correct)
    return {"correct": bool(correct)}, None


def finish_quiz(student, quiz_id: str) -> tuple:
    quiz = _active_quizzes.get(quiz_id)
    if not quiz or quiz["student_id"] != student.id:
        return None, ("quiz_not_found", 404)

    results = quiz["results"]
    total = len(quiz["items"])
    correct_count = sum(1 for v in results.values() if v)

    # Update mastery for correctly signed word items.
    if quiz["mode"] == "sign_word":
        for item in quiz["items"]:
            if results.get(item["id"]):
                bump_mastery(student, item["prompt"].lower())

    # Quiz object can be discarded; progress is persisted in deck mastery.
    del _active_quizzes[quiz_id]

    return {
        "correct": correct_count,
        "incorrect": total - correct_count,
        "total": total,
    }, None


def video_quiz_items(video_type: str) -> list:
    if video_type == "letters":
        return [
            {"id": _item_id(), "kind": "letter", "prompt": l}
            for l in random.sample(["A", "B", "C", "D", "E"], Config.VIDEO_QUIZ_LENGTH)
        ]
    if video_type == "numbers":
        return [
            {"id": _item_id(), "kind": "number", "prompt": n}
            for n in random.sample(["1", "2", "3", "4", "5"], Config.VIDEO_QUIZ_LENGTH)
        ]
    # 'words' (or any future spelling video): quiz on whole-word fingerspelling.
    words = get_dictionary().all()
    chosen = random.sample(words, min(Config.VIDEO_QUIZ_LENGTH, len(words))) if words else []
    return [
        {"id": _item_id(), "kind": "word", "prompt": w["english"].upper()}
        for w in chosen
    ]
