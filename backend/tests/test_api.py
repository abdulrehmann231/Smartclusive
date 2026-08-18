import base64
import io
import os
import pytest

from PIL import Image

from app import create_app


@pytest.fixture
def client():
    app = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    with app.app_context():
        from smartclusive.models import db
        db.create_all()
        yield app.test_client()


def _png_bytes() -> bytes:
    img = Image.new("RGB", (64, 64), color=(120, 180, 240))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _auth(client, email="test@example.com"):
    r = client.post(
        "/api/auth/register",
        json={"name": "Test Student", "email": email, "password": "secret123"},
    )
    assert r.status_code == 201, r.get_json()
    return r.get_json()["token"]


def test_register_and_login(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "A", "email": "a@example.com", "password": "pw"},
    )
    assert r.status_code == 201
    data = r.get_json()
    assert "token" in data
    assert data["student"]["email"] == "a@example.com"

    # Duplicate email rejected.
    r = client.post(
        "/api/auth/register",
        json={"name": "A", "email": "a@example.com", "password": "pw"},
    )
    assert r.status_code == 409
    assert r.get_json()["error"] == "email_taken"

    # Wrong credentials rejected.
    r = client.post(
        "/api/auth/login", json={"email": "a@example.com", "password": "wrong"}
    )
    assert r.status_code == 401

    r = client.post("/api/auth/login", json={"email": "a@example.com", "password": "pw"})
    assert r.status_code == 200


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401
    token = _auth(client)
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.get_json()["student"]["email"] == "test@example.com"


def test_deck_flow(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/deck", headers=h)
    assert r.status_code == 200
    assert r.get_json()["words"] == []

    r = client.post(
        "/api/deck",
        headers=h,
        json={"indonesian": "kucing", "english": "cat"},
    )
    assert r.status_code == 200
    assert r.get_json()["added"] is True

    r = client.post(
        "/api/deck",
        headers=h,
        json={"indonesian": "kucing", "english": "cat"},
    )
    assert r.status_code == 200
    assert r.get_json()["duplicate"] is True

    r = client.get("/api/deck", headers=h)
    assert len(r.get_json()["words"]) == 1


def test_card_and_guess(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/cards/next", headers=h)
    assert r.status_code == 200
    card = r.get_json()
    assert "cardId" in card
    assert len(card["options"]) == 4

    # Derive the correct option from the dictionary.
    from smartclusive.dictionary import get_dictionary
    correct_word = get_dictionary().by_indonesian(card["indonesian"])
    assert correct_word is not None
    correct_id = f"opt-{correct_word['english']}"

    r = client.post(
        "/api/cards/guess",
        headers=h,
        json={"indonesian": card["indonesian"], "optionId": correct_id},
    )
    assert r.status_code == 200
    data = r.get_json()
    assert data["correct"] is True
    assert "fingerspelling" in data


def test_quiz_requires_min_deck(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}
    r = client.post("/api/quiz/start?mode=sign_word", headers=h)
    assert r.status_code == 422
    assert r.get_json()["error"] == "deck_too_small"


def test_quiz_word_flow(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    words = [
        ("kucing", "cat"),
        ("anjing", "dog"),
        ("buku", "book"),
    ]
    for idn, eng in words:
        assert client.post("/api/deck", headers=h, json={"indonesian": idn, "english": eng}).status_code == 200

    r = client.post("/api/quiz/start?mode=sign_word", headers=h)
    assert r.status_code == 200
    quiz = r.get_json()
    assert len(quiz["items"]) > 0

    for item in quiz["items"]:
        r = client.post(
            f"/api/quiz/{quiz['quizId']}/answer",
            headers=h,
            json={"itemId": item["id"], "correct": True},
        )
        assert r.status_code == 200

    r = client.post(f"/api/quiz/{quiz['quizId']}/finish", headers=h)
    assert r.status_code == 200
    result = r.get_json()
    assert result["correct"] == len(quiz["items"])
    assert result["total"] == len(quiz["items"])


def test_videos_flow(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/videos", headers=h)
    assert r.status_code == 200
    videos = r.get_json()["videos"]
    assert len(videos) == 2

    r = client.post(f"/api/videos/{videos[0]['id']}/complete", headers=h)
    assert r.status_code == 200
    data = r.get_json()
    assert data["completed"] is True
    assert "quiz" in data

    r = client.get("/api/videos", headers=h)
    assert r.get_json()["videos"][0]["completed"] is True


def test_detect_demo_fallback(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    data = {"image": (io.BytesIO(_png_bytes()), "snap.png")}
    r = client.post("/api/detect", headers=h, data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    result = r.get_json()
    # Demo fallback may or may not be active depending on env, but the request should not crash.
    if result.get("detected"):
        assert "box" in result
        assert "fingerspelling" in result


def test_sign_rest_session(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/sign/start", headers=h, json={"target": "CAT", "kind": "word"})
    assert r.status_code == 200
    sid = r.get_json()["sessionId"]

    r = client.get(f"/api/sign/state?sessionId={sid}", headers=h)
    assert r.status_code == 200
    assert r.get_json()["target"] == "CAT"

    # Send a dummy frame with no hand; verifier should remain at the first letter.
    frame_b64 = base64.b64encode(_png_bytes()).decode()
    r = client.post(
        "/api/sign/frame", headers=h, json={"sessionId": sid, "image": frame_b64}
    )
    assert r.status_code == 200
    assert r.get_json()["expected"] == "C"

    r = client.post("/api/sign/stop", headers=h, json={"sessionId": sid})
    assert r.status_code == 200
