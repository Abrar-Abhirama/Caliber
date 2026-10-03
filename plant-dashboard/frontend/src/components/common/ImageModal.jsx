import { useEffect, useState } from "react";

export default function ImageModal({ imageUrl, title, refName, tag, onClose }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleOpenInNewTab = (e) => {
    e.stopPropagation();
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 25, 0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      {/* Top Header Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
          background: "rgba(15, 23, 42, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.9rem",
              background: "var(--accent, #0284c7)",
              color: "#fff",
              padding: "3px 8px",
              borderRadius: "4px",
              fontWeight: 700,
            }}
          >
            {refName || "DOCUMENT"}
          </span>
          {tag && (
            <span
              style={{
                fontSize: "0.8rem",
                background: "rgba(255,255,255,0.12)",
                padding: "2px 8px",
                borderRadius: "4px",
                color: "#e2e8f0",
              }}
            >
              {tag}
            </span>
          )}
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#f8fafc",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title || "Engineering Drawing / Document Sheet"}
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: "6px", padding: "2px" }}>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
              title="Zoom out"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                borderRadius: "4px",
              }}
            >
              -
            </button>
            <span style={{ color: "#cbd5e1", fontSize: "0.8rem", padding: "6px 4px", minWidth: "45px", textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
              title="Zoom in"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                borderRadius: "4px",
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              title="Reset Zoom"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                padding: "6px 8px",
                cursor: "pointer",
                fontSize: "0.75rem",
                borderRadius: "4px",
              }}
            >
              Reset
            </button>
          </div>

          <button
            onClick={handleOpenInNewTab}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              padding: "7px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            <span>Open in Browser</span>
            <span style={{ fontSize: "1rem" }}>↗</span>
          </button>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#cbd5e1",
              width: "34px",
              height: "34px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "grid",
              placeItems: "center",
            }}
            title="Close (Esc)"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
          background: "radial-gradient(#1e293b 1px, #0f172a 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <img
          src={imageUrl}
          alt={title || refName || "Drawing"}
          style={{
            maxWidth: zoom === 1 ? "95%" : "none",
            maxHeight: zoom === 1 ? "85vh" : "none",
            width: zoom !== 1 ? `${zoom * 100}%` : "auto",
            objectFit: "contain",
            borderRadius: "6px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            background: "#ffffff",
            transition: "width 0.15s ease-out",
          }}
        />
      </div>

      {/* Footer Info */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: "10px 24px",
          background: "rgba(15, 23, 42, 0.95)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#94a3b8",
          fontSize: "0.8rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>Original engineering sheet extracted from plant repository documents.</div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>Tip: Click <b>Open in Browser ↗</b> for raw full-resolution print & download</span>
        </div>
      </div>
    </div>
  );
}
