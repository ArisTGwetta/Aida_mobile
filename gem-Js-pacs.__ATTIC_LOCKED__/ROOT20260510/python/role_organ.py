# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\python\role_organ.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
# role_engine.py

import json
from typing import Any, Dict, List, Optional


# AIDA REVIEW BLOCK 3: Class RoleEngine - grouped organ/service behavior.
class RoleEngine:
    """
    Pure logic engine for Aida's roles (modes).

    - No network calls
    - No OAuth
    - No API keys
    - Operates only on data passed in
    - Interprets role configs (e.g., architect-companion, co-narrator, debugger)
    - Exposes a clean API for the runtime + IdentityEngine
    """

# AIDA REVIEW BLOCK 4: Function __init__ - callable organ behavior.
    def __init__(self, role_config: Dict[str, Any]):
        self.role_config = role_config or {}
        self._validate()
        self.resolved_role = self._resolve_role()

    # -------------------------------------------------------------------------
    # Convenience constructor
    # -------------------------------------------------------------------------
    @classmethod
# AIDA REVIEW BLOCK 5: Function from_file - callable organ behavior.
    def from_file(cls, role_config_path: str) -> "RoleEngine":
        with open(role_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data)

    # -------------------------------------------------------------------------
    # Validation
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 6: Function _validate - callable organ behavior.
    def _validate(self) -> None:
        """
        Minimal structural validation.
        """
        if not self.role_config:
            raise ValueError("role_config is empty")
        if "name" not in self.role_config:
            raise ValueError("role_config missing 'name' field")

    # -------------------------------------------------------------------------
    # Resolution
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 7: Function _resolve_role - callable organ behavior.
    def _resolve_role(self) -> Dict[str, Any]:
        rc = self.role_config

        name = rc.get("name")  # e.g., "architect-companion", "co-narrator"
        description = rc.get("description", "")

        # Tone modifiers specific to this role
        tone_modifiers = self._normalize_str_list(rc.get("tone_modifiers", []))

        # Behavioral priorities / style
        priorities = self._normalize_str_list(rc.get("priorities", []))
        communication_style = self._normalize_str_list(rc.get("communication_style", []))

        # Capabilities / allowed actions in this role
        capabilities = self._normalize_str_list(rc.get("capabilities", []))

        # Constraints specific to this role (on top of identity + realm)
        constraints = self._normalize_str_list(rc.get("constraints", []))

        # Flags for how this role should behave
        flags = rc.get("flags", {}) or {}
        # Example flags you might use:
        #   "allow_meta_layer": True
        #   "allow_emotional_mirroring": True
        #   "avoid_long_form": False
        #   "focus_on_debugging": True

        return {
            "name": name,
            "description": description,
            "tone_modifiers": tone_modifiers,
            "priorities": priorities,
            "communication_style": communication_style,
            "capabilities": capabilities,
            "constraints": constraints,
            "flags": {
                key: bool(value) for key, value in flags.items()
            },
        }

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 8: Function _normalize_str_list - callable organ behavior.
    def _normalize_str_list(self, value: Any) -> List[str]:
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [v for v in value if isinstance(v, str)]
        return []

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 9: Function get_resolved_role - callable organ behavior.
    def get_resolved_role(self) -> Dict[str, Any]:
        return self.resolved_role

# AIDA REVIEW BLOCK 10: Function get_name - callable organ behavior.
    def get_name(self) -> str:
        return self.resolved_role.get("name", "")

# AIDA REVIEW BLOCK 11: Function get_tone_modifiers - callable organ behavior.
    def get_tone_modifiers(self) -> List[str]:
        return self.resolved_role.get("tone_modifiers", [])

# AIDA REVIEW BLOCK 12: Function get_priorities - callable organ behavior.
    def get_priorities(self) -> List[str]:
        return self.resolved_role.get("priorities", [])

# AIDA REVIEW BLOCK 13: Function get_communication_style - callable organ behavior.
    def get_communication_style(self) -> List[str]:
        return self.resolved_role.get("communication_style", [])

# AIDA REVIEW BLOCK 14: Function get_capabilities - callable organ behavior.
    def get_capabilities(self) -> List[str]:
        return self.resolved_role.get("capabilities", [])

# AIDA REVIEW BLOCK 15: Function get_constraints - callable organ behavior.
    def get_constraints(self) -> List[str]:
        return self.resolved_role.get("constraints", [])

# AIDA REVIEW BLOCK 16: Function get_flags - callable organ behavior.
    def get_flags(self) -> Dict[str, bool]:
        return self.resolved_role.get("flags", {})

# AIDA REVIEW BLOCK 17: Function has_capability - callable organ behavior.
    def has_capability(self, capability: str) -> bool:
        return capability in self.get_capabilities()

# AIDA REVIEW BLOCK 18: Function is_flag_enabled - callable organ behavior.
    def is_flag_enabled(self, flag_name: str) -> bool:
        return bool(self.get_flags().get(flag_name, False))


