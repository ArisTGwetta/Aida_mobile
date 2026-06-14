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
      maxOutputTokens: 700,
      sleepMaxOutputTokens: 3200
    }
  };
})();
