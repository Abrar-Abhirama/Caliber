import { useState } from "react";
import ImageModal from "../common/ImageModal.jsx";

export default function SourceDrawer({ source, onClose }) {
  const [showImageModal, setShowImageModal] = useState(false);
  if (!source) return null;

  const handleOpenInNewTab = (e) => {
    e.stopPropagation();
    if (source.image) {
      window.open(source.image, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "440px",
          maxWidth: "92vw",
          background: "var(--panel)",
          borderLeft: "1px solid var(--line)",
          padding: "20px",
          zIndex: 1000,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
          <div>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Document Reference</span>
            <h3 style={{ fontSize: "1.1rem", color: "var(--accent)", margin: "2px 0 0 0", fontFamily: "var(--font-mono)" }}>{source.ref}</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid var(--line)",
              background: "var(--panel2)",
              borderRadius: "6px",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "grid",
              placeItems: "center",
              color: "var(--ink2)",
            }}
            title="Close drawer"
          >
            &times;
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {source.tag && (
            <span style={{ padding: "3px 8px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
              {source.tag}
            </span>
          )}
          {source.status && (
            <span
              style={{
                padding: "3px 8px",
                background: source.status === "Approved" || source.status === "Completed" ? "rgba(44, 117, 73, 0.12)" : "rgba(169, 100, 0, 0.12)",
                color: source.status === "Approved" || source.status === "Completed" ? "var(--ok)" : "var(--warn)",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {source.status}
            </span>
          )}
          {source.revision && (
            <span style={{ padding: "3px 8px", background: "var(--panel2)", color: "var(--muted)", borderRadius: "4px", fontSize: "0.75rem" }}>
              Rev {source.revision}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: "14px" }}>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "3px" }}>Title / Scope</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)", lineHeight: 1.4 }}>{source.title}</div>
          </div>

          {/* Original Drawing / Extracted Image Box */}
          {source.image && (
            <div
              style={{
                background: "var(--panel2)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink2)", textTransform: "uppercase" }}>
                  Original Extracted Drawing
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>PNG File</span>
              </div>

              <div
                onClick={() => setShowImageModal(true)}
                style={{
                  height: "170px",
                  background: "#0f172a",
                  position: "relative",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                title="Click to view high-resolution drawing"
              >
                <img
                  src={source.image}
                  alt={source.title || source.ref}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "#ffffff",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#fff",
                    fontSize: "0.72rem",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>🔍 Enlarge</span>
                </div>
              </div>

              <div style={{ padding: "8px 12px", display: "flex", gap: "8px", background: "var(--panel)" }}>
                <button
                  onClick={() => setShowImageModal(true)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    background: "var(--panel2)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    color: "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  Inspect in Lightbox
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>Open in Browser</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          )}

          {source.text && (
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "6px" }}>Excerpt from Knowledge Base</div>
              <pre
                style={{
                  background: "var(--panel2)",
                  padding: "12px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "var(--ink2)",
                  border: "1px solid var(--line)",
                  fontFamily: "var(--font-sans)",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                {source.text}
              </pre>
            </div>
          )}
        </div>
      </div>

      {showImageModal && (
        <ImageModal
          imageUrl={source.image}
          title={source.title}
          refName={source.ref}
          tag={source.tag}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </>
  );
}

