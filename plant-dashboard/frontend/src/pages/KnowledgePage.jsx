import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import ImageModal from "../components/common/ImageModal.jsx";

const ASSETS = [
  { tag: "", label: "All Assets" },
  { tag: "GA-1201A", label: "GA-1201A (Hexane Feed Pump)" },
  { tag: "YD-2301", label: "YD-2301 (Polymer Dryer)" },
  { tag: "DC-3401A", label: "DC-3401A (Reactor)" },
  { tag: "KC-4501", label: "KC-4501 (Recycle Compressor)" },
  { tag: "EA-5601", label: "EA-5601 (Solvent Heater)" },
  { tag: "LV-6701", label: "LV-6701 (Level Control Valve)" },
  { tag: "CT-7801", label: "CT-7801 (Cooling Tower Fan)" },
  { tag: "FA-8901", label: "FA-8901 (Reflux Accumulator Drum)" },
];

export default function KnowledgePage() {
  const [selectedAsset, setSelectedAsset] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'drawings', 'workorders'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [modalImage, setModalImage] = useState(null);

  const performSearch = async (q, asset) => {
    setLoading(true);
    try {
      // Call knowledge search with limit=48 to show ample documents
      const params = new URLSearchParams({
        q: q || "",
        ...(asset ? { asset } : {}),
        limit: "48",
      });
      const res = await fetch(`/api/knowledge/search?${params.toString()}`).then((r) => r.json());
      setResults(res.data?.passages || []);
    } catch (err) {
      console.error("Knowledge search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(query, selectedAsset);
  }, [selectedAsset]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(query, selectedAsset);
  };

  // Filter results by tab
  const filteredResults = results.filter((item) => {
    if (activeTab === "drawings") {
      return item.kind === "document" || (!item.isAssetDrawing && !!item.image);
    }
    if (activeTab === "workorders") {
      return item.kind === "work_order";
    }
    return true;
  });

  return (
    <div style={{ padding: "24px 32px", position: "relative", maxWidth: "1440px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      {/* Header & Description */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.5rem", color: "var(--ink)" }}>
              Knowledge Base Documents & Drawing Repository
            </h2>
            <p style={{ color: "var(--muted)", margin: "0", fontSize: "0.92rem", lineHeight: 1.5 }}>
              Browse and search 94 high-resolution engineering drawings (P&IDs, OPL sheets, GA drawings, Interlocks) and 211 maintenance work orders.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", background: "var(--panel2)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              📁 94 Image Sheets Available
            </span>
          </div>
        </div>

        {/* Search Bar & Asset Selector */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              color: "var(--ink)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            {ASSETS.map((a) => (
              <option key={a.tag} value={a.tag}>
                {a.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${selectedAsset || "all assets"} for drawings, OPL procedures, setpoints, or work orders...`}
            style={{
              flex: 1,
              minWidth: "280px",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              color: "var(--ink)",
              fontSize: "0.9rem",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 22px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Search
          </button>
        </form>

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: activeTab === "all" ? "var(--accent)" : "transparent",
              color: activeTab === "all" ? "#fff" : "var(--ink2)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            All Records ({results.length})
          </button>
          <button
            onClick={() => setActiveTab("drawings")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: activeTab === "drawings" ? "var(--accent)" : "transparent",
              color: activeTab === "drawings" ? "#fff" : "var(--ink2)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            📐 Drawings & OPL Sheets ({results.filter((i) => i.kind === "document").length})
          </button>
          <button
            onClick={() => setActiveTab("workorders")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: activeTab === "workorders" ? "var(--accent)" : "transparent",
              color: activeTab === "workorders" ? "#fff" : "var(--ink2)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            📋 Work Orders & Logs ({results.filter((i) => i.kind === "work_order").length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center", fontSize: "0.95rem" }}>
          Searching knowledge base and loading drawing sheets...
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              Showing {filteredResults.length} records for <b>{selectedAsset || "All Assets"}</b>
            </span>
            <span style={{ fontSize: "0.78rem" }}>Tip: Click &quot;Open Tab ↗&quot; on any card to view the raw image in browser</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
            {filteredResults.map((item, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: "10px",
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
              >
                {/* Image Thumbnail Container */}
                {item.image ? (
                  <div
                    onClick={() => setModalImage({ url: item.image, title: item.title, ref: item.ref, tag: item.tag })}
                    style={{
                      height: "150px",
                      background: "#0f172a",
                      position: "relative",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      borderBottom: "1px solid var(--line)",
                    }}
                    title="Click to view drawing in Lightbox"
                  >
                    <img
                      src={item.image}
                      alt={item.title || item.ref}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#ffffff",
                        transition: "transform 0.25s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                    />

                    {/* Top Badges */}
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        background: "rgba(15, 23, 42, 0.9)",
                        color: "#fff",
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono)",
                        padding: "3px 7px",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      {item.ref}
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: item.isAssetDrawing ? "rgba(2, 132, 199, 0.9)" : "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {item.isAssetDrawing ? "Asset GA Drawing" : "Original Sheet"}
                    </div>

                    {/* Quick Enlarge Overlay Tag */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        right: "8px",
                        background: "rgba(15, 23, 42, 0.8)",
                        color: "#fff",
                        fontSize: "0.7rem",
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
                ) : (
                  <div
                    style={{
                      height: "70px",
                      background: "var(--panel2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 16px",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--accent)", fontWeight: 700 }}>
                      {item.ref}
                    </span>
                    <span style={{ fontSize: "0.72rem", background: "var(--panel)", padding: "2px 8px", borderRadius: "4px", color: "var(--muted)" }}>
                      {item.kind}
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1, justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      {item.tag && (
                        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: "3px", fontWeight: 600 }}>
                          {item.tag}
                        </span>
                      )}
                      {item.status && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: item.status === "Approved" || item.status === "Completed" ? "rgba(44, 117, 73, 0.12)" : "rgba(169, 100, 0, 0.12)",
                            color: item.status === "Approved" || item.status === "Completed" ? "var(--ok)" : "var(--warn)",
                            fontWeight: 600,
                          }}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.35, marginBottom: "6px" }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.45 }}>
                      {item.text?.replace(/^Work Order: [^\n]+\n/, "").replace(/^Document: [^\n]+\n/, "")}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: "flex", gap: "8px", paddingTop: "10px", borderTop: "1px solid var(--line)", marginTop: "4px" }}>
                    <button
                      onClick={() => setSelectedDoc(item)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background: "var(--panel2)",
                        border: "1px solid var(--line)",
                        borderRadius: "5px",
                        color: "var(--ink2)",
                        cursor: "pointer",
                      }}
                    >
                      Details &rarr;
                    </button>

                    {item.image && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.image, "_blank", "noopener,noreferrer");
                        }}
                        title="Open image file in a new browser tab"
                        style={{
                          padding: "7px 12px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          background: "var(--accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>Open Tab</span>
                        <span>↗</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Excerpt Details Drawer */}
      <SourceDrawer source={selectedDoc} onClose={() => setSelectedDoc(null)} />

      {/* Fullscreen Image Lightbox Modal */}
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

