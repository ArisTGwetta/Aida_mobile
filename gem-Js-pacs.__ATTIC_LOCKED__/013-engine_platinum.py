# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\013-engine_platinum.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
# ==========================================================
#  AIDA PLATINUM ENGINE v5.1 â€” THE UNIFIED CORE
#  (Consolidating Blocks 6, 7, 8, 9, and 9B)
# ==========================================================

import json, asyncio, random, math
from pyscript import document, window
from pyodide.http import pyfetch
from pyodide.ffi import create_proxy

# ==========================================================
#  UTILITIES & DEBUG (BLOCK 6)
# ==========================================================
# AIDA REVIEW BLOCK 3: Function pulse - callable organ behavior.
def pulse(msg):
    """Appends a debug line to the ship's log panel."""
    log = document.getElementById("log-content")
    if log:
        div = document.createElement("div")
        div.innerText = f"> {msg}"
        div.classList.add("debug-line")
        log.appendChild(div)
        log.parentElement.scrollTop = log.parentElement.scrollHeight

# AIDA REVIEW BLOCK 4: Function py_list_briefcases - callable organ behavior.
def py_list_briefcases():
    try: return aida.blocks
    except: return []

# AIDA REVIEW BLOCK 5: Async function send_to_butler - async callable organ behavior.
async def send_to_butler(log):
    pulse("[BUTLER] Syncing session to cloud vault... (stub)")
    await asyncio.sleep(0.1)

# AIDA REVIEW BLOCK 6: Function clear_rolling_summaries - callable organ behavior.
def clear_rolling_summaries():
    try:
        aida.global_id = {}
        aida.realm_data = ""
        pulse("[RESET] Rolling summaries flushed.")
    except Exception as e:
        pulse(f"[RESET] Error: {e}")

# ==========================================================
#  THE CHASSIS (BLOCK 7)
# ==========================================================
# AIDA REVIEW BLOCK 7: Class PresentationState - grouped organ/service behavior.
class PresentationState:
# AIDA REVIEW BLOCK 8: Function __init__ - callable organ behavior.
    def __init__(self):
        self.mode = "idle"
        self.last_arrival = None

# AIDA REVIEW BLOCK 9: Class InteractionState - grouped organ/service behavior.
class InteractionState:
# AIDA REVIEW BLOCK 10: Function __init__ - callable organ behavior.
    def __init__(self):
        self.session_log = []
        self.turn_index = 0
        self.strike_count = 0

# AIDA REVIEW BLOCK 11: Class AidaChassis - grouped organ/service behavior.
class AidaChassis:
# AIDA REVIEW BLOCK 12: Function __init__ - callable organ behavior.
    def __init__(self):
        # Organs are expected to be imported or defined in 007/009
        # These are stubs to ensure the engine boots even if files are missing
        self.role = type('obj', (object,), {'load_from_dict': lambda d: None, 'to_dict': lambda: {}})
        self.realm = type('obj', (object,), {'load_from_dict': lambda d: None, 'to_dict': lambda: {}, 'briefcase_name': "CORE"})
        self.emotion = type('obj', (object,), {'load_from_dict': lambda d: None, 'to_dict': lambda: {}})
        self.identity = type('obj', (object,), {'load_from_dict': lambda d: None, 'to_dict': lambda: {}})
        
        self.presentation = PresentationState()
        self.interaction = InteractionState()
        self.google_token = None

aida = AidaChassis()

# ==========================================================
#  SOUL SYNC ENGINE (BLOCK 8)
# ==========================================================
# AIDA REVIEW BLOCK 13: Async function _fetch_briefcase_json - async callable organ behavior.
async def _fetch_briefcase_json(briefcase_name: str) -> dict:
    pulse(f"[SOUL] Fetching data for {briefcase_name}...")
    # TODO: Connect to Google Drive Librarian
    return {"role": {}, "realm": {"name": briefcase_name}, "emotion": {}, "identity": {}}

# AIDA REVIEW BLOCK 14: Async function py_sync_soul - async callable organ behavior.
async def py_sync_soul(google_token: str):
    pulse("[SOUL] Initializing Deep Sync...")
    aida.google_token = google_token
    briefcase_name = getattr(aida.realm, "briefcase_name", "REALM_CORE.json")
    
    data = await _fetch_briefcase_json(briefcase_name)
    
    # Load Organs
    aida.role.load_from_dict(data.get("role", {}))
    aida.realm.load_from_dict(data.get("realm", {}))
    aida.emotion.load_from_dict(data.get("emotion", {}))
    aida.identity.load_from_dict(data.get("identity", {}))
    
    pulse("[SOUL] All organs synchronized.")
    window.aida_arrive() # Trigger the JS Hologram

# ==========================================================
#  INTERACTION ENGINE & SNAPSHOTS (BLOCK 9 & 9B)
# ==========================================================
# AIDA REVIEW BLOCK 15: Function _tetrad_snapshot - callable organ behavior.
def _tetrad_snapshot():
    return {
        "role": aida.role.to_dict(),
        "realm": aida.realm.to_dict(),
        "emotion": aida.emotion.to_dict(),
        "identity": aida.identity.to_dict(),
        "interaction": {
            "turn": aida.interaction.turn_index,
            "strikes": aida.interaction.strike_count
        }
    }

# AIDA REVIEW BLOCK 16: Function py_get_tetrad_snapshot - callable organ behavior.
def py_get_tetrad_snapshot():
    return json.dumps(_tetrad_snapshot())

# AIDA REVIEW BLOCK 17: Function py_log_turn - callable organ behavior.
def py_log_turn(user_text, assistant_text, meta=None):
    entry = {
        "turn": aida.interaction.turn_index,
        "user": user_text,
        "assistant": assistant_text,
        "tetrad": _tetrad_snapshot()
    }
    aida.interaction.session_log.append(entry)
    aida.interaction.turn_index += 1
    pulse(f"[VOICE] Entry {entry['turn']} committed to log.")

# AIDA REVIEW BLOCK 18: Function py_register_strike - callable organ behavior.
def py_register_strike(reason=""):
    aida.interaction.strike_count += 1
    pulse(f"[STRIKE] {aida.interaction.strike_count} total. Reason: {reason}")

# ==========================================================
#  JS BRIDGE EXPOSURE
# ==========================================================
window.py_sync_soul = create_proxy(py_sync_soul)
window.py_get_tetrad_snapshot = create_proxy(py_get_tetrad_snapshot)
window.py_log_turn = create_proxy(py_log_turn)
window.py_register_strike = create_proxy(py_register_strike)
window.py_list_briefcases = create_proxy(py_list_briefcases)

pulse("ENGINE PLATINUM v5.1 ONLINE")
