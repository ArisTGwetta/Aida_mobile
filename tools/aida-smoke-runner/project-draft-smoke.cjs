const fs = require("fs");
const path = require("path");
const vm = require("vm");

const runtime = {
  boot: { mindReady: false },
  drive: { files: {}, fileIndex: {} },
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
  sleep: {}
};

const window = {
  AIDA_RUNTIME: runtime,
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
  dispatchEvent() {}
};

const context = {
  window,
  console,
  CustomEvent: function CustomEvent(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};
vm.createContext(context);

const sourcePath = path.resolve(__dirname, "../../AIDA_ONE_SPINE/spine/project_context.js");
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

process.stdout.write(JSON.stringify({
  status: "pass",
  fileName: created.fileName,
  realm: runtime.context.project.realm,
  role: runtime.context.role.role_name,
  mode: runtime.context.projectMode,
  privacy: runtime.context.newProjectDraft.privacy,
  duplicateReopened: !reopened.created
}, null, 2));
