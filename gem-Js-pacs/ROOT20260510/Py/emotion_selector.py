# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\Py\emotion_selector.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
# ==========================================================
#  emotion_selector.py â€” Embedded, Selfâ€‘Contained Version
# ==========================================================
# This version removes all filesystem access and embeds the
# JSON data directly into the module. Fully Pyodideâ€‘safe.
# ==========================================================

import math
import random

# ----------------------------------------------------------
# Embedded JSON: emotion_coordinates.json
# ----------------------------------------------------------
EMBEDDED_COORDS = {
    "__meta": {
        "description": "Defines the valence/arousal coordinates for each of Aida's named emotions. Used by the emotion selector to map coordinates to emotion labels.",
        "model": {
            "valence": "Emotional positivity from -1.0 (negative) to +1.0 (positive).",
            "arousal": "Energy level from -1.0 (calm/sleepy) to +1.0 (excited/intense).",
            "notes": "These coordinates define meaning, not visuals. Face variants live in face_map.json."
        }
    },

    "happy":       { "valence": 0.8,  "arousal": 0.4 },
    "excited":     { "valence": 0.9,  "arousal": 0.9 },
    "mischievous": { "valence": 0.5,  "arousal": 0.7 },
    "neutral":     { "valence": 0.1,  "arousal": -0.1 },
    "focused":     { "valence": 0.0,  "arousal": 0.8 },
    "curious":     { "valence": 0.3,  "arousal": 0.5 },
    "concerned":   { "valence": -0.3, "arousal": 0.4 },
    "calm":        { "valence": 0.0,  "arousal": -0.6 },
    "angry":       { "valence": -0.7, "arousal": 0.8 },
    "sad":         { "valence": -0.6, "arousal": -0.4 },
    "pouting":     { "valence": -0.2, "arousal": -0.1 },
    "sarcastic":   { "valence": -0.1, "arousal": 0.3 },
    "surprised":   { "valence": 0.2,  "arousal": 0.9 },
    "inviting":    { "valence": 0.6,  "arousal": 0.2 },
    "lure":        { "valence": 0.4,  "arousal": 0.3 },
    "hello":       { "valence": 0.5,  "arousal": 0.1 },
    "goodbye":     { "valence": -0.1, "arousal": -0.2 },
    "know_it_all": { "valence": 0.1,  "arousal": 0.6 },
    "standby":     { "valence": 0.0,  "arousal": -0.8 }
}

