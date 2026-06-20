#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const providerPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_provider.js");
const airlockPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "airlock.js");
const bootFlowPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "boot_flow.js");

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function runRoute(provider, route, expected) {
  const requests = [];
  global.document = { addEventListener() {} };
  global.window = {
    AIDA_CONFIG: {
      llm: {
        model: "gpt-4.1-mini",
        maxOutputTokens: 700,
        providers: {
          openai: { model: "gpt-4.1-mini" },
          xai: { model: "grok-4.3" },
          ollama: { model: "llama3:latest", endpoint: "http://127.0.0.1:11434/v1/responses" }
        }
      }
    },
    AIDA_RUNTIME: {
      tokens: { llm: { provider, profile: "smoke", ...route } },
      context: {}
    },
    AIDA_MODULES: { register() {} }
  };
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return {
      ok: true,
      json: async () => ({
        id: `response_${provider}`,
        output: [{ content: [{ type: "output_text", text: `${provider} says hello` }] }]
      })
    };
  };

  Function(fs.readFileSync(providerPath, "utf8"))();
  const text = await global.window.AIDA_LLM_PROVIDER.callMessages([
    { role: "user", content: "Hello" }
  ]);
  const request = requests[0];

  assert(text === `${provider} says hello`, `${provider} output was not extracted.`, text);
  assert(request.url === expected.endpoint, `${provider} endpoint was incorrect.`, request);
  assert(request.body.model === expected.model, `${provider} model was incorrect.`, request.body);
  assert(Boolean(request.options.headers.Authorization) === expected.hasAuth, `${provider} authorization behavior was incorrect.`, request.options.headers);
  assert(global.window.AIDA_RUNTIME.context.lastLlmResponse.provider === expected.normalizedProvider, `${provider} response metadata was incorrect.`);

  return {
    provider,
    endpoint: request.url,
    model: request.body.model,
    hasAuthorization: Boolean(request.options.headers.Authorization)
  };
}

function makeStorage(values = {}) {
  const entries = new Map(Object.entries(values));
  return {
    getItem: (key) => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key)
  };
}

function runCredentialClearTest() {
  const sessionStorage = makeStorage({
    aida_active_key: "secret-test-key",
    aida_active_route: JSON.stringify({ provider: "xai", profile: "grok-roleplay", auth: "bearer" })
  });
  const input = { value: "***", dataset: { realPin: "456" } };
  const runtime = {
    boot: { airlockCleared: true, phase: "wake_complete" },
    tokens: {
      openai: { key: null, source: null },
      llm: {
        provider: "xai",
        profile: "grok-roleplay",
        key: "secret-test-key",
        model: "grok-4.3",
        endpoint: null,
        auth: "bearer",
        source: "airlock_route"
      }
    }
  };
  global.document = {
    addEventListener() {},
    getElementById: (id) => id === "scramble-pin" ? input : null,
    querySelectorAll: () => []
  };
  global.window = {
    sessionStorage,
    AIDA_RUNTIME: runtime,
    AIDA_MODULES: { register() {} }
  };
  global.sessionStorage = sessionStorage;

  Function(fs.readFileSync(airlockPath, "utf8"))();
  assert(global.window.AIDA_AIRLOCK?.clearSessionCredentials, "Airlock credential clear API was not installed.");
  global.window.AIDA_AIRLOCK.clearSessionCredentials("sleep_complete");

  assert(sessionStorage.getItem("aida_active_key") === null, "Session key was not removed.");
  assert(sessionStorage.getItem("aida_active_route") === null, "Session route was not removed.");
  assert(runtime.tokens.llm.key === null && runtime.tokens.llm.provider === null, "Runtime LLM credentials were not cleared.", runtime.tokens.llm);
  assert(runtime.boot.airlockCleared === false, "Airlock state remained cleared.");
  assert(input.value === "" && input.dataset.realPin === "", "Keypad input was not cleared.", input);
  return { keyCleared: true, routeCleared: true, runtimeCleared: true, keypadCleared: true };
}

function runOllamaWakeGateSourceTest() {
  const source = fs.readFileSync(bootFlowPath, "utf8");
  assert(
    source.includes("AIDA_LLM_PROVIDER?.readiness?.().pass"),
    "Wake gate is not provider-aware."
  );
  assert(
    !source.includes("rt.boot?.airlockCleared && rt.tokens?.llm?.key"),
    "Wake gate still requires a key and would reject Ollama."
  );
  return { providerAwareReadiness: true, keylessOllamaAllowed: true };
}

async function main() {
  const startedAt = new Date().toISOString();
  try {
    assert(fs.existsSync(providerPath), `Missing provider source: ${providerPath}`);
    const tests = {
      openai: await runRoute("openai", { key: "test-openai-key" }, {
        endpoint: "https://api.openai.com/v1/responses",
        model: "gpt-4.1-mini",
        hasAuth: true,
        normalizedProvider: "openai"
      }),
      xai: await runRoute("xai", { key: "test-xai-key" }, {
        endpoint: "https://api.x.ai/v1/responses",
        model: "grok-4.3",
        hasAuth: true,
        normalizedProvider: "xai"
      }),
      grokAlias: await runRoute("grok", { key: "test-xai-key", model: "grok-4.3" }, {
        endpoint: "https://api.x.ai/v1/responses",
        model: "grok-4.3",
        hasAuth: true,
        normalizedProvider: "xai"
      }),
      ollama: await runRoute("ollama", { auth: "none" }, {
        endpoint: "http://127.0.0.1:11434/v1/responses",
        model: "llama3:latest",
        hasAuth: false,
        normalizedProvider: "ollama"
      }),
      credentialClear: runCredentialClearTest(),
      ollamaWakeGate: runOllamaWakeGateSourceTest()
    };
    console.log(JSON.stringify({
      status: "pass",
      startedAt,
      finishedAt: new Date().toISOString(),
      source: providerPath,
      tests
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "fail",
      startedAt,
      finishedAt: new Date().toISOString(),
      source: providerPath,
      message: error.message,
      details: error.details || null,
      stack: error.stack
    }, null, 2));
    process.exitCode = 1;
  }
}

main();
