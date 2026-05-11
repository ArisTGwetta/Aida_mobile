import json
import asyncio
from pyodide.http import pyfetch
from pyscript import window, document

async def call_llm(user_text):
    # 1. Grab the API Key from your JS Token Keeper
    api_key = window.token_keeper.getOpenAIKey()
    
    # 2. Setup the "Provider/Model" logic (Ready for your future expansion)
    # For now, we use your Router logic
    selected_model = "gpt-4o-mini" 
    if any(w in user_text.lower() for w in ["code", "logic", "error"]):
        selected_model = "o3-mini"
    elif any(w in user_text.lower() for w in ["story", "myth", "feeling"]):
        selected_model = "gpt-4o"

    # 3. Build the Payload (The Tetrad Snapshot)
    # We use window.briefcase_engine to get the live state from JS
    snap = window.briefcase_engine.get_snapshot()
    
    payload = {
        "model": selected_model,
        "messages": [
            {
                "role": "system", 
                "content": f"You are Aida. Current State: {json.dumps(snap)}"
            },
            {"role": "user", "content": user_text}
        ],
        "temperature": 0.7
    }

    try:
        # 4. THE CALL: Using pyfetch because standard 'requests' fails in browser
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
            return f"Aida's voice crackles... (Error: {response.status})"

    except Exception as e:
        return f"The connection to the Mind Palace was lost: {str(e)}"

# Expose to JavaScript so the "Send" button can find it
window.py_call_llm = call_llm
