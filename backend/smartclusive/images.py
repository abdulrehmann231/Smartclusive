import urllib.parse


def svg_data_uri(label: str, emoji: str, hue: int = 199) -> str:
    """Return a data-URI SVG card matching the frontend mock image style."""
    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>"
        f"<rect width='320' height='200' fill='hsl({hue},70%,92%)'/>"
        f"<text x='160' y='96' font-size='72' text-anchor='middle'>{emoji}</text>"
        f"<text x='160' y='160' font-size='26' font-family='Segoe UI, sans-serif' "
        f"font-weight='700' fill='hsl({hue},45%,35%)' text-anchor='middle'>{label}</text>"
        f"</svg>"
    )
    return "data:image/svg+xml;utf8," + urllib.parse.quote(svg)


_ASL_EMOJI = {
    # Placeholder reference images — a colored tile with the letter/digit and a hand emoji.
    # Replace with real ASL fingerspelling assets when available.
    "default": "🤟",
}


def asl_reference_image(char: str) -> str:
    """Return a placeholder reference image for an ASL letter or digit."""
    hue = (ord(char) * 17) % 360
    return svg_data_uri(char, _ASL_EMOJI.get("default", "🤟"), hue)


def word_image(english: str, emoji: str, hue: int) -> str:
    return svg_data_uri(english, emoji, hue)


import re


def fingerspelling_for(word: str) -> dict:
    clean = re.sub(r"[^A-Z0-9]", "", word.upper())
    return {
        "word": clean,
        "letters": [
            {"letter": ch, "image": asl_reference_image(ch)}
            for ch in clean
        ],
    }
