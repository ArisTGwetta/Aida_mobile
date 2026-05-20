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
    identity = None
    realm = None
    role = None
    session = None

    if len(args) >= 1: identity = args[0]
    if len(args) >= 2: realm = args[1]
    if len(args) >= 3: role = args[2]
    if len(args) >= 4: session = args[3]

    identity = kwargs.get("identity", identity)
    realm = kwargs.get("realm", realm)
    role = kwargs.get("role", role)
    session = kwargs.get("session", session)

    try:
        return Butler(identity, realm, role, session)
    except Exception as e:
        return {"error": str(e)}
`;
            }

            // --- PATCH LIBRARIAN TRUCK TO ADD LEGACY API ---
            let LIBRARIAN_TRUCK = typeof LIBRARIAN_PY !== "undefined" ? LIBRARIAN_PY : null;
            if (LIBRARIAN_TRUCK) {
                LIBRARIAN_TRUCK += `
def build_library(*args, **kwargs):
    identity = None
    realm = None
    role = None
    session = None
    facts = None
    insights = None
    memory = None

    if len(args) >= 1: identity = args[0]
    if len(args) >= 2: realm = args[1]
    if len(args) >= 3: role = args[2]
    if len(args) >= 4: session = args[3]
    if len(args) >= 5: facts = args[4]
    if len(args) >= 6: insights = args[5]
    if len(args) >= 7: memory = args[6]

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
    try:
        engine_cls = globals().get("EmotionSelector", None)
        if engine_cls is not None:
            engine = engine_cls()
            if hasattr(engine, "select"):
                return engine.select(*args, **kwargs)
            if callable(engine):
                return engine(*args, **kwargs)
        return {"emotion": "neutral"}
    except Exception as e:
        return {"error": str(e)}
`;
            }

            // 2. THE AUTOMATION CYCLE: Write all JS delivery trucks to Python Memory
            const AIDA_MODULES = {
                "identity_organ.py": typeof IDENTITY_PY !== "undefined" ? IDENTITY_PY : null,
                "realm_organ.py": typeof REALM_PY !== "undefined" ? REALM_PY : null,
                "role_organ.py": typeof ROLE_PY !== "undefined" ? ROLE_PY : null,
                "emotion_selector.py": EMOTION_TRUCK,
                "soul_sync_engine.py": typeof SOUL_SYNC_PY !== "undefined" ? SOUL_SYNC_PY : null,
                "tetrad.py": typeof TETRAD_PY !== "undefined" ? TETRAD_PY : null,
                "tetrad_chassis.py": typeof TETRAD_PY !== "undefined" ? TETRAD_PY : null,
                // ⭐ Correct triad shim
                "triad.py": "from tetrad import assemble_tetrad as build_triads",
                "butler.py": BUTLER_TRUCK,
                "librarian.py": LIBRARIAN_TRUCK,
                "crawler.py": typeof CRAWLER_PY !== "undefined" ? CRAWLER_PY : null,
                "llm_engine_v1.py": typeof LLM_ENGINE_PY !== "undefined" ? LLM_ENGINE_PY : null
            };

            // 1. Write all modules into Pyodide FS
            for (const [filename, content] of Object.entries(AIDA_MODULES)) {
                if (content) {
                    await pyodide.FS.writeFile(filename, content);
                    console.log(`%c>>> FS: ${filename} synchronized.`, "color:#00d4ff");
                } else {
                    console.warn(`>>> FS: Skipping ${filename} (No JS truck defined)`);
                }
            }

            // 2. NOW invalidate caches so Python reloads the new versions
            pyodide.runPython("import importlib; importlib.invalidate_caches()");

            biosLog("Cognitive Organs Synchronized.", "log-blue");

            // ---------------------------------------------------------
            // ⭐ OVERRIDE logistics_hub WITH REAL JS MIND STATE ⭐
            // ---------------------------------------------------------
            window.logistics_hub = {
                getCurrentState() {
                    const state = {
                        global: {
                            core_identity: window.AIDA_IDENTITY
                        },
                        realm: {
                            ...(window.AIDA_REALM || {}),
                            emotion_state: window.AIDA_EMOTION_STATE
                        },
                        project: {
                            ...(window.AIDA_ROLE || {})
                        }
                    };
                    console.log(">>> LOGISTICS_HUB.getCurrentState:", state);
                    return state;
                }
            };

            window.logistics_hub.get_snapshot = function () {
                const snap = {
                    identity: window.AIDA_IDENTITY,
                    realm: window.AIDA_REALM,
                    role: window.AIDA_ROLE,
                    emotion: window.AIDA_EMOTION_STATE,
                    project: window.AIDA_ACTIVE_PROJECT || null,
                    status: "synchronized"
                };
                console.log(">>> LOGISTICS_HUB.get_snapshot:", snap);
                return snap;
            };

            // ---------------------------------------------------------
            // TETRAD SNAPSHOT BRIDGE (JS → Python → JS)
            // ---------------------------------------------------------
            window.py_get_tetrad_snapshot = async function () {
                console.log(">>> TETRAD BRIDGE: py_get_tetrad_snapshot LOADED (033)");

                const py = await window.AIDA_PY_BOOT_PROMISE;

                const code = `
from soul_sync_engine import py_sync_soul
from js import logistics_hub

print(">>> PY: TETRAD BRIDGE EXECUTING")

state_js = logistics_hub.getCurrentState()
if callable(state_js):
    state_js = state_js()

print(">>> PY: state_js =", state_js)

state = state_js.to_py()

global_state   = state.get("global")  or {}
realm_state    = state.get("realm")   or {}
project_state  = state.get("project") or {}

core_identity = global_state.get("core_identity", {})
realm_config  = realm_state
role_config   = project_state
emotion_state = realm_state.get("emotion_state", {})

print(">>> PY: core_identity =", core_identity)
print(">>> PY: realm_config  =", realm_config)
print(">>> PY: role_config   =", role_config)
print(">>> PY: emotion_state =", emotion_state)

snapshot = py_sync_soul(core_identity, realm_config, role_config, emotion_state)
print(">>> PY: TETRAD SNAPSHOT =", snapshot)
snapshot
`;

                console.log(">>> JS: Calling py_get_tetrad_snapshot Python block...");
                const result = await py.runPythonAsync(code);
                console.log(">>> TETRAD SNAPSHOT (JS):", result);

                if (typeof window.updateTetradInspector === "function") {
                    window.updateTetradInspector(result);
                } else {
                    console.warn(">>> TETRAD: updateTetradInspector not defined.");
                }

                return result;
            };

            window.AIDA_PY_READY = true;
            console.log("[PYTHON] 033: All organs mounted. AIDA_PY_READY = true.");
            biosLog("Python Mind Online. Awaiting Handshake.", "log-blue");

            return pyodide;

        } catch (e) {
            console.error("[PYTHON] 033: Boot failure:", e);
            biosLog("Python Boot Failure.", "log-error");
            throw e;
        }
    })();

    // ---------------------------------------------------------
    // TOOLS ENGINE
    // ---------------------------------------------------------
    window.py_engine = {
        runTool: async function (toolName, className) {
            const pyodide = await window.AIDA_PY_BOOT_PROMISE;

            const payload = `${toolName}_payload.json`;
            const output = `${toolName}_output.json`;

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

