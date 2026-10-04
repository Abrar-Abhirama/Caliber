import { useState, useRef } from "react";
import { api } from "../../services/api.js";
import { IconFilePdf, IconUpload, IconCheck, IconAlert } from "../common/icons.jsx";

const ASSET_OPTIONS = [
  { value: "AUTO", label: "✨ Auto-detect from PDF content" },
  { value: "GA-1201A", label: "GA-1201A — Hexane Feed Pump" },
  { value: "YD-2301", label: "YD-2301 — Polymer Dryer" },
  { value: "DC-3401A", label: "DC-3401A — Loop Reactor" },
  { value: "KC-4501", label: "KC-4501 — Recycle Compressor" },
  { value: "EA-5601", label: "EA-5601 — Solvent Heater" },
  { value: "LV-6701", label: "LV-6701 — Level Control Valve" },
  { value: "CT-7801", label: "CT-7801 — Cooling Tower Fan" },
  { value: "FA-8901", label: "FA-8901 — Reflux Accumulator Drum" },
  { value: "PLANT", label: "PLANT — Plant-wide / General Systems" },
];

const DOC_TYPES = [
  "Operating Manual",
  "Datasheet",
  "Inspection Report",
  "SOP / Procedure",
  "Technical Note",
];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function UploadPdfModal({ isOpen, onClose, onUploadSuccess, onAskInChat }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [assetTag, setAssetTag] = useState("AUTO");
  const [docType, setDocType] = useState("Operating Manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF document (.pdf).");
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("File size exceeds 25 MB limit.");
      return;
    }

    setError(null);
    setFile(selectedFile);
    // Suggest a human-readable title from the filename
    const cleanName = selectedFile.name
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    setTitle(cleanName);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file to upload.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("assetTag", assetTag === "AUTO" ? "" : assetTag);
      formData.append("docType", docType);

      const res = await api.uploadPdf(formData);
      setSuccessResult(res.data);
      if (onUploadSuccess) {
        onUploadSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to upload and process PDF file.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle("");
    setAssetTag("AUTO");
    setDocType("Operating Manual");
    setError(null);
    setSuccessResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-menu)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
          <div>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600 }}>
              Knowledge Hub
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              <IconFilePdf width={22} height={22} style={{ color: "#ef4444" }} />
              Add PDF Document to Knowledge
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            style={{
              background: "var(--panel2)",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              fontSize: "1.2rem",
              cursor: "pointer",
              color: "var(--ink2)",
            }}
            title="Close modal"
          >
            &times;
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <IconAlert width={16} height={16} />
            <span>{error}</span>
          </div>
        )}

        {successResult ? (
          /* Success View */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#10b981",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <IconCheck width={18} height={18} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.95rem" }}>
                  PDF Document Indexed Successfully!
                </div>
                <div style={{ color: "var(--ink2)", fontSize: "0.82rem", marginTop: "3px" }}>
                  The document has been parsed and integrated into the plant knowledge base. It is now immediately available for search and AI reasoning.
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--panel2)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "14px",
                fontSize: "0.85rem",
                display: "grid",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Document Reference:</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{successResult.docId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Assigned Asset:</span>
                <span style={{ fontWeight: 500, color: "var(--ink)" }}>{successResult.assetTag}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Pages Parsed:</span>
                <span style={{ color: "var(--ink)" }}>{successResult.pageCount} pages</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Total Search Passages:</span>
                <span style={{ color: "var(--ink)" }}>{successResult.totalPassages} indexed passages</span>
              </div>
              {successResult.snippet && (
                <div style={{ marginTop: "6px", borderTop: "1px solid var(--line)", paddingTop: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "4px" }}>Content Preview:</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink2)", fontStyle: "italic", lineHeight: 1.4 }}>
                    "{successResult.snippet}..."
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "var(--panel2)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontWeight: 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
              {onAskInChat && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onAskInChat(`What are the key points in document ${successResult.docId} (${successResult.title})?`);
                  }}
                  style={{
                    flex: 1.3,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "var(--brand)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                >
                  Ask AI About This Document →
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Upload & Configuration Form */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Drag & drop upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />

            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? "var(--brand)" : "var(--line)"}`,
                  background: dragActive ? "var(--panel2)" : "var(--bg)",
                  borderRadius: "10px",
                  padding: "32px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--panel2)",
                    border: "1px solid var(--line)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--brand)",
                  }}
                >
                  <IconUpload width={24} height={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.95rem" }}>
                    Click to browse or drag & drop PDF here
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px" }}>
                    Supports equipment manuals, technical datasheets, inspection SOPs (up to 25 MB)
                  </div>
                </div>
              </div>
            ) : (
              /* Selected file banner */
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--panel2)",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconFilePdf width={20} height={20} />
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: "var(--ink)",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {formatBytes(file.size)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setTitle("");
                  }}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "4px",
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {/* Document Title */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hexane Feed Pump Mechanical Seal Replacement Manual"
                disabled={loading}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "0.88rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Equipment Asset Tag */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                Equipment Asset Tag
              </label>
              <select
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "0.88rem",
                  boxSizing: "border-box",
                }}
              >
                {ASSET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>
                Select a specific equipment tag or leave as "Auto-detect" to extract from PDF text automatically.
              </div>
            </div>

            {/* Document Type */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "0.88rem",
                  boxSizing: "border-box",
                }}
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "var(--panel2)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontWeight: 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "var(--brand)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: loading || !file ? "not-allowed" : "pointer",
                  opacity: loading || !file ? 0.65 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <span className="thinking-dot" style={{ width: "12px", height: "12px" }} />
                    Extracting & Indexing...
                  </>
                ) : (
                  <>
                    <IconUpload width={16} height={16} />
                    Add to Knowledge Base
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
