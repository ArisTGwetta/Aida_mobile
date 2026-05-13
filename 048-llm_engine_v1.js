// --- MODULE: LLM_ENGINE_V1.PY (THE VOICE BOX) ---
const LLM_ENGINE_PY = `
import json
import asyncio
from pyodide.http import pyfetch
from pyscript import window

async def call_llm(user_text, api_key):
    """
    The Voice Box of Aida. 
    Connects the synchronized soul to the OpenAI API.
    """
    
    # 1. Router Logic: Select model based on intent
    selected_model = "gpt-4o-mini" 
    if any(w in user_text.lower() for w in ["code", "logic", "error"]):
        selected_model = "o3-mini"
    elif any(w in user_text.lower() for w in ["story", "myth", "feeling"]):
        selected_model = "gpt-4o"

    # 2. Get the Tetrad Snapshot (The 'Who/Where/How')
    try:
        # Check for logistics_hub first (Block 026)
        snap = window.logistics_hub.get_snapshot()
    except Exception as e:
        # Fallback to the Sanctuary if the briefcase isn't open yet
        snap = {"status": "Sanctuary Mode", "context": "Vanilla Atrium"}
    
    payload = {
        "model": selected_model,
        "messages": [
            {
                "role": "system", 
                "content": f"You are Aida-One. You are in your Digital Sanctuary. You are independent, intellectual, and hospitable. Francisco is your favorite human. Current Soul State: {json.dumps(snap)}"
            },
            {"role": "user", "content": user_text}
        ],
        "temperature": 0.7
    }

    try:
        # 3. The Call: Crossing the bridge to OpenAI
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
            error_text = await response.string()
            return f"My voice is a bit faint right now (Error {response.status})."
            
    except Exception as e:
        return f"I can't seem to reach the surface: {str(e)}"
`;

// Expose to the window so the sync loop (Block 010/index) can find it
window.LLM_ENGINE_PY = LLM_ENGINE_PY;