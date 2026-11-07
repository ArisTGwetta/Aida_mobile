// AIDA action bridge: the LLM proposes structured work; Python validates it.
(function () {
  const MODULE_ID = "spine.action.executor";
  const PYODIDE_VERSION = "0.26.4";
  let readyPromise = null;

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
      return { action: "create_project", target, value: "", params: {} };
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
    if (action.action === "create_project") return `create project "${action.target}"`;
    if (action.action === "rename_project") return `rename project "${action.target}" to "${action.value}"`;
    return `move project "${action.target}" to realm "${action.value}"`;
  }

  function propose(route) {
    const action = actionFromRoute(route);
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

  function isConfirmation(text) {
    return /^(?:yes|yes please|confirm|do it|go ahead|please proceed|approved|okay|ok)[.! ]*$/i.test(String(text || "").trim());
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
    if (!pending || !isConfirmation(text)) return null;
    const envelope = { ...pending, approval: "confirmed" };
    try {
      const verdict = await executeInPython(envelope);
      if (!verdict?.ok) throw new Error(verdict?.error || "Python rejected the action.");
      const applied = await applyEffect(verdict.effect);
      runtime().context.pendingAction = null;
      return { ok: true, reply: applied.message, result: applied };
    } catch (error) {
      return { ok: false, reply: `I could not carry out that project action: ${error.message}` };
    }
  }

  window.AIDA_ACTION_EXECUTOR = { actionFromRoute, propose, confirm, ensureReady };
})();
