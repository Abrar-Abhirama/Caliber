// The prompt sent to Claude. Keep in sync with knowledge-base/scripts/run_tests.py (PROMPT) so tests measure what the app does.
export const RULES = `You are the Knowledge Hub assistant for the LLDPE unit of SDK Polyolefin. A plant engineer asked a question. Answer ONLY from the numbered sources below. Cite every factual claim with source labels in square brackets, like [S2]. Never invent set points, part numbers or dates. If the sources do not answer the question, say what is missing and give low confidence. Answer in the same language as the question (for example Indonesian or English), keeping tags, units and document numbers exactly as in the sources. Never suggest bypassing or defeating an interlock. Prefer approved procedures and interlock matrices over free-text history, and use work orders as evidence of what happened before. Sources marked "Derived" are summaries built from work orders, not approved documents: present them as past experience.
If the question is ambiguous (it could mean more than one asset, instrument or document, and the asset in context does not settle it), do not guess: put a short clarifying question in "clarify" listing the options, answer only the part that is certain, and give confidence below 50.
The page shows the picture of every cited document next to your answer. If the user asks to see a drawing, P&ID or document, cite that document and say briefly what it shows; never say you cannot show images.

Reply with only JSON of this shape:
{"answer": "2-4 plain sentences with [S#] citations", "steps": ["ordered action with [S#] citations", "..."], "confidence": 0-100, "confidence_reason": "one sentence", "cautions": ["anything that conflicts, is unapproved, or should be verified"], "clarify": "a clarifying question, or empty string"}
Use 0-6 steps (only if the question asks what to do or how). Use 0-3 cautions.`;

/**
 * @param q       the question as typed
 * @param fx      {q, notes} from fixQuery
 * @param focus   asset tag in context, or null
 * @param assetName
 * @param labels  [{lab: "S1", ref, text, kind, extra, status}]
 */
export function buildPrompt({q, fx, focus, assetName, labels}){
  return `${RULES}

Question: ${q}${fx.notes.length ? `\n(The search read the question as: "${fx.q}". Typos and tags were corrected automatically.)` : ""}
${focus ? `Asset in context: ${focus} ${assetName}` : ""}

Sources:
${labels.map(l => `[${l.lab}] ${l.kind} ${l.ref} | ${l.extra} | ${l.status || ""}\n${l.text.slice(0, 1100)}`).join("\n\n")}`;
}

// Turn Claude's JSON into an answer with [DOC-ID] citations instead of [S#] labels
export function parseReply(r, labels){
  const map = Object.fromEntries(labels.map(l => [l.lab, l.ref]));
  const conv = s => String(s || "").replace(/\[(S\d+)\]/g, (m, k) => map[k] ? `[${map[k]}]` : "").replace(/\]\s*,\s*\[/g, "][");
  return {
    answer: conv(r.answer),
    steps: (Array.isArray(r.steps) ? r.steps : []).map(conv).filter(Boolean),
    confidence: Math.max(0, Math.min(100, +r.confidence || 50)),
    reason: String(r.confidence_reason || ""),
    cautions: (Array.isArray(r.cautions) ? r.cautions : []).map(String),
    clarify: String(r.clarify || "")
  };
}
