/* 025-vault_gold.js
   THE VAULT: TOKEN KEEPER (BLOCK 25)
*/

window.token_keeper = (function() {
    let driveToken = null;
    let refreshToken = null;
    let openaiKey = null;

    function init() {
        // Restore from sessionStorage (survives refresh, dies on tab close)
        driveToken = sessionStorage.getItem("aida_drive_token") || null;
        refreshToken = sessionStorage.getItem("aida_drive_refresh") || null;
        openaiKey = sessionStorage.getItem("aida_active_key") || null;
        console.log("[VAULT] Token Keeper Initialized.");
    }

    // Setters
    function setDriveToken(token) { driveToken = token; sessionStorage.setItem("aida_drive_token", token); }
    function setRefreshToken(token) { refreshToken = token; sessionStorage.setItem("aida_drive_refresh", token); }
    function setOpenAIKey(key) { openaiKey = key; sessionStorage.setItem("aida_active_key", key); }

    // Header Builders
    function driveHeaders() {
        return driveToken ? { "Authorization": `Bearer ${driveToken}` } : {};
    }

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
    // WAIT FOR KEY — resolves only when the OpenAI key exists
    // =========================================================
    waitForKey: function () {
        return new Promise((resolve, reject) => {
            let attempts = 0;

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
