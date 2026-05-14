# 020-emotion_green.py
# THE EMOTION ENGINE (AWAKE MODE)

from pyscript import window
from datetime import datetime, timezone
import json
import math
import random

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def _clamp(x, lo, hi):
    return max(lo, min(hi, x))

class EmotionEngine:
    def __init__(self, base_dir="/workspace/default"):
        self.base_dir = base_dir
        
        # Initial State
        self.state = {
            "valence": 0.1,
            "arousal": -0.1,
            "label": "neutral",
            "face": "neutral1.png",
            "mode": "Muse"
        }

        # Constants for "Human-like" behavior
        self.baseline_valence = 0.25
        self.baseline_arousal = -0.05
        self.damping = 0.15
        self.impulse_scale = 0.6
        self.micro_motion = 0.02

    def apply_impulse(self, dv, da):
        """External triggers (like user praise or insults) call this."""
        self.state["valence"] += dv * self.impulse_scale
        self.state["arousal"] += da * self.impulse_scale
        self._update()

    def tick(self):
        """The 'Heartbeat'—brings her back to center and adds tiny life movements."""
        # Damping toward baseline
        self.state["valence"] += (self.baseline_valence - self.state["valence"]) * self.damping
        self.state["arousal"] += (self.baseline_arousal - self.state["arousal"]) * self.damping
        
        # Micro-motion (jitter)
        self.state["valence"] += random.uniform(-self.micro_motion, self.micro_motion)
        self._update()

    def _update(self):
        self.state["valence"] = _clamp(self.state["valence"], -1.0, 1.0)
        self.state["arousal"] = _clamp(self.state["arousal"], -1.0, 1.0)

        # Call the JS Selector to get the Face/Label
        if hasattr(window, "emotion_selector"):
            res = window.emotion_selector.select_emotion(
                self.state["valence"], 
                self.state["arousal"]
            )
            self.state.update({
                "label": res.label,
                "face": res.face,
                "distance": res.distance
            })

        # Expose context to the whole system
        window.emotion_ctx = json.loads(json.dumps(self.state))
        
        # Trigger the Visual Sync
        if hasattr(window, "hologram_sync"):
            window.hologram_sync.update(window.emotion_ctx)

# Initialize
window.emotion_engine = EmotionEngine()
