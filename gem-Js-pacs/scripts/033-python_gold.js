/* 033-python_gold.js
   THE ENGINE ROOM: PYODIDE & PYTHON TOOLS
*/

window.py_engine = (function() {
    let pyodide = null;
    let isReady = false;

    // 1. Ignition: Load the runtime and the "Organs" (.py files)
    async function boot() {
        if (isReady) return;
        
        console.log("[PYTHON] Booting Engine...");
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });

        // Load your scripts (The Organ Map)
        const scripts = ['butler', 'crawler', 'librarian', 'identity_organ', 'soul_sync_engine'];
        for (const name of scripts) {
            try {
                const resp = await fetch(`/Py/${name}.py`);
                const code = await resp.text();
                pyodide.FS.writeFile(`${name}.py`, code);
            } catch (e) { console.error(`[PYTHON] Failed to load ${name}.py`, e); }
        }

        isReady = true;
        console.log("[PYTHON] Engine Ready.");
    }

    // 2. The Conveyor: Drive <-> Python FS
    const fs = {
        importFromDrive: async (filename) => {
            const data = await logistics_hub.drive.downloadJSON_By_Name(filename); // Uses our 026 logic
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

            // Bring the data into the lab
            await fs.importFromDrive(payload);

            // Execute the Python logic
            const pythonCode = `
from ${toolName} import ${className}
worker = ${className}()
worker.run(payload_path="${payload}", output_path="${output}")
            `;
            
            await pyodide.runPythonAsync(pythonCode);

            // Send results back to the Vault
            await fs.exportToDrive(output, window.AIDA_MEMORY_FOLDER);
            console.log(`[PYTHON] ${toolName} execution complete.`);
        }
    };
})();