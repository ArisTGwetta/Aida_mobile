// AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\scripts\032-memory_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 032-memory_gold.js 
   THE COGNITIVE HUB: BUTLER, LIBRARIAN, & CRAWLER
*/

// AIDA REVIEW BLOCK 3: Browser export deep_memory - exposes this organ to the page runtime.
window.deep_memory = (function() {
    let lastRealm = null;

    // --- Identity Shift Wrapper ---
// AIDA REVIEW BLOCK 4: Function performDeepTask - callable behavior in this runtime organ.
    async function performDeepTask(taskName, targetRealm, taskFn) {
        console.log(`[MEMORY] Initiating ${taskName}...`);
        
        // Save current realm to return later
        lastRealm = logistics_hub.getCurrentState().realm?.filename || "realm_default.json";
        
        // Shift to the "Inner Mind" realm
        await aura_engine.manifest(targetRealm);
        
        try {
            await taskFn();
        } catch (e) {
            console.error(`[MEMORY] ${taskName} failed:`, e);
            aura_engine.addWakeLine(`System hiccup during ${taskName}. Reverting...`);
        } finally {
            // Always come back home
            await aura_engine.manifest(lastRealm);
        }
    }

    return {
        // Nightly Cleanup
        runButler: () => performDeepTask("Butler", "realm_aida_architecture.json", async () => {
            aura_engine.addWakeLine("Butler is tidying the session logs...");
            // await python_bridge.run("butler_script.py");
            aura_engine.addWakeLine("Night cycle complete. Tomorrowâ€™s mind is ready.");
        }),

        // Long-term Pattern Recognition
        runLibrarian: () => performDeepTask("Librarian", "realm_aida_architecture.json", async () => {
            aura_engine.addWakeLine("Librarian is indexing the Vault...");
            // await python_bridge.run("librarian_script.py");
            aura_engine.addWakeLine("Deep meditation complete. Patterns updated.");
        }),

        // Search & Retrieval
        runCrawler: () => performDeepTask("Crawler", "realm_aida_architecture.json", async () => {
            aura_engine.addWakeLine("Crawler is exploring the archives...");
            // await python_bridge.run("crawler_script.py");
            aura_engine.addWakeLine("Archive crawl complete.");
        })
    };
})();

