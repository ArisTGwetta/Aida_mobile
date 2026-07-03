/*
  Copy this file to:

    spine/token_fragments.local.js

  Then fill in your private OpenAI key fragments.

  Do not commit the real local file. It is ignored by .gitignore.

  The keypad ignores zeros for assembly, so a visible sequence like:

    1 0 0 8 0 3

  assembles fragments 1, 8, and 3 in that order.
*/

window.AIDA_TOKEN_FRAGMENTS = {
  openai: {
    prefix: "sk-proj-",
    segments: {
      "1": "fragment-for-1",
      "2": "fragment-for-2",
      "3": "fragment-for-3",
      "4": "fragment-for-4",
      "5": "fragment-for-5",
      "6": "fragment-for-6",
      "7": "fragment-for-7",
      "8": "fragment-for-8",
      "9": "fragment-for-9"
    }
  }
};
