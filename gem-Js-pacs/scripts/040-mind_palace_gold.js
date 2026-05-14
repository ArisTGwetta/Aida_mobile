/* 040-mind_palace_gold.js
   THE COGNITIVE CYCLE: ORCHESTRATION & NARRATION
*/

window.mind_palace = (function() {

    // --- 1. THE SUITCASE (Payloads) ---
    const payloads = {
        build: async (type) => {
            console.log(`[MIND] Packing payload for ${type}...`);
            // We'll use a loop to grab all necessary files defined in your Block 39
            const coreFiles = ["facts.json", "insights.json", "user_model.json", "session_log.json"];
            const data = {};
            for (const f of coreFiles) {
                data[f.replace('.json', '') ] = await logistics_hub.drive.downloadJSON_By_Name(f);
            }
            
            data.timestamp = new Date().toISOString();
            data.active_context = briefcase_engine.realm;

            await logistics_hub.drive.uploadText(window.AIDA_MEMORY_FOLDER, `${type}_payload.json`, JSON.stringify(data));
        }
    };

    // --- 2. THE NARRATOR (While You Were Away) ---
    const narrator = {
        generate: async () => {
            const b = await logistics_hub.drive.downloadJSON_By_Name("butler_output.json");
            const l = await logistics_hub.drive.downloadJSON_By_Name("librarian_output.json");
            
            // Simplified narrative logic from Block 41
            if (!b && !l) return "I kept the lights warm while you were away.";
            
            let report = "While you were away, ";
            if (b) report += `I tidied ${b.summary?.facts_updated?.length || 0} factual threads`;
            if (l) report += ` and refined your long-term preferences.`;
            
            return report;
        }
    };

    // --- 3. THE CYCLE (Orchestrator) ---
    async function runCycle(tool, className, wakeMsg) {
        // Shift to Architecture Realm
        await aura_engine.manifest("realm_aida_architecture.json");
        aura_engine.addWakeLine(wakeMsg);

        try {
            await payloads.build(tool);
            await py_engine.runTool(tool, className); // Call our 033 Engine
            
            const finalStory = await narrator.generate();
            aura_engine.addWakeLine(finalStory);
        } catch (e) {
            console.error(`[MIND] Cycle failed for ${tool}:`, e);
        } finally {
            // Return to the previous realm
            await aura_engine.manifest(logistics_hub.getPreviousRealm());
        }
    }

    return {
        butler:    () => runCycle("butler", "Butler", "Butler is tidying the day..."),
        librarian: () => runCycle("librarian", "Librarian", "Librarian is meditating..."),
        crawler:   () => runCycle("crawler", "Crawler", "Crawler is indexing the archives...")
    };
})();

// --- 4. THE LISTENERS ---
document.addEventListener('click', (e) => {
    if (e.target.id === "btn-run-butler") mind_palace.butler();
    if (e.target.id === "btn-run-librarian") mind_palace.librarian();
    if (e.target.id === "btn-run-crawler") mind_palace.crawler();
});
