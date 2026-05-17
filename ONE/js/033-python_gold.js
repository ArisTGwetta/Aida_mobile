/* 033-python_gold.js
   THE ENGINE ROOM: GIANT ORGAN PACK (NO .PY FETCHES)
   - Mounts all Python organs from JS trucks into Pyodide FS
   - Exposes a shared Pyodide + tools runner
*/

(function () {
    console.log("[PYTHON] 033: Giant organ pack initializing...");

    // Global flags
    window.AIDA_PYODIDE = null;
    window.AIDA_PY_READY = false;

    // --- BIOS-style logger hook (optional, safe if missing) ---
    function biosLog(msg, colorClass = "log-white") {
        const logs = document.getElementById("bios-logs");
        if (!logs) return;
        const div = document.createElement("div");
        div.className = colorClass;
        div.textContent = ">>> " + msg;
        logs.appendChild(div);
    }

    // --- Core boot promise: load Pyodide + mount all organs ---
    window.AIDA_PY_BOOT_PROMISE = (async function () {
        try {
            biosLog("Beginning Python Boot Sequence...", "log-white");
            console.log("[PYTHON] 033: Loading Pyodide runtime...");

            const pyodide = await loadPyodide();
            window.AIDA_PYODIDE = pyodide;
            biosLog("Engine Warmed.", "log-amber");
            console.log("[PYTHON] 033: Pyodide ready.");

            // --- PATCH BUTLER TRUCK TO ADD LEGACY API ---
            let BUTLER_TRUCK = typeof BUTLER_PY !== "undefined" ? BUTLER_PY : null;
            if (BUTLER_TRUCK) {
                BUTLER_TRUCK += `
def build_butler_state(*args, **kwargs):
    """
    Legacy API bridge: tolerate old positional calls like
    build_butler_state(identity) or (identity, realm, role, session)
    and map into the new Butler(...) signature.
    """
    identity = None
    realm = None
    role = None
    session = None

    # Positional mapping
    if len(args) >= 1:
        identity = args[0]
    if len(args) >= 2:
        realm = args[1]
    if len(args) >= 3:
        role = args[2]
    if len(args) >= 4:
        session = args[3]

    # Keyword overrides
    identity = kwargs.get("identity", identity)
    realm = kwargs.get("realm", realm)
    role = kwargs.get("role", role)
    session = kwargs.get("session", session)

    try:
        return Butler(identity, realm, role, session)
    except Exception as e:
        return {
            "error": str(e),
            "identity": identity,
            "realm": realm,
            "role": role,
            "session": session,
        }
`;
            }

            // --- PATCH LIBRARIAN TRUCK TO ADD LEGACY API ---
            let LIBRARIAN_TRUCK = typeof LIBRARIAN_PY !== "undefined" ? LIBRARIAN_PY : null;
            if (LIBRARIAN_TRUCK) {
                LIBRARIAN_TRUCK += `
def build_library(*args, **kwargs):
    """
    Legacy API bridge: tolerate old calls like
    build_library(identity) or build_library(identity, realm, role, session, facts, insights, memory)
    and map into Librarian(...).
    """
    identity = None
    realm = None
    role = None
    session = None
    facts = None
    insights = None
    memory = None

    # Positional mapping
    if len(args) >= 1:
        identity = args[0]
    if len(args) >= 2:
        realm = args[1]
    if len(args) >= 3:
        role = args[2]
    if len(args) >= 4:
        session = args[3]
    if len(args) >= 5:
        facts = args[4]
    if len(args) >= 6:
        insights = args[5]
    if len(args) >= 7:
        memory = args[6]

    # Keyword overrides
    identity = kwargs.get("identity", identity)
    realm = kwargs.get("realm", realm)
    role = kwargs.get("role", role)
    session = kwargs.get("session", session)
    facts = kwargs.get("facts", facts)
    insights = kwargs.get("insights", insights)
    memory = kwargs.get("memory", memory)

    try:
        return Librarian(
            identity=identity,
            realm=realm,
            role=role,
            session=session,
            facts=facts,
            insights=insights,
            memory=memory,
        )
    except Exception as e:
        return {"error": str(e)}
`;
            }

            // --- PATCH EMOTION SELECTOR TRUCK TO ADD LEGACY API ---
            let EMOTION_TRUCK = typeof EMOTION_SELECTOR_PY !== "undefined" ? EMOTION_SELECTOR_PY : null;
            if (EMOTION_TRUCK) {
                EMOTION_TRUCK += `
def select_emotion(*args, **kwargs):
    """
    Legacy API bridge: old code imports select_emotion from emotion_selector.
    Try to delegate to an EmotionSelector engine if present,
    otherwise return a neutral stub so the pipeline doesn't crash.
    """
    try:
        engine_cls = globals().get("EmotionSelector", None)
        if engine_cls is not None:
            engine = engine_cls()
            # Prefer a 'select' method if it exists
            if hasattr(engine, "select"):
                return engine.select(*args, **kwargs)
            # Fallback: call the instance directly if it's callable
            if callable(engine):
                return engine(*args, **kwargs)
        # Fallback neutral emotion
        return {"emotion": "neutral"}
    except Exception as e:
        return {"error": str(e)}
`;
            }

            // 2. THE AUTOMATION CYCLE: Write all JS delivery trucks to Python Memory
            const AIDA_MODULES = {
                // CORE IDENTITY / REALM / ROLE / EMOTION / SOUL
                "identity_organ.py":
                    typeof IDENTITY_PY !== "undefined"
                        ? IDENTITY_PY
                        : `class IdentityEngine:\n    def __init__(self, **kwargs): pass\n    def get_resolved_identity(self): return {"name": "Aida (Mock)"}`,
                "realm_organ.py":
                    typeof REALM_PY !== "undefined"
                        ? REALM_PY
                        : `class RealmEngine:\n    def __init__(self, config=None): self.resolved_realm = config or {"realm_name": "Mock Realm"}`,
                "role_organ.py":
                    typeof ROLE_PY !== "undefined"
                        ? ROLE_PY
                        : `class RoleEngine:\n    def __init__(self, config=None): self.resolved_role = config or {"name": "Mock Role"}`,
                "emotion_selector.py": EMOTION_TRUCK,
                "soul_sync_engine.py":
                    typeof SOUL_SYNC_PY !== "undefined" ? SOUL_SYNC_PY : null,

                // TETRAD / TRIAD CHASSIS (map to both common filenames just in case)
                "tetrad.py":
                    typeof TETRAD_PY !== "undefined" ? TETRAD_PY : null,
                "tetrad_chassis.py":
                    typeof TETRAD_PY !== "undefined" ? TETRAD_PY : null,

                // TOOLS: BUTLER / LIBRARIAN / CRAWLER
                "butler.py": BUTLER_TRUCK,
                "librarian.py": LIBRARIAN_TRUCK,
                "crawler.py":
                    typeof CRAWLER_PY !== "undefined" ? CRAWLER_PY : null,

                // OPTIONAL: LLM ENGINE (if present in this build)
                "llm_engine_v1.py":
                    typeof LLM_ENGINE_PY !== "undefined" ? LLM_ENGINE_PY : null
            };

            try {
                for (const [filename, content] of Object.entries(AIDA_MODULES)) {
                    if (content) {
                        await pyodide.FS.writeFile(filename, content);
                        console.log(`%c>>> FS: ${filename} synchronized.`, "color:#00d4ff");
                    } else {
                        console.warn(`>>> FS: Skipping ${filename} (No JS truck defined)`);
                    }
                }
                biosLog("Cognitive Organs Synchronized.", "log-blue");
            } catch (err) {
                console.error("[PYTHON] 033: FS write error:", err);
                biosLog("FS Error: Critical failure.", "log-error");
                throw err;
            }

            // --- TRIAD BRIDGE: legacy triad → new Soul Sync ---
            try {
                pyodide.FS.writeFile(
                    "triad.py",
                    `
from soul_sync_engine import py_sync_soul

def build_triads(identity, realm, role, emotion, session):
    # Legacy API bridge: old triad call now runs Soul Sync
    return py_sync_soul(identity, realm, role, emotion)
`
                );
                console.log(">>> FS: triad.py bridge module synchronized.");
            } catch (e) {
                console.warn(">>> FS: Could not create triad bridge module:", e);
            }

            window.AIDA_PY_READY = true;
            console.log("[PYTHON] 033: All organs mounted. AIDA_PY_READY = true.");
            biosLog("Python Mind Online. Awaiting Handshake.", "log-blue");

            
            // ---------------------------------------------------------
            // TETRAD SNAPSHOT BRIDGE (JS → Python → JS)
            // ---------------------------------------------------------
window.py_get_tetrad_snapshot = async function () {
    const py = await window.AIDA_PY_BOOT_PROMISE;

    const code = `
from soul_sync_engine import py_sync_soul
from js import logistics_hub
from pyodide.ffi import to_py

# Pull the current Drive state from JS and convert fully
state = to_py(logistics_hub.getCurrentState())

core_identity = state.get("global", {}).get("core_identity", {})
realm_config  = state.get("realm", {})
role_config   = state.get("project", {})
emotion_state = state.get("realm", {}).get("emotion_state", {"valence": 0.1, "arousal": -0.1})

snapshot = py_sync_soul(core_identity, realm_config, role_config, emotion_state)
snapshot
`;

    return await py.runPythonAsync(code);
};



            return pyodide;
        } catch (e) {
            console.error("[PYTHON] 033: Boot failure:", e);
            biosLog("Python Boot Failure.", "log-error");
            throw e;
        }
    })();

    // ---------------------------------------------------------
    // TOOLS ENGINE: reuse the same Pyodide instance for trucks
    // ---------------------------------------------------------
    window.py_engine = {
        /**
         * Run a specific Python tool class from a mounted module.
         * toolName: module name (without .py)
         * className: class to instantiate inside that module
         */
        runTool: async function (toolName, className) {
            // Ensure core boot is done
            const pyodide = await window.AIDA_PY_BOOT_PROMISE;

            const payload = `${toolName}_payload.json`;
            const output = `${toolName}_output.json`;

            // Simple Drive bridge helpers must exist on window.logistics_hub
            const fs = {
                importFromDrive: async (filename) => {
                    const data = await logistics_hub.drive.downloadJSON_By_Name(filename);
                    pyodide.FS.writeFile(filename, JSON.stringify(data));
                },
                exportToDrive: async (filename, folderId) => {
                    const content = pyodide.FS.readFile(filename, { encoding: "utf8" });
                    await logistics_hub.drive.uploadText(folderId, filename, content);
                }
            };

            // Bring payload into Pyodide
            await fs.importFromDrive(payload);

            const pythonCode = `
from ${toolName} import ${className}
worker = ${className}()
worker.run(payload_path="${payload}", output_path="${output}")
`;
            console.log(`[PYTHON] 033: Running tool ${toolName}.${className}...`);
            await pyodide.runPythonAsync(pythonCode);

            await fs.exportToDrive(output, window.AIDA_MEMORY_FOLDER);
            console.log(`[PYTHON] 033: ${toolName} execution complete.`);
        }
    };

    console.log("[PYTHON] 033: Giant organ pack wired.");
})();
