// --- MODULE: EMOTION_SELECTOR.PY (AIDA BLUE PHASE) ---
const EMOTION_SELECTOR_PY = `
import math
import random

# --- Embedded Data Structures ---
EMBEDDED_COORDS = {
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

EMBEDDED_FACE_MAP = {
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
        "know_it_all": ["Know_It_All.png"],
        "standby": ["stanby-rot1.png", "stanby-rot2.png", "stanby-rot3.png", "stanby-rot4.png", "stanby-rot5.png", "stanby-rot6.png"]
    }
}

class EmotionSelector:
    def __init__(self, coords=None, face_map=None):
        self.coords = coords or EMBEDDED_COORDS
        self.faces = (face_map or EMBEDDED_FACE_MAP).get("faces", {})

    def select_emotion(self, v, a):
        # Logic to find the closest emotion in the valence/arousal plane
        best_label = "neutral"
        min_dist = 999.0
        for label, coord in self.coords.items():
            dist = math.sqrt((v - coord["valence"])**2 + (a - coord["arousal"])**2)
            if dist < min_dist:
                min_dist = dist
                best_label = label
        
        variants = self.faces.get(best_label, ["neutral1.png"])
        return {"label": best_label, "face": random.choice(variants)}
`;