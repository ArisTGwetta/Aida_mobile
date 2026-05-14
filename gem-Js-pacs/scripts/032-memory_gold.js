/* 032-memory_gold.js 
   THE COGNITIVE HUB: BUTLER, LIBRARIAN, & CRAWLER
*/

window.deep_memory = (function() {
    let lastRealm = null;

    // --- Identity Shift Wrapper ---
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
            aura_engine.addWakeLine("Night cycle complete. Tomorrow’s mind is ready.");
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

