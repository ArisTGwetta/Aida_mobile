// AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\014-manifest_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* AIDA MANIFEST GOLD v5.1 
    Combines Blocks 10, 11, 12, 14, and 15.
    Controls: Hologram Arrival, Aura Colors, and Realm Themes.
*/

// ---------------------------------------------------------
//  1. COLOR & STYLE PROFILES
// ---------------------------------------------------------
const ColorProfiles = {
    neutral:     { beam: "#ffffff", glow: "#ffffff", accent: "#cccccc", bg: "#050509" },
    calm:        { beam: "#6fb7ff", glow: "#4a8fd6", accent: "#8fd0ff", bg: "#020814" },
    excited:     { beam: "#ffd45a", glow: "#ffb300", accent: "#ffe28f", bg: "#140800" },
    angry:       { beam: "#ff5a5a", glow: "#ff1f1f", accent: "#ff9a9a", bg: "#140202" },
    mischievous: { beam: "#c27bff", glow: "#9b4dff", accent: "#e0b5ff", bg: "#0b0214" },
    ghost:       { beam: "#7fffe9", glow: "#3fffd0", accent: "#b8fff4", bg: "#020b0b" },
    muse:        { beam: "#ff9ad6", glow: "#ff6fbf", accent: "#ffd0ec", bg: "#140212" },
    guide:       { beam: "#9affc2", glow: "#5fff98", accent: "#c8ffd9", bg: "#02140a" }
};

const PresentationProfiles = {
    calm:    { arrival: "soft",     departure: "fade" },
    excited: { arrival: "burst",    departure: "spark" },
    ghost:   { arrival: "spectral", departure: "vanish" },
    neutral: { arrival: "standard", departure: "standard" }
};

const RealmThemes = {
    space: {
        palette: { bg: "#02030a", frame: "#101320", bubbleUser: "#1f2435", bubbleAida: "#050814", accent: "#7fd0ff" },
        images: [] 
    },
    middle_earth: {
        palette: { bg: "#0b1208", frame: "#1d2614", bubbleUser: "#28341b", bubbleAida: "#151d0f", accent: "#c9a96a" },
        images: [] 
    },
    ghost: {
        palette: { bg: "#020607", frame: "#0b1414", bubbleUser: "#141f1f", bubbleAida: "#050b0b", accent: "#7fffe9" },
        images: [] 
    },
    default: {
        palette: { bg: "#050509", frame: "#151520", bubbleUser: "#222233", bubbleAida: "#11111c", accent: "#9f9fff" },
        images: []
    }
};

// ---------------------------------------------------------
//  2. SELECTORS & LOGIC
// ---------------------------------------------------------

// AIDA REVIEW BLOCK 3: Function getTetrad - callable behavior in this runtime organ.
async function getTetrad() {
    try {
        if (window.py_get_tetrad_snapshot) {
            const raw = await window.py_get_tetrad_snapshot();
            return typeof raw === "string" ? JSON.parse(raw) : raw;
        }
    } catch (e) { console.warn("[MANIFEST] Snapshot error:", e); }
    return null;
}

// AIDA REVIEW BLOCK 4: Function selectColorProfile - callable behavior in this runtime organ.
function selectColorProfile(snap) {
    if (!snap) return ColorProfiles.neutral;
    const emotion = snap.emotion?.label || "neutral";
// AIDA REVIEW BLOCK 5: Function realm - arrow-function behavior in this runtime organ.
    const realm = (snap.realm?.briefcase_name || "").toLowerCase();
// AIDA REVIEW BLOCK 6: Function role - arrow-function behavior in this runtime organ.
    const role = (snap.role?.name || "").toLowerCase();

    if (ColorProfiles[emotion]) return ColorProfiles[emotion];
    if (realm.includes("ghost")) return ColorProfiles.ghost;
    if (role.includes("muse")) return ColorProfiles.muse;
    if (role.includes("guide")) return ColorProfiles.guide;
    return ColorProfiles.neutral;
}

// ---------------------------------------------------------
//  3. THE RENDERER HOOKS
// ---------------------------------------------------------

// AIDA REVIEW BLOCK 7: Function applyUITheme - callable behavior in this runtime organ.
function applyUITheme(snap) {
    const root = document.documentElement;
// AIDA REVIEW BLOCK 8: Function realmKey - arrow-function behavior in this runtime organ.
    const realmKey = (snap?.realm?.briefcase_name || "default").toLowerCase();
    const theme = RealmThemes[realmKey] || RealmThemes.default;
    const p = theme.palette;

    root.style.setProperty("--ui-bg", p.bg);
    root.style.setProperty("--ui-frame", p.frame);
    root.style.setProperty("--ui-bubble-user", p.bubbleUser);
    root.style.setProperty("--ui-bubble-aida", p.bubbleAida);
    root.style.setProperty("--ui-accent", p.accent);
}

// AIDA REVIEW BLOCK 9: Function applyAura - callable behavior in this runtime organ.
function applyAura(profile) {
    const root = document.documentElement;
    root.style.setProperty("--aida-beam-color", profile.beam);
    root.style.setProperty("--aida-glow-color", profile.glow);
    root.style.setProperty("--aida-accent-color", profile.accent);
    root.style.setProperty("--aida-bg-color", profile.bg);
}

// ---------------------------------------------------------
//  4. PUBLIC API
// ---------------------------------------------------------

// AIDA REVIEW BLOCK 10: Browser export presentation_arrive - exposes this organ to the page runtime.
window.presentation_arrive = async function() {
    const snap = await getTetrad();
    const colorProfile = selectColorProfile(snap);
    const emotion = snap?.emotion?.label || "neutral";
    const styleProfile = PresentationProfiles[emotion] || PresentationProfiles.neutral;

    applyUITheme(snap);
    applyAura(colorProfile);

    console.log(`[MANIFEST] Arriving as ${emotion} (${styleProfile.arrival})`);
    
    if (typeof window.aida_arrive === "function") {
        window.aida_arrive(); 
        // Future: window.aida_arrive_style(styleProfile.arrival);
    }
};

// AIDA REVIEW BLOCK 11: Browser export presentation_depart - exposes this organ to the page runtime.
window.presentation_depart = async function() {
    const snap = await getTetrad();
    const emotion = snap?.emotion?.label || "neutral";
    const styleProfile = PresentationProfiles[emotion] || PresentationProfiles.neutral;

    console.log(`[MANIFEST] Departing (${styleProfile.departure})`);
    
    if (typeof window.aida_depart === "function") {
        window.aida_depart();
    }
};

// Global trigger for realm changes
// AIDA REVIEW BLOCK 12: Browser export run_realm_transition - exposes this organ to the page runtime.
window.run_realm_transition = async function() {
    const snap = await getTetrad();
    applyUITheme(snap);
    // Add environment flash logic here if desired
};
