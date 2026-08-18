import os
import requests
from typing import Optional

# Optional offline translator. If not installed or not ready, fall back to the MyMemory API.
_argos = None


def _import_argos():
    global _argos
    if _argos is None:
        try:
            import argostranslate.package
            import argostranslate.translate
            _argos = argostranslate
        except Exception:
            _argos = False
    return _argos


def _argos_translate(text: str) -> Optional[str]:
    argos = _import_argos()
    if not argos:
        return None
    try:
        # argostranslate caches installed packages; from_code/to_code are positional.
        return argos.translate.translate(text, "en", "id")
    except Exception:
        return None


def _mymemory_translate(text: str) -> Optional[str]:
    try:
        resp = requests.get(
            "https://api.mymemory.translated.net/get",
            params={"q": text, "langpair": "en|id"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("responseData", {}).get("translatedText")
    except Exception:
        return None


def translate_en_to_id(text: str) -> str:
    """Translate an English word/phrase to Indonesian. Never raises."""
    text = text.strip()
    if not text:
        return text
    try:
        result = _argos_translate(text)
        if result and result.lower() != text.lower():
            return result
    except Exception:
        pass
    try:
        result = _mymemory_translate(text)
        if result:
            return result
    except Exception:
        pass
    # Last-resort fallback: echo the English label so the UI still has text.
    return text
