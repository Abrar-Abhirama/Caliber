import { useState } from "react";
import ChatMessage from "./ChatMessage.jsx";

const SUGGESTIONS = [
  "GA-1201A vibration is at 5.3 mm/s and rising. What should I check first?",
  "What seal flush differential pressure is needed before starting GA-1201A?",
  "What are the alignment tolerances for GA-1201A?",
  "At what O2 level does YD-2301 trip?",
];

const ASSETS = [
  { tag: "", label: "All Assets (Auto-detect)" },
  { tag: "GA-1201A", label: "GA-1201A (Hexane Feed Pump)" },
  { tag: "YD-2301", label: "YD-2301 (Polymer Dryer)" },
  { tag: "DC-3401A", label: "DC-3401A (Reactor)" },
  { tag: "KC-4501", label: "KC-4501 (Recycle Compressor)" },
  { tag: "EA-5601", label: "EA-5601 (Solvent Heater)" },
  { tag: "LV-6701", label: "LV-6701 (Level Control Valve)" },
  { tag: "CT-7801", label: "CT-7801 (Cooling Tower Fan)" },
  { tag: "FA-8901", label: "FA-8901 (Reflux Accumulator Drum)" },
];

export default function ChatWindow({
  messages,
  loading,
  onSend,
  assetContext,
  setAssetContext,
  onSelectSource,
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input, assetContext || null);
    setInput("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--panel)",
        borderRadius: "8px",
        border: "1px solid var(--line)",
      }}
    >
      {/* Top Bar with Context Selector */}
      <div
        style={{
          padding: "10px 18px",
          background: "var(--panel2)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--muted)", fontWeight: 500 }}>Target Asset:</span>
          <select
            value={assetContext}
            onChange={(e) => setAssetContext(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              color: "var(--ink)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {ASSETS.map((a) => (
              <option key={a.tag} value={a.tag}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
          Grounding: 315 Engineering Docs & 211 Work Orders
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          padding: "24px",
          overflowY: "auto",
          display: "grid",
          gap: "18px",
          alignContent: "start",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              marginTop: "48px",
              display: "grid",
              gap: "16px",
              maxWidth: "680px",
              margin: "48px auto 0",
            }}
          >
            <h2 style={{ color: "var(--ink)", fontSize: "1.4rem" }}>
              Plant Operations AI Assistant
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Ask any question about standard operating procedures (OPLs), safety interlock matrices,
              bills of materials, past failure work orders, or labor costs.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
                marginTop: "12px",
              }}
            >
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSend(s, assetContext || null)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "18px",
                    border: "1px solid var(--line)",
                    background: "var(--panel2)",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    transition: "all 0.15s ease",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} onSelectSource={onSelectSource} />
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--accent)",
              fontSize: "0.9rem",
              padding: "12px 0",
            }}
          >
            <span style={{ animation: "spin 1s infinite linear" }}>⚙️</span>
            <span>Searching 2,022 passages & synthesizing answer with Gemini...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: "12px",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            assetContext
              ? `Ask about ${assetContext}, trip limits, or procedures...`
              : "Ask about any equipment, setpoints, procedures, or work orders..."
          }
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            background: "var(--bg)",
            color: "var(--ink)",
            fontSize: "0.95rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 24px",
            background: loading || !input.trim() ? "var(--muted)" : "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            transition: "background 0.15s ease",
          }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
