/* 033-python_gold.js
   THE ENGINE ROOM: PYODIDE & PYTHON TOOLS + ORGAN LOADER
*/

/* ---------------------------------------------------------
 *  A. PYTHON ORGANS FOR THE MIND ENGINE (035–039)
 *  - Preloads .py files into window.AIDA_PY_ORGANS
 *  - Uses correct GitHub Pages path
 * --------------------------------------------------------- */

window.AIDA_PY_ORGANS = window.AIDA_PY_ORGANS || {};

(async function preloadPythonOrgans() {
    console.log("[PYTHON] Preloading Mind organs into AIDA_PY_ORGANS...");

    // GitHub Pages path (your repo structure)
    const BASE = "/Aida_mobile/ONE/py";

    // Deterministic load order (dependency‑friendly)
    const organNames = [
        "identity_engine",
        "realm_engine",
        "role_engine",
        "emotion_selector",
        "triad",
        "butler",
        "crawler",
        "librarian"
    ];

    for (const name of organNames) {
        const filename = `${name}.py`;
        const url = `${BASE}/${filename}`;

        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.warn(`[PYTHON] Failed to fetch organ ${filename}: HTTP ${resp.status}`);
                continue;
            }
            const code = await resp.text();
            window.AIDA_PY_ORGANS[filename] = code;
            console.log(`[PYTHON] Loaded organ: ${filename}`);
        } catch (e) {
            console.error(`[PYTHON] Error loading organ ${filename}`, e);
        }
    }

    console.log("[PYTHON] Organ preload complete. AIDA_PY_ORGANS is ready for 035–039.");
})();

/* ---------------------------------------------------------
 *  B. TOOLS ENGINE (original py_engine wrapper)
 *  - Uses its own Pyodide instance for Drive tools.
 * --------------------------------------------------------- */

window.py_engine = (function() {
    let pyodide = null;
    let isReady = false;

    // 1. Ignition: Load the runtime and the "Organs" (.py files) for tools
    async function boot() {
        if (isReady) return;

        console.log("[PYTHON] Booting Tools Engine...");
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        window.AIDA_PYODIDE = pyodide;

        // Tool‑side scripts (subset)
        const BASE = "/Aida_mobile/ONE/py";
        const scripts = [
            "butler",
            "crawler",
            "librarian",
            "identity_organ",
            "soul_sync_engine"
        ];

        for (const name of scripts) {
            const filename = `${name}.py`;
            const url = `${BASE}/${filename}`;

            try {
                const resp = await fetch(url);
                if (!resp.ok) {
                    console.warn(`[PYTHON] Tools Engine: failed to fetch ${filename}: HTTP ${resp.status}`);
                    continue;
                }
                const code = await resp.text();
                pyodide.FS.writeFile(filename, code);
                console.log(`[PYTHON] Tools Engine mounted: ${filename}`);
            } catch (e) {
                console.error(`[PYTHON] Tools Engine: failed to load ${filename}`, e);
            }
        }

        isReady = true;
        window.AIDA_PY_READY = true;
        console.log("[PYTHON] Tools Engine Ready.");
    }

    // 2. The Conveyor: Drive <-> Python FS
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

    // 3. The Operator: Run a specific tool
    return {
        runTool: async function(toolName, className) {
            await boot();

            const payload = `${toolName}_payload.json`;
            const output = `${toolName}_output.json`;

            await fs.importFromDrive(payload);

            const pythonCode = `
from ${toolName} import ${className}
worker = ${className}()
worker.run(payload_path="${payload}", output_path="${output}")
            `;

            await pyodide.runPythonAsync(pythonCode);

            await fs.exportToDrive(output, window.AIDA_MEMORY_FOLDER);
            console.log(`[PYTHON] ${toolName} execution complete.`);
        }
    };
})();
