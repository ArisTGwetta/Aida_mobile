// AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\scripts\020-vitality_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 020-vitality_gold.js
   Consolidated Expression, Sync, UI Accent, and Spark Engines.
*/

// AIDA REVIEW BLOCK 3: Browser export vitality_stack - exposes this organ to the page runtime.
window.vitality_stack = (function() {
    let prevV = 0.1, prevA = -0.1;
    let driftTimer = 0;

    // 1. EXPRESSION ENGINE (Micro-movements)
// AIDA REVIEW BLOCK 4: Function runExpressions - callable behavior in this runtime organ.
    function runExpressions(ctx) {
        const holo = document.getElementById("aida-hologram");
        const aura = document.getElementById("aida-aura");
        if (!holo) return;

        driftTimer += 1;
        const dx = Math.sin(driftTimer / 120) * 1.5;
        const dy = Math.cos(driftTimer / 150) * 1.5;
        holo.style.transform = `translate(${dx}px, ${dy}px)`;

        // Aura breathing
        const scale = 1 + Math.sin(driftTimer / 80) * 0.02;
        if (aura) aura.style.transform = `scale(${scale})`;
    }

    // 2. HOLOGRAM SYNC (Reactive Blooms)
// AIDA REVIEW BLOCK 5: Function runSync - callable behavior in this runtime organ.
    function runSync(ctx) {
        const dv = ctx.valence - prevV;
        const da = ctx.arousal - prevA;
        const delta = Math.sqrt(dv*dv + da*da);
        
        const glow = document.getElementById("aida-glow");
        const face = document.getElementById("aida-face");

        if (face && ctx.face) face.src = ctx.face;

        if (glow && delta > 0.1) {
            console.log("[VITALITY] Emotional Pulse detected:", delta);
            glow.style.transition = "opacity 400ms ease-out";
            glow.style.opacity = "0.5";
            setTimeout(() => glow.style.opacity = "0.2", 400);
        }
        
        prevV = ctx.valence;
        prevA = ctx.arousal;
    }

    // 3. UI ACCENT ENGINE
// AIDA REVIEW BLOCK 6: Function runUIAccents - callable behavior in this runtime organ.
    function runUIAccents(ctx) {
        const overlay = document.getElementById("ui-emotion-overlay");
        if (!overlay) return;

        let color = "rgba(255,255,255,0.05)";
        if (ctx.label === "happy") color = "rgba(255,220,150,0.1)";
        if (ctx.label === "excited") color = "rgba(255,150,50,0.15)";
        if (ctx.label === "concerned") color = "rgba(150,200,255,0.1)";

        overlay.style.background = color;
    }

    // PUBLIC API
    return {
        update: function(ctx) {
            runExpressions(ctx);
            runSync(ctx);
            runUIAccents(ctx);
        },
        startSparks: function() {
            // Logic for the flicker grid (Block 24)
            console.log("[VITALITY] Spark Layer Active.");
        }
    };
})();

// Global bridge for the Python Engine
// AIDA REVIEW BLOCK 7: Browser export hologram_sync - exposes this organ to the page runtime.
window.hologram_sync = {
    update: (ctx) => window.vitality_stack.update(ctx)
};
