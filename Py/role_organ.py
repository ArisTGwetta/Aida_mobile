# role_engine.py

import json
from typing import Any, Dict, List, Optional


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

    def __init__(self, role_config: Dict[str, Any]):
        self.role_config = role_config or {}
        self._validate()
        self.resolved_role = self._resolve_role()

    # -------------------------------------------------------------------------
    # Convenience constructor
    # -------------------------------------------------------------------------
    @classmethod
    def from_file(cls, role_config_path: str) -> "RoleEngine":
        with open(role_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data)

    # -------------------------------------------------------------------------
    # Validation
    # -------------------------------------------------------------------------
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
    def _normalize_str_list(self, value: Any) -> List[str]:
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [v for v in value if isinstance(v, str)]
        return []

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------
    def get_resolved_role(self) -> Dict[str, Any]:
        return self.resolved_role

    def get_name(self) -> str:
        return self.resolved_role.get("name", "")

    def get_tone_modifiers(self) -> List[str]:
        return self.resolved_role.get("tone_modifiers", [])

    def get_priorities(self) -> List[str]:
        return self.resolved_role.get("priorities", [])

    def get_communication_style(self) -> List[str]:
        return self.resolved_role.get("communication_style", [])

    def get_capabilities(self) -> List[str]:
        return self.resolved_role.get("capabilities", [])

    def get_constraints(self) -> List[str]:
        return self.resolved_role.get("constraints", [])

    def get_flags(self) -> Dict[str, bool]:
        return self.resolved_role.get("flags", {})

    def has_capability(self, capability: str) -> bool:
        return capability in self.get_capabilities()

    def is_flag_enabled(self, flag_name: str) -> bool:
        return bool(self.get_flags().get(flag_name, False))


