import { useState } from "react";
import { IconAlert, IconCheck, IconCopy, IconLogo, IconPin } from "../common/icons.jsx";

// Render inline formatting: citations [REF], bold **bold**, code `code`
function renderInline(str, keyPrefix, sources, onSelectSource) {
  const citationParts = str.split(/(\[[A-Za-z0-9#\-]+\])/g);

  return citationParts.map((part, ci) => {
    const match = part.match(/^\[([A-Za-z0-9#\-]+)\]$/);
    if (match) {
      const ref = match[1];
      const srcObj = sources?.find((s) => s.ref === ref) || { ref, title: ref };
      return (
        <button
          key={`${keyPrefix}-cit-${ci}`}
          className="citation"
          onClick={(e) => {
            e.stopPropagation();
            onSelectSource && onSelectSource(srcObj);
          }}
          title={`View source details for ${ref}`}
        >
          {ref}
        </button>
      );
    }

    // Commas between back-to-back citations: drop them so the tags sit side by side.
    const isCitation = (x) => x && /^\[[A-Za-z0-9#\-]+\]$/.test(x);
    if (/^[\s,;]+$/.test(part) && isCitation(citationParts[ci - 1]) && isCitation(citationParts[ci + 1])) {
      return null;
    }

    const inlineParts = part.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return inlineParts.map((sub, si) => {
      if (sub.startsWith("**") && sub.endsWith("**") && sub.length >= 4) {
        return <strong key={`${keyPrefix}-b-${ci}-${si}`}>{sub.slice(2, -2)}</strong>;
      }
      if (sub.startsWith("`") && sub.endsWith("`") && sub.length >= 2) {
        return <code key={`${keyPrefix}-c-${ci}-${si}`}>{sub.slice(1, -1)}</code>;
      }
      return <span key={`${keyPrefix}-t-${ci}-${si}`}>{sub}</span>;
    });
  });
}

// Group lines into paragraphs, unordered lists, and ordered lists
export function Markdown({ text, sources, onSelectSource }) {
  if (!text) return null;

  const blocks = [];
  let currentList = null;

  for (const rawLine of text.split("\n")) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      continue;
    }

    // Bullet list match: "- ", "* ", "• "
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list match: "1. ", "2. ", etc.
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[1]);
      continue;
    }

    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    // Heading match: "# ", "## ", "### " ...
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: "h3", text: headingMatch[1] });
      continue;
    }

    blocks.push({ type: "p", text: trimmed });
  }

  if (currentList) blocks.push(currentList);

  return (
    <div className="md">
      {blocks.map((block, bi) => {
        if (block.type === "h3") {
          return <h3 key={`b-${bi}`}>{renderInline(block.text, `h-${bi}`, sources, onSelectSource)}</h3>;
        }
        if (block.type === "p") {
          return <p key={`b-${bi}`}>{renderInline(block.text, `p-${bi}`, sources, onSelectSource)}</p>;
        }
        const List = block.type;
        return (
          <List key={`b-${bi}`}>
            {block.items.map((item, ii) => (
              <li key={`li-${bi}-${ii}`}>{renderInline(item, `${List}-${bi}-${ii}`, sources, onSelectSource)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

// Which model really answered; older saved messages have no `model` field and show nothing.
export function ModelLabel({ message }) {
  if (message.error || (message.model === undefined && message.fallback === undefined)) return null;
  const text = message.model
    ? `Answered by ${message.model}${message.fallback ? " · fallback" : ""}`
    : "No model answered · offline fallback";
  return (
    <span className="model-label" title={message.fallbackReason || undefined}>
      {text}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context); nothing to do.
    }
  };

  return (
    <button className="icon-btn sm" onClick={copy} aria-label={copied ? "Copied" : "Copy answer"} title={copied ? "Copied" : "Copy"}>
      {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
    </button>
  );
}

function PinButton({ pinned, onToggle }) {
  return (
    <button
      type="button"
      className={`icon-btn sm pin-btn ${pinned ? "is-pinned" : ""}`}
      onClick={onToggle}
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin message" : "Pin message"}
      title={pinned ? "Unpin" : "Pin"}
    >
      <IconPin width={16} height={16} />
    </button>
  );
}

export default function ChatMessage({ id, message, flash, onSelectSource, onTogglePin }) {
  const stateClass = `${message.pinned ? "pinned" : ""} ${flash ? "flash" : ""}`;

  if (message.role === "user") {
    return (
      <div id={id} className={`msg msg-user-row ${stateClass}`}>
        <PinButton pinned={!!message.pinned} onToggle={onTogglePin} />
        <div className="msg-user">{message.text}</div>
      </div>
    );
  }

  const sources = message.sources;

  const confColor =
    message.confidence >= 80 ? "var(--ok)" : message.confidence >= 55 ? "var(--warn)" : "var(--crit)";

  const copyText = [
    message.answer,
    message.steps?.length ? message.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") : "",
    message.cautions?.length ? `Caution: ${message.cautions.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div id={id} className={`msg msg-assistant ${stateClass}`}>
      <div className="msg-avatar">
        <IconLogo width={18} height={18} />
      </div>

      <div className="msg-body">
        {message.error ? (
          <div className="msg-error" role="alert">
            <IconAlert width={18} height={18} />
            <span>{message.answer}</span>
          </div>
        ) : (
          <Markdown text={message.answer} sources={sources} onSelectSource={onSelectSource} />
        )}

        {message.steps && message.steps.length > 0 && (
          <section className="msg-steps">
            <h4>Recommended steps</h4>
            <ol>
              {message.steps.map((step, idx) => (
                <li key={idx}>
                  <Markdown text={step} sources={sources} onSelectSource={onSelectSource} />
                </li>
              ))}
            </ol>
          </section>
        )}

        {message.cautions && message.cautions.length > 0 && (
          <aside className="msg-caution" role="note">
            <IconAlert width={20} height={20} />
            <div>
              <strong>Safety &amp; operating caution</strong>
              {message.cautions.map((c, i) => (
                <p key={i}>{c}</p>
              ))}
            </div>
          </aside>
        )}

        {!message.error && (
          <div className="msg-actions">
            <CopyButton text={copyText} />
            <PinButton pinned={!!message.pinned} onToggle={onTogglePin} />
            {message.confidence != null && (
              <span className="confidence" title="Grounding confidence">
                <span className="conf-dot" style={{ background: confColor }} />
                {message.confidence}% grounded
              </span>
            )}
            <ModelLabel message={message} />
          </div>
        )}
      </div>

    </div>
  );
}
