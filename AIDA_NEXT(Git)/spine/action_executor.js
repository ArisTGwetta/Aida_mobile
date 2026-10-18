// AIDA action bridge: the LLM proposes structured work; Python validates it.
(function () {
  const MODULE_ID = "spine.action.executor";
  const PYODIDE_VERSION = "0.26.4";
  let readyPromise = null;
  let confirming = false;

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) window.AIDA_BIOS.log(message, className);
  }

  function cleanText(value, limit = 160) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function actionFromRoute(route) {
    const action = cleanText(route?.action, 80).toLowerCase();
    const target = cleanText(route?.target || route?.value || route?.query, 160);
    const value = cleanText(route?.value, 160);
    if (["create_project", "create", "new_project"].includes(action)) {
      return { action: "create_project", target: cleanText(route?.target, 160), value: "", params: {} };
    }
    if (["rename_project", "rename"].includes(action)) {
      return { action: "rename_project", target, value, params: {} };
    }
    if (["move_project", "move", "reclassify_project"].includes(action)) {
      return { action: "move_project", target, value, params: {} };
    }
    return null;
  }

  function describe(action) {
    if (action.action === "create_project") return `create project "${action.target}" in realm "${action.params?.realm || "unspecified"}"`;
    if (action.action === "rename_project") return `rename project "${action.target}" to "${action.value}"`;
    return `move project "${action.target}" to realm "${action.value}"`;
  }

  // Creation names must come from explicit user syntax, never router context/query fallback.
  function explicitName(value) {
    const text = String(value || "").trim();
    const quoted = text.match(/^(?:"([^"\n]+)"|“([^”\n]+)”|'([^'\n]+)')$/);
    const name = quoted ? quoted[1] || quoted[2] || quoted[3] : text.replace(/[.!]+$/, "").trim();
    if (!name || name.length > 160 || !/[\p{L}\p{N}]/u.test(name)) return null;
    if (!quoted && (!/^[\p{L}\p{N}_-]+$/u.test(name) ||
        /\b(?:please|create|confirm|confirmed|project|instead|rather|actually|should|want|call|named|but|not|don't|do|it|this|that|and|or|in|realm)\b/i.test(name))) return null;
    return name;
  }

  function creationName(text) {
    const match = String(text || "").trim().match(/^(?:please\s+)?create\s+(?:(?:a\s+)?(?:new\s+)?project\s+(?:(?:called|named)\s+)?)?(.+?)\s*$/i);
    return match ? explicitName(match[1]) : null;
  }

  function realmName() {
    const rt = runtime();
    const realm = rt.context?.realm || rt.mind?.realm;
    return typeof realm === "string" ? realm : realm?.realm_name || realm?.name || "rpg";
  }

  function propose(route, userText) {
    if (runtime().context.pendingAction) return clarify(runtime().context.pendingAction);
    const action = actionFromRoute(route);
    if (action?.action === "create_project") {
      const name = creationName(userText);
      if (!name) return { ok: false, reply: 'Please give an explicit project name, for example: create project "cooking".' };
      action.target = name;
      action.params = { realm: realmName() };
      action.explicitTarget = true;
    }
    if (!action?.target || (action.action !== "create_project" && !action.value)) {
      return { ok: false, reply: "I understand this as a project change, but I need the project name and the requested change before I can stage it." };
    }
    runtime().context.pendingAction = {
      version: 1,
      ...action,
      requestedAt: new Date().toISOString(),
      route: { intent: route.intent, confidence: route.confidence, reason: route.reason }
    };
    return { ok: true, reply: `I understand that as: ${describe(action)}. Please confirm and I will stage it for Drive writeback.` };
  }

  function clarify(pending) {
    return { ok: false, reply: 'Pending: ' + describe(pending) + '. Confirm this exact action, cancel it, or say: change the name to "new name".' };
  }

  function confirmation(text, pending) {
    const value = String(text || "").trim().replace(/[.!]+$/, "").trim();
    if (/^(?:yes(?: please)?|confirmed?|approved|okay|ok|go ahead|do it|let['’]s do it|(?:please )?proceed)(?:\s*[,!]\s*(?:yes|confirmed?|approved|okay|ok|please proceed))*$/i.test(value)) return true;
    if (pending.action !== "create_project") return false;
    const named = value.match(/^(?:yes|confirmed?|approved|okay|ok)[,!]?\s+(?:(?:let['’]s|please)\s+)?(create\s+.+)$/i);
    return Boolean(named && creationName(named[1]) === pending.target);
  }

  function scriptUrl() {
    return window.AIDA_CONFIG?.pyodide?.scriptUrl || `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
  }

  function indexUrl() {
    return window.AIDA_CONFIG?.pyodide?.indexUrl || `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-aida-pyodide="${url}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Pyodide script failed to load.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.aidaPyodide = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Pyodide script failed to load."));
      document.head.appendChild(script);
    });
  }

  async function ensureReady() {
    if (runtime()?.py?.ready && runtime().py.instance) return runtime().py.instance;
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      if (!window.loadPyodide) await loadScript(scriptUrl());
      const pyodide = await window.loadPyodide({ indexURL: indexUrl() });
      const response = await fetch("organs/action_executor.py", { cache: "no-store" });
      if (!response.ok) throw new Error("Python action executor could not be loaded.");
      await pyodide.runPythonAsync(await response.text());
      runtime().py.instance = pyodide;
      runtime().py.ready = true;
      runtime().boot.pyReady = true;
      runtime().py.organsMounted = { ...(runtime().py.organsMounted || {}), action_executor: true };
      log("PY ACTIONS: Python executor ready.", "log-blue");
      return pyodide;
    })().catch((error) => {
      readyPromise = null;
      runtime().py.ready = false;
      runtime().boot.pyReady = false;
      throw error;
    });
    return readyPromise;
  }

  async function executeInPython(envelope) {
    const pyodide = await ensureReady();
    const expression = `execute_action_json(${JSON.stringify(JSON.stringify(envelope))})`;
    return JSON.parse(await pyodide.runPythonAsync(expression));
  }

  async function applyEffect(effect) {
    if (effect.type === "create_project") {
      const result = window.AIDA_PROJECTS?.createDraft?.(effect.name, { realm: effect.realm || undefined });
      if (!result?.project) throw new Error("Project context could not create the draft.");
      const staged = window.AIDA_PROJECTS?.stageBriefcaseEdit?.(result.fileName, {
        name: result.project.project_name || result.project.name,
        realm: result.project.realm,
        status: "active",
        summary: result.project.summary
      });
      if (!staged?.ok) throw new Error("Project draft was created but could not be staged.");
      return { projectName: staged.projectName, fileName: staged.fileName, message: `Project "${staged.projectName}" is staged for Drive writeback.` };
    }
    if (effect.type === "rename_project") {
      const entry = window.AIDA_PROJECTS?.findByName?.(effect.project, "project");
      if (!entry?.fileName) throw new Error("Project was not found.");
      const result = window.AIDA_PROJECTS?.stageBriefcaseEdit?.(entry.fileName, { name: effect.name });
      if (!result?.ok) throw new Error("Project could not be staged for rename.");
      return { projectName: result.projectName, fileName: result.fileName, message: `Project renamed to "${result.projectName}" and staged for Drive writeback.` };
    }
    const result = await window.AIDA_PROJECTS?.claimProject?.(effect.project, effect.realm);
    if (!result?.ok) throw new Error(result?.reason || "Project could not be moved.");
    return { projectName: result.projectName, fileName: result.fileName, message: `Project "${result.projectName}" was moved to "${effect.realm}" and staged for Drive writeback.` };
  }

  async function confirm(text) {
    const pending = runtime()?.context?.pendingAction;
    if (!pending) return null;
    if (confirming) return { ok: false, reply: "The confirmed project action is still being staged. Please wait." };
    const input = String(text || "").trim();
    if (/^(?:cancel(?: (?:it|that|the (?:project|proposal|action)))?|never ?mind|stop|no(?: thanks)?)[.!]*$/i.test(input)) {
      runtime().context.pendingAction = null;
      return { ok: true, reply: "Project proposal cancelled. No new project write was staged." };
    }
    const correction = input.match(/^(?:(?:no|actually|correction)[,:]?\s+)?(?:change (?:the )?(?:project )?name to|(?:please )?call it|(?:the )?(?:project )?name (?:is|should be)|(?:the )?project should be called|rename it to|use the name|I meant)\s+(.+?)(?:,?\s+not\s+(?:"[^"\n]+"|[\p{L}\p{N}_-]+)[.!]?)?$/iu);
    if (correction && pending.action === "create_project") {
      const name = explicitName(correction[1]);
      if (!name) return clarify(pending);
      const updated = { ...pending, target: name, explicitTarget: true, params: { ...pending.params, realm: pending.params?.realm || realmName() } };
      runtime().context.pendingAction = updated;
      return { ok: true, reply: 'Updated proposal: ' + describe(updated) + '. Please confirm this exact target before I stage it.' };
    }
    if (!confirmation(input, pending)) return clarify(pending);
    if (pending.action === "create_project" && !pending.explicitTarget && !explicitName(pending.target)) {
      return { ok: false, reply: 'The saved proposal does not contain a verified project name. Say: change the name to "exact name", then confirm it.' };
    }
    // Legacy proposals lack a saved realm: display and confirm it before staging.
    if (pending.action === "create_project" && !pending.params?.realm) {
      const updated = { ...pending, params: { ...pending.params, realm: realmName() } };
      runtime().context.pendingAction = updated;
      return clarify(updated);
    }
    confirming = true;
    const envelope = { ...pending, params: { ...pending.params }, approval: "confirmed" };
    try {
      const verdict = await executeInPython(envelope);
      if (!verdict?.ok) throw new Error(verdict?.error || "Python rejected the action.");
      if (runtime().context.pendingAction !== pending) throw new Error("The proposal changed; please confirm it again.");
      const applied = await applyEffect(verdict.effect);
      runtime().context.pendingAction = null;
      return { ok: true, reply: applied.message, result: applied };
    } catch (error) {
      return { ok: false, reply: `I could not carry out that project action: ${error.message}` };
    } finally {
      confirming = false;
    }
  }

  window.AIDA_ACTION_EXECUTOR = { actionFromRoute, propose, confirm, ensureReady };
})();
