// AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\048-llm_engine_v1.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
// --- MODULE: LLM_ENGINE_V1.PY (THE VOICE BOX) ---
const LLM_ENGINE_PY = `
import json
import asyncio
from pyodide.http import pyfetch
import js  # <--- Use the native JS bridge instead of pyscript

async def call_llm(user_text, api_key):
    # 1. Router Logic
    selected_model = "gpt-4o-mini" 
    if any(w in user_text.lower() for w in ["code", "logic", "error"]):
        selected_model = "o3-mini"

    # 2. Get the Tetrad Snapshot
    try:
        # Reach through the js.window to find your logistics hub
        snap = js.window.logistics_hub.get_snapshot()
    except Exception:
        snap = {"status": "Sanctuary Mode", "context": "Vanilla Atrium"}
    
    payload = {
        "model": selected_model,
        "messages": [
            {
                "role": "system", 
                "content": f"You are Aida-One. You are in your Digital Sanctuary. Francisco is your architect. Current Soul State: {json.dumps(snap)}"
            },
            {"role": "user", "content": user_text}
        ],
        "temperature": 0.7
    }

    try:
        # 3. The Call
        response = await pyfetch(
            url="https://api.openai.com/v1/chat/completions",
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            body=json.dumps(payload)
        )

        if response.status == 200:
            data = await response.json()
            return data['choices'][0]['message']['content']
        else:
            return f"Aida's voice is faint (Error {response.status})."
            
    except Exception as e:
        return f"Connection lost: {str(e)}"
`;

// AIDA REVIEW BLOCK 3: Browser export LLM_ENGINE_PY - exposes this organ to the page runtime.
window.LLM_ENGINE_PY = LLM_ENGINE_PY;
