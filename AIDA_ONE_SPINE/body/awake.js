(function () {
  const ASSET_BASE = "body/assets/";
  const DEFAULT_FACE = `${ASSET_BASE}neutral1.png`;
  const FACE_EFFECTS = {
    sparkCount: 48,
    sparkLayerOpacity: 0.78,
    sparkOpacityMin: 0.52,
    sparkOpacityRange: 0.38,
    sparkSizeMin: 5,
    sparkSizeRange: 9,
    sparkDurationMin: 9000,
    sparkDurationRange: 18000
  };

  function $(id) {
    return document.getElementById(id);
  }

  function runtime() {
    return window.AIDA_RUNTIME || null;
  }

  function setBootPhase(phase) {
    const rt = runtime();
    if (rt) rt.boot.phase = phase;
  }

  function appendBios(message, className = "log-green") {
    const logs = $("bios-logs");
    if (!logs) return;
    const line = document.createElement("div");
    line.className = className;
    line.textContent = `>>> ${message}`;
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
  }

  function summarizeDriveWriteback(result) {
    const ops = Array.isArray(result?.operations) ? result.operations : [];
    if (!ops.length) return result?.status || "no operations";
    return ops
      .map((op) => `${op.action || op.mode || "plan"} ${op.fileName} (${op.count || 0})`)
      .join("; ");
  }

  async function runDriveWriteback(action) {
    const api = window.AIDA_DRIVE_WRITEBACK;
    if (!api) {
      appendBios("Drive writeback organ is not loaded.", "log-amber");
      return;
    }

    try {
      if (action === "preview") {
        const result = api.preview();
        appendBios(`Drive write preview: ${summarizeDriveWriteback(result)}.`, result.ready ? "log-blue" : "log-amber");
        return;
      }

      if (action === "dry_run") {
        const result = await api.apply({ dryRun: true });
        appendBios(`Drive write dry-run: ${summarizeDriveWriteback(result)}.`, result.ready ? "log-blue" : "log-amber");
        return;
      }

      if (action === "apply") {
        const preview = api.preview();
        if (!preview.ready) {
          appendBios("Drive write apply blocked: nothing staged to write.", "log-amber");
          return;
        }

        const confirmed = window.confirm(
          `Apply ${preview.operations.length} staged Drive write operation(s) to the real JSON vault?`
        );
        if (!confirmed) {
          appendBios("Drive write apply cancelled before network write.", "log-amber");
          return;
        }

        const result = await api.apply({ dryRun: false });
        appendBios(`Drive write applied: ${summarizeDriveWriteback(result)}.`, "log-blue");
      }
    } catch (error) {
      appendBios(`Drive writeback failed: ${error.message}`, "log-amber");
      console.error(error);
    }
  }

  function ensureSleepCollectedCard() {
    const veil = $("veil");
    if (!veil) return null;

    let card = $("sleep-collected-card");
    if (card) return card;

    card = document.createElement("div");
    card.id = "sleep-collected-card";
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");

    const title = document.createElement("div");
    title.className = "sleep-collected-title";

    const detail = document.createElement("div");
    detail.className = "sleep-collected-detail";

    const close = document.createElement("div");
    close.className = "sleep-collected-close";

    const status = document.createElement("div");
    status.className = "sleep-collected-status";

    const actions = document.createElement("div");
    actions.className = "sleep-collected-actions";

    const save = document.createElement("button");
    save.type = "button";
    save.className = "sleep-action sleep-action-save";
    save.textContent = "SAVE TO DRIVE";

    const keep = document.createElement("button");
    keep.type = "button";
    keep.className = "sleep-action sleep-action-keep";
    keep.textContent = "KEEP FOR LATER";

    const discard = document.createElement("button");
    discard.type = "button";
    discard.className = "sleep-action sleep-action-discard";
    discard.textContent = "DISCARD DRAFTS";

    actions.append(save, keep, discard);
    card.append(title, detail, close, status, actions);
    veil.appendChild(card);
    return card;
  }

  function setSleepCardStatus(message, tone = "normal") {
    const status = $("sleep-collected-card")?.querySelector(".sleep-collected-status");
    if (!status) return;
    status.textContent = message || "";
    status.dataset.tone = tone;
  }

  function setSleepActionsBusy(busy) {
    document.querySelectorAll("#sleep-collected-card .sleep-action").forEach((button) => {
      button.disabled = Boolean(busy);
    });
  }

  function finishSleepScreen() {
    const card = $("sleep-collected-card");
    const veil = $("veil");
    const engine = $("main-engine");
    if (card) {
      card.classList.remove("visible");
      card.style.display = "none";
    }
    if (engine) engine.style.visibility = "hidden";
    if (veil) {
      veil.style.background = "black";
      veil.style.opacity = "1";
      veil.style.pointerEvents = "auto";
    }
    const rt = runtime();
    if (rt) {
      rt.body.arrivalComplete = false;
      rt.boot.arrived = false;
      rt.boot.phase = "sleep_complete";
    }
    window.AIDA_AIRLOCK?.clearSessionCredentials?.("sleep_complete");
  }

  function prepareWakeScreen() {
    const card = $("sleep-collected-card");
    const veil = $("veil");
    const engine = $("main-engine");
    if (card) {
      card.classList.remove("visible");
      card.style.display = "none";
    }
    if (engine) engine.style.visibility = "visible";
    if (veil) {
      veil.style.background = "black";
      veil.style.opacity = "1";
      veil.style.pointerEvents = "auto";
    }
  }

  function installSleepActions(card) {
    if (!card || card.dataset.actionsInstalled === "true") return;
    card.dataset.actionsInstalled = "true";

    const save = card.querySelector(".sleep-action-save");
    const keep = card.querySelector(".sleep-action-keep");
    const discard = card.querySelector(".sleep-action-discard");
    let discardArmedUntil = 0;

    save?.addEventListener("click", async () => {
      const api = window.AIDA_DRIVE_WRITEBACK;
      if (!api?.apply) {
        setSleepCardStatus("Drive writeback is unavailable. Drafts remain safe.", "error");
        return;
      }
      if (!runtime()?.tokens?.drive?.accessToken) {
        setSleepCardStatus("Drive connection expired. Reconnect, then tap Save again.", "error");
        window.AIDA_DRIVE?.requestDriveToken?.();
        return;
      }

      setSleepActionsBusy(true);
      setSleepCardStatus("Saving reviewed memory to Drive...", "working");
      try {
        const result = await api.apply({ dryRun: false });
        if (!result?.ready || result.status !== "applied") {
          throw new Error(result?.status || "Drive write did not complete.");
        }
        window.AIDA_SLEEP?.markLastPacketSaved?.();
        setSleepCardStatus(`Saved ${result.operations.length} memory update(s) to Drive.`, "success");
        if (save) {
          save.textContent = "SAVED";
          save.hidden = true;
        }
        if (keep) keep.textContent = "CLOSE";
        if (discard) discard.hidden = true;
      } catch (error) {
        setSleepCardStatus(`Save failed: ${error.message}. Drafts remain safe.`, "error");
      } finally {
        setSleepActionsBusy(false);
      }
    });

    keep?.addEventListener("click", () => {
      finishSleepScreen();
      setSleepCardStatus("");
    });

    discard?.addEventListener("click", () => {
      const now = Date.now();
      if (now > discardArmedUntil) {
        discardArmedUntil = now + 7000;
        discard.textContent = "CONFIRM DISCARD";
        setSleepCardStatus("Tap again to discard generated drafts. Raw conversation will remain.", "warning");
        window.setTimeout(() => {
          if (Date.now() >= discardArmedUntil && discard) discard.textContent = "DISCARD DRAFTS";
        }, 7100);
        return;
      }

      const result = window.AIDA_SLEEP?.discardLastDrafts?.();
      if (!result?.ok) {
        setSleepCardStatus("No sleep drafts were available to discard.", "error");
        return;
      }
      setSleepCardStatus(
        `Drafts discarded. ${result.rawExchangeCountPreserved} raw exchange(s) remain available for a future Sleep.`,
        "success"
      );
      if (save) save.hidden = true;
      if (discard) discard.hidden = true;
      if (keep) keep.textContent = "CLOSE";
    });
  }

  function showSleepCollected(summary = {}, options = {}) {
    const card = ensureSleepCollectedCard();
    const veil = $("veil");
    if (!card || !veil) return;

    const final = Boolean(options.final);
    const writeback = window.AIDA_DRIVE_WRITEBACK?.preview?.();
    const writeCount = writeback?.operations?.length || 0;
    const title = card.querySelector(".sleep-collected-title");
    const detail = card.querySelector(".sleep-collected-detail");
    const close = card.querySelector(".sleep-collected-close");
    const actions = card.querySelector(".sleep-collected-actions");
    installSleepActions(card);
    card.style.display = "block";

    if (title) title.textContent = final ? "Sleep collected." : "Collecting sleep...";
    if (detail) {
      detail.textContent = [
        summary.packetId ? `packet ${summary.packetId}` : "",
        Number.isFinite(summary.exchangeCount) ? `${summary.exchangeCount} exchange(s)` : "",
        Number.isFinite(summary.diaryDraftCount) ? `${summary.diaryDraftCount} diary draft(s)` : "",
        Number.isFinite(summary.factCandidateCount) ? `${summary.factCandidateCount} fact candidate(s)` : "",
        Number.isFinite(summary.insightCandidateCount) ? `${summary.insightCandidateCount} insight candidate(s)` : "",
        Number.isFinite(writeCount) ? `${writeCount} Drive write(s) staged` : ""
      ].filter(Boolean).join(" | ");
    }
    if (close) {
      close.textContent = final
        ? "It is OK to close the app now."
        : "Finishing the quiet writeback staging...";
    }
    if (actions) actions.hidden = !final;
    if (!final) {
      const save = card.querySelector(".sleep-action-save");
      const keep = card.querySelector(".sleep-action-keep");
      const discard = card.querySelector(".sleep-action-discard");
      if (save) {
        save.hidden = false;
        save.disabled = false;
        save.textContent = "SAVE TO DRIVE";
      }
      if (keep) {
        keep.hidden = false;
        keep.disabled = false;
        keep.textContent = "KEEP FOR LATER";
      }
      if (discard) {
        discard.hidden = false;
        discard.disabled = false;
        discard.textContent = "DISCARD DRAFTS";
      }
      setSleepCardStatus("");
    }

    veil.style.background = "black";
    veil.style.opacity = "1";
    veil.style.pointerEvents = "auto";
    card.classList.add("visible");
  }

  function hideSleepCollected() {
    const card = $("sleep-collected-card");
    if (card) card.classList.remove("visible");
    const veil = $("veil");
    if (veil) {
      veil.style.opacity = "0";
      veil.style.pointerEvents = "none";
    }
  }

  function appendChat(role, text, options = {}) {
    const flow = $("chat-flow");
    if (!flow) return null;
    const line = document.createElement("div");
    const displayRole = String(options.displayRole || role || "AIDA").trim();
    const styleRole = String(options.styleRole || role || "AIDA").toUpperCase();
    line.className = `line ${styleRole}`;
    line.dataset.speaker = displayRole;

    const speaker = document.createElement("span");
    speaker.className = "line-speaker";
    speaker.textContent = displayRole;

    const content = document.createElement("span");
    content.className = "line-text";
    content.textContent = text;

    line.append(speaker, content);
    if (Array.isArray(options.sources) && options.sources.length) {
      const sources = document.createElement("div");
      sources.className = "line-sources";
      const heading = document.createElement("span");
      heading.className = "line-sources-heading";
      heading.textContent = "SOURCES";
      sources.appendChild(heading);
      options.sources.forEach((source, index) => {
        if (!source?.url) return;
        const link = document.createElement("a");
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `${index + 1}. ${source.title || source.url}`;
        sources.appendChild(link);
      });
      line.appendChild(sources);
    }
    flow.appendChild(line);
    flow.scrollTop = flow.scrollHeight;
    return line;
  }

  function pulse(message) {
    const log = $("log-content");
    if (!log) return;
    const line = document.createElement("div");
    line.textContent = `> ${message}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function projectLabel(project) {
    return project?.name || project?.fileName || project?.key || "Unnamed project";
  }

  function projectPayload(fileName, fallback) {
    const rt = runtime();
    return rt?.mind?.projects?.[fileName] || rt?.drive?.files?.[fileName] || fallback?.summary || {};
  }

  function briefcaseEditStatus(fileName) {
    const edits = runtime()?.driveWriteback?.briefcaseEdits || [];
    const latest = edits.filter((item) => item.fileName === fileName).slice(-1)[0];
    return latest?.status || "runtime";
  }

  function openThreadsText(project) {
    return (Array.isArray(project?.open_threads) ? project.open_threads : [])
      .map((item) => typeof item === "string" ? item : item?.text || item?.thread || "")
      .filter(Boolean)
      .join("\n");
  }

  function labeledBriefcaseField(labelText, helpText, field) {
    const wrap = document.createElement("label");
    wrap.className = "briefcase-field-wrap";
    const label = document.createElement("span");
    label.className = "briefcase-label";
    label.textContent = labelText;
    const help = document.createElement("span");
    help.className = "briefcase-help";
    help.textContent = helpText;
    wrap.append(label, help, field);
    return wrap;
  }

  function renderMeditationResults(box, result) {
    const results = result?.results || [];
    if (!results.length) {
      box.textContent = "No indexed matches yet. Try a different phrase or run Sleep/Commit after more story turns.";
      return;
    }

    box.innerHTML = "";
    results.forEach((item) => {
      const row = document.createElement("div");
      row.className = "briefcase-search-result";
      const title = document.createElement("div");
      title.className = "briefcase-search-title";
      title.textContent = `${item.title || item.type} (${item.project || "unfiled"}, score ${item.score})`;
      const text = document.createElement("div");
      text.className = "briefcase-search-text";
      text.textContent = item.text || "";
      const refs = document.createElement("div");
      refs.className = "briefcase-search-refs";
      refs.textContent = (item.sourceRefs || []).length ? `refs: ${item.sourceRefs.join(", ")}` : item.humanSource || "";
      row.append(title, text, refs);
      box.appendChild(row);
    });
  }

  function runBriefcaseMeditation(query, resultBox) {
    const text = String(query || "").trim();
    if (!text) {
      resultBox.textContent = "Type what you want to find first.";
      return;
    }
    if (!window.AIDA_CRAWLER?.search) {
      resultBox.textContent = "Crawler is not loaded yet.";
      return;
    }

    window.AIDA_CRAWLER.indexNow?.("briefcase_inspector_meditate");
    const result = window.AIDA_CRAWLER.search(text, {
      limit: 6,
      minScore: 1,
      llmScope: "current"
    });
    renderMeditationResults(resultBox, result);
    pulse(`Meditation search: ${result.results?.length || 0} match(es).`);
  }

  function renderBriefcaseInspector(pane, activeProject) {
    const rt = runtime();
    const fileName = activeProject?.fileName || rt?.context?.projectName || rt?.mind?.activeProjectName || activeProject?.key || null;
    if (!fileName) return;
    const project = projectPayload(fileName, activeProject);
    const editable = Boolean(rt?.mind?.projects?.[fileName] || rt?.drive?.files?.[fileName]);

    const panel = document.createElement("section");
    panel.className = "briefcase-inspector";

    const title = document.createElement("div");
    title.className = "briefcase-inspector-title";
    title.textContent = `BRIEFCASE: ${project.project_name || project.name || activeProject.name || fileName}`;

    const meta = document.createElement("div");
    meta.className = "briefcase-inspector-meta";
    meta.textContent = `${fileName} | ${briefcaseEditStatus(fileName)} | Stage edits here, then use BIOS > DRIVE WRITE APPLY to save to Drive.`;

    const name = document.createElement("input");
    name.className = "briefcase-field";
    name.value = project.project_name || project.name || activeProject.name || "";
    name.placeholder = "story name";

    const realm = document.createElement("input");
    realm.className = "briefcase-field";
    realm.value = project.realm || project.realm_name || activeProject.realmKey || "";
    realm.placeholder = "realm";

    const status = document.createElement("input");
    status.className = "briefcase-field";
    status.value = project.status || "active";
    status.placeholder = "status";

    const role = document.createElement("input");
    role.className = "briefcase-field";
    role.value = typeof project.role === "string" ? project.role : project.role?.file || project.role?.name || "";
    role.placeholder = "role";

    const summary = document.createElement("textarea");
    summary.className = "briefcase-area";
    summary.value = project.latest_summary || project.summary || activeProject.status || "";
    summary.placeholder = "summary";

    const threads = document.createElement("textarea");
    threads.className = "briefcase-area";
    threads.value = openThreadsText(project);
    threads.placeholder = "open threads, one per line";

    const actions = document.createElement("div");
    actions.className = "briefcase-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "STAGE EDIT";
    const meditate = document.createElement("button");
    meditate.type = "button";
    meditate.textContent = "MEDITATE";
    actions.append(save, meditate);

    const search = document.createElement("input");
    search.className = "briefcase-field briefcase-search";
    search.placeholder = "which project did we do this or that?";

    const resultBox = document.createElement("div");
    resultBox.className = "briefcase-search-results";

    save.addEventListener("click", () => {
      if (!editable) {
        resultBox.textContent = "This briefcase is visible from the index, but its full payload is not loaded yet. Select it again or fetch Drive JSON before editing.";
        return;
      }
      const result = window.AIDA_PROJECTS?.stageBriefcaseEdit?.(fileName, {
        name: name.value,
        realm: realm.value,
        status: status.value,
        role: role.value,
        latest_summary: summary.value,
        open_threads: threads.value
      });
      const ok = Boolean(result?.ok);
      resultBox.textContent = ok
        ? `Staged edit for ${result.projectName}. This changed runtime state; use BIOS > DRIVE WRITE APPLY to save it to Drive.`
        : `Could not stage edit: ${result?.reason || "unknown error"}.`;
      if (ok) meta.textContent = `${fileName} | staged | Use BIOS > DRIVE WRITE APPLY to save to Drive.`;
      pulse(ok ? `Briefcase edit staged: ${fileName}` : `Briefcase edit failed: ${fileName}`);
    });

    meditate.addEventListener("click", () => {
      runBriefcaseMeditation(search.value || $("user-in")?.value, resultBox);
    });

    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") runBriefcaseMeditation(search.value, resultBox);
    });

    if (!editable) {
      resultBox.textContent = "Index-only briefcase. Full editable payload is not loaded yet.";
      save.disabled = true;
    }

    panel.append(
      title,
      meta,
      labeledBriefcaseField("Name", "Story/project display name.", name),
      labeledBriefcaseField("Realm", "Shelf/category this briefcase belongs under.", realm),
      labeledBriefcaseField("Status", "Usually active, draft, or superseded.", status),
      labeledBriefcaseField("Role", "Default role file, such as role_co_narrator.json.", role),
      labeledBriefcaseField("Summary", "Short continuity note Aida sees when this project is active.", summary),
      labeledBriefcaseField("Open Threads", "Questions or loose ends, one per line.", threads),
      actions,
      labeledBriefcaseField("Meditate Query", "Search indexed memory without changing the briefcase.", search),
      resultBox
    );
    pane.appendChild(panel);
  }

  function renderProjectSelector() {
    const tag = $("realm-tag");
    const pane = $("pres-content");
    if (!pane) return;

    const hierarchy = window.AIDA_PROJECTS?.hierarchy?.() || [];
    const rt = runtime();
    if (window.AIDA_PROJECTS?.hierarchyNeedsHydration?.()) {
      pane.innerHTML = '<div class="project-shelf-loading">Loading project shelves from Drive...</div>';
      window.AIDA_PROJECTS.hydrateHierarchy()
        .then(() => renderProjectSelector())
        .catch((error) => {
          pane.textContent = `Project shelves could not finish loading: ${error.message}`;
          pulse(`Project hierarchy hydration failed: ${error.message}`);
        });
      return;
    }
    const activeProject = hierarchy.flatMap((realm) => realm.projects || []).find((project) => project.active) || null;
    const activeRealm = activeProject
      ? hierarchy.find((realm) => (realm.projects || []).some((project) => (
          project.key === activeProject.key ||
          project.fileName === activeProject.fileName
        ))) || null
      : hierarchy.find((realm) => realm.active) || null;
    if (tag) {
      tag.textContent = activeProject
        ? `${projectLabel(activeRealm)} / ${projectLabel(activeProject)}`
        : activeRealm
          ? `${projectLabel(activeRealm)} / ALL PROJECTS`
          : "REALMS / PROJECTS";
    }

    pane.innerHTML = "";

    if (!hierarchy.length) {
      pane.textContent = "No realm or project ledger loaded. Fetch Drive JSON first.";
      pulse("Project selector waiting for Drive project ledger.");
      return;
    }

    const selectEntry = async (entry, row) => {
      row.disabled = true;
      let selected = null;
      try {
        const targetKey = entry.kind === "project"
          ? entry.fileName || entry.key
          : entry.key || entry.fileName;
        selected = await (
          window.AIDA_PROJECTS?.selectHydrated?.(targetKey) ||
          window.AIDA_PROJECTS?.select?.(targetKey) ||
          window.AIDA_DRIVE?.selectActiveProject?.(targetKey)
        );
      } finally {
        row.disabled = false;
      }
      if (!selected) return;
      const isRealm = entry.kind === "realm";
      const refreshedHierarchy = window.AIDA_PROJECTS?.hierarchy?.() || [];
      const refreshedProject = refreshedHierarchy.flatMap((realm) => realm.projects || []).find((project) => project.active) || null;
      const refreshedRealm = refreshedProject
        ? refreshedHierarchy.find((realm) => (realm.projects || []).some((project) => (
            project.key === refreshedProject.key ||
            project.fileName === refreshedProject.fileName
          )))
        : refreshedHierarchy.find((realm) => realm.active) || null;
      appendChat(
        "AIDA",
        isRealm
          ? `Realm context switched to ${projectLabel(entry)}. Its projects are available, but no single story is active.`
          : `Project context switched to ${projectLabel(refreshedProject || entry)} inside ${projectLabel(refreshedRealm || {})}.`
      );
      pulse(`${isRealm ? "Realm" : "Project"} switched: ${entry.fileName || entry.key}`);
      renderProjectSelector();
    };

    hierarchy.forEach((realm) => {
      const group = document.createElement("section");
      group.className = `realm-group${realm.active ? " is-active" : ""}`;

      const realmRow = document.createElement("button");
      realmRow.type = "button";
      realmRow.className = `project-row realm-row${realm.active ? " is-active" : ""}`;
      realmRow.dataset.projectName = realm.fileName || realm.key || "";
      realmRow.disabled = !realm.fileName && !realm.summary;

      const realmName = document.createElement("span");
      realmName.className = "project-row-name";
      realmName.textContent = projectLabel(realm);
      const realmMeta = document.createElement("span");
      realmMeta.className = "project-row-meta";
      realmMeta.textContent = `${realm.projects.length} project${realm.projects.length === 1 ? "" : "s"} · select realm-wide context`;
      realmRow.append(realmName, realmMeta);
      realmRow.addEventListener("click", () => selectEntry(realm, realmRow));
      group.appendChild(realmRow);

      realm.projects.forEach((project) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = `project-row project-child${project.active ? " is-active" : ""}`;
        row.dataset.projectName = project.fileName || project.key || "";
        row.disabled = !project.fileName && !project.summary;

        const name = document.createElement("span");
        name.className = "project-row-name";
        name.textContent = projectLabel(project);
        const meta = document.createElement("span");
        meta.className = "project-row-meta";
        meta.textContent = [
          project.lastActive ? `last ${project.lastActive}` : "",
          project.status || ""
        ].filter(Boolean).join(" | ") || project.source || "briefcase";
        row.append(name, meta);
        row.addEventListener("click", () => selectEntry(project, row));
        group.appendChild(row);
      });

      pane.appendChild(group);
    });

    renderBriefcaseInspector(pane, activeProject);
  }

  function buildPixelGrid() {
    const grid = $("pixelGrid");
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i < 20; i += 1) {
      const cell = document.createElement("div");
      cell.style.setProperty("--dx", Math.random().toString());
      cell.style.setProperty("--dy", Math.random().toString());
      grid.appendChild(cell);
    }
  }

  function buildSparks() {
    const layer = $("sparkLayer");
    if (!layer) return;
    layer.innerHTML = "";
    for (let i = 0; i < FACE_EFFECTS.sparkCount; i += 1) {
      const spark = document.createElement("div");
      spark.className = "spark";
      spark.style.left = `${Math.random() * 100}%`;
      spark.style.top = `${Math.random() * 100}%`;
      spark.style.setProperty(
        "--spark-duration",
        `${Math.round(FACE_EFFECTS.sparkDurationMin + Math.random() * FACE_EFFECTS.sparkDurationRange)}ms`
      );
      spark.style.setProperty(
        "--spark-opacity",
        (FACE_EFFECTS.sparkOpacityMin + Math.random() * FACE_EFFECTS.sparkOpacityRange).toFixed(2)
      );
      spark.style.setProperty(
        "--spark-size",
        `${Math.round(FACE_EFFECTS.sparkSizeMin + Math.random() * FACE_EFFECTS.sparkSizeRange)}px`
      );
      spark.style.animationDelay = `${Math.random() * 12}s`;
      layer.appendChild(spark);
    }
  }

  function buildFaceDataGrid(id, count, durationRange, opacityRange) {
    const grid = $(id);
    if (!grid) return;
    grid.innerHTML = "";
    
    for (let i = 0; i < count; i += 1) {
      const cell = document.createElement("span");
      const duration = durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]);
      const delay = Math.random() * duration;
      const opacity = opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]);
      
      // OPTION A: Randomly scatter each pixel across the entire 0-100% canvas coordinates
      cell.style.position = "absolute";
      cell.style.left = `${Math.random() * 100}%`;
      cell.style.top = `${Math.random() * 100}%`;
      
      cell.style.setProperty("--blink-duration", `${Math.round(duration)}ms`);
      cell.style.setProperty("--blink-delay", `${Math.round(delay)}ms`);
      cell.style.setProperty("--blink-opacity", opacity.toFixed(2));
      grid.appendChild(cell);
    }
  }

  function buildFaceDataGrids() {
    buildFaceDataGrid("face-data-slow", 120, [45000, 110000], [0.72, 1.0]);
    buildFaceDataGrid("face-data-fast", 396, [12000, 36000], [0.38, 0.78]);
  }

  function syncCustomTagsFromButtons() {
    const rt = runtime();
    if (!rt?.context) return [];

    const selected = document.querySelector(".tag-btn.selected");
    const label = selected?.textContent?.trim() || "FRANCISCO";
    const mode = selected?.dataset?.mode || "francisco";
    const tags = [label].filter(Boolean);

    rt.context.customTags = tags;
    rt.context.storyInputMode = {
      mode,
      label
    };
    return tags;
  }

  function installTagEditor() {
    const tagButtons = document.querySelectorAll(".tag-btn");
    const tagEdit = $("tag-edit");
    let activeTagIndex = null;
    if (!tagEdit || !tagButtons.length) return;

    tagButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tagButtons.forEach((item) => item.classList.remove("selected"));
        btn.classList.add("selected");
        syncCustomTagsFromButtons();
      });

      btn.addEventListener("dblclick", () => {
        activeTagIndex = btn.dataset.index;
        tagEdit.value = btn.textContent === "#" ? "" : btn.textContent;
        tagEdit.style.display = "block";
        tagEdit.placeholder = `rename ${btn.dataset.mode || "story lane"}...`;
        tagEdit.focus();
      });
    });

    tagEdit.addEventListener("blur", () => {
      if (activeTagIndex === null) return;
      const btn = document.querySelector(`.tag-btn[data-index="${activeTagIndex}"]`);
      const val = tagEdit.value.trim();
      if (btn) {
        btn.textContent = val || "#";
        btn.classList.toggle("used", Boolean(val));
        btn.classList.add("selected");
      }
      syncCustomTagsFromButtons();
      tagEdit.style.display = "none";
      activeTagIndex = null;
    });

    tagEdit.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        tagEdit.blur();
      }
      if (event.key === "Escape") {
        tagEdit.value = "";
        tagEdit.blur();
      }
    });

    syncCustomTagsFromButtons();
  }

  function installInputPlaceholders() {
    const input = $("user-in");
    const send = $("send-btn");
    const realms = $("eject-btn");
    const sleep = $("sleep-btn");
    const bios = $("bios-return-btn");

    if (send && input) {
      send.addEventListener("click", () => {
        if (window.AIDA_CONVERSATION?.sendFromInput) {
          window.AIDA_CONVERSATION.sendFromInput();
          return;
        }

        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        try {
          localStorage.removeItem("AIDA_INPUT_DRAFT_V1");
        } catch (_) {
          // Local draft storage may be unavailable in restricted browser modes.
        }
        appendChat("USER", text);
        appendChat("AIDA", "Body received the signal. Conversation is still warming up.");
        pulse("Conversation hook fired; waiting for live conversation module.");
      });
    }

    if (input) {
      try {
        const savedDraft = localStorage.getItem("AIDA_INPUT_DRAFT_V1");
        if (savedDraft && !input.value) input.value = savedDraft;
      } catch (_) {
        // Local draft storage may be unavailable in restricted browser modes.
      }

      input.addEventListener("input", () => {
        try {
          const value = input.value || "";
          if (value) localStorage.setItem("AIDA_INPUT_DRAFT_V1", value);
          else localStorage.removeItem("AIDA_INPUT_DRAFT_V1");
        } catch (_) {
          // Input remains fully functional without local draft persistence.
        }
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && send) send.click();
      });
    }

    if (realms) {
      realms.addEventListener("click", () => {
        renderProjectSelector();
      });
    }

    if (sleep) {
      sleep.addEventListener("click", () => {
        if (window.AIDA_SLEEP?.sleepNow) {
          window.AIDA_SLEEP.sleepNow("manual_sleep_button");
          return;
        }

        pulse("Sleep collector unavailable. Running body departure only.");
        if (typeof window.aida_depart === "function") window.aida_depart();
      });
    }

    if (bios) {
      bios.addEventListener("click", () => {
        const biosScreen = $("bios-screen");
        const iface = $("aida-interface");
        if (iface) iface.style.display = "none";
        if (biosScreen) biosScreen.style.display = "flex";
        const rt = runtime();
        if (rt) rt.boot.phase = "bios_return";
        appendBios("Returned to BIOS. Runtime state preserved.", "log-blue");
      });
    }
  }

  function showBody() {
    const bios = $("bios-screen");
    const airlock = $("airlock");
    const iface = $("aida-interface");
    const engine = $("main-engine");
    if (bios) bios.style.display = "none";
    if (airlock) airlock.style.display = "none";
    if (iface) iface.style.display = "block";
    if (engine) engine.classList.remove("hidden");
  }

  function createHologramLayer() {
    const veil = $("veil");
    const portrait = $("aida-portrait");
    if (!veil || !portrait || $("holoFace")) return;

    const scanline = document.createElement("div");
    scanline.id = "holoScanline";
    Object.assign(scanline.style, {
      position: "absolute",
      top: "-20px",
      left: "0",
      width: "100%",
      height: "20px",
      background: "linear-gradient(to bottom, transparent, rgba(75,227,255,0.4), transparent)",
      opacity: "0",
      zIndex: "2001",
      pointerEvents: "none"
    });

    const beam = document.createElement("div");
    beam.id = "holoBeam";
    Object.assign(beam.style, {
      position: "absolute",
      bottom: "0",
      left: "50%",
      width: "2px",
      height: "0",
      background: "linear-gradient(to top, rgba(75,227,255,0.35), transparent)",
      transform: "translateX(-50%)",
      opacity: "0",
      zIndex: "2002",
      pointerEvents: "none"
    });

    const cone = document.createElement("div");
    cone.id = "holoCone";
    Object.assign(cone.style, {
      position: "absolute",
      bottom: "0",
      left: "50%",
      width: "0",
      height: "0",
      borderLeft: "0 solid transparent",
      borderRight: "0 solid transparent",
      borderTop: "0 solid rgba(75,227,255,0.15)",
      transform: "translateX(-50%) scaleY(1.25)",
      transformOrigin: "bottom center",
      opacity: "0",
      filter: "blur(2px)",
      zIndex: "2003",
      pointerEvents: "none"
    });

    const face = document.createElement("img");
    face.id = "holoFace";
    face.src = portrait.src || DEFAULT_FACE;
    Object.assign(face.style, {
      position: "absolute",
      bottom: "20%",
      left: "50%",
      width: "180px",
      height: "auto",
      transform: "translateX(-50%)",
      opacity: "0",
      filter: "grayscale(1) contrast(0.6) brightness(0.7)",
      zIndex: "2004",
      pointerEvents: "none",
      webkitMaskImage: "radial-gradient(circle, black 40%, transparent 80%)",
      maskImage: "radial-gradient(circle, black 40%, transparent 80%)"
    });

    veil.append(scanline, beam, cone, face);
  }

  function resetRitualElements() {
    const scanline = $("holoScanline");
    const beam = $("holoBeam");
    const cone = $("holoCone");
    const face = $("holoFace");

    if (scanline) {
      scanline.getAnimations().forEach((animation) => animation.cancel());
      scanline.style.opacity = "0";
      scanline.style.top = "-20px";
    }
    if (beam) {
      beam.getAnimations().forEach((animation) => animation.cancel());
      beam.style.opacity = "0";
      beam.style.height = "0";
    }
    if (cone) {
      cone.getAnimations().forEach((animation) => animation.cancel());
      cone.style.opacity = "0";
      cone.style.borderLeftWidth = "0";
      cone.style.borderRightWidth = "0";
      cone.style.borderTopWidth = "0";
    }
    if (face) {
      face.getAnimations().forEach((animation) => animation.cancel());
      Object.assign(face.style, {
        display: "block",
        bottom: "20%",
        left: "50%",
        width: "180px",
        height: "auto",
        objectFit: "initial",
        transform: "translateX(-50%)",
        opacity: "0",
        filter: "grayscale(1) contrast(0.6) brightness(0.7)",
        webkitMaskImage: "radial-gradient(circle, black 40%, transparent 80%)",
        maskImage: "radial-gradient(circle, black 40%, transparent 80%)"
      });
    }
  }

  window.aida_arrive = function () {
    showBody();
    prepareWakeScreen();
    createHologramLayer();
    resetRitualElements();
    setBootPhase("body_arrival");

    const veil = $("veil");
    const scanline = $("holoScanline");
    const beam = $("holoBeam");
    const cone = $("holoCone");
    const face = $("holoFace");
    const flickerGrid = $("flicker-grid");
    const pixelGrid = $("pixelGrid");
    const sparkLayer = $("sparkLayer");
    const portraitSpacer = $("portrait-spacer");
    const portraitPane = $("portrait-pane");
    const uiDock = $("input-dock");
    const dataStack = $("data-stack");
    const slowData = $("face-data-slow");
    const fastData = $("face-data-fast");

    if (!veil || !scanline || !beam || !cone || !face) return;
    hideSleepCollected();

    [uiDock, dataStack, flickerGrid, pixelGrid, sparkLayer, portraitSpacer, portraitPane, slowData, fastData].forEach((el) => {
      if (el) el.style.opacity = "0";
    });

    veil.style.background = "black";
    veil.style.opacity = "1";
    veil.style.pointerEvents = "auto";

    setTimeout(() => {
      scanline.style.opacity = "1";
      scanline.animate(
        [{ top: "-20px" }, { top: "100%" }, { top: "-20px" }],
        { duration: 1200, easing: "linear", fill: "forwards" }
      );
    }, 500);

    setTimeout(() => {
      beam.style.opacity = "1";
      beam.animate([{ height: "0" }, { height: "260px" }], {
        duration: 400,
        easing: "ease-out",
        fill: "forwards"
      });

      cone.style.opacity = "1";
      cone.animate(
        [
          { borderLeftWidth: "0", borderRightWidth: "0", borderTopWidth: "0" },
          { borderLeftWidth: "80px", borderRightWidth: "80px", borderTopWidth: "200px" }
        ],
        { duration: 700, easing: "ease-out", fill: "forwards" }
      );
    }, 1500);

    setTimeout(() => {
      face.style.opacity = "0.3";
      face.animate(
        [{ opacity: 0.2 }, { opacity: 0.6 }, { opacity: 0.1 }, { opacity: 0.8 }],
        { duration: 800, easing: "steps(4)" }
      );
    }, 2200);

    setTimeout(() => {
      Object.assign(face.style, {
        bottom: "20%",
        width: "auto",
        height: "auto",
        opacity: "1",
        filter: "grayscale(0) contrast(1.1) brightness(1.2) drop-shadow(0 0 15px rgba(75,227,255,0.6))",
        webkitMaskImage: "radial-gradient(circle, black 40%, transparent 80%)",
        maskImage: "radial-gradient(circle, black 40%, transparent 80%)"
      });

      cone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
      beam.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
    }, 3000);

    setTimeout(() => {
      veil.style.background = "white";
      veil.style.opacity = "1";

      setTimeout(() => {
        Object.assign(face.style, {
          bottom: "0",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center center",
          transform: "translateX(-50%) scale(1)",
          webkitMaskImage: "none",
          maskImage: "none",
          filter: "none"
        });
        veil.style.background = "black";
      }, 150);

      setTimeout(() => {
        veil.style.background = "white";

        setTimeout(() => {
          face.style.opacity = "0";
          face.style.display = "none";
          veil.style.background = "black";
          [uiDock, dataStack, flickerGrid, portraitSpacer, portraitPane].forEach((el) => {
            if (el) el.style.opacity = "1";
          });
          if (slowData) slowData.style.opacity = "";
          if (fastData) fastData.style.opacity = "";
          if (sparkLayer) sparkLayer.style.opacity = String(FACE_EFFECTS.sparkLayerOpacity);

          setTimeout(() => {
            veil.style.opacity = "0";
            veil.style.pointerEvents = "none";
            const rt = runtime();
            if (rt) {
              rt.body.arrivalComplete = true;
              rt.boot.arrived = true;
              rt.boot.phase = "body_ready";
            }
            pulse("Awake body arrived. Drive mind mapping is handled by the wake flow.");
          }, 300);
        }, 120);
      }, 700);
    }, 3800);
  };

  window.aida_depart = function () {
    createHologramLayer();
    const veil = $("veil");
    const beam = $("holoBeam");
    const cone = $("holoCone");
    const face = $("holoFace");
    const scanline = $("holoScanline");
    const uiDock = $("input-dock");
    const dataStack = $("data-stack");
    const flickerGrid = $("flicker-grid");

    if (!veil || !beam || !cone || !face || !scanline) return;
    setBootPhase("body_departure");

    [uiDock, dataStack, flickerGrid].forEach((el) => {
      if (el) el.style.opacity = "0";
    });

    face.style.opacity = "1";
    face.animate(
      [
        { transform: "translateX(-50%) scale(1)", opacity: 1 },
        { transform: "translateX(-50%) scale(1.02)", opacity: 0.6 },
        { transform: "translateX(-50%) scale(0.98)", opacity: 0.3 }
      ],
      { duration: 500, easing: "steps(3)" }
    );

    setTimeout(() => {
      beam.style.opacity = "1";
      cone.style.opacity = "1";
      face.animate(
        [
          { opacity: 0.3, filter: "grayscale(0)" },
          { opacity: 0.1, filter: "grayscale(1)" },
          { opacity: 0 }
        ],
        { duration: 1000, easing: "ease-out", fill: "forwards" }
      );
    }, 500);

    setTimeout(() => {
      scanline.style.opacity = "1";
      scanline.animate([{ top: "-20px" }, { top: "100%" }], {
        duration: 1000,
        easing: "ease-in"
      });
    }, 1500);

    setTimeout(() => {
      veil.style.background = "black";
      veil.style.opacity = "1";
      veil.style.pointerEvents = "auto";
      const rt = runtime();
      if (rt) rt.body.arrivalComplete = false;
    }, 2500);
  };

  window.AIDA_BODY = {
    arrive: window.aida_arrive,
    depart: window.aida_depart,
    appendChat,
    pulse,
    showSleepCollected,
    finishSleepScreen,
    prepareWakeScreen,
    setFace(src) {
      const portrait = $("aida-portrait");
      if (portrait) portrait.src = src || DEFAULT_FACE;
      const rt = runtime();
      if (rt) rt.body.currentFace = src || DEFAULT_FACE;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const portrait = $("aida-portrait");
    if (portrait) {
      portrait.src = DEFAULT_FACE;
      const rt = runtime();
      if (rt) rt.body.currentFace = DEFAULT_FACE;
    }

    buildPixelGrid();
    buildSparks();
    buildFaceDataGrids();
    installTagEditor();
    installInputPlaceholders();
    createHologramLayer();
    appendBios("Awake body module loaded.", "log-blue");

    const preview = $("boot-preview-btn");
    if (preview) {
      preview.addEventListener("click", () => {
        appendBios("Previewing Awake body ceremony.", "log-amber");
        window.aida_arrive();
      });
    }

    const writePreview = $("drive-write-preview-btn");
    if (writePreview) {
      writePreview.addEventListener("click", () => runDriveWriteback("preview"));
    }

    const writeDryRun = $("drive-write-dryrun-btn");
    if (writeDryRun) {
      writeDryRun.addEventListener("click", () => runDriveWriteback("dry_run"));
    }

    const writeApply = $("drive-write-apply-btn");
    if (writeApply) {
      writeApply.addEventListener("click", () => runDriveWriteback("apply"));
    }
  });

  window.AIDA_BODY_PROJECTS = {
    render: renderProjectSelector
  };

  window.AIDA_BODY_TAGS = {
    sync: syncCustomTagsFromButtons
  };
})();
