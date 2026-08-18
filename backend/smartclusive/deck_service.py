import datetime
from smartclusive.models import db, DeckWord
from smartclusive.dictionary import get_dictionary
from smartclusive.images import word_image


def get_deck(student) -> list:
    return [w.to_dict() for w in DeckWord.query.filter_by(student_id=student.id).order_by(DeckWord.learned_at.desc()).all()]


def add_to_deck(student, indonesian: str, english: str) -> dict:
    english_clean = english.strip().lower()
    existing = DeckWord.query.filter_by(student_id=student.id, english=english_clean).first()
    if existing:
        return {"added": False, "duplicate": True, "word": existing.to_dict()}

    dic = get_dictionary().by_english(english_clean)
    image = word_image(english_clean, dic["emoji"], dic["hue"]) if dic else word_image(english_clean, "📝", 199)

    word = DeckWord(
        student_id=student.id,
        indonesian=indonesian.strip(),
        english=english_clean,
        image=image,
        mastery=0,
        learned_at=datetime.datetime.utcnow(),
    )
    db.session.add(word)
    db.session.commit()
    return {"added": True, "duplicate": False, "word": word.to_dict()}


def bump_mastery(student, english: str, delta: int = 1, cap: int = 5) -> None:
    word = DeckWord.query.filter_by(student_id=student.id, english=english.lower()).first()
    if word:
        word.mastery = min(cap, max(0, word.mastery + delta))
        db.session.commit()


def eligible_words(student) -> list:
    return [w.to_dict() for w in DeckWord.query.filter_by(student_id=student.id).all()]
