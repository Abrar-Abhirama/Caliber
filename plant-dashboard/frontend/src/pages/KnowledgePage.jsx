import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import PillSelect from "../components/chatbot/PillSelect.jsx";
import ImageModal from "../components/common/ImageModal.jsx";
import { IconArrowUp, IconExternal, IconSearch } from "../components/common/icons.jsx";

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

  const tabs = [
    { id: "all", label: "All", count: results.length },
    { id: "drawings", label: "Drawings", count: results.filter((i) => i.kind === "document").length },
    { id: "workorders", label: "Work orders", count: results.filter((i) => i.kind === "work_order").length },
  ];

  return (
    <div className="kb">
      <form className="kb-toolbar" onSubmit={handleSearchSubmit}>
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
              {item.image && (
                <button
                  className="kb-thumb"
                  onClick={() => setModalImage({ url: item.image, title: item.title, ref: item.ref, tag: item.tag })}
                  aria-label={`Enlarge ${item.ref}`}
                >
                  <img src={item.image} alt={item.title || item.ref} loading="lazy" />
                </button>
              )}

              <div className="kb-body">
                <div className="kb-meta">
                  <span className="kb-ref">{item.ref}</span>
                  {item.status && <span>{item.status}</span>}
                </div>
                <div className="kb-title">{item.title}</div>
              </div>

              <div className="kb-actions">
                <button className="kb-action" onClick={() => setSelectedDoc(item)}>
                  Details
                </button>
                {item.image && (
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
                )}
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
    </div>
  );
}
