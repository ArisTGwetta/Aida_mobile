(function () {
  const MODULE_ID = "spine.glasses";
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const PDF_TYPE = "application/pdf";

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME;
  }

  function log(message, className = "log-blue") {
    if (window.AIDA_BIOS?.log) window.AIDA_BIOS.log(message, className);
    else if (window.AIDA_BODY?.pulse) window.AIDA_BODY.pulse(message);
  }

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

  function kindForType(type) {
    if (IMAGE_TYPES.has(type)) return "image";
    if (type === PDF_TYPE) return "pdf";
    return null;
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read the selected file."));
      reader.readAsDataURL(file);
    });
  }

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

  function peek() {
    const attachment = ensureState().attachment;
    if (!attachment) return null;
    return { ...attachment };
  }

  function clear(reason = "manual_clear") {
    const state = ensureState();
    state.attachment = null;
    state.lastClearReason = reason;
    const input = $("glasses-file-in");
    if (input) input.value = "";
    renderState();
    return true;
  }

  function markSent() {
    const state = ensureState();
    state.lastSentAt = new Date().toISOString();
    return clear("sent_successfully");
  }

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

  document.addEventListener("DOMContentLoaded", install);
})();
