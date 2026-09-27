// Live AI through your own backend (api/ask.js). The API key stays on the server.
export const AI_ENDPOINT = "/api/ask";

// Resolves to a client {json(prompt, {signal})} or null when no backend / no key is configured
export async function connectAI(){
  try {
    const r = await fetch(AI_ENDPOINT, {method: "GET"});
    if (!r.ok || !(await r.json()).ok) return null;
  } catch (e) { return null; }
  return {
    async json(prompt, opts = {}){
      const res = await fetch(AI_ENDPOINT, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({prompt}), signal: opts.signal})
        .catch(e => { throw {code: e.name === "AbortError" ? "cancelled" : "upstream_error"}; });
      if (!res.ok) throw {code: "upstream_error"};
      const data = await res.json();
      const m = data.text.match(/\{[\s\S]*\}/);
      if (!m) throw {code: "invalid_json"};
      return JSON.parse(m[0]);
    }
  };
}
