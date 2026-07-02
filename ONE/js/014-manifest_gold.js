// AIDA REVIEW BLOCK 1: File header - ONE\js\014-manifest_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* AIDA MANIFEST GOLD v6.0
   Cockpit: Active State, Tetrad Assembly, LLM Prompt, UI Themes
*/

// =========================================================
// ACTIVE STATE VARIABLES (GLOBAL COCKPIT)
// =========================================================

// AIDA REVIEW BLOCK 3: Browser export AIDA_ACTIVE_PROJECT - exposes this organ to the page runtime.
window.AIDA_ACTIVE_PROJECT = null;
// AIDA REVIEW BLOCK 4: Browser export AIDA_ACTIVE_REALM - exposes this organ to the page runtime.
window.AIDA_ACTIVE_REALM = null;
// AIDA REVIEW BLOCK 5: Browser export AIDA_ACTIVE_ROLE - exposes this organ to the page runtime.
window.AIDA_ACTIVE_ROLE = null;
// AIDA REVIEW BLOCK 6: Browser export AIDA_ROLE_OVERRIDE - exposes this organ to the page runtime.
window.AIDA_ROLE_OVERRIDE = false;
// AIDA REVIEW BLOCK 7: Browser export AIDA_ACTIVE_EMOTION - exposes this organ to the page runtime.
window.AIDA_ACTIVE_EMOTION = null;
// AIDA REVIEW BLOCK 8: Browser export AIDA_ACTIVE_IDENTITY - exposes this organ to the page runtime.
window.AIDA_ACTIVE_IDENTITY = null;
// AIDA REVIEW BLOCK 9: Browser export AIDA_ACTIVE_SAFETY - exposes this organ to the page runtime.
window.AIDA_ACTIVE_SAFETY = null;

// AIDA REVIEW BLOCK 10: Browser export AIDA_TETRAD - exposes this organ to the page runtime.
window.AIDA_TETRAD = {
    identity: null,
    realm: null,
    role: null,
    emotion: null,
    safety: null
};

// AIDA REVIEW BLOCK 11: Browser export AIDA_LLM_PROMPT - exposes this organ to the page runtime.
window.AIDA_LLM_PROMPT = "";


// =========================================================
// ACTIVE STATE SETTERS
// =========================================================

// AIDA REVIEW BLOCK 12: Browser export setActiveProject - exposes this organ to the page runtime.
window.setActiveProject = function (projectName) {
    const proj = window.DRIVE_MINDS.briefcases[projectName];
    if (!proj) {
        console.warn(">>> PROJECT: Not found:", projectName);
        return;
    }

// AIDA REVIEW BLOCK 13: Browser export AIDA_ACTIVE_PROJECT - exposes this organ to the page runtime.
    window.AIDA_ACTIVE_PROJECT = proj;
    console.log(">>> PROJECT: Active project set to:", projectName);

    // Reset realm + role to project defaults if they exist
    if (proj.realm_pointer) {
        window.setActiveRealm(proj.realm_pointer);
    }
    if (proj.role_pointer) {
        window.setActiveRole(proj.role_pointer);
    }

    window.rebuildTetrad();
};

// AIDA REVIEW BLOCK 14: Browser export setActiveRealm - exposes this organ to the page runtime.
window.setActiveRealm = function (realmName) {
    const realm = window.DRIVE_MINDS.mind[realmName];
    if (!realm) {
        console.warn(">>> REALM: Not found:", realmName);
        return;
    }

// AIDA REVIEW BLOCK 15: Browser export AIDA_ACTIVE_REALM - exposes this organ to the page runtime.
    window.AIDA_ACTIVE_REALM = realm;
    console.log(">>> REALM: Active realm set to:", realmName);

    window.rebuildTetrad();
};

// AIDA REVIEW BLOCK 16: Browser export setActiveRole - exposes this organ to the page runtime.
window.setActiveRole = function (roleName) {
    const role = window.DRIVE_MINDS.mind[roleName];
    if (!role) {
        console.warn(">>> ROLE: Not found:", roleName);
        return;
    }

// AIDA REVIEW BLOCK 17: Browser export AIDA_ACTIVE_ROLE - exposes this organ to the page runtime.
    window.AIDA_ACTIVE_ROLE = role;
    console.log(">>> ROLE: Active role set to:", roleName);

    window.rebuildTetrad();
};

// AIDA REVIEW BLOCK 18: Browser export AIDA_PREVIOUS_EMOTION - exposes this organ to the page runtime.
window.AIDA_PREVIOUS_EMOTION = null;

