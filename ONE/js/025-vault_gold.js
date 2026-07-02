// AIDA REVIEW BLOCK 1: File header - ONE\js\025-vault_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 025-vault_gold.js
   THE VAULT: TOKEN KEEPER (BLOCK 25)
*/

// AIDA REVIEW BLOCK 3: Browser export token_keeper - exposes this organ to the page runtime.
window.token_keeper = (function() {
    let driveToken = null;
    let refreshToken = null;
    let openaiKey = null;

// AIDA REVIEW BLOCK 4: Function init - callable behavior in this runtime organ.
    function init() {
        // Restore from sessionStorage (survives refresh, dies on tab close)
        driveToken = sessionStorage.getItem("aida_drive_token") || null;
        refreshToken = sessionStorage.getItem("aida_drive_refresh") || null;
        openaiKey = sessionStorage.getItem("aida_active_key") || null;
        console.log("[VAULT] Token Keeper Initialized.");
    }

    // Setters
// AIDA REVIEW BLOCK 5: Function setDriveToken - callable behavior in this runtime organ.
    function setDriveToken(token) { driveToken = token; sessionStorage.setItem("aida_drive_token", token); }
// AIDA REVIEW BLOCK 6: Function setRefreshToken - callable behavior in this runtime organ.
    function setRefreshToken(token) { refreshToken = token; sessionStorage.setItem("aida_drive_refresh", token); }
// AIDA REVIEW BLOCK 7: Function setOpenAIKey - callable behavior in this runtime organ.
    function setOpenAIKey(key) { openaiKey = key; sessionStorage.setItem("aida_active_key", key); }

    // Header Builders
// AIDA REVIEW BLOCK 8: Function driveHeaders - callable behavior in this runtime organ.
    function driveHeaders() {
        return driveToken ? { "Authorization": `Bearer ${driveToken}` } : {};
    }

// AIDA REVIEW BLOCK 9: Function openaiHeaders - callable behavior in this runtime organ.
    function openaiHeaders() {
        return openaiKey ? { 
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
        } : {};
    }

    
    return {
    init,
    setDriveToken,
    setRefreshToken,
    setOpenAIKey,

    getDriveToken: () => driveToken,
    getRefreshToken: () => refreshToken,
    getOpenAIKey: () => openaiKey,

    driveHeaders,
    openaiHeaders,

    // =========================================================
    // WAIT FOR KEY â€” resolves only when the OpenAI key exists
    // =========================================================
    waitForKey: function () {
        return new Promise((resolve, reject) => {
            let attempts = 0;

// AIDA REVIEW BLOCK 10: Function check - arrow-function behavior in this runtime organ.
            const check = () => {
                attempts++;

                try {
                    const key = openaiKey;
                    if (key && typeof key === "string" && key.startsWith("sk-")) {
                        resolve(key);
                        return;
                    }
                } catch (e) {
                    // ignore and retry
                }

                if (attempts > 200) {   // ~2 seconds at 10ms
                    reject("OpenAI key not ready after waiting.");
                    return;
                }

                setTimeout(check, 10);
            };

            check();
        });
    }
};
})();


// Immediate Init
window.token_keeper.init();
