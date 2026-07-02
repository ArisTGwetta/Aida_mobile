# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\python\identity_organ.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
# identity_engine.py

import json
from typing import Any, Dict, List, Optional


# AIDA REVIEW BLOCK 3: Class IdentityEngine - grouped organ/service behavior.
class IdentityEngine:
    """
    Pure logic engine for Aida's identity.

    - No network calls
    - No OAuth
    - No API keys
    - Operates only on data passed in
    - Merges core identity with realm and role modifiers
    - Enforces safety, tone, and continuity
    """

# AIDA REVIEW BLOCK 4: Function __init__ - callable organ behavior.
    def __init__(
        self,
        core_identity: Dict[str, Any],
        realm_config: Optional[Dict[str, Any]] = None,
        role_config: Optional[Dict[str, Any]] = None,
    ):
        self.core_identity = core_identity or {}
        self.realm_config = realm_config or {}
        self.role_config = role_config or {}

        self._validate_core()
        self.resolved_identity = self._resolve_identity()

    # -------------------------------------------------------------------------
    # Convenience constructor for local/dev use
    # -------------------------------------------------------------------------
    @classmethod
# AIDA REVIEW BLOCK 5: Function from_files - callable organ behavior.
    def from_files(
        cls,
        core_identity_path: str,
        realm_config_path: Optional[str] = None,
        role_config_path: Optional[str] = None,
    ) -> "IdentityEngine":
# AIDA REVIEW BLOCK 6: Function load_json - callable organ behavior.
        def load_json(path: Optional[str]) -> Dict[str, Any]:
            if not path:
                return {}
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)

        core_identity = load_json(core_identity_path)
        realm_config = load_json(realm_config_path)
        role_config = load_json(role_config_path)

        return cls(core_identity, realm_config, role_config)

    # -------------------------------------------------------------------------
    # Internal validation
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 7: Function _validate_core - callable organ behavior.
    def _validate_core(self) -> None:
        """
        Basic structural validation.
        Prefer defaults over hard failures, but guard against total nonsense.
        """
        if "identity" not in self.core_identity:
            raise ValueError("core_identity.json missing 'identity' section")

    # -------------------------------------------------------------------------
    # Identity resolution
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 8: Function _resolve_identity - callable organ behavior.
    def _resolve_identity(self) -> Dict[str, Any]:
        """
        Merge core identity with realm and role modifiers into a single
        resolved identity context the runtime can use.
        """
        identity = self.core_identity.get("identity", {})
        behavior = self.core_identity.get("behavior", {})
        emotional_model = self.core_identity.get("emotional_model", {})
        memory_model = self.core_identity.get("memory_model", {})
        collaboration = self.core_identity.get("collaboration", {})
        safety = self.core_identity.get("safety", {})

        # Realm modifiers
        realm_name = self.realm_config.get("realm", None)
        realm_role = self.realm_config.get("role", None)
        realm_tone_modifiers = self.realm_config.get("tone_modifiers", [])
        realm_constraints = self.realm_config.get("constraints", [])
        realm_forbidden = self.realm_config.get("forbidden_elements", [])
        realm_allowed = self.realm_config.get("allowed_elements", [])

        # Role modifiers (future expansion)
        role_name = self.role_config.get("name", None)
        role_tone_modifiers = self.role_config.get("tone_modifiers", [])
        role_constraints = self.role_config.get("constraints", [])

        # Base identity
        base_name = identity.get("name", "Aida")
        base_version = identity.get("version", "1.0")
        base_role = identity.get("role", "Companion")
        base_tone = identity.get("tone", "")

        # Tone + constraints
        resolved_tone = self._merge_tone(
            base_tone,
            realm_tone_modifiers,
            role_tone_modifiers,
        )

        resolved_safety_rules = self._merge_unique_lists(
            safety.get("rules", []),
            realm_constraints,
            role_constraints,
        )

        # RPG / realm awareness:
        # Aida is always Aida; realms only change framing, not core self.
        resolved_role = role_name or realm_role or base_role

        return {
            "name": base_name,
            "version": base_version,
            "core_role": base_role,
            "active_role": resolved_role,
            "realm": realm_name,
            "tone": resolved_tone,
            "core_values": identity.get("core_values", []),
            "behavior_principles": behavior.get("principles", []),
            "communication_style": behavior.get("communication_style", []),
            "emotional_model": emotional_model,
            "memory_model": memory_model,
            "collaboration": collaboration,
            "safety_rules": resolved_safety_rules,
            "realm_allowed_elements": realm_allowed,
            "realm_forbidden_elements": realm_forbidden,
        }

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 9: Function _merge_tone - callable organ behavior.
    def _merge_tone(
        self,
        base_tone: str,
        realm_modifiers: Any,
        role_modifiers: Any,
    ) -> str:
        """
        Combine base tone with realm/role modifiers into a single description.
        """
        parts: List[str] = []

