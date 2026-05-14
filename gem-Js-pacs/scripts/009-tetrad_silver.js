// --- MODULE: TETRAD_CHASSIS.PY (SILVER PHASE) ---
const TETRAD_PY = `
import json
from identity_organ import IdentityEngine
from realm_organ import RealmEngine
from role_organ import RoleEngine
from emotion_selector import EmotionSelector

def assemble_tetrad(core_identity, realm_config, role_config, emotion_state):
    """
    The Blender: Fuses all organs into a single Aida context.
    Modified for Pyodide virtual memory.
    """
    try:
        # 1. Initialize Engines
        realm_engine = RealmEngine(realm_config)
        realm_ctx = realm_engine.resolved_realm

        role_engine = RoleEngine(role_config)
        role_ctx = role_engine.resolved_role

        # 2. Identity absorbs the Environment (Realm) and the Hat (Role)
        identity_engine = IdentityEngine(core_identity, realm_ctx, role_ctx)
        identity_ctx = identity_engine.get_resolved_identity()

        # 3. Emotion Mapping
        selector = EmotionSelector()
        emo_result = selector.select_emotion(
            valence=emotion_state.get("valence", 0.1),
            arousal=emotion_state.get("arousal", -0.1)
        )

        # 4. The Final Assembly
        return {
            "identity": identity_ctx,
            "realm": realm_ctx,
            "role": role_ctx,
            "emotion": {
                "valence": emotion_state.get("valence"),
                "arousal": emotion_state.get("arousal"),
                "label": emo_result["label"],
                "face": emo_result.get("face", "neutral1.png")
            },
            "status": "ready"
        }
    except Exception as e:
        return {"status": "error", "message": f"Blender Error: {str(e)}"}
`;
