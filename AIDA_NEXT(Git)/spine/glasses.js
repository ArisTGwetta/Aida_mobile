// AIDA REVIEW BLOCK 1: File header - AIDA_ONE_SPINE\spine\glasses.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
(function () {
  const MODULE_ID = "spine.glasses";
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const PDF_TYPE = "application/pdf";

// AIDA REVIEW BLOCK 3: Function $ - callable behavior in this runtime organ.
  function $(id) {
    return document.getElementById(id);
  }

// AIDA REVIEW BLOCK 4: Function runtime - callable behavior in this runtime organ.
  function runtime() {
    return window.AIDA_RUNTIME;
  }

// AIDA REVIEW BLOCK 5: Function log - callable behavior in this runtime organ.
  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) window.AIDA_BIOS.log(message, className);
    else if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

// AIDA REVIEW BLOCK 6: Function ensureState - callable behavior in this runtime organ.
  function ensureState() {
    const rt = runtime();
    rt.glasses = rt.glasses || {
      attachment: null,
      lastPreparedAt: null,
      lastSentAt: null,
      error: null
    };
    return rt.glasses;
  }

// AIDA REVIEW BLOCK 7: Function kindForType - callable behavior in this runtime organ.
  function kindForType(type) {
    if (IMAGE_TYPES.has(type)) return "image";
    if (type === PDF_TYPE) return "pdf";
    return null;
  }

// AIDA REVIEW BLOCK 8: Function readAsDataUrl - callable behavior in this runtime organ.
  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read the selected file."));
      reader.readAsDataURL(file);
    });
  }

// AIDA REVIEW BLOCK 9: Function renderState - callable behavior in this runtime organ.
  function renderState() {
    const state = ensureState();
    const button = $("glasses-attach-btn");
    const status = $("glasses-attachment-status");
    const attachment = state.attachment;

    if (button) {
      button.classList.toggle("has-attachment", Boolean(attachment));
      button.title = attachment
        ? `Replace attachment: ${attachment.name}`
        : "Attach an image or PDF";
      button.setAttribute("aria-label", button.title);
    }
    if (status) {
      status.textContent = attachment
        ? `${attachment.name} | ${attachment.kind}`
        : "";
      status.classList.toggle("visible", Boolean(attachment));
    }
  }

// AIDA REVIEW BLOCK 10: Function prepare - callable behavior in this runtime organ.
  async function prepare(file) {
    const state = ensureState();
    if (!file) return null;

    const kind = kindForType(file.type);
    if (!kind) {
      state.error = "unsupported_file_type";
      log("GLASSES: Only PNG, JPEG, WEBP, GIF, and PDF files are supported.", "log-amber");
      return null;
    }
    if (file.size > MAX_FILE_BYTES) {
      state.error = "file_too_large";
      log("GLASSES: Attachment is larger than the 15 MB browser limit.", "log-amber");
      return null;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      const preparedAt = new Date().toISOString();
      state.attachment = {
        name: file.name || `aida_attachment.${kind === "pdf" ? "pdf" : "png"}`,
        type: file.type,
        kind,
        size: file.size,
        dataUrl,
        preparedAt
      };
      state.lastPreparedAt = preparedAt;
      state.error = null;
      renderState();
      log(`GLASSES: ${kind} ready for the next message: ${state.attachment.name}.`, "log-blue");
      return peek();
    } catch (error) {
      state.error = error.message;
      log(`GLASSES: ${error.message}`, "log-amber");
      return null;
    }
  }

// AIDA REVIEW BLOCK 11: Function peek - callable behavior in this runtime organ.
  function peek() {
    const attachment = ensureState().attachment;
    if (!attachment) return null;
    return { ...attachment };
  }

// AIDA REVIEW BLOCK 12: Function clear - callable behavior in this runtime organ.
  function clear(reason = "manual_clear") {
    const state = ensureState();
    state.attachment = null;
    state.lastClearReason = reason;
    const input = $("glasses-file-in");
    if (input) input.value = "";
    renderState();
    return true;
  }

// AIDA REVIEW BLOCK 13: Function markSent - callable behavior in this runtime organ.
  function markSent() {
    const state = ensureState();
    state.lastSentAt = new Date().toISOString();
    return clear("sent_successfully");
  }

// AIDA REVIEW BLOCK 14: Function inspect - callable behavior in this runtime organ.
  function inspect() {
    const state = ensureState();
    const summary = {
      ready: Boolean(state.attachment),
      attachment: state.attachment ? {
        name: state.attachment.name,
        type: state.attachment.type,
        kind: state.attachment.kind,
        size: state.attachment.size,
        preparedAt: state.attachment.preparedAt
      } : null,
      lastPreparedAt: state.lastPreparedAt,
      lastSentAt: state.lastSentAt,
      error: state.error
    };
    console.log("AIDA_GLASSES_INSPECT", summary);
    return summary;
  }

// AIDA REVIEW BLOCK 15: Function install - callable behavior in this runtime organ.
  function install() {
    ensureState();
    const button = $("glasses-attach-btn");
    const input = $("glasses-file-in");
    if (button && input) {
      button.addEventListener("click", () => input.click());
      input.addEventListener("change", () => prepare(input.files?.[0] || null));
    }
    renderState();
    log("Glasses organ loaded. Images and PDFs can be attached on request.", "log-blue");
  }

// AIDA REVIEW BLOCK 16: Browser export AIDA_GLASSES - exposes this organ to the page runtime.
  window.AIDA_GLASSES = {
    prepare,
    peek,
    clear,
    markSent,
    inspect
  };

  if (window.AIDA_MODULES) {
    window.AIDA_MODULES.register({
      id: MODULE_ID,
      phase: "multimodal_input",
      reads: ["browser File API"],
      writes: ["AIDA_RUNTIME.glasses.attachment"],
      requires: ["AIDA_RUNTIME"],
      verifies: ["one image or PDF is retained in browser runtime until the next successful LLM response"]
    });
  }

// AIDA REVIEW BLOCK 17: Browser event wiring - connects page lifecycle or user actions to this organ.
  document.addEventListener("DOMContentLoaded", install);
})();
