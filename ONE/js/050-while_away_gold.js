/* 050-while_away_gold.js
   While-You-Were-Away Organ (embedded Python + JS bridge)
   Version: 0.1 (Socket ready, logic safe to extend)
*/

(function () {
    // =========================================================
    // 1) EMBEDDED PYTHON ORGAN
    //    - Computes a simple gap bucket based on last_active
    //    - Returns a reentry_script stub (safe, extendable)
    // =========================================================
    const WHILE_AWAY_PY = `
import json
from datetime import datetime, timezone

def _parse_iso(ts):
    if not ts:
        return None
    try:
        # Expecting ISO 8601, e.g. "2025-05-25T18:30:00Z"
        if ts.endswith("Z"):
            ts = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts)
    except Exception:
        return None

def _compute_gap_bucket(last_active_str, now_str=None):
    last_dt = _parse_iso(last_active_str)
    if not last_dt:
        return "unknown"

    if now_str:
        now_dt = _parse_iso(now_str)
    else:
        now_dt = datetime.now(timezone.utc)

    if not now_dt:
        now_dt = datetime.now(timezone.utc)

    delta = now_dt - last_dt
    days = delta.total_seconds() / 86400.0

    if days < 1.0:
        return "same_day"
    elif days <= 5.0:
        return "short_gap"
    else:
        return "long_gap"

def py_get_while_away_script(state_js_json):
    """
    state_js_json: JSON string from JS (LOGISTICS_HUB.getCurrentState)
    Expected shape (minimal):
      {
        "global": {
          "session": {
            "last_active": "2025-05-25T18:30:00Z",
            "now": "2025-05-26T14:00:00Z"   # optional
          }
        }
      }
    """
    try:
        state = json.loads(state_js_json)
    except Exception:
        state = {}

    session = (
        state.get("global", {})
             .get("session", {})
    )

    last_active = session.get("last_active")
    now_ts = session.get("now")

    gap_bucket = _compute_gap_bucket(last_active, now_ts)

    # --- STUB LOGIC (SAFE DEFAULTS) ---
    # This is the contract. You can enrich this later with:
    # - curiosity seeds
    # - art/philosophy/AI picks
    # - engagement-based topic selection
    # For now, we just return a simple, safe script.
    reentry_script = {
        "gap_bucket": gap_bucket,
        "opening_mode": "hello_only",
        "seed_topic": None
    }

    # Example of future extension:
    # if gap_bucket == "short_gap":
    #     reentry_script["opening_mode"] = "small_curiosity"
    #     reentry_script["seed_topic"] = {
    #         "type": "tiny_spark",
    #         "summary": "A small thing I kept thinking about while you were away."
    #     }
    # elif gap_bucket == "long_gap":
    #     reentry_script["opening_mode"] = "treasure_box"
    #     reentry_script["seed_topic"] = {
    #         "type": "curiosity_bundle",
    #         "items": [
    #             {"title": "Piece 1", "why": "Matches your mythic/architect tastes."},
    #             {"title": "Piece 2", "why": "Interesting AI/philosophy angle."},
    #             {"title": "Piece 3", "why": "Emotion / story resonance."}
    #         ]
    #     }

    return reentry_script
`;

    // =========================================================
    // 2) BOOTSTRAP HOOK
    //    Call this once after Pyodide is ready and FS is wired.
    //    Example (in 033-python_gold.js):
    //      await window.WHILE_AWAY_BOOT(pyodide);
    // =========================================================
    window.WHILE_AWAY_BOOT = async function (pyodide) {
        try {
            await pyodide.runPythonAsync(WHILE_AWAY_PY);
            console.log("[WHILE_AWAY] Organ mounted (py_get_while_away_script ready).");
        } catch (err) {
            console.error("[WHILE_AWAY] Failed to mount organ:", err);
        }
    };

    // =========================================================
    // 3) JS BRIDGE
    //    - Takes JS state object (from LOGISTICS_HUB.getCurrentState)
    //    - Sends JSON string into Python
    //    - Returns a plain JS object:
    //        {
    //          gap_bucket: "same_day" | "short_gap" | "long_gap" | "unknown",
    //          opening_mode: "hello_only" | ...,
    //          seed_topic: null | {...}
    //        }
    // =========================================================
    window.WHILE_AWAY_BRIDGE = {
        getReentryScript: async (stateJs) => {
            try {
                if (!window.pyodide) {
                    console.warn("[WHILE_AWAY] Pyodide not present, using fallback.");
                    return {
                        gap_bucket: "unknown",
                        opening_mode: "hello_only",
                        seed_topic: null
                    };
                }

                const pyFunc = window.pyodide.globals.get("py_get_while_away_script");
                const payload = JSON.stringify(stateJs || {});
                const result = await pyFunc(payload);
                // result is a PyProxy (dict) → convert to JS
                const jsResult = result.toJs ? result.toJs() : result;
                console.log("[WHILE_AWAY] Reentry script:", jsResult);
                return jsResult;
            } catch (err) {
                console.warn("[WHILE_AWAY] Error in bridge, using fallback:", err);
                return {
                    gap_bucket: "unknown",
                    opening_mode: "hello_only",
                    seed_topic: null
                };
            }
        }
    };

})();
