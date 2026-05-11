/* ===================================================== */
/* 010-CHASSIS_GOLD.JS: HOLOGRAM & UI BUILDERS         */
/* ===================================================== */

// Initialize the environment
window.addEventListener('DOMContentLoaded', () => {
    buildPixelGrid();
    buildSparks();
});

function buildPixelGrid() {
    const grid = document.getElementById("pixelGrid");
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i < 40; i++) {
        const cell = document.createElement("div");
        cell.style.setProperty("--dx", Math.random());
        cell.style.setProperty("--dy", Math.random());
        grid.appendChild(cell);
    }
}

function buildSparks() {
    const layer = document.getElementById("sparkLayer");
    if (!layer) return;
    layer.innerHTML = "";
    for (let i = 0; i < 40; i++) {
        const s = document.createElement("div");
        s.className = "spark";
        s.style.left = Math.random() * 100 + "%";
        s.style.top = Math.random() * 100 + "%";
        s.style.animationDelay = (Math.random() * 1.2) + "s";
        layer.appendChild(s);
    }
}

window.aida_arrive = function() {
    console.log("AIDA ARRIVING...");
    const veil = document.getElementById("veil");
    const ui = document.getElementById("main-engine");
    
    veil.style.opacity = "1";
    veil.style.background = "black";
    
    // The sequence we discussed: Scanline -> Beam -> Face -> UI Reveal
    // (I've compressed the timing for the 'Vibe' feel)
    setTimeout(() => { document.getElementById("holoScanline").style.opacity = "1"; }, 500);
    setTimeout(() => { 
        document.getElementById("holoBeam").style.opacity = "1";
        document.getElementById("holoCone").style.opacity = "1";
    }, 1200);
    setTimeout(() => { 
        document.getElementById("holoFace").style.opacity = "1";
        ui.classList.remove("hidden"); 
    }, 2500);
    setTimeout(() => { 
        veil.style.opacity = "0"; 
        veil.style.pointerEvents = "none";
    }, 3800);
};