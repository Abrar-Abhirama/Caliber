import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import PillSelect from "../components/chatbot/PillSelect.jsx";
import ImageModal from "../components/common/ImageModal.jsx";
import UploadPdfModal from "../components/knowledge/UploadPdfModal.jsx";
import { IconArrowUp, IconExternal, IconSearch, IconPlus, IconFilePdf } from "../components/common/icons.jsx";

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

export default function KnowledgePage({ onAskInChat }) {
  const [selectedAsset, setSelectedAsset] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'drawings', 'workorders', 'pdfs'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const performSearch = async (q, asset) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: q || "",
        ...(asset ? { asset } : {}),
        // Browsing (no query) must list every record for the asset; a search only needs the top matches.
        limit: q && q.trim() ? "200" : "1000",
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
      return item.kind === "document" && item.sourceFormat !== "pdf";
    }
    if (activeTab === "workorders") {
      return item.kind === "work_order";
    }
    if (activeTab === "pdfs") {
      return item.sourceFormat === "pdf";
    }
    return true;
  });

  const pdfCount = results.filter((i) => i.sourceFormat === "pdf").length;

  const tabs = [
    { id: "all", label: "All", count: results.length },
    { id: "drawings", label: "Drawings", count: results.filter((i) => i.kind === "document" && i.sourceFormat !== "pdf").length },
    { id: "workorders", label: "Work orders", count: results.filter((i) => i.kind === "work_order").length },
    ...(pdfCount > 0 ? [{ id: "pdfs", label: "PDF Documents", count: pdfCount }] : [{ id: "pdfs", label: "PDFs", count: 0 }]),
  ];

  return (
    <div className="kb">
      <div style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%" }}>
        <form className="kb-toolbar" style={{ flex: 1, margin: 0 }} onSubmit={handleSearchSubmit}>
          <PillSelect
            className="kb-dd"
            placement="down"
            ariaLabel="Asset"
            label={ASSETS.find((a) => a.tag === selectedAsset)?.label || "All Assets"}
            value={selectedAsset}
            onChange={setSelectedAsset}
            items={ASSETS.map((a) => ({ value: a.tag, title: a.label }))}
          />

          <label className="kb-search">
            <IconSearch width={18} height={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${selectedAsset || "all assets"}`}
            />
            <button type="submit" className="send-btn" aria-label="Search" title="Search">
              <IconArrowUp width={16} height={16} />
            </button>
          </label>
        </form>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "0 16px",
            height: "42px",
            background: "var(--p-grad)",
            color: "var(--on-accent)",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            transition: "opacity 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          title="Upload and index a PDF file into the knowledge base"
        >
          <IconPlus width={15} height={15} strokeWidth={2.4} />
          <span>Upload PDF</span>
        </button>
      </div>

      <div className="kb-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`kb-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            <span className="kb-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="kb-empty">Searching…</div>
      ) : filteredResults.length === 0 ? (
        <div className="kb-empty">No results</div>
      ) : (
        <div className="kb-grid">
          {filteredResults.map((item, idx) => (
            <article key={idx} className="kb-card">
              {item.sourceFormat === "pdf" ? (
                <div
                  style={{
                    height: "120px",
                    background: "var(--panel2)",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    color: "var(--muted)",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <IconFilePdf width={24} height={24} />
                  </div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ink2)" }}>PDF Document</span>
                </div>
              ) : item.image ? (
                <button
                  className="kb-thumb"
                  onClick={() => setModalImage({ url: item.image, title: item.title, ref: item.ref, tag: item.tag })}
                  aria-label={`Enlarge ${item.ref}`}
                >
                  <img src={item.image} alt={item.title || item.ref} loading="lazy" />
                </button>
              ) : null}

              <div className="kb-body">
                <div className="kb-meta">
                  <span className="kb-ref">{item.ref}</span>
                  {item.sourceFormat === "pdf" && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(239, 68, 68, 0.15)",
                        color: "#ef4444",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                      }}
                    >
                      PDF
                    </span>
                  )}
                  {item.docType && item.sourceFormat === "pdf" && (
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{item.docType}</span>
                  )}
                  {item.status && <span>{item.status}</span>}
                </div>
                <div className="kb-title">{item.title}</div>
              </div>

              <div className="kb-actions">
                {item.pdfUrl ? (
                  <button
                    className="kb-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.pdfUrl, "_blank", "noopener,noreferrer");
                    }}
                    title="Open original PDF document in a new tab"
                  >
                    View PDF
                    <IconExternal width={13} height={13} />
                  </button>
                ) : item.image ? (
                  <button
                    className="kb-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.image, "_blank", "noopener,noreferrer");
                    }}
                    title="Open image in a new tab"
                  >
                    Open tab
                    <IconExternal width={14} height={14} />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <SourceDrawer source={selectedDoc} onClose={() => setSelectedDoc(null)} />

      {modalImage && (
        <ImageModal
          imageUrl={modalImage.url}
          title={modalImage.title}
          refName={modalImage.ref}
          tag={modalImage.tag}
          onClose={() => setModalImage(null)}
        />
      )}

      <UploadPdfModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => {
          performSearch(query, selectedAsset);
        }}
        onAskInChat={onAskInChat}
      />
    </div>
  );
}

