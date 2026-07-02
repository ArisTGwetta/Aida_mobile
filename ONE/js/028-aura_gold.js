// AIDA REVIEW BLOCK 1: File header - ONE\js\028-aura_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 028-aura_gold.js 
   THE AURA HUB: WAKE, FACE, COLOR, & TRANSITION
*/

// AIDA REVIEW BLOCK 3: Browser export aura_engine - exposes this organ to the page runtime.
window.aura_engine = (function() {
    let lastFace = null;

    // --- INTERNAL VISUAL UTILITIES ---
    const ui = {
        setOverlay: (opacity, blur = "none") => {
            const el = document.getElementById("realm-transition-overlay");
            if (!el) return;
            el.style.opacity = opacity;
            el.style.backdropFilter = blur;
        },
        updateCSS: (palette) => {
            for (let [key, val] of Object.entries(palette)) {
                document.documentElement.style.setProperty(`--ui-${key}`, val);
            }
        }
    };

    // --- CORE ACTIONS ---
    return {
        // Combined Boot & Transition logic
        manifest: async function(realmFilename, isInitialBoot = false) {
            console.log(`[AURA] Manifesting Realm: ${realmFilename}`);
            
            // 1. Enter the "Airlock" (Fade out)
            if (!isInitialBoot) await ui.setOverlay(1, "blur(4px)");

            // 2. Swap the Data (Call Logistics)
            const loaded = await logistics_hub.switchRealm(realmFilename);
            
            // 3. Set the Vibe (Colors)
            ui.updateCSS(loaded.realm.palette || {});
            
            // 4. Exit the "Airlock" (Fade in)
            await new Promise(r => setTimeout(r, 800)); // Cinematic pause
            ui.setOverlay(0, "none");
            
            // 5. Speak (Wake Line)
            if (window.wake_engine) window.wake_engine.generateWakeLine(loaded.realm);
            
            if (isInitialBoot) {
                document.getElementById("airlock").classList.add("hidden");
                document.getElementById("main-engine").classList.remove("hidden");
            }
        },

        // Reacts to Aida's emotional "pulse"
        syncView: async function(ctx) {
            if (ctx.face && ctx.face !== lastFace) {
                lastFace = ctx.face;
                // Soft iris swap (Block 29 logic)
                if (window.face_loader) window.face_loader.load(ctx.face, ctx.distance);
            }
            // Update UI accent based on arousal
            const tint = ctx.arousal > 0.5 ? "rgba(255,100,100,0.2)" : "rgba(255,255,255,0.05)";
            document.getElementById("ui-emotion-overlay").style.background = tint;
        }
    };
})();

// ONE hook to rule them all
hologram_sync.update = (ctx) => window.aura_engine.syncView(ctx);
