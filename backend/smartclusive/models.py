import datetime
import uuid
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _uuid() -> str:
    return uuid.uuid4().hex


class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.String(32), primary_key=True, default=_uuid)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    deck = db.relationship("DeckWord", backref="student", lazy="dynamic", cascade="all, delete-orphan")
    tokens = db.relationship("AuthToken", backref="student", lazy="dynamic", cascade="all, delete-orphan")
    video_progress = db.relationship("VideoProgress", backref="student", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "email": self.email}


class AuthToken(db.Model):
    __tablename__ = "auth_tokens"
    token = db.Column(db.String(64), primary_key=True)
    student_id = db.Column(db.String(32), db.ForeignKey("students.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class DeckWord(db.Model):
    __tablename__ = "deck_words"
    id = db.Column(db.String(32), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(32), db.ForeignKey("students.id"), nullable=False, index=True)
    indonesian = db.Column(db.String(120), nullable=False)
    english = db.Column(db.String(120), nullable=False)
    image = db.Column(db.Text, nullable=False)
    mastery = db.Column(db.Integer, default=0, nullable=False)
    learned_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("student_id", "english", name="uix_student_word"),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "indonesian": self.indonesian,
            "english": self.english,
            "image": self.image,
            "mastery": self.mastery,
            "learnedAt": self.learned_at.isoformat() + "Z" if self.learned_at else None,
        }


class VideoProgress(db.Model):
    __tablename__ = "video_progress"
    id = db.Column(db.String(32), primary_key=True, default=_uuid)
    student_id = db.Column(db.String(32), db.ForeignKey("students.id"), nullable=False, index=True)
    video_id = db.Column(db.String(32), nullable=False, index=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    quiz_result = db.Column(db.JSON, nullable=True)

    __table_args__ = (db.UniqueConstraint("student_id", "video_id", name="uix_student_video"),)

    def is_completed(self) -> bool:
        return self.completed_at is not None
