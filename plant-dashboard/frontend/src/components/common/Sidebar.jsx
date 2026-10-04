import { IconBook, IconChat, IconNewChat, IconPin, IconSidebar, IconTrash } from "./icons.jsx";
import { snippet } from "../chatbot/snippet.js";
import BrandLogo from "./BrandLogo.jsx";
import ProfileMenu from "./ProfileMenu.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Sidebar({
  open,
  onToggle,
  view,
  conversations,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  pinned = [],
  onOpenPinned,
  onUnpin,
  onTogglePinChat,
  onOpenKnowledge,
  onClearChats,
}) {
  // Pinned chats move to the Pinned section, like ChatGPT.
  const pinnedChats = conversations.filter((c) => c.pinned);
  const recentChats = conversations.filter((c) => !c.pinned);

  return (
    <aside className="sidebar" inert={!open} aria-label="Sidebar">
      <div className="sidebar-head">
        <span className="sidebar-brand">
          <BrandLogo size={28} />
          <span className="sidebar-brand-name">Brody</span>
        </span>
        <button className="icon-btn" onClick={onToggle} aria-label="Close sidebar" title="Close sidebar">
          <IconSidebar />
        </button>
      </div>

      <nav className="sidebar-nav">
        <button className={`nav-item ${view === "chat" && !activeId ? "active" : ""}`} onClick={onNewChat}>
          <IconNewChat width={20} height={20} />
          New chat
        </button>
        <button className={`nav-item ${view === "knowledge" ? "active" : ""}`} onClick={onOpenKnowledge}>
          <IconBook width={20} height={20} />
          Knowledge Base
        </button>
      </nav>

      <div className="sidebar-section">
        {(pinnedChats.length > 0 || pinned.length > 0) && (
          <>
            <div className="sidebar-label">Pinned</div>
            <ul className="chat-list pinned-list">
              {pinnedChats.map((c) => (
                <li key={c.id} className={`chat-item ${view === "chat" && c.id === activeId ? "active" : ""}`}>
                  <button className="chat-item-btn pinned-item-btn" onClick={() => onSelectChat(c.id)} title={c.title}>
                    <IconChat width={16} height={16} className="chat-icon" />
                    <span className="pinned-item-text">{c.title}</span>
                  </button>
                  <button
                    className="icon-btn sm chat-item-del"
                    onClick={() => onTogglePinChat(c.id)}
                    aria-label={`Unpin chat: ${c.title}`}
                    title="Unpin chat"
                  >
                    <IconPin width={16} height={16} className="unpin-icon" />
                  </button>
                </li>
              ))}
              {pinned.map(({ convId, index, message }) => {
                const text = snippet(message, 80) || "Message";
                return (
                  <li key={`${convId}-${index}`} className="chat-item">
                    <button
                      className="chat-item-btn pinned-item-btn"
                      onClick={() => onOpenPinned(convId, index)}
                      title={text}
                    >
                      <IconPin width={16} height={16} />
                      <span className="pinned-item-text">{text}</span>
                    </button>
                    <button
                      className="icon-btn sm chat-item-del"
                      onClick={() => onUnpin(convId, index)}
                      aria-label={`Unpin: ${text}`}
                      title="Unpin"
                    >
                      <IconPin width={16} height={16} className="unpin-icon" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {recentChats.length > 0 && (
          <div className={`sidebar-label ${pinnedChats.length > 0 || pinned.length > 0 ? "spaced" : ""}`}>Chats</div>
        )}
        {recentChats.length > 0 && (
          <ul className="chat-list">
            {recentChats.map((c) => (
              <li key={c.id} className={`chat-item ${view === "chat" && c.id === activeId ? "active" : ""}`}>
                <button className="chat-item-btn" onClick={() => onSelectChat(c.id)} title={c.title}>
                  {c.title}
                </button>
                <button
                  className="icon-btn sm chat-item-del chat-item-pin"
                  onClick={() => onTogglePinChat(c.id)}
                  aria-label={`Pin chat: ${c.title}`}
                  title="Pin chat"
                >
                  <IconPin width={16} height={16} />
                </button>
                <button
                  className="icon-btn sm chat-item-del"
                  onClick={() => onDeleteChat(c.id)}
                  aria-label={`Delete chat: ${c.title}`}
                  title="Delete chat"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ThemeToggle />
      <ProfileMenu onOpenKnowledge={onOpenKnowledge} onClearChats={onClearChats} hasChats={conversations.length > 0} />
    </aside>
  );
}
