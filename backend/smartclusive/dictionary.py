import json
import os
import random
from typing import Optional

from smartclusive.config import DATA_DIR
from smartclusive.images import fingerspelling_for, word_image


class Dictionary:
    def __init__(self, path: Optional[str] = None):
        self.path = path or os.path.join(DATA_DIR, "dictionary.json")
        with open(self.path, "r", encoding="utf-8") as f:
            self.words = json.load(f)
        self._by_english = {w["english"].lower(): w for w in self.words}
        self._by_indonesian = {w["indonesian"].lower(): w for w in self.words}

    def all(self) -> list:
        return self.words

    def by_english(self, english: str) -> Optional[dict]:
        return self._by_english.get(english.lower())

    def by_indonesian(self, indonesian: str) -> Optional[dict]:
        return self._by_indonesian.get(indonesian.lower())

    def card_options_for(self, correct: dict) -> list:
        """Return exactly four distinct options with one correct answer."""
        distractors = correct.get("distractors") or []
        distractor_words = [
            self.by_english(e)
            for e in distractors
            if self.by_english(e) and e.lower() != correct["english"].lower()
        ]
        while len(distractor_words) < 3:
            other = random.choice(self.words)
            if other["english"].lower() != correct["english"].lower() and other not in distractor_words:
                distractor_words.append(other)
        options = [correct] + distractor_words[:3]
        random.shuffle(options)
        return [
            {
                "id": f"opt-{opt['english']}",
                "english": opt["english"],
                "image": word_image(opt["english"], opt["emoji"], opt["hue"]),
            }
            for opt in options
        ]

    def fingerspelling(self, english: str) -> dict:
        return fingerspelling_for(english)


_dictionary: Optional[Dictionary] = None


def get_dictionary() -> Dictionary:
    global _dictionary
    if _dictionary is None:
        _dictionary = Dictionary()
    return _dictionary
