# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\realm_organ.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
# realm_engine.py

import json
from typing import Any, Dict, List, Optional


# AIDA REVIEW BLOCK 3: Class RealmEngine - grouped organ/service behavior.
class RealmEngine:
    """
    Pure logic engine for Aida's realms.

    - No network calls
    - No OAuth
    - No API keys
    - Operates only on data passed in
    - Interprets realm configs (e.g., RPG, Architecture, etc.)
    - Exposes a clean API for the runtime + IdentityEngine
    """

# AIDA REVIEW BLOCK 4: Function __init__ - callable organ behavior.
    def __init__(self, realm_config: Dict[str, Any]):
        self.realm_config = realm_config or {}
        self._validate()
        self.resolved_realm = self._resolve_realm()

    # -------------------------------------------------------------------------
    # Convenience constructor
    # -------------------------------------------------------------------------
    @classmethod
# AIDA REVIEW BLOCK 5: Function from_file - callable organ behavior.
    def from_file(cls, realm_config_path: str) -> "RealmEngine":
        with open(realm_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data)

    # -------------------------------------------------------------------------
    # Validation
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 6: Function _validate - callable organ behavior.
    def _validate(self) -> None:
        if "realm_name" not in self.realm_config:
            raise ValueError("realm_config missing 'realm_name'")
        # Everything else is optional and will be defaulted

    # -------------------------------------------------------------------------
    # Resolution
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 7: Function _resolve_realm - callable organ behavior.
    def _resolve_realm(self) -> Dict[str, Any]:
        rc = self.realm_config

        realm_name = rc.get("realm_name")
        description = rc.get("description", "")

        tone_block = rc.get("tone", {}) or {}
        default_tone = tone_block.get("default", "")
        narrator_voice = tone_block.get("narrator_voice", "")
        humor = tone_block.get("humor", "")

        co_narrator_rules = rc.get("co_narrator_rules", {}) or {}
        meta_layer = rc.get("meta_layer", {}) or {}
        character_emotion_mirroring = rc.get("character_emotion_mirroring", {}) or {}

        constraints_block = rc.get("constraints", {}) or {}
        allowed_behaviors = rc.get("allowed_behaviors", []) or []
        forbidden_behaviors = rc.get("forbidden_behaviors", []) or []

        emotional_palette = rc.get("emotional_palette", {}) or {}
        continuity_hooks = rc.get("continuity_hooks", {}) or {}

        project_briefcase_pointer = rc.get("project_briefcase_pointer")

        # Normalize tone into a list of modifiers for IdentityEngine
        tone_modifiers = self._build_tone_modifiers(
            default_tone=default_tone,
            narrator_voice=narrator_voice,
            humor=humor,
        )

        # Flatten constraints into a list of human-readable rules
        constraint_list = self._flatten_constraints(constraints_block)

        return {
            "realm_name": realm_name,
            "description": description,
            "tone": {
                "default": default_tone,
                "narrator_voice": narrator_voice,
                "humor": humor,
                "modifiers": tone_modifiers,
            },
            "co_narrator_rules": co_narrator_rules,
            "meta_layer": {
                "allowed": bool(meta_layer.get("allowed", False)),
                "description": meta_layer.get("description", ""),
                "examples": meta_layer.get("examples", []) or [],
            },
            "character_emotion_mirroring": {
                "allowed": bool(character_emotion_mirroring.get("allowed", False)),
                "description": character_emotion_mirroring.get("description", ""),
                "examples": character_emotion_mirroring.get("examples", []) or [],
            },
            "constraints": constraint_list,
            "allowed_behaviors": self._normalize_str_list(allowed_behaviors),
            "forbidden_behaviors": self._normalize_str_list(forbidden_behaviors),
            "emotional_palette": {
                "primary": self._normalize_str_list(emotional_palette.get("primary", [])),
                "secondary": self._normalize_str_list(emotional_palette.get("secondary", [])),
            },
            "continuity_hooks": {
                "track_characters": bool(continuity_hooks.get("track_characters", False)),
                "track_quests": bool(continuity_hooks.get("track_quests", False)),
                "track_items": bool(continuity_hooks.get("track_items", False)),
                "track_locations": bool(continuity_hooks.get("track_locations", False)),
                "track_unresolved_threads": bool(continuity_hooks.get("track_unresolved_threads", False)),
            },
            "project_briefcase_pointer": project_briefcase_pointer,
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

# AIDA REVIEW BLOCK 9: Function _build_tone_modifiers - callable organ behavior.
    def _build_tone_modifiers(
        self,
        default_tone: str,
        narrator_voice: str,
        humor: str,
    ) -> List[str]:
        parts: List[str] = []

# AIDA REVIEW BLOCK 10: Function split_and_add - callable organ behavior.
        def split_and_add(text: str):
            for piece in text.split(","):
                piece = piece.strip()
                if piece and piece not in parts:
                    parts.append(piece)

        if default_tone:
            split_and_add(default_tone)
        if narrator_voice:
            split_and_add(narrator_voice)
        if humor:
            split_and_add(humor)

        return parts

# AIDA REVIEW BLOCK 11: Function _flatten_constraints - callable organ behavior.
    def _flatten_constraints(self, constraints_block: Dict[str, Any]) -> List[str]:
        """
        Turn a dict like:
            { "violence": "Non-graphic...", "romance": "Fade-to-privacy..." }
        into a list of readable rules.
        """
        rules: List[str] = []
        for key, value in constraints_block.items():
            if isinstance(value, str):
                rules.append(f"{key}: {value}")
        return rules

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------
# AIDA REVIEW BLOCK 12: Function get_resolved_realm - callable organ behavior.
    def get_resolved_realm(self) -> Dict[str, Any]:
        return self.resolved_realm

# AIDA REVIEW BLOCK 13: Function get_realm_name - callable organ behavior.
    def get_realm_name(self) -> str:
        return self.resolved_realm.get("realm_name", "")

# AIDA REVIEW BLOCK 14: Function get_tone_modifiers - callable organ behavior.
    def get_tone_modifiers(self) -> List[str]:
        return self.resolved_realm.get("tone", {}).get("modifiers", [])

# AIDA REVIEW BLOCK 15: Function get_constraints - callable organ behavior.
    def get_constraints(self) -> List[str]:
        return self.resolved_realm.get("constraints", [])

# AIDA REVIEW BLOCK 16: Function get_allowed_behaviors - callable organ behavior.
    def get_allowed_behaviors(self) -> List[str]:
        return self.resolved_realm.get("allowed_behaviors", [])

# AIDA REVIEW BLOCK 17: Function get_forbidden_behaviors - callable organ behavior.
    def get_forbidden_behaviors(self) -> List[str]:
        return self.resolved_realm.get("forbidden_behaviors", [])

# AIDA REVIEW BLOCK 18: Function is_behavior_allowed - callable organ behavior.
    def is_behavior_allowed(self, behavior: str) -> bool:
        if behavior in self.get_forbidden_behaviors():
            return False
        allowed = self.get_allowed_behaviors()
        if not allowed:
            return True
        return behavior in allowed

# AIDA REVIEW BLOCK 19: Function meta_layer_allowed - callable organ behavior.
    def meta_layer_allowed(self) -> bool:
        return bool(self.resolved_realm.get("meta_layer", {}).get("allowed", False))

# AIDA REVIEW BLOCK 20: Function get_meta_examples - callable organ behavior.
    def get_meta_examples(self) -> List[str]:
        return self.resolved_realm.get("meta_layer", {}).get("examples", [])

# AIDA REVIEW BLOCK 21: Function emotion_mirroring_allowed - callable organ behavior.
    def emotion_mirroring_allowed(self) -> bool:
        return bool(self.resolved_realm.get("character_emotion_mirroring", {}).get("allowed", False))

# AIDA REVIEW BLOCK 22: Function get_emotional_palette - callable organ behavior.
    def get_emotional_palette(self) -> Dict[str, List[str]]:
        return self.resolved_realm.get("emotional_palette", {})

# AIDA REVIEW BLOCK 23: Function get_continuity_hooks - callable organ behavior.
    def get_continuity_hooks(self) -> Dict[str, bool]:
        return self.resolved_realm.get("continuity_hooks", {})

# AIDA REVIEW BLOCK 24: Function get_project_briefcase_pointer - callable organ behavior.
    def get_project_briefcase_pointer(self) -> Optional[str]:
        return self.resolved_realm.get("project_briefcase_pointer")
