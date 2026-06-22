(function () {
  window.AIDA_CONFIG = {
    google: {
      clientId: "1054257858103-lu77u4rp49svk4q2j52mbta758toafim.apps.googleusercontent.com",
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly"
      ]
    },
    drive: {
      jsonFolderId: "19mkQyJEkgtUUCG4djk7160u7vycvWPja"
    },
    llm: {
      model: "gpt-4.1-mini",
      webSearchModel: "gpt-5.5",
      maxOutputTokens: 700,
      sleepMaxOutputTokens: 3200,
      providers: {
        openai: {
          model: "gpt-4.1-mini"
        },
        xai: {
          model: "grok-4.3"
        },
        ollama: {
          model: "llama3:latest",
          endpoint: "http://127.0.0.1:11434/v1/responses"
        }
      }
    }
  };
})();
