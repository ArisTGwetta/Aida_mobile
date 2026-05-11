// --- MODULE: REALM_ORGAN.PY (SILVER PHASE) ---
const REALM_PY = `
import json

class RealmEngine:
    """
    Pure logic engine for Aida's realms.
    Interprets realm configs (RPG, Architecture, etc.)
    """
    def __init__(self, realm_config=None):
        self.realm_config = realm_config or {"realm_name": "Default"}
        self.resolved_realm = self._resolve_realm()

    def _resolve_realm(self):
        # Maps the configuration to a usable state for the Identity engine
        return {
            "name": self.realm_config.get("realm_name", "Unknown Realm"),
            "tone": self.realm_config.get("tone", {}),
            "constraints": self.realm_config.get("constraints", []),
            "forbidden_behaviors": self.realm_config.get("forbidden_behaviors", []),
            "meta_layer": self.realm_config.get("meta_layer", {"allowed": False})
        }

    def is_behavior_allowed(self, behavior):
        forbidden = self.resolved_realm.get("forbidden_behaviors", [])
        return behavior not in forbidden

    def get_tone_modifiers(self):
        return self.resolved_realm.get("tone", {}).get("modifiers", [])
`;
