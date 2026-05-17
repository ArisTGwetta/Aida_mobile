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
def build_butler_state(identity, realm, role, session):
    # Legacy API bridge: old butler call now instantiates the new Butler
    try:
        return Butler(identity, realm, role, session)
    except Exception as e:
        return {"error": str(e), "identity": identity, "realm": realm, "role": role, "session": session}
`;
            }

            // --- PATCH LIBRARIAN TRUCK TO ADD LEGACY API ---
            let LIBRARIAN_TRUCK = typeof LIBRARIAN_PY !== "undefined" ? LIBRARIAN_PY : null;
            if (LIBRARIAN_TRUCK) {
                LIBRARIAN_TRUCK += `
def build_library(*args, **kwargs):
    """
    Legacy API bridge.
    Old loop typically calls: build_library(identity)
    New system needs: Librarian(identity, realm, role, session, facts, insights, memory)
    We reconstruct from AIDA_CONTEXT.
    """
    try:
        from soul_sync_engine import AIDA_CONTEXT
        identity = AIDA_CONTEXT.get("identity")
        realm = AIDA_CONTEXT.get("realm")
        role = AIDA_CONTEXT.get("role")
        session = AIDA_CONTEXT.get("session")
        facts = AIDA_CONTEXT.get("facts")
        insights = AIDA_CONTEXT.get("insights")
        memory = AIDA_CONTEXT.get("memory")

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

            // --- PATCH CRAWLER TRUCK TO ADD LEGACY API ---
            let CRAWLER_TRUCK = typeof CRAWLER_PY !== "undefined" ? CRAWLER_PY : null;
            if (CRAWLER_TRUCK) {
                CRAWLER_TRUCK += `
def build_crawler_index(identity, realm, role, session, memory=None):
    # Legacy API bridge: old crawler call now instantiates the new Crawler
    try:
        return Crawler(
            identity=identity,
            realm=realm,
            role=role,
            session=session,
            memory=memory,
        )
    except Exception as e:
        return {"error": str(e)}
`;
            }

            // --- PATCH EMOTION SELECTOR TRUCK TO ADD LEGACY API ---
            let EMOTION_SELECTOR_TRUCK =
                typeof EMOTION_SELECTOR_PY !== "undefined" ? EMOTION_SELECTOR_PY : null;

            if (EMOTION_SELECTOR_TRUCK) {
                EMOTION_SELECTOR_TRUCK += `
def select_emotion(identity, realm, role, session, memory=None, insights=None, facts=None):
    # Legacy API bridge: old select_emotion call now uses the new EmotionSelector
    try:
        selector = EmotionSelector(
            identity=identity,
            realm=realm,
            role=role,
            session=session,
            memory=memory,
            insights=insights,
            facts=facts,
        )
        return selector.select()
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
                "emotion_selector.py": EMOTION_SELECTOR_TRUCK,
                "soul_sync_engine.py":
                    typeof SOUL_SYNC_PY !== "undefined" ? SOUL_SYNC_PY : null,

                // TETRAD / TRIAD CHASSIS
                "tetrad.py":
                    typeof TETRAD_PY !== "undefined" ? TETRAD_PY : null,
                "tetrad_chassis.py":
                    typeof TETRAD_PY !== "undefined" ? TETRAD_PY : null,

                // TOOLS: BUTLER / LIBRARIAN / CRAWLER
                "butler.py": BUTLER_TRUCK,
                "librarian.py": LIBRARIAN_TRUCK,
                "crawler.py": CRAWLER_TRUCK,

                // OPTIONAL: LLM ENGINE
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