// AIDA REVIEW BLOCK 19: Browser export setActiveEmotion - exposes this organ to the page runtime.
window.setActiveEmotion = function (label) {
// AIDA REVIEW BLOCK 20: Browser export AIDA_PREVIOUS_EMOTION - exposes this organ to the page runtime.
    window.AIDA_PREVIOUS_EMOTION = window.AIDA_ACTIVE_EMOTION;

// AIDA REVIEW BLOCK 21: Browser export AIDA_ACTIVE_EMOTION - exposes this organ to the page runtime.
    window.AIDA_ACTIVE_EMOTION = {
        label: label,
        valence: 0,
        arousal: 0
    };

    console.log(">>> EMOTION:", window.AIDA_PREVIOUS_EMOTION?.label, "â†’", label);

    window.rebuildTetrad();
};


// =========================================================
// DIRECT TETRAD ASSEMBLY (NEW PIPELINE)
// =========================================================

// AIDA REVIEW BLOCK 22: Browser export runTetradAssembly - exposes this organ to the page runtime.
window.runTetradAssembly = async function () {
    try {
        const core_identity = window.AIDA_ACTIVE_IDENTITY;
        const realm_config  = window.AIDA_ACTIVE_REALM;
        const role_config   = window.AIDA_ACTIVE_ROLE;
        const emotion_state = window.AIDA_ACTIVE_EMOTION;

        if (!core_identity || !realm_config || !role_config) {
            console.warn(">>> TETRAD: Missing active state. Cannot assemble.");
            return null;
        }

        const result = await window.AIDA_PYODIDE.runPythonAsync(`
            import json
            from tetrad_chassis import assemble_tetrad

            core_identity = json.loads("""${JSON.stringify(core_identity)}""")
            realm_config  = json.loads("""${JSON.stringify(realm_config)}""")
            role_config   = json.loads("""${JSON.stringify(role_config)}""")
            emotion_state = json.loads("""${JSON.stringify(emotion_state)}""")

            json.dumps(assemble_tetrad(core_identity, realm_config, role_config, emotion_state))
        `);

        const parsed = JSON.parse(result);

// AIDA REVIEW BLOCK 23: Browser export AIDA_TETRAD - exposes this organ to the page runtime.
        window.AIDA_TETRAD = parsed;

        if (window.updateTetradInspector) {
            window.updateTetradInspector(parsed);
        }
        if (window.buildLLMPrompt) {
            window.buildLLMPrompt();
        }

        return parsed;

    } catch (err) {
        console.error(">>> TETRAD: Python assembly error:", err);
        return null;
    }
};


// =========================================================
// TETRAD REBUILDER (JS snapshot only)
// =========================================================

// AIDA REVIEW BLOCK 24: Browser export rebuildTetrad - exposes this organ to the page runtime.
window.rebuildTetrad = function () {
// AIDA REVIEW BLOCK 25: Browser export AIDA_TETRAD - exposes this organ to the page runtime.
    window.AIDA_TETRAD = {
        identity: window.AIDA_ACTIVE_IDENTITY,
        realm: window.AIDA_ACTIVE_REALM,
        role: window.AIDA_ACTIVE_ROLE,
        emotion: window.AIDA_ACTIVE_EMOTION,
        safety: window.AIDA_ACTIVE_SAFETY
    };

    buildLLMPrompt();
    if (window.updateTetradInspector) {
        window.updateTetradInspector(window.AIDA_TETRAD);
    }
};

// =========================================================
// RESET TO PROJECT DEFAULTS
// =========================================================

// AIDA REVIEW BLOCK 26: Browser export resetToProjectDefaults - exposes this organ to the page runtime.
window.resetToProjectDefaults = function () {
    const proj = window.AIDA_ACTIVE_PROJECT;
    if (!proj) {
        console.warn(">>> RESET: No active project to reset.");
        return;
    }

    // Reset realm
    if (proj.realm_pointer) {
// AIDA REVIEW BLOCK 27: Browser export AIDA_ACTIVE_REALM - exposes this organ to the page runtime.
        window.AIDA_ACTIVE_REALM = window.DRIVE_MINDS.realms[proj.realm_pointer] || null;
    }

    // Reset role
    if (proj.role_pointer) {
// AIDA REVIEW BLOCK 28: Browser export AIDA_ACTIVE_ROLE - exposes this organ to the page runtime.
        window.AIDA_ACTIVE_ROLE = window.DRIVE_MINDS.roles[proj.role_pointer] || null;
// AIDA REVIEW BLOCK 29: Browser export AIDA_ROLE_OVERRIDE - exposes this organ to the page runtime.
        window.AIDA_ROLE_OVERRIDE = false;
    }

    // Reset emotion to neutral
// AIDA REVIEW BLOCK 30: Browser export AIDA_ACTIVE_EMOTION - exposes this organ to the page runtime.
    window.AIDA_ACTIVE_EMOTION = { label: "neutral", valence: 0, arousal: 0 };

    // Rebuild Tetrad
    window.rebuildTetrad();

    console.log(">>> RESET: Project defaults restored.");
};

