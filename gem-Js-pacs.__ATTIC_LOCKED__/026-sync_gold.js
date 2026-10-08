// AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\026-sync_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 026-sync_gold.js
   THE LOGISTICS HUB: DRIVE SYNC & BRIEFCASE ENGINE (BLOCKS 26 & 27)
*/

// AIDA REVIEW BLOCK 3: Browser export logistics_hub - exposes this organ to the page runtime.
window.logistics_hub = (function() {
    const DRIVE_URL = "https://www.googleapis.com/drive/v3/files";
    const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    let vaultId = null;
    let state = { global: null, realm: null, project: null };

    // --- DRIVE SYNC CORE ---
// AIDA REVIEW BLOCK 4: Function apiRequest - callable behavior in this runtime organ.
    async function apiRequest(url, options = {}) {
        const headers = { ...token_keeper.driveHeaders(), ...options.headers };
        const resp = await fetch(url, { ...options, headers });
        if (!resp.ok) throw new Error(`[LOGISTICS] API Error: ${resp.status}`);
        return resp;
    }

    const drive = {
        list: async (folderId) => {
            const q = `'${folderId}' in parents and trashed = false`;
            const r = await apiRequest(`${DRIVE_URL}?q=${encodeURIComponent(q)}`);
            const d = await r.json();
            return d.files || [];
        },
        downloadJSON: async (fileId) => {
            const r = await apiRequest(`${DRIVE_URL}/${fileId}?alt=media`);
            return await r.json();
        },
        uploadText: async (folderId, filename, content) => {
            const metadata = { name: filename, parents: [folderId] };
            const boundary = "AIDA_SYNC_BND_" + Date.now();
            const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n` +
                         `--${boundary}\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--${boundary}--`;
            
            const r = await apiRequest(UPLOAD_URL, {
                method: "POST",
                headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
                body: body
            });
            return await r.json();
        }
    };

    // --- BRIEFCASE ENGINE ---
    return {
        init: (folderId) => { vaultId = folderId; },
        
        switchRealm: async (realmFilename) => {
            console.log(`[LOGISTICS] Switching Realm to: ${realmFilename}`);
            const files = await drive.list(vaultId);
            
            // 1. Load Global Identity if missing
            if (!state.global) {
                const gFile = files.find(f => f.name.includes("global_briefcase"));
                if (gFile) state.global = await drive.downloadJSON(gFile.id);
            }

            // 2. Load Realm Config
            const rFile = files.find(f => f.name === realmFilename);
            if (rFile) state.realm = await drive.downloadJSON(rFile.id);

            // 3. Load Project Continuity
            if (state.realm?.project_context) {
                const pFile = files.find(f => f.name === state.realm.project_context);
                if (pFile) state.project = await drive.downloadJSON(pFile.id);
            }

            // Update UI
            const tag = document.getElementById("realm-tag");
            if (tag) tag.innerText = realmFilename.split('_').pop().replace('.json','').toUpperCase();
            
            return state;
        },
        
        getFiles: () => drive.list(vaultId),
        getCurrentState: () => state
    };
})();

