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
    realmLedger: {
      rpg: {
        key: "realm_rpg.json",
        realmKey: "rpg",
        name: "RPG",
        kind: "realm",
        loaded: true,
        fileName: "realm_rpg.json",
        summary: {
          name: "RPG",
          role: "role_co_narrator.json"
        }
      }
    },
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
    projectMode: "realm_context",
    memoryWindow: {}
  },
  session: {
    id: "session_story_smoke",
    currentTurns: [
      {
        turnIndex: 1,
        capturedAt: "2026-06-21T14:00:00.000Z",
        user: { text: "A bard dreams of his frozen true love." },
        aida: { text: "The frozen woman may be his angel and guide." },
        tags: { session_id: "session_story_smoke", project: "rpg", realm: "rpg", llm_provider: "openai", llm_scope: "openai" }
      },
      {
        turnIndex: 2,
        capturedAt: "2026-06-21T14:01:00.000Z",
        user: { text: "He follows her voice across a magical winter." },
        aida: { text: "That gives the story a romantic quest." },
        tags: { session_id: "session_story_smoke", project: "rpg", realm: "rpg", llm_provider: "openai", llm_scope: "openai" }
      },
      {
        turnIndex: 3,
        capturedAt: "2026-06-21T14:02:00.000Z",
        user: { text: "Perhaps she is trapped between love and prophecy." },
        aida: { text: "The bard must decide whether to free or trust his guide." },
        tags: { session_id: "session_story_smoke", project: "rpg", realm: "rpg", llm_provider: "openai", llm_scope: "openai" }
      },
      {
        turnIndex: 4,
        capturedAt: "2026-06-21T14:03:00.000Z",
        user: { text: "A separate Grok-only dragon secret." },
        aida: { text: "This must remain in the Grok history." },
        tags: { session_id: "session_story_smoke", project: "rpg", realm: "rpg", llm_provider: "xai", llm_scope: "xai" }
      }
    ],
    exchangeCount: 4
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
const whileAwayPath = path.resolve(__dirname, "../../AIDA_ONE_SPINE/spine/while_away.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, {
  filename: sourcePath
});

const suggestion = window.AIDA_PROJECTS.suggestUnnamedStory();
if (!suggestion?.text || suggestion.count !== 3) {
  throw new Error("Unnamed story suggestion did not detect sustained generic RPG discussion.");
}

const named = window.AIDA_PROJECTS.consumeUnnamedStoryTitle("Bard and the Frozen Guide");
if (!named?.handled) throw new Error("Natural title reply did not create the pending unnamed story.");
const created = named.created;
if (!created.created) throw new Error("Project draft was not created.");
if (created.fileName !== "project_briefcase_bard_and_the_frozen_guide.json") {
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
const adopted = named.adopted;
if (!adopted.ok || adopted.count !== 3) {
  throw new Error(`Project did not adopt the prior RPG history: ${JSON.stringify(adopted)}`);
}
if (created.project.adopted_history?.length !== 3) {
  throw new Error("Adopted history was not attached to the project payload.");
}
if (created.project.opening_material?.llm_provider !== "openai") {
  throw new Error("Adopted opening material lost its LLM boundary.");
}

const reopened = window.AIDA_PROJECTS.createDraft("Bard and the Frozen Guide");
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
            latest_summary: "The bard chose Liora as the name of his frozen guide.",
            latest_status: "Liora remains a ghostly muse beside the frozen lake.",
            open_threads: ["What awakens Liora from stasis?"],
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
  created.project.realm = "UNFILED";
  runtime.mind.projectLedger[created.fileName].realmKey = "unknown";
  const claimed = await window.AIDA_PROJECTS.claimProject("Bard and the Frozen Guide", "RPG");
  if (!claimed.ok || created.project.realm !== "RPG") {
    throw new Error(`Project realm claim failed: ${JSON.stringify(claimed)}`);
  }
  const rpgGroup = window.AIDA_PROJECTS.hierarchy().find((realm) => realm.realmKey === "rpg");
  if (!rpgGroup?.projects?.some((project) => project.name === "Bard and the Frozen Guide")) {
    throw new Error("Claimed project did not appear beneath the RPG realm.");
  }

  const applied = await window.AIDA_DRIVE_WRITEBACK.apply({ dryRun: false });
  if (applied.status !== "applied") throw new Error(`Project writeback failed: ${applied.status}`);
  if (!uploadedContent) throw new Error("Project briefcase content was not uploaded.");
  if (uploadedContent.draft?.status !== "persisted") throw new Error("Project draft was not marked persisted.");
  if (uploadedContent.status !== "active") throw new Error("Persisted project was not activated.");
  if (uploadedContent.privacy !== "private_candidate") throw new Error("Project privacy was not preserved.");
  if (uploadedContent.role !== "role_co_narrator.json") throw new Error("Project role was not preserved.");
  if (!uploadedContent.interaction_rules?.rules?.length) throw new Error("Project interaction rules were not preserved.");
  if (uploadedContent.llm_provider !== "openai") throw new Error("Project LLM scope was not preserved.");
  if (uploadedContent.adopted_history?.length !== 3) throw new Error("Adopted history did not persist to Drive.");
  if (uploadedContent.opening_material?.source_refs?.length !== 3) throw new Error("Adopted source references did not persist.");

  runtime.drive.files = { [created.fileName]: uploadedContent };
  window.AIDA_PROJECTS.mapDriveFilesToMind(runtime.drive.files, { selectDefault: false });
  const durable = runtime.mind.projects[created.fileName];
  if (!durable) throw new Error("Persisted project did not reopen after simulated restart.");
  const proposedReturn = window.AIDA_PROJECTS.returnContext("openai");
  if (proposedReturn?.projectName !== "Bard and the Frozen Guide") {
    throw new Error(`Wake did not propose the latest OpenAI project: ${JSON.stringify(proposedReturn)}`);
  }
  vm.runInContext(fs.readFileSync(whileAwayPath, "utf8"), context, {
    filename: whileAwayPath
  });
  const returnGreeting = window.AIDA_WHILE_AWAY.buildThought({ gap: { minutes: 180 } });
  if (!returnGreeting.thought.includes("Shall we return to Bard and the Frozen Guide")) {
    throw new Error(`WYWA did not offer the proposed project naturally: ${returnGreeting.thought}`);
  }
  const acceptedReturn = await window.AIDA_PROJECTS.acceptReturnContext();
  if (acceptedReturn?.projectName !== "Bard and the Frozen Guide") {
    throw new Error(`Wake return context could not be accepted: ${JSON.stringify(acceptedReturn)}`);
  }

  process.stdout.write(JSON.stringify({
    status: "pass",
    fileName: created.fileName,
    realm: durable.realm,
    role: durable.role,
    mode: runtime.context.projectMode,
    privacy: durable.privacy,
    duplicateReopened: !reopened.created,
    unnamedSuggestion: suggestion.text,
    adoptedTurns: adopted.count,
    claimedRealm: claimed.realmName,
    driveStatus: applied.status,
    draftStatus: durable.draft.status,
    llmProvider: durable.llm_provider,
    proposedReturnProject: proposedReturn.projectName,
    returnGreeting: returnGreeting.thought,
    acceptedReturnProject: acceptedReturn.projectName,
    reopenedAfterRestart: Boolean(durable)
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
