const API_BASE = "/api";

export const api = {
  // Chat & Q&A
  async askQuestion(question, assetContext) {
    const res = await fetch(`${API_BASE}/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, assetContext }),
    });
    if (!res.ok) throw new Error("Failed to query AI service");
    return res.json();
  },

  // Knowledge Base
  async searchKnowledge(query, asset) {
    const params = new URLSearchParams({ q: query, ...(asset ? { asset } : {}) });
    const res = await fetch(`${API_BASE}/knowledge/search?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to search knowledge base");
    return res.json();
  },

  async getDocument(docId) {
    const res = await fetch(`${API_BASE}/knowledge/doc/${docId}`);
    if (!res.ok) throw new Error(`Failed to fetch document ${docId}`);
    return res.json();
  },
};
