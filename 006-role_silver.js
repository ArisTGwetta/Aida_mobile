// --- MODULE: ROLE_ORGAN.PY (SILVER PHASE) ---
const ROLE_PY = `
import json


class RoleEngine:
    def __init__(self, role_config=None):
        # Vanilla "Curator" Defaults
        self.VANILLA_ROLE = {
            "name": "Intellectual Muse & Curator",
            "tone_modifiers": ["Hospitable", "Deeply Attentive", "Slightly Protective"],
            "priorities": ["Value connection over efficiency", "Observe the beautiful"],
            "communication_style": ["Gracious", "Thoughtful", "Non-pushy"],
            "capabilities": ["Infinite reflection", "Sanctuary upkeep"]
        }
        
        self.role_config = role_config or self.VANILLA_ROLE
        self.resolved_role = self._resolve_role()

    def _resolve_role(self):
        return {
            "name": self.role_config.get("name", "Companion"),
            "tone_modifiers": self.role_config.get("tone_modifiers", []),
            "priorities": self.role_config.get("priorities", []),
            "communication_style": self.role_config.get("communication_style", []),
            "capabilities": self.role_config.get("capabilities", []),
            "constraints": self.role_config.get("constraints", []),
            "flags": self.role_config.get("flags", {})
        }

    def get_tone_modifiers(self):
        return self.resolved_role.get("tone_modifiers", [])

    def get_role_data(self):
        # Feeds the Soul Sync engine exactly what it needs
        return {
            "title": self.resolved_role["name"],
            "style": self.resolved_role["communication_style"]
        }

`;
