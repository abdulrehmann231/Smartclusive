import re
import urllib.parse


# Public-domain ASL alphabet illustrations from Wikimedia Commons.
# See: https://commons.wikimedia.org/wiki/Category:American_Sign_Language_fingerspelling
_WIKIMEDIA_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"


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


def asl_reference_image(char: str) -> str:
    """Return an ASL fingerspelling reference image for a letter or digit."""
    # Letters A–Z use public-domain Wikimedia Commons illustrations.
    if "A" <= char <= "Z":
        file_name = f"Sign_language_{char}.svg"
        return _WIKIMEDIA_BASE + urllib.parse.quote(file_name)
    # Digits fall back to a colored placeholder until real ASL number assets are added.
    hue = (ord(char) * 17) % 360
    return svg_data_uri(char, "🤟", hue)


def word_image(english: str, emoji: str, hue: int) -> str:
    return svg_data_uri(english, emoji, hue)


def fingerspelling_for(word: str) -> dict:
    clean = re.sub(r"[^A-Z0-9]", "", word.upper())
    return {
        "word": clean,
        "letters": [
            {"letter": ch, "image": asl_reference_image(ch)}
            for ch in clean
        ],
    }
