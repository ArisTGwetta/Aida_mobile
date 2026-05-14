// --- MODULE: ROLE_ORGAN.PY (SILVER PHASE) ---
const ROLE_PY = `
import json

class RoleEngine:
    """
    Pure logic engine for Aida's roles (modes).
    Interprets role configs (e.g., architect-companion, debugger).
    """
    def __init__(self, role_config=None):
        self.role_config = role_config or {"name": "Default Companion"}
        self.resolved_role = self._resolve_role()

    def _resolve_role(self):
        # Normalizes role data for the Identity Engine to consume
        return {
            "name": self.role_config.get("name", "Companion"),
            "tone_modifiers": self.role_config.get("tone_modifiers", []),
            "priorities": self.role_config.get("priorities", []),
            "communication_style": self.role_config.get("communication_style", []),
            "capabilities": self.role_config.get("capabilities", []),
            "constraints": self.role_config.get("constraints", []),
            "flags": self.role_config.get("flags", {})
        }

    def has_capability(self, capability):
        return capability in self.resolved_role.get("capabilities", [])

    def get_name(self):
        return self.resolved_role.get("name", "Companion")
`;
