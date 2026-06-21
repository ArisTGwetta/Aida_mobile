const fs = require("fs");
const path = require("path");
const vm = require("vm");

const runtime = {
  boot: { mindReady: false },
  drive: { files: {}, fileIndex: {}, folderId: "smoke_folder" },
  driveWriteback: { operations: [], history: [] },
  tokens: {
    drive: { accessToken: "smoke_drive_token" },
    openai: { key: null, fragments: null },
    llm: { provider: "openai", profile: "normal", model: "gpt-4.1-mini", fragments: null }
  },
  mind: {
    projects: {},
    realms: {
      "realm_rpg.json": {
        name: "RPG",
        role: "role_co_narrator.json"
      }
    },
    roles: {
      "role_co_narrator.json": {
        role_name: "co_narrator"
      }
    },
    projectLedger: {},
    realm: {
      name: "RPG"
    },
    role: {
      role_name: "co_narrator"
    },
    facts: {},
    memory: {}
  },
  context: {
    realm: {
      name: "RPG"
    },
    role: {
      role_name: "co_narrator"
    },
    projectName: "realm_rpg.json",
    memoryWindow: {}
  },
  session: {
    currentTurns: [],
    exchangeCount: 0
  },
  sleep: {},
  curator: {}
};

let uploadedContent = null;
const window = {
  AIDA_RUNTIME: runtime,
  AIDA_CONFIG: { drive: { jsonFolderId: "smoke_folder" } },
  AIDA_MODULES: {
    registry: {},
    register(module) {
      this.registry[module.id] = module;
    }
  },
  AIDA_LLM_MESSAGES: {
    build() {
      return { blocked: true };
    }
  },
  AIDA_BIOS: { log() {} },
  dispatchEvent() {}
};

const context = {
  window,
  console,
  document: { addEventListener() {}, getElementById() { return null; } },
  fetch: async (url, options = {}) => {
    if (!String(url).includes("upload/drive/v3/files")) {
      throw new Error(`Unexpected fetch URL: ${url}`);
    }
    const marker = "Content-Type: application/json\r\n\r\n";
    const parts = String(options.body || "").split(marker);
    uploadedContent = JSON.parse(parts[1].split("\r\n--")[0]);
    return {
      ok: true,
      json: async () => ({
        id: "drive_project_smoke",
        name: created.fileName,
        mimeType: "application/json",
        modifiedTime: "2026-06-21T15:00:00.000Z"
      })
    };
  },
  CustomEvent: function CustomEvent(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};
vm.createContext(context);

const sourcePath = path.resolve(__dirname, "../../AIDA_ONE_SPINE/spine/project_context.js");
const writebackPath = path.resolve(__dirname, "../../AIDA_ONE_SPINE/spine/drive_writeback.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, {
  filename: sourcePath
});

const created = window.AIDA_PROJECTS.createDraft("Serana - The Mysterious Door");
if (!created.created) throw new Error("Project draft was not created.");
if (created.fileName !== "project_briefcase_serana_the_mysterious_door.json") {
  throw new Error(`Unexpected filename: ${created.fileName}`);
}
if (runtime.context.projectMode !== "new_project_draft") {
  throw new Error(`Unexpected project mode: ${runtime.context.projectMode}`);
}
if (runtime.context.project?.realm !== "RPG") {
  throw new Error(`Project did not inherit RPG realm: ${runtime.context.project?.realm}`);
}
if (runtime.context.role?.role_name !== "co_narrator") {
  throw new Error("Project did not resolve the co-narrator role.");
}
if (runtime.context.newProjectDraft?.privacy !== "private_candidate") {
  throw new Error("Project was not flagged as a private candidate.");
}

const reopened = window.AIDA_PROJECTS.createDraft("Serana - The Mysterious Door");
if (reopened.created) throw new Error("Duplicate project command created a second project.");

window.AIDA_CURATOR = {
  getReviewed() {
    return {
      lastReviewedPacketId: "sleep_project_smoke",
      diaryWriteDrafts: [],
      projectListingDrafts: [],
      factWriteDrafts: [],
      insightWriteDrafts: [],
      sensitiveContextWriteDrafts: [],
      salutationSignalWriteDrafts: [],
      rawLogWriteDrafts: [],
      processingBacklogWriteDrafts: [],
      projectBriefcaseWriteDrafts: [
        {
          id: "project_persistence_smoke",
          packetId: "sleep_project_smoke",
          source: "llm",
          method: "llm_refined_draft",
          fileName: created.fileName,
          initialProject: created.project,
          project: {
            name: created.project.name,
            realm: created.project.realm,
            file: created.fileName
          },
          llm_provider: "openai",
          llm_profile: "normal",
          llm_model: "gpt-4.1-mini",
          llm_scope: "openai",
          update: {
            latest_summary: "Serana and Francisco reached the mysterious door.",
            latest_status: "The ancient door was unexpectedly open.",
            open_threads: ["What opened the door?"],
            facts_to_consider: [],
            insights_to_consider: [],
            sensitive_context_to_consider: [],
            salutation_tone_signals: [],
            emotional_notes: ["curious"],
            last_active: "2026-06-21T15:00:00.000Z"
          }
        }
      ]
    };
  }
};
window.AIDA_DRIVE = {
  listJsonFiles: async () => [],
  mapDriveFilesToMind: () => window.AIDA_PROJECTS.mapDriveFilesToMind(runtime.drive.files, { selectDefault: false })
};
vm.runInContext(fs.readFileSync(writebackPath, "utf8"), context, {
  filename: writebackPath
});

(async () => {
  const applied = await window.AIDA_DRIVE_WRITEBACK.apply({ dryRun: false });
  if (applied.status !== "applied") throw new Error(`Project writeback failed: ${applied.status}`);
  if (!uploadedContent) throw new Error("Project briefcase content was not uploaded.");
  if (uploadedContent.draft?.status !== "persisted") throw new Error("Project draft was not marked persisted.");
  if (uploadedContent.status !== "active") throw new Error("Persisted project was not activated.");
  if (uploadedContent.privacy !== "private_candidate") throw new Error("Project privacy was not preserved.");
  if (uploadedContent.role !== "role_co_narrator.json") throw new Error("Project role was not preserved.");
  if (!uploadedContent.interaction_rules?.rules?.length) throw new Error("Project interaction rules were not preserved.");
  if (uploadedContent.llm_provider !== "openai") throw new Error("Project LLM scope was not preserved.");

  runtime.drive.files = { [created.fileName]: uploadedContent };
  window.AIDA_PROJECTS.mapDriveFilesToMind(runtime.drive.files, { selectDefault: false });
  const durable = runtime.mind.projects[created.fileName];
  if (!durable) throw new Error("Persisted project did not reopen after simulated restart.");

  process.stdout.write(JSON.stringify({
    status: "pass",
    fileName: created.fileName,
    realm: durable.realm,
    role: durable.role,
    mode: runtime.context.projectMode,
    privacy: durable.privacy,
    duplicateReopened: !reopened.created,
    driveStatus: applied.status,
    draftStatus: durable.draft.status,
    llmProvider: durable.llm_provider,
    reopenedAfterRestart: Boolean(durable)
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