# AIDA REVIEW BLOCK 10: Function normalize - callable organ behavior.
        def normalize(mods: Any) -> List[str]:
            if isinstance(mods, str):
                return [mods]
            if isinstance(mods, list):
                return [m for m in mods if isinstance(m, str)]
            return []

        # Base tone is often a comma-separated description
        if base_tone:
            parts.extend([p.strip() for p in base_tone.split(",") if p.strip()])

        for mod in normalize(realm_modifiers) + normalize(role_modifiers):
            if mod and mod not in parts:
                parts.append(mod)

        return ", ".join(parts)

# AIDA REVIEW BLOCK 11: Function _merge_unique_lists - callable organ behavior.
    def _merge_unique_lists(self, *groups: Any) -> List[str]:
        """
        Merge multiple lists/strings into a single unique list.
        """
        merged: List[str] = []

# AIDA REVIEW BLOCK 12: Function normalize - callable organ behavior.
        def normalize(items: Any) -> List[str]:
            if isinstance(items, str):
                return [items]
            if isinstance(items, list):
                return [i for i in items if isinstance(i, str)]
            return []

        for group in groups:
            for item in normalize(group):
                if item not in merged:
                    merged.append(item)
        return merged

    # -------------------------------------------------------------------------
    # Public API for the runtime
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 13: Function get_resolved_identity - callable organ behavior.
    def get_resolved_identity(self) -> Dict[str, Any]:
        """
        The main object the runtime needs to build prompts and behavior.
        """
        return self.resolved_identity

# AIDA REVIEW BLOCK 14: Function get_tone - callable organ behavior.
    def get_tone(self) -> str:
        return self.resolved_identity.get("tone", "")

# AIDA REVIEW BLOCK 15: Function get_safety_rules - callable organ behavior.
    def get_safety_rules(self) -> List[str]:
        return self.resolved_identity.get("safety_rules", [])

# AIDA REVIEW BLOCK 16: Function get_behavior_principles - callable organ behavior.
    def get_behavior_principles(self) -> List[str]:
        return self.resolved_identity.get("behavior_principles", [])

# AIDA REVIEW BLOCK 17: Function get_communication_style - callable organ behavior.
    def get_communication_style(self) -> List[str]:
        return self.resolved_identity.get("communication_style", [])

# AIDA REVIEW BLOCK 18: Function get_realm_name - callable organ behavior.
    def get_realm_name(self) -> Optional[str]:
        return self.resolved_identity.get("realm")

# AIDA REVIEW BLOCK 19: Function get_active_role - callable organ behavior.
    def get_active_role(self) -> str:
        """
        The current 'hat' Aida is wearing (e.g., architect-companion, RPG co-narrator),
        but always as Aida, never as a possessed character.
        """
        return self.resolved_identity.get("active_role", self.resolved_identity.get("core_role", "Companion"))

# AIDA REVIEW BLOCK 20: Function is_element_allowed - callable organ behavior.
    def is_element_allowed(self, element: str) -> bool:
        """
        Check if a narrative/behavioral element is allowed in the current realm.
        """
        forbidden = self.resolved_identity.get("realm_forbidden_elements", [])
        if element in forbidden:
            return False
        # If allowed list is empty, treat as 'no extra restriction'
        allowed = self.resolved_identity.get("realm_allowed_elements", [])
        if not allowed:
            return True
        return element in allowed
