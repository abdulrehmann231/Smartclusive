#!/usr/bin/env python3
"""Generate short placeholder MP4 lesson videos for local development and Render.

Requires opencv-python (already listed in backend/requirements.txt).
Run after installing dependencies:

    python backend/scripts/generate_lesson_videos.py

The script writes:
    backend/static/letters.mp4
    backend/static/numbers.mp4

Replace these with real ASL lesson videos when available.
"""

import os
import sys

# Allow importing from the backend package when run from the repo root.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from smartclusive.config import STATIC_DIR

try:
    import cv2
    import numpy as np
except ImportError as exc:
    print(f"Missing dependency: {exc}")
    print("Install backend requirements first: pip install -r backend/requirements.txt")
    raise SystemExit(1) from exc


WIDTH, HEIGHT = 640, 480
FPS = 10
DURATION_SECONDS = 8
SLIDE_SECONDS = 1.5


SLIDES = {
    "letters": [
        ("Alfabet ASL", "Pelajaran huruf"),
        ("A", "Kepalkan tangan, ibu jari di samping"),
        ("B", "Jari lurus rapat, telapak ke depan"),
        ("C", "Bentuk huruf C dengan jari"),
        ("D", "Telunjuk ke atas, jari lainnya melengkung"),
        ("E", "Jari melengkung ke bawah"),
        ("Bagus!", "Lanjut latihan di kuis"),
    ],
    "numbers": [
        ("Angka ASL", "Pelajaran angka"),
        ("1", "Telunjuk ke atas"),
        ("2", "Telunjuk dan jari tengah"),
        ("3", "Tiga jari menyatu"),
        ("4", "Empat jari lurus"),
        ("5", "Lima jari terbuka"),
        ("Hebat!", "Kamu siap untuk kuis"),
    ],
}


def render_slide(title: str, subtitle: str, width: int, height: int) -> "np.ndarray":
    """Render a single slide as a BGR OpenCV image."""
    # Soft gradient-ish background.
    img = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        color = (230 - int(30 * y / height), 240 - int(20 * y / height), 250)
        img[y, :] = color

    # Centered text.
    cv2.putText(
        img,
        title,
        (width // 2, height // 2 - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.6,
        (30, 40, 50),
        3,
        cv2.LINE_AA,
    )
    cv2.putText(
        img,
        subtitle,
        (width // 2, height // 2 + 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (60, 70, 80),
        2,
        cv2.LINE_AA,
    )
    return img


def write_video(kind: str, slides: list, output_path: str) -> None:
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, FPS, (WIDTH, HEIGHT))
    if not writer.isOpened():
        raise RuntimeError(f"Could not open VideoWriter for {output_path}")

    frames_per_slide = int(FPS * SLIDE_SECONDS)
    for title, subtitle in slides:
        frame = render_slide(title, subtitle, WIDTH, HEIGHT)
        for _ in range(frames_per_slide):
            writer.write(frame)

    # Pad to target duration with a final "ready" slide.
    total_frames = FPS * DURATION_SECONDS
    remaining = max(0, total_frames - len(slides) * frames_per_slide)
    ready = render_slide("Siap!", "Tonton sampai selesai untuk kuis", WIDTH, HEIGHT)
    for _ in range(remaining):
        writer.write(ready)

    writer.release()
    print(f"Wrote {output_path}")


def main():
    os.makedirs(STATIC_DIR, exist_ok=True)
    for kind, slides in SLIDES.items():
        output = os.path.join(STATIC_DIR, f"{kind}.mp4")
        write_video(kind, slides, output)
    print("Done. Replace the generated files with real ASL lesson videos when available.")


if __name__ == "__main__":
    main()
