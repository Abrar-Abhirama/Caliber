const API_BASE = "/api";

export const api = {
  // Chat & Q&A
  // `scope` ({ pid, opl }) limits retrieval to one P&ID set in Inspect mode.
  async askQuestion(question, assetContext, model, scope) {
    const res = await fetch(`${API_BASE}/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, assetContext, model, scope }),
    });
    if (!res.ok) throw new Error("Failed to query AI service");
    return res.json();
  },

  async getModels() {
    const res = await fetch(`${API_BASE}/chat/models`);
    if (!res.ok) throw new Error("Failed to load models");
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

  async uploadPdf(formData) {
    const res = await fetch(`${API_BASE}/knowledge/upload-pdf`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to upload and process PDF file.");
    }
    return data;
  },

  // Inspect mode
  async getInspectSets() {
    const res = await fetch(`${API_BASE}/inspect/sets`);
    if (!res.ok) throw new Error("Failed to load P&ID sets");
    return res.json();
  },

  async getInspectSet(pid) {
    const res = await fetch(`${API_BASE}/inspect/sets/${encodeURIComponent(pid)}`);
    if (!res.ok) throw new Error(`Failed to load P&ID set ${pid}`);
    return res.json();
  },

  async getOpl(code) {
    const res = await fetch(`${API_BASE}/inspect/opl/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error(`Failed to load OPL ${code}`);
    return res.json();
  },

  // Reliability dashboard
  // filters: { pid, period, type, crit }; empty values are left out.
  async getReliability(filters = {}) {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const res = await fetch(`${API_BASE}/reliability/overview?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load reliability data");
    return res.json();
  },
};
