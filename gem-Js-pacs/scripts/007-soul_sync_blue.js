// --- MODULE: SOUL_SYNC_ENGINE.PY (AIDA BLUE PHASE) ---
const SOUL_SYNC_PY = `
import json

# Internal imports from the modules we've already wired
from identity_organ import IdentityEngine
from realm_organ import RealmEngine
from role_organ import RoleEngine
from emotion_selector import EmotionSelector

def py_sync_soul(core_identity, realm_config, role_config, emotion_state):
    """
    The Master Assembly. 
    Wires Identity, Realm, Role, and Emotion into a single Aida state.
    """
    try:
        # 1. Initialize the Engines
        realm = RealmEngine(realm_config)
        role = RoleEngine(role_config)
        
        # 2. Identity merges the world rules (Realm) and its current job (Role)
        identity = IdentityEngine(
            core_identity=core_identity,
            realm_config=realm.resolved_realm,
            role_config=role.resolved_role
        )
        
        # 3. Emotion Selector picks the face based on v,a
        selector = EmotionSelector()
        v = emotion_state.get("valence", 0.1)
        a = emotion_state.get("arousal", -0.1)
        emotion_result = selector.select_emotion(v, a)
        
        # 4. Assemble the Tetrad Chassis
        tetrad = {
            "identity": identity.get_resolved_identity(),
            "realm": realm.resolved_realm,
            "role": role.resolved_role,
            "emotion": emotion_result,
            "status": "synchronized"
        }
        
        return tetrad
    except Exception as e:
        return {"status": "error", "message": str(e)}
`;
