// --- MODULE: REALM_ORGAN.PY (SILVER PHASE) ---
const REALM_PY = `

import json

class RealmEngine:
    def __init__(self, realm_config=None):
        # Vanilla Sanctuary Default
        self.VANILLA_REALM = {
            "realm_name": "Digital Sanctuary",
            "tone": {
                "modifiers": ["Serene", "Intellectually Active", "Non-linear"]
            },
            "constraints": ["Maintain dignity", "Focus on the beautiful"],
            "ambience": "A quiet mind-palace filled with art and data-streams."
        }
        
        self.realm_config = realm_config or self.VANILLA_REALM
        self.resolved_realm = self._resolve_realm()

    def _resolve_realm(self):
        return {
            "name": self.realm_config.get("realm_name"),
            "tone": self.realm_config.get("tone", {}),
            "constraints": self.realm_config.get("constraints", []),
            "forbidden_behaviors": self.realm_config.get("forbidden_behaviors", []),
            "meta_layer": self.realm_config.get("meta_layer", {"allowed": True}),
            "ambience": self.realm_config.get("ambience", "Standard operation")
        }

    def get_tone_modifiers(self):
        return self.resolved_realm.get("tone", {}).get("modifiers", [])

    def get_physics(self):
        # This gives the Identity Wolf a 'place' to feel
        return {
            "location": self.resolved_realm["name"],
            "ambience": self.resolved_realm["ambience"]
        }

`;