// =========================================================
// INSPECTOR AUTO-REFRESH FIX
// =========================================================

// AIDA REVIEW BLOCK 31: Browser export updateTetradInspector - exposes this organ to the page runtime.
window.updateTetradInspector = function (tetrad) {
    const div = document.getElementById("tetrad-inspector-content");
    if (!div) return;

    div.textContent = JSON.stringify(tetrad, null, 2);
};



// =========================================================
// LLM PROMPT BUILDER
// =========================================================

// AIDA REVIEW BLOCK 32: Browser export buildLLMPrompt - exposes this organ to the page runtime.
window.buildLLMPrompt = function () {
    const t = window.AIDA_TETRAD;

// AIDA REVIEW BLOCK 33: Browser export AIDA_LLM_PROMPT - exposes this organ to the page runtime.
    window.AIDA_LLM_PROMPT = `
IDENTITY:
${JSON.stringify(t.identity || {}, null, 2)}

REALM:
${JSON.stringify(t.realm || {}, null, 2)}

ROLE:
${JSON.stringify(t.role || {}, null, 2)}

EMOTION:
${JSON.stringify(t.emotion || {}, null, 2)}

SAFETY:
${JSON.stringify(t.safety || {}, null, 2)}
    `.trim();
};


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

// AIDA REVIEW BLOCK 34: Function getTetrad - callable behavior in this runtime organ.
async function getTetrad() {
    try {
        if (window.py_get_tetrad_snapshot) {
            const raw = await window.py_get_tetrad_snapshot();
            return typeof raw === "string" ? JSON.parse(raw) : raw;
        }
    } catch (e) { console.warn("[MANIFEST] Snapshot error:", e); }
    return null;
}

// AIDA REVIEW BLOCK 35: Function selectColorProfile - callable behavior in this runtime organ.
function selectColorProfile(snap) {
    if (!snap) return ColorProfiles.neutral;
    const emotion = snap.emotion?.label || "neutral";
// AIDA REVIEW BLOCK 36: Function realm - arrow-function behavior in this runtime organ.
    const realm = (snap.realm?.briefcase_name || "").toLowerCase();
// AIDA REVIEW BLOCK 37: Function role - arrow-function behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 38: Function applyUITheme - callable behavior in this runtime organ.
function applyUITheme(snap) {
    const root = document.documentElement;
// AIDA REVIEW BLOCK 39: Function realmKey - arrow-function behavior in this runtime organ.
    const realmKey = (snap?.realm?.briefcase_name || "default").toLowerCase();
    const theme = RealmThemes[realmKey] || RealmThemes.default;
    const p = theme.palette;

    root.style.setProperty("--ui-bg", p.bg);
    root.style.setProperty("--ui-frame", p.frame);
    root.style.setProperty("--ui-bubble-user", p.bubbleUser);
    root.style.setProperty("--ui-bubble-aida", p.bubbleAida);
    root.style.setProperty("--ui-accent", p.accent);
}

// AIDA REVIEW BLOCK 40: Function applyAura - callable behavior in this runtime organ.
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

// AIDA REVIEW BLOCK 41: Browser export presentation_arrive - exposes this organ to the page runtime.
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
    }
};

// AIDA REVIEW BLOCK 42: Browser export presentation_depart - exposes this organ to the page runtime.
window.presentation_depart = async function() {
    const snap = await getTetrad();
    const emotion = snap?.emotion?.label || "neutral";
    const styleProfile = PresentationProfiles[emotion] || PresentationProfiles.neutral;

    console.log(`[MANIFEST] Departing (${styleProfile.departure})`);
    
    if (typeof window.aida_depart === "function") {
        window.aida_depart();
    }
};

// AIDA REVIEW BLOCK 43: Browser export run_realm_transition - exposes this organ to the page runtime.
window.run_realm_transition = async function() {
    const snap = await getTetrad();
    applyUITheme(snap);
};
