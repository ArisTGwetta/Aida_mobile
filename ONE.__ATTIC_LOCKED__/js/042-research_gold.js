// AIDA REVIEW BLOCK 1: File header - ONE\js\042-research_gold.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
/* 042-research_gold.js
   THE RESEARCH HUB: SEMANTIC SEARCH & MIND PALACE
*/

// AIDA REVIEW BLOCK 3: Browser export research_hub - exposes this organ to the page runtime.
window.research_hub = (function() {
    let index = null;
    let snippets = [];

    // --- 1. THE LIBRARIAN'S TOOLS (Internal) ---
// AIDA REVIEW BLOCK 4: Function loadIndex - callable behavior in this runtime organ.
    async function loadIndex() {
        if (index) return index;
        index = await logistics_hub.drive.downloadJSON_By_Name("crawler_output.json");
        snippets = index.log_snippets.snippets || [];
        return index;
    }

    const math = {
        cosine: (a, b) => {
            let dot = 0, na = 0, nb = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
            }
            return dot / (Math.sqrt(na) * Math.sqrt(nb));
        }
    };

    // --- 2. THE SEARCH ENGINES ---
    return {
        // Keyword + Tag + Metadata
        queryStandard: async (q) => {
            await loadIndex();
            const term = q.toLowerCase();
            return snippets.filter(s => 
                s.text.toLowerCase().includes(term) || 
                s.realm.toLowerCase().includes(term)
            );
        },

        // OpenAI Vector Search
        querySemantic: async (text, topK = 15) => {
            await loadIndex();
            const apiKey = token_keeper.getOpenAIKey();
            
            // Get vector from OpenAI
            const resp = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ model: "text-embedding-3-small", input: text })
            });
            const { data } = await resp.json();
            const qVec = data[0].embedding;

            // Score and Sort
            const vectors = index.indexes.semantic_index.vectors;
            return Object.entries(vectors)
                .map(([id, vec]) => ({ id, score: math.cosine(qVec, vec) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK)
                .map(item => snippets.find(s => s.id === item.id));
        },

        // Context Window (Block 47)
        showContext: async (id, windowSize = 3) => {
            const pos = snippets.findIndex(s => s.id === id);
            return snippets.slice(Math.max(0, pos - windowSize), pos + windowSize + 1);
        }
    };
})();
