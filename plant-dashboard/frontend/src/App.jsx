import { useState } from "react";
import Sidebar from "./components/common/Sidebar.jsx";
import BrandLogo from "./components/common/BrandLogo.jsx";
import { IconSidebar } from "./components/common/icons.jsx";
import ChatbotPage from "./pages/ChatbotPage.jsx";
import KnowledgePage from "./pages/KnowledgePage.jsx";
import InspectPage from "./pages/InspectPage.jsx";
import ReliabilityPage from "./pages/ReliabilityPage.jsx";
import ModeToggle from "./components/inspect/ModeToggle.jsx";
import { useChat } from "./hooks/useChat.js";

const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

export default function App() {
  const [view, setView] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [jumpRequest, setJumpRequest] = useState(null);
  const chat = useChat();
  const [inspectNav, setInspectNav] = useState({ pid: null, opl: null });
  const [inspectAnswers, setInspectAnswers] = useState([]);
  // Bumped on every Reliability press so the dashboard remounts fresh (filters and sort reset).
  const [reliabilityKey, setReliabilityKey] = useState(0);

  // Pressing Inspect always starts on "Choose a P&ID set", and Reliability on a fresh dashboard.
  const switchMode = (mode) => {
    if (mode === "inspect") {
      setInspectNav({ pid: null, opl: null });
      setInspectAnswers([]);
    }
    if (mode === "reliability") setReliabilityKey((k) => k + 1);
    setView(mode);
  };

  // From Reliability: open an asset's P&ID set (and optionally one of its OPLs) in Inspect.
  const openInspectSet = (pid, opl = null) => {
    setInspectNav({ pid, opl });
    setInspectAnswers([]);
    setView("inspect");
  };

  // "Ask in Chat" from Reliability: ask in a new conversation.
  const askInChat = (question) => {
    setView("chat");
    chat.sendMessage(question, null, undefined, { fresh: true });
  };

  const closeOnMobile = () => {
    if (isMobile()) setSidebarOpen(false);
  };

  const startNewChat = () => {
    chat.newChat();
    setView("chat");
    closeOnMobile();
  };

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        view={view}
        conversations={chat.conversations}
        activeId={chat.activeId}
        onNewChat={startNewChat}
        onSelectChat={(id) => {
          chat.selectChat(id);
          setView("chat");
          closeOnMobile();
        }}
        onDeleteChat={chat.deleteChat}
        pinned={chat.pinned}
        onOpenPinned={(convId, index) => {
          chat.selectChat(convId);
          setView("chat");
          setJumpRequest({ index, at: Date.now() });
          closeOnMobile();
        }}
        onUnpin={chat.togglePinIn}
        onTogglePinChat={chat.togglePinChat}
        onOpenKnowledge={() => {
          setView("knowledge");
          closeOnMobile();
        }}
        onClearChats={chat.clearAll}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        {view === "chat" ? (
          <ChatbotPage
            chat={chat}
            jumpRequest={jumpRequest}
            sidebarOpen={sidebarOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNewChat={startNewChat}
            modeToggle={<ModeToggle mode="chat" onChange={switchMode} />}
          />
        ) : view === "inspect" ? (
          <InspectPage
            nav={inspectNav}
            setNav={setInspectNav}
            answers={inspectAnswers}
            setAnswers={setInspectAnswers}
            sidebarOpen={sidebarOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNewChat={startNewChat}
            modeToggle={<ModeToggle mode="inspect" onChange={switchMode} />}
          />
        ) : view === "reliability" ? (
          <ReliabilityPage
            key={reliabilityKey}
            sidebarOpen={sidebarOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNewChat={startNewChat}
            modeToggle={<ModeToggle mode="reliability" onChange={switchMode} />}
            onOpenPid={openInspectSet}
            onAsk={askInChat}
          />
        ) : (
          <>
            <header className="topbar">
              {!sidebarOpen && (
                <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" title="Open sidebar">
                  <IconSidebar />
                </button>
              )}
              <span className="topbar-brand">
                <BrandLogo size={22} className="brand-top" />
                <span className="topbar-title">Knowledge Base</span>
              </span>
            </header>
            <div className="knowledge-scroll">
              <KnowledgePage />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
