// Plain-text preview of a message for pinned lists.
export function snippet(msg, max = 90) {
  const raw = msg.role === "user" ? msg.text : msg.answer;
  const text = (raw || "")
    .replace(/\[[A-Za-z0-9#\-]+\]/g, "")
    .replace(/[*`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
