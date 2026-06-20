#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const providerPath = path.join(repoRoot, "AIDA_ONE_SPINE", "spine", "llm_provider.js");

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
      })
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
