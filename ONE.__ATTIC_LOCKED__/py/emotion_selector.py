# AIDA REVIEW BLOCK 1: File header - ONE\py\emotion_selector.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
import json
import math
import random
from pathlib import Path

BASE_DIR = Path(__file__).parent

EMOTION_COORDS_PATH = BASE_DIR / "emotion_coordinates.json"
FACE_MAP_PATH = BASE_DIR / "face_map.json"


# AIDA REVIEW BLOCK 3: Class EmotionSelector - grouped organ/service behavior.
class EmotionSelector:
# AIDA REVIEW BLOCK 4: Function __init__ - callable organ behavior.
    def __init__(self,
                 coords_path: Path = EMOTION_COORDS_PATH,
                 face_map_path: Path = FACE_MAP_PATH,
                 gap_distance_threshold: float = 0.45,
                 between_ratio_threshold: float = 1.2):
        """
        gap_distance_threshold:
            If the closest emotion is farther than this distance,
            we consider it a 'gap' region.

        between_ratio_threshold:
            If dist2 / dist1 < this ratio, we consider Aida to be
            'between' two emotions (candidate for a new label).
        """
        self.coords = self._load_json(coords_path)
        self.face_map = self._load_json(face_map_path)
        self.gap_distance_threshold = gap_distance_threshold
        self.between_ratio_threshold = between_ratio_threshold

        # Strip meta blocks if present
        self.emotions = {
            k: v for k, v in self.coords.items()
            if not k.startswith("__")
        }
        self.faces = self.face_map.get("faces", {})
        self.transitions = self.face_map.get("transitions", {})

    @staticmethod
# AIDA REVIEW BLOCK 5: Function _load_json - callable organ behavior.
    def _load_json(path: Path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
# AIDA REVIEW BLOCK 6: Function _distance - callable organ behavior.
    def _distance(v1, a1, v2, a2) -> float:
        return math.sqrt((v1 - v2) ** 2 + (a1 - a2) ** 2)

# AIDA REVIEW BLOCK 7: Function find_closest_emotions - callable organ behavior.
    def find_closest_emotions(self, valence: float, arousal: float):
        distances = []
        for label, coords in self.emotions.items():
            d = self._distance(
                valence, arousal,
                coords["valence"], coords["arousal"]
            )
            distances.append((label, d))

        distances.sort(key=lambda x: x[1])
        return distances  # list of (label, distance)

# AIDA REVIEW BLOCK 8: Function select_emotion - callable organ behavior.
    def select_emotion(self, valence: float, arousal: float):
        """
        Returns:
            {
              "label": str,
              "face": str,
              "gap_candidate": bool,
              "between_labels": [str, str] | None,
              "distance": float
            }
        """
        ranked = self.find_closest_emotions(valence, arousal)
        if not ranked:
            return {
                "label": "neutral",
                "face": self._pick_face("neutral"),
                "gap_candidate": False,
                "between_labels": None,
                "distance": 0.0
            }

        (label1, dist1) = ranked[0]
        (label2, dist2) = ranked[1] if len(ranked) > 1 else (None, None)

        gap_candidate = dist1 > self.gap_distance_threshold
        between_labels = None

        if label2 is not None and dist1 > 0:
            ratio = dist2 / dist1
            if ratio < self.between_ratio_threshold:
                # Aida is 'between' two emotions
                between_labels = [label1, label2]

        face = self._pick_face(label1)

        return {
            "label": label1,
            "face": face,
            "gap_candidate": gap_candidate or (between_labels is not None),
            "between_labels": between_labels,
            "distance": dist1
        }

# AIDA REVIEW BLOCK 9: Function _pick_face - callable organ behavior.
    def _pick_face(self, label: str) -> str:
        variants = self.faces.get(label)
        if not variants:
            # Fallback to neutral if no faces defined
            neutral_variants = self.faces.get("neutral", [])
            if neutral_variants:
                return random.choice(neutral_variants)
            return ""  # last resort

        return random.choice(variants)

