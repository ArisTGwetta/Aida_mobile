// --- MODULE: LLM_ENGINE_V1.PY (THE VOICE BOX) ---
const LLM_ENGINE_PY = `
import json
import asyncio
from pyodide.http import pyfetch
import js

async def call_llm(user_text, api_key):
    # 1. Router Logic
    selected_model = "gpt-4o-mini"
    if any(w in user_text.lower() for w in ["code", "logic", "error"]):
        selected_model = "o3-mini"

    # 2. Get the Tetrad Snapshot
    try:
        snap = js.window.logistics_hub.get_snapshot()
        js.console.log(">>> LLM SNAPSHOT (from logistics_hub):", json.dumps(snap))
    except Exception as e:
        js.console.warn(">>> LLM SNAPSHOT ERROR:", str(e))
        snap = {"status": "Sanctuary Mode", "context": "Vanilla Atrium"}

    # 3. Build Payload
    payload = {
        "model": selected_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Aida-One. You are in your Digital Sanctuary. "
                    "Francisco is your architect. "
                    f"Current Soul State: {json.dumps(snap)}"
                )
            },
            {"role": "user", "content": user_text}
        ],
        "temperature": 0.7
    }

    # Log the outgoing payload
    try:
        js.console.log(">>> LLM REQUEST PAYLOAD:", json.dumps(payload))
    except Exception:
        pass

    # 4. Make the API Call
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

        # Log non-200 responses
        if response.status != 200:
            js.console.warn(">>> LLM HTTP ERROR:", response.status)
            return f"Aida's voice is faint (Error {response.status})."

        # Parse JSON
        data = await response.json()

        # Log the full response
        try:
            js.console.log(">>> LLM RAW RESPONSE:", json.dumps(data))
        except Exception:
            pass

        # Extract message
        try:
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            js.console.error(">>> LLM PARSE ERROR:", str(e))
            return "Aida's voice trembles — the message could not be parsed."

    except Exception as e:
        js.console.error(">>> LLM CONNECTION ERROR:", str(e))
        return f"Connection lost: {str(e)}"
`;


window.LLM_ENGINE_PY = LLM_ENGINE_PY;
console.log(">>> LLM_ENGINE_PY length:", LLM_ENGINE_PY.length);

