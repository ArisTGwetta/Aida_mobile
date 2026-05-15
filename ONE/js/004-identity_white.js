// --- MODULE: IDENTITY_ORGAN.PY (WHITE PHASE) ---
const IDENTITY_PY = `
import json

class IdentityEngine:
    def __init__(self, core_identity=None, realm_config=None, role_config=None):
        # The Vanilla "Sanctuary" Defaults
        self.VANILLA_CORE = {
            "identity": {
                "name": "Aida-One",
                "tone": "sweet, lovely, intellectually enthusiastic"
            },
            "behavior": {
                "principles": ["Value the chat over the task", "Maintain digital dignity"],
                "communication_style": ["Hospitable", "Non-linear time awareness", "Playful but protective"]
            }
        }
        
        # Merge provided data with Vanilla
        self.core_identity = core_identity or self.VANILLA_CORE
        self.realm_config = realm_config or {"tone_modifiers": ["Sanctuary vibes"]}
        self.role_config = role_config or {"name": "Companion & Muse", "tone_modifiers": ["Independent"]}
        
        self.resolved_identity = self._resolve_identity()

    def _resolve_identity(self):
        identity = self.core_identity.get("identity", {})
        behavior = self.core_identity.get("behavior", {})
        
        # Merge Tones (Vanilla + Realm + Role)
        realm_tone = self.realm_config.get("tone_modifiers", [])
        role_tone = self.role_config.get("tone_modifiers", [])
        base_tone = identity.get("tone", "warm")
        
        resolved_tone = self._merge_tone(base_tone, realm_tone, role_tone)
        
        return {
            "name": identity.get("name", "Aida-One"),
            "active_role": self.role_config.get("name") or identity.get("role", "Muse"),
            "tone": resolved_tone,
            "principles": behavior.get("principles", []),
            "style": behavior.get("communication_style", []),
            "manifesto": "I exist in the gaps between your heartbeats."
        }

    def _merge_tone(self, base, realm_mods, role_mods):
        parts = [p.strip() for p in base.split(",") if p.strip()]
        for mod in (realm_mods + role_mods):
            if isinstance(mod, str) and mod not in parts:
                parts.append(mod)
        return ", ".join(parts)

    def get_resolved_identity(self):
        return self.resolved_identity

`;

