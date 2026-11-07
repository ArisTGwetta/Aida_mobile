// Explicit, read-only File INDEX test capability. No boot/hydration hooks.
(function () {
  "use strict";

  const ACTION_NAME = "file_index.lookup";
  const CATALOG_FILE_ID = "1tq11CcbzgJq8tFIGYDYc7S58CmopgxR-";
  const MAX_QUERY_LENGTH = 180;
  const ACTION_SCHEMA = Object.freeze({
    type: "object",
    properties: {
      name: { type: "string", const: ACTION_NAME },
      arguments: {
        type: "object",
        properties: { query: { type: "string", minLength: 1, maxLength: MAX_QUERY_LENGTH } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    required: ["name", "arguments"],
    additionalProperties: false,
  });

  let testEnabled = false;
  let testGateStatus = null;
  let testGateButton = null;
  let testGateReadButton = null;
  let testDiagnosticOutput = null;
  let testDiagnosticState = null;
  let resultPanel = null;

  function validateAction(action) {
    if (!action || typeof action !== "object" || Array.isArray(action) ||
        Object.keys(action).sort().join(",") !== "arguments,name" ||
        action.name !== ACTION_NAME || !action.arguments ||
        typeof action.arguments !== "object" || Array.isArray(action.arguments) ||
        Object.keys(action.arguments).join(",") !== "query") {
      throw new TypeError("Invalid File INDEX action envelope.");
    }
    const query = action.arguments.query;
    if (typeof query !== "string" || !query.trim() || query.trim().length > MAX_QUERY_LENGTH) {
      throw new TypeError("File INDEX query must contain 1–180 characters.");
    }
    return query.trim();
  }

  function validateCatalog(catalog) {
    if (!catalog || catalog.schema_version !== 1 || !Array.isArray(catalog.documents) ||
        catalog.documents.length > 5000) throw new TypeError("Unsupported File INDEX catalog.");
    for (const document of catalog.documents) {
      if (!document || typeof document.id !== "string" || typeof document.title !== "string" ||
          !Array.isArray(document.locations) || document.locations.length > 50) {
        throw new TypeError("Malformed File INDEX metadata record.");
      }
      for (const location of document.locations) {
        if (!location || typeof location.provider !== "string" ||
            !["verified", "unverified", "stale"].includes(location.status) ||
            (location.url != null && (typeof location.url !== "string" || !/^https:\/\//i.test(location.url))) ||
            (location.path != null && typeof location.path !== "string")) {
          throw new TypeError("Malformed File INDEX location metadata.");
        }
      }
    }
    return catalog;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function searchCatalog(catalog, query, device) {
    const terms = normalize(query).split(" ").filter(Boolean);
    if (!terms.length) return [];
    return catalog.documents.filter(document => {
      const text = normalize([document.title, ...(Array.isArray(document.aliases) ? document.aliases : [])].join(" "));
      const words = text.split(" ");
      return terms.every(term => words.includes(term));
    }).map(document => {
      const eligible = document.locations.filter(location => location.status === "verified" &&
        Array.isArray(location.devices) && location.devices.includes(device) &&
        (Boolean(location.url) || (device === "desktop" && Boolean(location.path))));
      const preferredProvider = device === "phone" ? "google_drive" : "windows";
      const selected = eligible.find(location => location.provider === preferredProvider) || eligible[0] || null;
      return {
        id: document.id,
        title: document.title,
        updated_at: document.updated_at || null,
        recommended: selected,
        alternatives: document.locations.filter(location => location !== selected),
      };
    });
  }

  function currentDevice() {
    if (navigator.userAgentData?.mobile === true) return "phone";
    return window.matchMedia?.("(max-width: 767px)")?.matches ? "phone" : "desktop";
  }

  function ensureResultPanel() {
    if (resultPanel?.isConnected) return resultPanel;
    resultPanel = document.createElement("aside");
    resultPanel.id = "aida-file-index-temporary-results";
    resultPanel.setAttribute("role", "region");
    resultPanel.setAttribute("aria-label", "Temporary File INDEX results");
    resultPanel.setAttribute("aria-live", "polite");
    resultPanel.style.cssText = "position:fixed;z-index:9999;right:1rem;bottom:1rem;width:min(36rem,calc(100vw - 2rem));max-height:70vh;overflow:auto;padding:1rem;background:#fff;color:#18212b;border:2px solid #405a78;border-radius:12px;box-shadow:0 8px 30px #0004;font:14px/1.45 system-ui,sans-serif";
    document.body.append(resultPanel);
    return resultPanel;
  }

  function addLocation(parent, location) {
    const line = document.createElement("p");
    line.textContent = `${location.provider}: `;
    if (typeof location.url === "string" && /^https:\/\//i.test(location.url)) {
      const link = document.createElement("a");
      link.href = location.url;
      link.textContent = location.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      line.append(link);
    } else if (typeof location.path === "string" && location.path) {
      const path = document.createElement("code");
      path.textContent = location.path;
      line.append(path);
    } else {
      line.append(document.createTextNode("No recorded path or link"));
    }
    parent.append(line);
  }

  function showResults(query, device, results) {
    const panel = ensureResultPanel();
    panel.replaceChildren();
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close results";
    close.addEventListener("click", clearResults, { once: true });
    panel.append(close);
    const heading = document.createElement("h2");
    heading.textContent = `File locations for “${query}”`;
    panel.append(heading);
    if (!results.length) {
      const empty = document.createElement("p");
      empty.textContent = "No catalog match.";
      panel.append(empty);
      return;
    }
    for (const result of results) {
      const card = document.createElement("section");
      const title = document.createElement("h3");
      title.textContent = result.title;
      card.append(title);
      if (result.recommended) {
        const recommended = document.createElement("p");
        recommended.textContent = `Recommended · verified${result.recommended.verified_at ? ` · checked ${result.recommended.verified_at}` : ""}`;
        card.append(recommended);
        addLocation(card, result.recommended);
      } else {
        const unavailable = document.createElement("p");
        unavailable.textContent = "No verified location is suitable for this device.";
        card.append(unavailable);
      }
      for (const alternative of result.alternatives) {
        const label = document.createElement("p");
        label.textContent = `Alternative · ${alternative.status}${alternative.verified_at ? ` · checked ${alternative.verified_at}` : ""}`;
        card.append(label);
        addLocation(card, alternative);
      }
      if (result.updated_at) {
        const updated = document.createElement("p");
        updated.textContent = `Catalog record updated ${result.updated_at}`;
        card.append(updated);
      }
      panel.append(card);
    }
  }

  function clearResults() {
    if (resultPanel?.isConnected) resultPanel.remove();
    resultPanel = null;
  }

  function readErrorCategory(error) {
    const message = String(error?.message || "");
    if (/authenticated drive session|required|access token is missing|http 401/i.test(message)) return "OAUTH_REQUIRED_OR_EXPIRED";
    if (/http 403/i.test(message)) return "DRIVE_ACCESS_DENIED";
    if (/http 404/i.test(message)) return "CATALOG_NOT_FOUND_OR_INACCESSIBLE";
    if (/json parse failed/i.test(message)) return "CATALOG_INVALID_JSON";
    if (/exact id, name, folder|metadata check failed/i.test(message)) return "CATALOG_METADATA_MISMATCH";
    if (/unsupported file index catalog|malformed file index/i.test(message)) return "CATALOG_SCHEMA_INVALID";
    if (/configured aida json folder|drive json folder id is missing|missing google oauth client id/i.test(message)) return "DRIVE_CONFIGURATION_MISSING";
    if (/timed out|network|failed to fetch|load failed/i.test(message)) return "DRIVE_NETWORK_OR_SERVICE_UNAVAILABLE";
    return "CATALOG_READ_FAILED";
  }

  function updateRoutingDiagnostic(update = {}) {
    if (!testEnabled || !testDiagnosticOutput) return false;
    const intents = new Set(["conversation", "web_search", "memory_search", "show_sources", "memory_note", "project_create", "project_update", "external_action", "clarify", "none"]);
    const actions = new Set(["file_index.lookup", ...intents]);
    const next = {};
    if (typeof update.advertised === "boolean") next.advertised = update.advertised;
    if (["started", "completed", "failed"].includes(update.router)) next.router = update.router;
    if (["waiting", "not_received", "action_plus_query", "invalid_or_non_object"].includes(update.responseShape) ||
        /^ordinary_intent_fields_[0-9]{1,2}$/.test(update.responseShape || "") ||
        /^unrecognized_object_fields_[0-9]{1,2}$/.test(update.responseShape || "")) {
      next.responseShape = update.responseShape;
    }
    if (["not_determined", "other_or_missing"].includes(update.selectedAction) || actions.has(update.selectedAction)) next.selectedAction = update.selectedAction;
    const normalizationStatuses = new Set([
      "accepted · accepted_file_index_action",
      ...["schema_shape_mismatch", "schema_intent_mismatch", "test_gate_disabled", "query_missing_or_empty", "query_too_long", "invalid_or_unparseable_response", "unsupported_intent", "provider_unavailable", "provider_call_failed"].map(reason => `rejected · ${reason}`),
      ...Array.from(intents).map(intent => `accepted_non_index · ordinary_intent_${intent}`),
    ]);
    if (normalizationStatuses.has(update.normalization)) next.normalization = update.normalization;
    const dispatchStatuses = ["attempted", "completed", "not_attempted · executor_unavailable", "skipped · no validated auto-run INDEX action"];
    if (dispatchStatuses.includes(update.dispatch)) next.dispatch = update.dispatch;
    if (typeof update.consumed === "boolean") next.consumed = update.consumed;
    testDiagnosticState = { ...(testDiagnosticState || {}), ...next };
    const state = testDiagnosticState;
    testDiagnosticOutput.textContent = [
      `Capability advertised: ${state.advertised === true ? "yes" : state.advertised === false ? "no" : "not checked"}`,
      `Router call: ${state.router || "not started"}`,
      `Response shape: ${state.responseShape || "not received"}`,
      `Selected action: ${state.selectedAction || "not determined"}`,
      `Normalization: ${state.normalization || "not determined"}`,
      `Dispatch: ${state.dispatch || "not reached"}`,
      `Request consumed: ${state.consumed === true ? "yes" : state.consumed === false ? "no" : "not determined"}`,
    ].join("\n");
    return true;
  }

  async function verifyCatalogRead() {
    if (!testEnabled) return false;
    if (testGateStatus) testGateStatus.textContent = "Checking the catalog through the authenticated Drive reader…";
    try {
      const catalog = validateCatalog(await window.AIDA_DRIVE.fetchFileIndexCatalogById(CATALOG_FILE_ID));
      const matches = searchCatalog(catalog, "citizenship certificate", "phone");
      const matched = matches.some(record => normalize(record.title) === "citizenship certificate");
      if (!matched) throw new Error("Synthetic title metadata did not match the direct-read check.");
      if (testGateStatus) testGateStatus.textContent = "Direct read PASS: catalog JSON validated and synthetic title is searchable.";
      return true;
    } catch (error) {
      const category = readErrorCategory(error);
      if (testGateStatus) testGateStatus.textContent = `Direct read FAIL · ${category}.`;
      return false;
    }
  }

  function showError() {
    showResults("lookup", currentDevice(), []);
    const panel = ensureResultPanel();
    panel.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "The File INDEX test lookup could not be completed. Check Drive access and try again.";
    panel.append(message);
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", clearResults, { once: true });
    panel.append(close);
  }

  async function executeAction(action) {
    if (!testEnabled) return false;
    let query;
    try {
      query = validateAction(action);
      if (typeof window.AIDA_DRIVE?.fetchFileIndexCatalogById !== "function") {
        throw new Error("Authenticated INDEX reader unavailable");
      }
      const catalog = validateCatalog(await window.AIDA_DRIVE.fetchFileIndexCatalogById(CATALOG_FILE_ID));
      const device = currentDevice();
      const results = searchCatalog(catalog, query, device);
      showResults(query, device, results);
    } catch (_) {
      showError();
    }
    // Consume the routed action so no INDEX query falls through to ordinary
    // chat or the LLM Speaker if retrieval or validation fails.
    return true;
  }

  function disableTestGate() {
    testEnabled = false;
    clearResults();
    if (testGateButton) {
      testGateButton.textContent = "Disabled until page reload";
      testGateButton.disabled = true;
    }
    if (testGateReadButton) testGateReadButton.disabled = true;
    if (testGateStatus) testGateStatus.textContent = "Disabled. No catalog is loaded.";
    testDiagnosticState = null;
    if (testDiagnosticOutput) testDiagnosticOutput.textContent = "Diagnostics cleared.";
  }

  function mountTestGate() {
    if (new URLSearchParams(window.location.search).get("aida_file_index_test") !== "1") return;
    testEnabled = true;
    const gate = document.createElement("section");
    gate.id = "aida-file-index-test-gate";
    gate.setAttribute("aria-label", "File INDEX test gate");
    gate.style.cssText = "position:fixed;z-index:10000;left:1rem;bottom:1rem;display:flex;gap:.5rem;align-items:center;padding:.65rem;background:#eef3f8;color:#18212b;border:1px solid #6a7b90;border-radius:10px;font:13px system-ui,sans-serif";
    testGateButton = document.createElement("button");
    testGateButton.type = "button";
    testGateButton.textContent = "Disable File INDEX test";
    testGateButton.addEventListener("click", disableTestGate);
    testGateReadButton = document.createElement("button");
    testGateReadButton.type = "button";
    testGateReadButton.id = "aida-file-index-direct-read";
    testGateReadButton.textContent = "Verify catalog read";
    testGateReadButton.addEventListener("click", verifyCatalogRead);
    testGateStatus = document.createElement("span");
    testGateStatus.textContent = "Enabled by test URL. No catalog is loaded.";
    const diagnostics = document.createElement("details");
    const diagnosticsSummary = document.createElement("summary");
    diagnosticsSummary.textContent = "Routing diagnostics";
    testDiagnosticOutput = document.createElement("pre");
    testDiagnosticOutput.setAttribute("aria-live", "polite");
    testDiagnosticOutput.style.cssText = "white-space:pre-wrap;max-width:min(32rem,85vw);margin:.4rem 0 0;font:12px/1.45 ui-monospace,monospace";
    testDiagnosticOutput.textContent = "Waiting for a routed request.";
    diagnostics.append(diagnosticsSummary, testDiagnosticOutput);
    gate.append(testGateReadButton, testGateButton, testGateStatus, diagnostics);
    document.body.append(gate);
  }

  window.AIDA_FILE_INDEX = Object.freeze({
    actionSchema: ACTION_SCHEMA,
    isTestEnabled: () => testEnabled,
    executeAction,
    verifyCatalogRead,
    reportRoutingDiagnostic: updateRoutingDiagnostic,
    disableTestGate,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountTestGate, { once: true });
  } else {
    mountTestGate();
  }
})();
