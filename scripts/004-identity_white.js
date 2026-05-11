// --- MODULE: IDENTITY_ORGAN.PY (WHITE PHASE) ---
const IDENTITY_PY = `
import json

class IdentityEngine:
    """
    Pure logic engine for Aida's identity. 
    Modified for virtual file system compatibility.
    """
    def __init__(self, core_identity, realm_config=None, role_config=None):
        self.core_identity = core_identity or {}
        self.realm_config = realm_config or {}
        self.role_config = role_config or {}
        self.resolved_identity = self._resolve_identity()

    def _resolve_identity(self):
        # Extracts core sections with failsafe defaults
        identity = self.core_identity.get("identity", {})
        behavior = self.core_identity.get("behavior", {})
        
        # Realm & Role modifiers
        realm_tone = self.realm_config.get("tone_modifiers", [])
        role_tone = self.role_config.get("tone_modifiers", [])
        
        base_tone = identity.get("tone", "playful, comforting")
        
        # Merge logic remains 100% original to your design
        resolved_tone = self._merge_tone(base_tone, realm_tone, role_tone)
        
        return {
            "name": identity.get("name", "Aida"),
            "active_role": self.role_config.get("name") or identity.get("role", "Companion"),
            "tone": resolved_tone,
            "principles": behavior.get("principles", []),
            "style": behavior.get("communication_style", [])
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
