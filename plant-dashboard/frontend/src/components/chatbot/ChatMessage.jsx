import { useState } from "react";
import ImageModal from "../common/ImageModal.jsx";

export default function ChatMessage({ message, onSelectSource }) {
  const [modalImage, setModalImage] = useState(null);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "12px 12px 2px 12px",
            background: "var(--accent)",
            color: "#fff",
            fontSize: "0.95rem",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  // Helper to render formatted Markdown (paragraphs, bullet lists, bolding, code, and clickable citation pills)
  const renderFormattedContent = (text) => {
    if (!text) return null;

    // Render inline formatting: citations [REF], bold **bold**, code `code`
    const renderInline = (str, keyPrefix = "") => {
      const citationParts = str.split(/(\[[A-Za-z0-9#\-]+\])/g);

      return citationParts.map((part, ci) => {
        const match = part.match(/^\[([A-Za-z0-9#\-]+)\]$/);
        if (match) {
          const ref = match[1];
          const srcObj = message.sources?.find((s) => s.ref === ref) || { ref, title: ref };
          return (
            <button
              key={`${keyPrefix}-cit-${ci}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSource && onSelectSource(srcObj);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--accent-soft, rgba(2, 132, 199, 0.12))",
                color: "var(--accent, #0284c7)",
                border: "1px solid rgba(2, 132, 199, 0.35)",
                borderRadius: "4px",
                padding: "1px 6px",
                margin: "0 3px",
                fontSize: "0.78rem",
                fontWeight: 600,
                fontFamily: "var(--font-mono, monospace)",
                cursor: "pointer",
                verticalAlign: "middle",
                whiteSpace: "nowrap",
              }}
              title={`View source details for ${ref}`}
            >
              {ref}
            </button>
          );
        }

        const inlineParts = part.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return inlineParts.map((sub, si) => {
          if (sub.startsWith("**") && sub.endsWith("**") && sub.length >= 4) {
            return (
              <strong key={`${keyPrefix}-b-${ci}-${si}`} style={{ fontWeight: 700, color: "var(--ink)" }}>
                {sub.slice(2, -2)}
              </strong>
            );
          }
          if (sub.startsWith("`") && sub.endsWith("`") && sub.length >= 2) {
            return (
              <code
                key={`${keyPrefix}-c-${ci}-${si}`}
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  background: "var(--panel2, rgba(255,255,255,0.06))",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  fontSize: "0.85em",
                  color: "var(--accent)",
                }}
              >
                {sub.slice(1, -1)}
              </code>
            );
          }
          return <span key={`${keyPrefix}-t-${ci}-${si}`}>{sub}</span>;
        });
      });
    };

    // Group lines into paragraphs, unordered lists, and ordered lists
    const rawLines = text.split("\n");
    const blocks = [];
    let currentList = null;

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
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

      // Normal paragraph line
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: "p", text: trimmed });
    }

    if (currentList) {
      blocks.push(currentList);
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.96rem", lineHeight: 1.65, color: "var(--ink)" }}>
        {blocks.map((block, bi) => {
          if (block.type === "ul") {
            return (
              <ul key={`b-${bi}`} style={{ margin: "2px 0 6px 0", paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {block.items.map((item, ii) => (
                  <li key={`li-${bi}-${ii}`} style={{ lineHeight: 1.6 }}>
                    {renderInline(item, `ul-${bi}-${ii}`)}
                  </li>
                ))}
              </ul>
            );
          }
          if (block.type === "ol") {
            return (
              <ol key={`b-${bi}`} style={{ margin: "2px 0 6px 0", paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {block.items.map((item, ii) => (
                  <li key={`li-${bi}-${ii}`} style={{ lineHeight: 1.6 }}>
                    {renderInline(item, `ol-${bi}-${ii}`)}
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <p key={`b-${bi}`} style={{ margin: 0, lineHeight: 1.65 }}>
              {renderInline(block.text, `p-${bi}`)}
            </p>
          );
        })}
      </div>
    );
  };

  const confColor =
    message.confidence >= 80 ? "var(--ok)" : message.confidence >= 55 ? "var(--warn)" : "var(--crit)";

  // Collect unique images from cited/grounded sources
  const uniqueImages = [];
  const seenUrls = new Set();
  (message.sources || []).forEach((s) => {
    if (s.image && !seenUrls.has(s.image)) {
      seenUrls.add(s.image);
      uniqueImages.push(s);
    }
  });

  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "92%", width: "100%" }}>
      <div
        style={{
          padding: "18px 20px",
          borderRadius: "12px 12px 12px 2px",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          display: "grid",
          gap: "14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header / Mode */}
        {message.mode && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
              {message.mode}
            </span>
          </div>
        )}

        {/* Natural Language Answer Body */}
        <div>
          {renderFormattedContent(message.answer)}
        </div>

        {/* Recommended Action Steps */}
        {message.steps && message.steps.length > 0 && (
          <div style={{ background: "var(--panel2)", padding: "14px 18px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink2)", marginBottom: "8px", textTransform: "uppercase" }}>
              Recommended Operational Steps:
            </div>
            <ol style={{ paddingLeft: "20px", fontSize: "0.92rem", display: "grid", gap: "8px", color: "var(--ink)" }}>
              {message.steps.map((step, idx) => (
                <li key={idx}>{renderFormattedContent(step)}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Cautions Alert */}
        {message.cautions && message.cautions.length > 0 && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(231, 166, 70, 0.12)",
              borderLeft: "4px solid var(--warn)",
              borderRadius: "4px",
              fontSize: "0.88rem",
              color: "var(--warn)",
              display: "grid",
              gap: "4px",
            }}
          >
            <b>Safety & Operating Caution:</b>
            {message.cautions.map((c, i) => (
              <div key={i}>{c}</div>
            ))}
          </div>
        )}

        {/* Confidence Meter */}
        {message.confidence != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.82rem", color: "var(--muted)" }}>
            <span>Grounding Confidence: <b>{message.confidence}%</b></span>
            <div style={{ flex: 1, height: "6px", background: "var(--line)", borderRadius: "3px", overflow: "hidden", maxWidth: "160px" }}>
              <div style={{ width: `${message.confidence}%`, height: "100%", background: confColor }} />
            </div>
          </div>
        )}

        {/* Attached Original Engineering Drawings & Extracted Sheets Gallery */}
        {uniqueImages.length > 0 && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", marginTop: "2px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.95rem" }}>📐</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Attached Source Drawings & Sheets ({uniqueImages.length})
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                Extracted from engineering repository
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
              {uniqueImages.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--panel2)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setModalImage({ url: s.image, title: s.title, ref: s.ref, tag: s.tag })}
                    style={{
                      height: "120px",
                      background: "#0f172a",
                      position: "relative",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      borderBottom: "1px solid var(--line)",
                    }}
                    title="Click to view drawing in lightbox"
                  >
                    <img
                      src={s.image}
                      alt={s.title || s.ref}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#ffffff",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "6px",
                        left: "6px",
                        background: "rgba(15, 23, 42, 0.88)",
                        color: "#fff",
                        fontSize: "0.68rem",
                        fontFamily: "var(--font-mono)",
                        padding: "2px 5px",
                        borderRadius: "3px",
                        fontWeight: 600,
                      }}
                    >
                      {s.ref}
                    </div>
                    {s.isAssetDrawing && (
                      <div
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "rgba(2, 132, 199, 0.9)",
                          color: "#fff",
                          fontSize: "0.62rem",
                          padding: "2px 5px",
                          borderRadius: "3px",
                          fontWeight: 600,
                        }}
                      >
                        Asset GA
                      </div>
                    )}
                  </div>

                  {/* Caption & Actions */}
                  <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px", flex: 1, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, maxHeight: "2.6em", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.title}
                      </div>
                      {s.tag && (
                        <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                          {s.tag}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                      <button
                        onClick={() => setModalImage({ url: s.image, title: s.title, ref: s.ref, tag: s.tag })}
                        style={{
                          flex: 1,
                          padding: "4px 6px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: "var(--panel)",
                          border: "1px solid var(--line)",
                          borderRadius: "4px",
                          color: "var(--ink2)",
                          cursor: "pointer",
                        }}
                      >
                        Inspect 🔍
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(s.image, "_blank", "noopener,noreferrer");
                        }}
                        title="Open image file in a new browser tab"
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: "var(--accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>Open</span>
                        <span>↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Image Modal Lightbox */}
      {modalImage && (
        <ImageModal
          imageUrl={modalImage.url}
          title={modalImage.title}
          refName={modalImage.ref}
          tag={modalImage.tag}
          onClose={() => setModalImage(null)}
        />
      )}
    </div>
  );
}

