/* AIDA MANIFEST GOLD v6.0
   Cockpit: Active State, Tetrad Assembly, LLM Prompt, UI Themes
*/

// =========================================================
// ACTIVE STATE VARIABLES (GLOBAL COCKPIT)
// =========================================================

window.AIDA_ACTIVE_PROJECT = null;
window.AIDA_ACTIVE_REALM = null;
window.AIDA_ACTIVE_ROLE = null;
window.AIDA_ROLE_OVERRIDE = false;
window.AIDA_ACTIVE_EMOTION = null;
window.AIDA_ACTIVE_IDENTITY = null;
window.AIDA_ACTIVE_SAFETY = null;

window.AIDA_TETRAD = {
    identity: null,
    realm: null,
    role: null,
    emotion: null,
    safety: null
};

window.AIDA_LLM_PROMPT = "";


// =========================================================
// ACTIVE STATE SETTERS
// =========================================================

window.setActiveProject = function (projectJson) {
    window.AIDA_ACTIVE_PROJECT = projectJson;

    if (projectJson?.realm_pointer) {
        window.AIDA_ACTIVE_REALM = window.DRIVE_MINDS?.realms?.[projectJson.realm_pointer] || null;
    }

    if (projectJson?.role_pointer) {
        window.AIDA_ACTIVE_ROLE = window.DRIVE_MINDS?.roles?.[projectJson.role_pointer] || null;
        window.AIDA_ROLE_OVERRIDE = false;
    }

    rebuildTetrad();
};

window.setActiveRole = function (roleJson) {
    window.AIDA_ACTIVE_ROLE = roleJson;
    window.AIDA_ROLE_OVERRIDE = true;
    rebuildTetrad();
};

window.setActiveEmotion = function (emotionJson) {
    window.AIDA_ACTIVE_EMOTION = emotionJson;
    rebuildTetrad();
};

window.setActiveRealm = function (realmJson) {
    window.AIDA_ACTIVE_REALM = realmJson;
    rebuildTetrad();
};


// =========================================================
// DIRECT TETRAD ASSEMBLY (NEW PIPELINE)
// =========================================================

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

window.rebuildTetrad = function () {
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

window.resetToProjectDefaults = function () {
    const proj = window.AIDA_ACTIVE_PROJECT;
    if (!proj) {
        console.warn(">>> RESET: No active project to reset.");
        return;
    }

    // Reset realm
    if (proj.realm_pointer) {
        window.AIDA_ACTIVE_REALM = window.DRIVE_MINDS.realms[proj.realm_pointer] || null;
    }

    // Reset role
    if (proj.role_pointer) {
        window.AIDA_ACTIVE_ROLE = window.DRIVE_MINDS.roles[proj.role_pointer] || null;
        window.AIDA_ROLE_OVERRIDE = false;
    }

    // Reset emotion to neutral
    window.AIDA_ACTIVE_EMOTION = { label: "neutral", valence: 0, arousal: 0 };

    // Rebuild Tetrad
    window.rebuildTetrad();

    console.log(">>> RESET: Project defaults restored.");
};

// =========================================================
// INSPECTOR AUTO-REFRESH FIX
// =========================================================

window.updateTetradInspector = function (tetrad) {
    const div = document.getElementById("tetrad-inspector-content");
    if (!div) return;

    div.textContent = JSON.stringify(tetrad, null, 2);
};



// =========================================================
// LLM PROMPT BUILDER
// =========================================================

window.buildLLMPrompt = function () {
    const t = window.AIDA_TETRAD;

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

async function getTetrad() {
    try {
        if (window.py_get_tetrad_snapshot) {
            const raw = await window.py_get_tetrad_snapshot();
            return typeof raw === "string" ? JSON.parse(raw) : raw;
        }
    } catch (e) { console.warn("[MANIFEST] Snapshot error:", e); }
    return null;
}

function selectColorProfile(snap) {
    if (!snap) return ColorProfiles.neutral;
    const emotion = snap.emotion?.label || "neutral";
    const realm = (snap.realm?.briefcase_name || "").toLowerCase();
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

function applyUITheme(snap) {
    const root = document.documentElement;
    const realmKey = (snap?.realm?.briefcase_name || "default").toLowerCase();
    const theme = RealmThemes[realmKey] || RealmThemes.default;
    const p = theme.palette;

    root.style.setProperty("--ui-bg", p.bg);
    root.style.setProperty("--ui-frame", p.frame);
    root.style.setProperty("--ui-bubble-user", p.bubbleUser);
    root.style.setProperty("--ui-bubble-aida", p.bubbleAida);
    root.style.setProperty("--ui-accent", p.accent);
}

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

window.presentation_depart = async function() {
    const snap = await getTetrad();
    const emotion = snap?.emotion?.label || "neutral";
    const styleProfile = PresentationProfiles[emotion] || PresentationProfiles.neutral;

    console.log(`[MANIFEST] Departing (${styleProfile.departure})`);
    
    if (typeof window.aida_depart === "function") {
        window.aida_depart();
    }
};

window.run_realm_transition = async function() {
    const snap = await getTetrad();
    applyUITheme(snap);
};
