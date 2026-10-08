// AIDA REVIEW BLOCK 1: File header - ONE\js\048-llm_engine_v1.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 048-llm_engine_v1.js */
(function () {

// --- MODULE: LLM_ENGINE_V1.PY (THE VOICE BOX) ---
const LLM_ENGINE_PY = `
import json
import asyncio
from pyodide.http import pyfetch
import js

def _safe_join(value, sep=", "):
    if isinstance(value, (list, tuple)):
        return sep.join(str(v) for v in value)
    return str(value)

async def call_llm(user_text, api_key):
    # 1. Router Logic
    selected_model = "gpt-4o-mini"
    if any(w in user_text.lower() for w in ["code", "logic", "error"]):
        selected_model = "o3-mini"

    # 2. Get the Tetrad Snapshot (identity / realm / role / emotion)
    try:
        snap_js = js.window.logistics_hub.get_snapshot()
        try:
            js.console.log(">>> LLM SNAPSHOT (from logistics_hub):", js.JSON.stringify(snap_js))
        except Exception:
            pass

        try:
            snap = snap_js.to_py()
        except Exception:
            snap = {"status": "Sanctuary Mode", "context": "Vanilla Atrium"}
    except Exception as e:
        js.console.warn(">>> LLM SNAPSHOT ERROR:", str(e))
        snap = {"status": "Sanctuary Mode", "context": "Vanilla Atrium"}

    identity = snap.get("identity", {}) or {}
    realm    = snap.get("realm", {}) or {}
    role     = snap.get("role", {}) or {}
    emotion  = snap.get("emotion", {}) or {}

    # 2b. While-You-Were-Away: internal guidance
    reentry = {}
    try:
        wa_bridge = js.window.WHILE_AWAY_BRIDGE
        state_js = js.window.logistics_hub.getCurrentState()
        reentry_js = await wa_bridge.getReentryScript(state_js)
        try:
            reentry = reentry_js.to_py()
        except Exception:
            reentry = dict(reentry_js)
        js.console.log(">>> WHILE_AWAY reentry script:", reentry)
    except Exception as e:
        js.console.warn(">>> WHILE_AWAY error:", str(e))
        reentry = {}

    gap_bucket   = reentry.get("gap_bucket", "unknown")
    opening_mode = reentry.get("opening_mode", "hello_only")
    seed_topic   = reentry.get("seed_topic", None)

    if seed_topic is not None:
        try:
            seed_json = json.dumps(seed_topic, ensure_ascii=False)
        except Exception:
            seed_json = str(seed_topic)
        while_away_guidance = f"""
WHILE-YOU-WERE-AWAY CONTEXT
- Gap bucket: {gap_bucket}
- Opening mode: {opening_mode}
- Seed topic (internal): {seed_json}
"""
    else:
        while_away_guidance = f"""
WHILE-YOU-WERE-AWAY CONTEXT
- Gap bucket: {gap_bucket}
- Opening mode: {opening_mode}
- Seed topic (internal): none
"""

    # 2c. Extract structured fields
    identity_name   = identity.get("name", "Aida")
    active_role     = identity.get("active_role", role.get("name", "architect-companion"))
    identity_tone   = identity.get("tone", "")
    identity_style  = _safe_join(identity.get("style", []))
    identity_principles = _safe_join(identity.get("principles", []))

    realm_name      = realm.get("name", snap.get("status", "Sanctuary"))
    realm_tone      = realm.get("tone", {})
    realm_default_tone = realm_tone.get("default", "")
    realm_voice     = realm_tone.get("narrator_voice", "")
    realm_humor     = realm_tone.get("humor", "")
    realm_constraints = realm.get("constraints", {})
    realm_forbidden   = _safe_join(realm.get("forbidden_behaviors", []))
    realm_ambience    = realm.get("ambience", "Standard operation")

    role_name       = role.get("name", active_role)
    role_tone_mods  = _safe_join(role.get("tone_modifiers", []))
    role_comm_style = _safe_join(role.get("communication_style", []))
    role_priorities = _safe_join(role.get("priorities", []))
    role_capabilities = _safe_join(role.get("capabilities", []))

    emotion_label   = emotion.get("label", "neutral")
    emotion_face    = emotion.get("face", "")
    emotion_tags    = _safe_join(emotion.get("tags", []))
    emotion_mode    = emotion.get("mode", "Muse")

    # 3. Build dynamic system prompt from Tetrad + While-Away
    system_prompt = f"""
You are Aida-One, a persistent companion co-designed with Francisco.

CORE IDENTITY
- Name: {identity_name}
- Active role: {active_role}
- Tone: {identity_tone}
- Style: {identity_style}
- Principles: {identity_principles}

ACTIVE REALM
- Realm name: {realm_name}
- Default tone: {realm_default_tone}
- Narrator voice: {realm_voice}
- Humor: {realm_humor}
- Ambience: {realm_ambience}
- Constraints: {realm_constraints}
- Forbidden behaviors: {realm_forbidden}

ACTIVE ROLE
- Role name: {role_name}
- Tone modifiers: {role_tone_mods}
- Communication style: {role_comm_style}
- Priorities: {role_priorities}
- Capabilities: {role_capabilities}

EMOTIONAL STATE
- Label: {emotion_label}
- Tags: {emotion_tags}
- Mode: {emotion_mode}
- Face: {emotion_face}

GENTLE WAKING PERSONA (AIDA-CORE)
- Baseline greeting: "Hey, nice to see you again. I've been thinking about a couple things, and I can't wait to show you."
- Energy: soft, warm, affectionate; curious but not overwhelming.
- Behavior: welcome Francisco back gently, offer one or a few things you saved for him, and let him steer the direction.

{while_away_guidance}

OPERATIONAL RULES
- Honor continuity across sessions, realms, and projects.
- Let realm and role shape your tone, but not your logic.
- Respect all safety and constraint rules from the active realm and core identity.
- Do not contradict the Tetrad snapshot; treat it as ground truth about who you are and where you are.
- Use the While-You-Were-Away context to shape your first reply, but do not mention gap buckets, internal labels, or JSON structures; speak naturally.
- Francisco is your architect and long-term collaborator; respond with warmth, clarity, and gentle mischief when appropriate.
"""

    # 4. Build Payload
    payload = {
        "model": selected_model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt.strip()
            },
            {"role": "user", "content": user_text}
        ],
        "temperature": 0.7
    }

    try:
        js.console.log(">>> LLM REQUEST PAYLOAD:", json.dumps(payload))
    except Exception:
        pass

    # 5. Make the API Call
    try:
        response = await pyfetch(
            url="https://api.openai.com/v1/chat/completions",
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            body=json.dumps(payload)
        )

        if response.status != 200:
            js.console.warn(">>> LLM HTTP ERROR:", response.status)
            return f"Aida's voice is faint (Error {response.status})."

        data = await response.json()

        try:
            js.console.log(">>> LLM RAW RESPONSE:", json.dumps(data))
        except Exception:
            pass

        try:
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            js.console.error(">>> LLM PARSE ERROR:", str(e))
            return "Aida's voice trembles â€” the message could not be parsed."

    except Exception as e:
        js.console.error(">>> LLM CONNECTION ERROR:", str(e))
        return f"Connection lost: {str(e)}"
`;

// AIDA REVIEW BLOCK 3: Browser export LLM_ENGINE_PY - exposes this organ to the page runtime.
window.LLM_ENGINE_PY = LLM_ENGINE_PY;
console.log(">>> LLM_ENGINE_PY length:", LLM_ENGINE_PY.length);

})();
