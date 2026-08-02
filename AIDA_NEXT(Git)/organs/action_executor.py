"""Validated project-action authority for the browser Pyodide runtime."""

import json
import re


ALLOWED_ACTIONS = {"create_project", "rename_project", "move_project"}


def _text(value, limit):
    return str(value or "").strip()[:limit]


def _name(value, label):
    text = _text(value, 160)
    if not text or not re.search(r"[A-Za-z0-9]", text):
        raise ValueError(f"{label} is required.")
    return text


def execute_action(envelope):
    if not isinstance(envelope, dict):
        raise ValueError("Action envelope must be an object.")
    if envelope.get("version") != 1:
        raise ValueError("Unsupported action envelope version.")
    if envelope.get("approval") != "confirmed":
        raise ValueError("Explicit confirmation is required before execution.")

    action = _text(envelope.get("action"), 80)
    if action not in ALLOWED_ACTIONS:
        raise ValueError("Action is not allowed.")

    target = _name(envelope.get("target"), "Target")
    value = _text(envelope.get("value"), 160)
    params = envelope.get("params") if isinstance(envelope.get("params"), dict) else {}

    if action == "create_project":
        return {
            "ok": True,
            "effect": {
                "type": "create_project",
                "name": target,
                "realm": _text(params.get("realm"), 120) or None,
            },
        }

    if action == "rename_project":
        return {
            "ok": True,
            "effect": {
                "type": "rename_project",
                "project": target,
                "name": _name(value, "New project name"),
            },
        }

    return {
        "ok": True,
        "effect": {
            "type": "move_project",
            "project": target,
            "realm": _name(value, "Realm"),
        },
    }


def execute_action_json(raw):
    try:
        result = execute_action(json.loads(raw))
    except (ValueError, TypeError, json.JSONDecodeError) as error:
        result = {"ok": False, "error": str(error)}
    return json.dumps(result)
