# triad.py (updated for Tetrad)

from identity_engine import IdentityEngine
from realm_engine import RealmEngine
from role_engine import RoleEngine
from emotion_selector import EmotionSelector
import json
from pathlib import Path


def load_emotion_state(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def assemble_tetrad(core_identity,
                    realm_config,
                    role_config,
                    emotion_state_path: Path):
    """
    Builds the unified mind-state for Aida.
    Now includes the 4th organ: emotion.
    """

    # 1. Realm (environment)
    realm_engine = RealmEngine(realm_config)
    realm_ctx = realm_engine.get_resolved_realm()

    # 2. Role (mode)
    role_engine = RoleEngine(role_config)
    role_ctx = role_engine.get_resolved_role()

    # 3. Identity (self)
    identity_engine = IdentityEngine(core_identity, realm_ctx, role_ctx)
    identity_ctx = identity_engine.get_resolved_identity()

    # 4. Emotion (valence/arousal → label + face)
    emotion_state = load_emotion_state(emotion_state_path)
    selector = EmotionSelector()
    emo_result = selector.select_emotion(
        valence=emotion_state["valence"],
        arousal=emotion_state["arousal"]
    )

    emotion_ctx = {
        "valence": emotion_state["valence"],
        "arousal": emotion_state["arousal"],
        "label": emo_result["label"],
        "face": emo_result["face"],
        "gap_candidate": emo_result["gap_candidate"],
        "between_labels": emo_result["between_labels"],
        "distance": emo_result["distance"],
        "tags": emotion_state.get("tags", []),
        "mode": emotion_state.get("mode", "")
    }

    # Final unified mind-state
    tetrad = {
        "identity": identity_ctx,
        "realm": realm_ctx,
        "role": role_ctx,
        "emotion": emotion_ctx
    }

    return tetrad
