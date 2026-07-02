# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\python\tetrad_chassis.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
from identity_organ import IdentityEngine
from realm_organ import RealmEngine
from role_organ import RoleEngine
from emotion_selector import EmotionSelector
import json
from pathlib import Path


# AIDA REVIEW BLOCK 3: Function load_emotion_state - callable organ behavior.
def load_emotion_state(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# AIDA REVIEW BLOCK 4: Function assemble_tetrad - callable organ behavior.
def assemble_tetrad(
    core_identity,
    realm_config,
    role_config,
    emotion_state_path: Path
):
    realm_engine = RealmEngine(realm_config)
    realm_ctx = realm_engine.get_resolved_realm()

    role_engine = RoleEngine(role_config)
    role_ctx = role_engine.get_resolved_role()

    identity_engine = IdentityEngine(core_identity, realm_ctx, role_ctx)
    identity_ctx = identity_engine.get_resolved_identity()

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
        "face": emo_result["face"] or "neutral1.png",
        "gap_candidate": emo_result["gap_candidate"],
        "between_labels": emo_result["between_labels"],
        "distance": emo_result["distance"],
        "tags": emotion_state.get("tags", []),
        "mode": emotion_state.get("mode", "")
    }

    tetrad = {
        "identity": identity_ctx,
        "realm": realm_ctx,
        "role": role_ctx,
        "emotion": emotion_ctx
    }

    return tetrad
