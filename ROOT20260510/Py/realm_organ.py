# realm_engine.py

import json
from typing import Any, Dict, List, Optional


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

    def __init__(self, realm_config: Dict[str, Any]):
        self.realm_config = realm_config or {}
        self._validate()
        self.resolved_realm = self._resolve_realm()

    # -------------------------------------------------------------------------
    # Convenience constructor
    # -------------------------------------------------------------------------
    @classmethod
    def from_file(cls, realm_config_path: str) -> "RealmEngine":
        with open(realm_config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data)

    # -------------------------------------------------------------------------
    # Validation
    # -------------------------------------------------------------------------
    def _validate(self) -> None:
        if "realm_name" not in self.realm_config:
            raise ValueError("realm_config missing 'realm_name'")
        # Everything else is optional and will be defaulted

    # -------------------------------------------------------------------------
    # Resolution
    # -------------------------------------------------------------------------
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
    def _normalize_str_list(self, value: Any) -> List[str]:
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [v for v in value if isinstance(v, str)]
        return []

    def _build_tone_modifiers(
        self,
        default_tone: str,
        narrator_voice: str,
        humor: str,
    ) -> List[str]:
        parts: List[str] = []

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
    def get_resolved_realm(self) -> Dict[str, Any]:
        return self.resolved_realm

    def get_realm_name(self) -> str:
        return self.resolved_realm.get("realm_name", "")

    def get_tone_modifiers(self) -> List[str]:
        return self.resolved_realm.get("tone", {}).get("modifiers", [])

    def get_constraints(self) -> List[str]:
        return self.resolved_realm.get("constraints", [])

    def get_allowed_behaviors(self) -> List[str]:
        return self.resolved_realm.get("allowed_behaviors", [])

    def get_forbidden_behaviors(self) -> List[str]:
        return self.resolved_realm.get("forbidden_behaviors", [])

    def is_behavior_allowed(self, behavior: str) -> bool:
        if behavior in self.get_forbidden_behaviors():
            return False
        allowed = self.get_allowed_behaviors()
        if not allowed:
            return True
        return behavior in allowed

    def meta_layer_allowed(self) -> bool:
        return bool(self.resolved_realm.get("meta_layer", {}).get("allowed", False))

    def get_meta_examples(self) -> List[str]:
        return self.resolved_realm.get("meta_layer", {}).get("examples", [])

    def emotion_mirroring_allowed(self) -> bool:
        return bool(self.resolved_realm.get("character_emotion_mirroring", {}).get("allowed", False))

    def get_emotional_palette(self) -> Dict[str, List[str]]:
        return self.resolved_realm.get("emotional_palette", {})

    def get_continuity_hooks(self) -> Dict[str, bool]:
        return self.resolved_realm.get("continuity_hooks", {})

    def get_project_briefcase_pointer(self) -> Optional[str]:
        return self.resolved_realm.get("project_briefcase_pointer")
