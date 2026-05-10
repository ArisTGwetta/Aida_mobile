# soul_sync_engine.py

import json
from pathlib import Path

from tetrad_chassis import assemble_tetrad
from identity_organ import IdentityEngine
from realm_organ import RealmEngine
from role_organ import RoleEngine

BASE = Path(__file__).parent

def _load_json(name, default=None):
    path = BASE / name
    if not path.exists():
        return default or {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def py_sync_soul():
    """
    Main entrypoint called from JavaScript.
    Builds the full Tetrad (realm, role, identity, emotion)
    and returns a dict safe for the hologram engine.
    """

    core_identity = _load_json("core_identity.json", {})
    realm_config  = _load_json("realm_config.json", {})
    role_config   = _load_json("role_config.json", {})
    emotion_state_path = BASE / "emotion_state.json"

    tetrad = assemble_tetrad(
        core_identity=core_identity,
        realm_config=realm_config,
        role_config=role_config,
        emotion_state_path=emotion_state_path
    )

    # --- Safety: ensure face is never empty ---
    face = tetrad["emotion"].get("face") or "neutral1.png"
    tetrad["emotion"]["face"] = face

    return tetrad