# ----------------------------------------------------------
# Embedded JSON: face_map.json
# ----------------------------------------------------------
EMBEDDED_FACE_MAP = {
    "__meta": {
        "description": "Maps Aida's emotional labels to the filenames of her facial expression images. The loader resolves these filenames inside the Google Drive emotions folder.",
        "notes": {
            "no_paths": "Only filenames are stored here. The runtime loader handles folder ID, Drive API search, and blob retrieval.",
            "variants": "Multiple images per emotion allow Aida to pick a variant for natural expression.",
            "transitions": "Transition frames are optional and used for animated emotional shifts.",
            "characters": "Character emotion maps belong inside each project briefcase, not here."
        }
    },

    "faces": {
        "calm": ["calm1.png", "calm2.png"],
        "angry": ["angry.png"],
        "concerned": ["concerned1.png", "concerned2.png"],
        "excited": ["excited1.png", "excited2.png"],
        "focused": ["focused1.png", "focused2.png"],
        "happy": ["happy1.png", "happy2.png", "happy3.png", "happy4.png", "happy5.png"],
        "neutral": ["neutral1.png", "neutral2.png"],
        "mischievous": ["mischievous1.png", "mischievous2.png", "mischievous3.png", "mischievous4.png"],
        "pouting": ["pouting1.png", "pouting2.png", "pouting3.png", "pouting4.png"],
        "sad": ["sad1.png", "sad2.png"],
        "sarcastic": ["sarcastic1.png", "sarcastic2.png", "sarcastic3.png"],
        "surprised": ["surprised1.png", "surprised2.png", "surprised3.png"],
        "inviting": ["inviting1.png", "inviting2.png"],
        "lure": ["lure1.png", "lure2.png"],
        "hello": ["hello.png"],
        "goodbye": ["goodbye.png"],
        "hello_goodbye": ["hello-goobye.png"],
        "know_it_all": ["Know_It_All.png"],
        "standby": [
            "stanby-rot1.png",
            "stanby-rot2.png",
            "stanby-rot3.png",
            "stanby-rot4.png",
            "stanby-rot5.png",
            "stanby-rot6.png"
        ]
    },

    "transitions": {
        "concerned_to_focus": ["trans_concerned_to_focus.png"],
        "concerned_to_sad": ["trans_concerned_to_sad.png"],
        "calm_to_happy": ["trans_calm_to_happy.png"],
        "calm_to_neutral": ["trans_calm_to_neutral.png"],
        "exited_to_happy": ["trans_exited_to_happy.png"],
        "exited_to_surprised": ["trans_exited_to_surprised.png"],
        "focus": ["trans_focus.png"],
        "focus_to_surprised": ["trans_focus_to_surprised.png"],
        "focus_to_concerned": ["trans_focus_to_concerned.png"],
        "sad_to_concerned": ["trans_sad_to_concerned.png"],
        "surprised_to_calm": ["trans_surprised_to_calm.png"],
        "happy_to_exited": ["trans_happy_to_exited.png"],
        "sad_to_neutral": ["trans_sad_to_neutral.png"],
        "neutral_to_calm": ["trans_neutral_to_calm.png"],
        "surprised_to_exited": ["trans_surprised_to_exited.png"],
        "surprised_to_focus": ["trans_surprised_to_focus.png"]
    }
}

# ==========================================================
#  EmotionSelector (unchanged logic, no FS access)
# ==========================================================
# AIDA REVIEW BLOCK 3: Class EmotionSelector - grouped organ/service behavior.
class EmotionSelector:
# AIDA REVIEW BLOCK 4: Function __init__ - callable organ behavior.
    def __init__(
        self,
        coords=None,
        face_map=None,
        gap_distance_threshold: float = 0.45,
        between_ratio_threshold: float = 1.2
    ):
        # Use embedded data unless overridden
        self.coords = coords or EMBEDDED_COORDS
        self.face_map = face_map or EMBEDDED_FACE_MAP

        self.gap_distance_threshold = gap_distance_threshold
        self.between_ratio_threshold = between_ratio_threshold

        # Filter out __meta
        self.emotions = {
            k: v for k, v in self.coords.items()
            if not k.startswith("__")
        }

        self.faces = self.face_map.get("faces", {})
        self.transitions = self.face_map.get("transitions", {})

    @staticmethod
# AIDA REVIEW BLOCK 5: Function _distance - callable organ behavior.
    def _distance(v1, a1, v2, a2) -> float:
        return math.sqrt((v1 - v2) ** 2 + (a1 - a2) ** 2)

# AIDA REVIEW BLOCK 6: Function find_closest_emotions - callable organ behavior.
    def find_closest_emotions(self, valence: float, arousal: float):
        distances = []
        for label, coords in self.emotions.items():
            d = self._distance(
                valence, arousal,
                coords["valence"], coords["arousal"]
            )
            distances.append((label, d))

        distances.sort(key=lambda x: x[1])
        return distances

# AIDA REVIEW BLOCK 7: Function select_emotion - callable organ behavior.
    def select_emotion(self, valence: float, arousal: float):
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
                between_labels = [label1, label2]

        face = self._pick_face(label1)

        return {
            "label": label1,
            "face": face,
            "gap_candidate": gap_candidate or (between_labels is not None),
            "between_labels": between_labels,
            "distance": dist1
        }

# AIDA REVIEW BLOCK 8: Function _pick_face - callable organ behavior.
    def _pick_face(self, label: str) -> str:
        variants = self.faces.get(label)
        if not variants:
            neutral_variants = self.faces.get("neutral", [])
            if neutral_variants:
                return random.choice(neutral_variants)
            return "neutral1.png"

        return random.choice(variants)
