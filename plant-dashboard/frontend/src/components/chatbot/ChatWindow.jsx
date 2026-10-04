import { useCallback, useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage.jsx";
import AssetPicker from "./AssetPicker.jsx";
import ModelPicker from "./ModelPicker.jsx";
import Composer from "./Composer.jsx";
import BrandLogo from "../common/BrandLogo.jsx";
import { useDismiss } from "../common/useDismiss.js";
import { snippet } from "./snippet.js";
import {
  IconActivity,
  IconCheck,
  IconCopy,
  IconGauge,
  IconLogo,
  IconChevronDown,
  IconNewChat,
  IconPin,
  IconRuler,
  IconShield,
  IconSidebar,
} from "../common/icons.jsx";
import { copyToClipboard } from "../../services/clipboard.js";
import { useProfileName } from "../../services/profile.js";

export function formatConversation(messages, { assetContext, model } = {}) {
  const parts = [];
  parts.push("=== Brody Chat Transcript ===");
  parts.push(`Date: ${new Date().toLocaleString()}`);
  if (assetContext) parts.push(`Equipment / Asset: ${assetContext}`);
  if (model) parts.push(`Model: ${model}`);
  parts.push("----------------------------------------\n");

  messages.forEach((msg) => {
    if (msg.role === "user") {
      parts.push(`[User]:`);
      parts.push(msg.text || "");
      parts.push("");
    } else {
      const modelInfo = msg.model ? ` (via ${msg.model})` : "";
      parts.push(`[Brody${modelInfo}]:`);
      if (msg.error) {
        parts.push(`Error: ${msg.answer}`);
      } else {
        if (msg.answer) parts.push(msg.answer);
        if (msg.steps && msg.steps.length > 0) {
          parts.push("\nRecommended steps:");
          msg.steps.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
        }
        if (msg.cautions && msg.cautions.length > 0) {
          parts.push("\nSafety & Operating Caution:");
          msg.cautions.forEach((c) => parts.push(`- ${c}`));
        }
        if (msg.sources && msg.sources.length > 0) {
          parts.push("\nSources cited:");
          msg.sources.forEach((s) => parts.push(`- [${s.ref}] ${s.title || s.ref}`));
        }
      }
      parts.push("\n----------------------------------------\n");
    }
  });

  return parts.join("\n").trim();
}

const SUGGESTIONS = [
  {
    label: "Diagnose vibration",
    Icon: IconActivity,
    prompt: "GA-1201A vibration is at 5.3 mm/s and rising. What should I check first?",
  },
  {
    label: "Start-up checks",
    Icon: IconGauge,
    prompt: "What seal flush differential pressure is needed before starting GA-1201A?",
  },
  {
    label: "Alignment tolerances",
    Icon: IconRuler,
    prompt: "What are the alignment tolerances for GA-1201A?",
  },
  {
    label: "Trip limits",
    Icon: IconShield,
    prompt: "At what O2 level does YD-2301 trip?",
  },
];

export default function ChatWindow({
  messages,
  loading,
  busy,
  onSend,
  assetContext,
  setAssetContext,
  models,
  model,
  setModel,
  onSelectSource,
  onTogglePin,
  jumpRequest,
  sidebarOpen,
  onOpenSidebar,
  onNewChat,
  modeToggle,
}) {
  const profileName = useProfileName();
  const scrollRef = useRef(null);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [flashIndex, setFlashIndex] = useState(null);
  const pinsRef = useRef(null);
  const closePins = useCallback(() => setPinsOpen(false), []);
  useDismiss(pinsRef, pinsOpen, closePins);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  const isEmpty = messages.length === 0;
  const pinned = messages.map((m, i) => ({ m, i })).filter(({ m }) => m.pinned);

  const jumpTo = (i) => {
    setPinsOpen(false);
    document.getElementById(`msg-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlashIndex(i);
    setTimeout(() => setFlashIndex((cur) => (cur === i ? null : cur)), 1600);
  };

  // Jump requested from the sidebar's Pinned list; wait a tick so the chat has rendered
  // and the scroll-to-bottom above doesn't win.
  useEffect(() => {
    if (!jumpRequest) return;
    const t = setTimeout(() => jumpTo(jumpRequest.index), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpRequest]);

  const [copiedChat, setCopiedChat] = useState(false);

  const handleCopyChat = async () => {
    if (!messages.length) return;
    const transcript = formatConversation(messages, { assetContext, model });
    const ok = await copyToClipboard(transcript);
    if (ok) {
      setCopiedChat(true);
      setTimeout(() => setCopiedChat(false), 2000);
    }
  };

  const tools = (
    <>
      <AssetPicker value={assetContext} onChange={setAssetContext} />
      <ModelPicker models={models} value={model} onChange={setModel} />
    </>
  );

  return (
    <div className="chat">
      <header className={`topbar ${modeToggle ? "has-toggle" : ""}`}>
        <div className="topbar-left">
          {!sidebarOpen && (
            <>
              <button className="icon-btn" onClick={onOpenSidebar} aria-label="Open sidebar" title="Open sidebar">
                <IconSidebar />
              </button>
              <button className="icon-btn" onClick={onNewChat} aria-label="New chat" title="New chat">
                <IconNewChat />
              </button>
            </>
          )}
          <span className="topbar-brand">
            <BrandLogo size={22} className="brand-top" />
            <span className="topbar-title">Brody</span>
          </span>
        </div>
        {modeToggle}
        <div className="topbar-right">
          {!isEmpty && (
            <button
              type="button"
              className={`topbar-action-btn ${copiedChat ? "is-copied" : ""}`}
              onClick={handleCopyChat}
              aria-label={copiedChat ? "Chat copied to clipboard" : "Copy entire conversation"}
              title={copiedChat ? "Chat copied to clipboard!" : "Copy entire chat transcript"}
            >
              {copiedChat ? <IconCheck width={15} height={15} /> : <IconCopy width={15} height={15} />}
              <span className="btn-label">{copiedChat ? "Copied Chat!" : "Copy Chat"}</span>
            </button>
          )}
        </div>
      </header>

      {!isEmpty && pinned.length > 0 && (
        <div className="pinbar">
          <div className="pinbar-inner" ref={pinsRef}>
            <button
              type="button"
              className="pinbar-toggle"
              onClick={() => setPinsOpen((o) => !o)}
              aria-expanded={pinsOpen}
            >
              <IconPin width={15} height={15} />
              {pinned.length} pinned
              <IconChevronDown width={13} height={13} className={pinsOpen ? "flip" : ""} />
            </button>
            {pinsOpen && (
              <ul className="pinbar-list">
                {pinned.map(({ m, i }) => (
                  <li key={i} className="pinbar-item">
                    <button type="button" className="pinbar-jump" onClick={() => jumpTo(i)} title="Go to message">
                      <span className="pinbar-who">{m.role === "user" ? "You" : "Assistant"}</span>
                      <span className="pinbar-text">{snippet(m) || "Message"}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn sm pinbar-unpin"
                      onClick={() => onTogglePin(i)}
                      aria-label="Unpin message"
                      title="Unpin"
                    >
                      <IconPin width={15} height={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="chat-empty">
          <div className="chat-empty-head">
            <BrandLogo size={52} className="brand-hero" />
            <h1 className="chat-empty-title">Hi {profileName}, what can I help with?</h1>
          </div>
          <Composer onSend={onSend} disabled={busy} assetContext={assetContext} tools={tools} autoFocus />
          <div className="suggestions">
            {SUGGESTIONS.map(({ label, Icon, prompt }) => (
              <button key={label} className="suggestion" onClick={() => onSend(prompt)} disabled={busy} title={prompt}>
                <Icon width={16} height={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="chat-scroll" ref={scrollRef}>
            <div className="thread">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  id={`msg-${i}`}
                  message={msg}
                  flash={flashIndex === i}
                  onSelectSource={onSelectSource}
                  onTogglePin={() => onTogglePin(i)}
                />
              ))}
              {loading && (
                <div className="msg msg-assistant" aria-live="polite">
                  <div className="msg-avatar">
                    <IconLogo width={18} height={18} />
                  </div>
                  <div className="thinking">
                    <span className="thinking-dot" />
                    <span className="thinking-text">Thinking</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="composer-dock">
            <Composer onSend={onSend} disabled={busy} assetContext={assetContext} tools={tools} />
            <p className="disclaimer">
              Brody can make mistakes. Check critical setpoints against the source.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
