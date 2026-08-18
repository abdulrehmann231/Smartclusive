import secrets
from flask import request, g
from werkzeug.security import generate_password_hash, check_password_hash

from smartclusive.models import db, Student, AuthToken


def _hash(password: str) -> str:
    return generate_password_hash(password)


def _verify(password: str, hashed: str) -> bool:
    return check_password_hash(hashed, password)


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def register_student(name: str, email: str, password: str) -> tuple:
    email = email.lower().strip()
    if Student.query.filter_by(email=email).first():
        return None, "email_taken"
    student = Student(name=name.strip(), email=email, password_hash=_hash(password))
    db.session.add(student)
    db.session.commit()
    token = AuthToken(token=_new_token(), student_id=student.id)
    db.session.add(token)
    db.session.commit()
    return {"token": token.token, "student": student.to_dict()}, None


def login_student(email: str, password: str) -> tuple:
    email = email.lower().strip()
    student = Student.query.filter_by(email=email).first()
    if student is None or not _verify(password, student.password_hash):
        return None, "invalid_credentials"
    token = AuthToken(token=_new_token(), student_id=student.id)
    db.session.add(token)
    db.session.commit()
    return {"token": token.token, "student": student.to_dict()}, None


def logout_student(token: str) -> None:
    if not token:
        return
    AuthToken.query.filter_by(token=token).delete()
    db.session.commit()


def student_from_token(token: str):
    if not token:
        return None
    auth = AuthToken.query.filter_by(token=token).first()
    if auth is None:
        return None
    return auth.student


def get_auth_token() -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return request.headers.get("X-Token", "") or request.args.get("token", "")


def require_student():
    student = student_from_token(get_auth_token())
    if student is None:
        return None, ("unauthorized", 401)
    return student, None


def load_student():
    """Optional before-request helper to set g.student when a token is present."""
    g.student = student_from_token(get_auth_token())
