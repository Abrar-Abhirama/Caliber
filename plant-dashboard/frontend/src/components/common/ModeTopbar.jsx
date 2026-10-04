import BrandLogo from "./BrandLogo.jsx";
import { IconNewChat, IconSidebar } from "./icons.jsx";

// Top bar for the Inspect and Reliability modes: sidebar / new chat buttons, brand, and the centered mode toggle.
export default function ModeTopbar({ sidebarOpen, onOpenSidebar, onNewChat, modeToggle }) {
  return (
    <header className="topbar has-toggle">
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
    </header>
  );
}
