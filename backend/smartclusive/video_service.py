import datetime
from smartclusive.models import db, VideoProgress
from smartclusive.quiz_service import video_quiz_items


VIDEOS = [
    {
        "id": "v-letters",
        "title": "Alfabet ASL",
        "type": "letters",
        "url": "https://youtu.be/6byePgEZT2s",
        "captionsUrl": "",
    },
    {
        "id": "v-numbers",
        "title": "Angka ASL",
        "type": "numbers",
        "url": "/mock/numbers.mp4",
        "captionsUrl": "/mock/numbers.id.vtt",
    },
    {
        "id": "v-words",
        "title": "Kata-kata ASL",
        "type": "words",
        "url": "/mock/words.mp4",
        "captionsUrl": "/mock/words.id.vtt",
    },
]


def list_videos(student) -> list:
    completed_ids = {
        vp.video_id for vp in VideoProgress.query.filter_by(student_id=student.id).all() if vp.is_completed()
    }
    return [{**v, "completed": v["id"] in completed_ids} for v in VIDEOS]


def complete_video(student, video_id: str) -> tuple:
    video = next((v for v in VIDEOS if v["id"] == video_id), None)
    if not video:
        return None, ("video_not_found", 404)

    vp = VideoProgress.query.filter_by(student_id=student.id, video_id=video_id).first()
    if not vp:
        vp = VideoProgress(student_id=student.id, video_id=video_id)
        db.session.add(vp)
    vp.completed_at = datetime.datetime.utcnow()
    vp.quiz_result = None
    db.session.commit()

    items = video_quiz_items(video["type"])
    return {"completed": True, "quiz": {"quizId": f"vq-{video_id}", "items": items}}, None


def record_video_quiz_result(student, video_id: str, result: dict) -> None:
    vp = VideoProgress.query.filter_by(student_id=student.id, video_id=video_id).first()
    if vp:
        vp.quiz_result = result
        db.session.commit()
