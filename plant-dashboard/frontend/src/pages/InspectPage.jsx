import { useEffect, useRef, useState } from "react";
import ModeTopbar from "../components/common/ModeTopbar.jsx";
import { IconAlert } from "../components/common/icons.jsx";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import SetPicker from "../components/inspect/SetPicker.jsx";
import SetDetail from "../components/inspect/SetDetail.jsx";
import OplDetail from "../components/inspect/OplDetail.jsx";
import { ScopeBar, ScopedAnswers } from "../components/inspect/ScopedChat.jsx";
import { useModels } from "../hooks/useModels.js";
import { api } from "../services/api.js";

// Inspect mode: P&ID set -> OPL list -> OPL detail. `nav` ({ pid, opl }) and `answers` are owned by App.
export default function InspectPage({ nav, setNav, answers, setAnswers, sidebarOpen, onOpenSidebar, onNewChat, modeToggle }) {
  const [sets, setSets] = useState(null);
  const [set, setSet] = useState(null);
  const [opl, setOpl] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const { models, model, setModel } = useModels();
  const scrollRef = useRef(null);

  useEffect(() => {
    api
      .getInspectSets()
      .then(({ data }) => setSets(data))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!nav.pid) return setSet(null);
    if (set?.code === nav.pid) return;
    setSet(null);
    api
      .getInspectSet(nav.pid)
      .then(({ data }) => setSet(data))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.pid]);

  useEffect(() => {
    if (!nav.opl) return setOpl(null);
    setOpl(null);
    api
      .getOpl(nav.opl)
      .then(({ data }) => setOpl(data))
      .catch((e) => setError(e.message));
  }, [nav.opl]);

  const step = nav.opl ? 3 : nav.pid ? 2 : 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step, nav.pid, nav.opl]);

  const go = (next) => {
    setError(null);
    setNav(next);
  };

  const scopeKey = `${nav.pid}|${nav.opl || ""}`;
  const scopedAnswers = answers.filter((a) => a.scopeKey === scopeKey);
  const busy = answers.some((a) => a.loading);

  // Bring the answer card into view once React has rendered it.
  const reveal = (id) =>
    setTimeout(() => document.getElementById(`ans-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

  const ask = async (question) => {
    const id = `${Date.now()}`;
    const scope = { pid: nav.pid, opl: nav.opl };
    setAnswers((prev) => [...prev, { id, scopeKey, question, loading: true }]);
    reveal(id);
    try {
      const res = await api.askQuestion(question, null, model || undefined, scope);
      setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, loading: false, data: res.data } : a)));
    } catch (e) {
      setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, loading: false, error: e.message } : a)));
    }
    reveal(id);
  };

  let content;
  if (error) {
    content = (
      <div className="ins-inner">
        <div className="msg-error" role="alert">
          <IconAlert width={18} height={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  } else if (step === 1) {
    content = sets ? <SetPicker sets={sets} onOpen={(pid) => go({ pid, opl: null })} /> : <Loading />;
  } else if (step === 2) {
    content = set ? (
      <SetDetail set={set} onRoot={() => go({ pid: null, opl: null })} onOpenOpl={(code) => go({ pid: nav.pid, opl: code })} />
    ) : (
      <Loading />
    );
  } else {
    content = opl ? (
      <OplDetail opl={opl} onRoot={() => go({ pid: null, opl: null })} onSet={() => go({ pid: nav.pid, opl: null })} />
    ) : (
      <Loading />
    );
  }

  return (
    <div className="inspect">
      <ModeTopbar sidebarOpen={sidebarOpen} onOpenSidebar={onOpenSidebar} onNewChat={onNewChat} modeToggle={modeToggle} />

      <div className="ins-scroll" ref={scrollRef}>
        {content}
        {step > 1 && !error && (
          <div className="ins-inner ins-answers-wrap">
            <ScopedAnswers answers={scopedAnswers} pid={nav.pid} onSelectSource={setSelectedSource} />
          </div>
        )}
      </div>

      {step > 1 && !error && (
        <ScopeBar
          pid={nav.pid}
          opl={nav.opl}
          onSend={ask}
          busy={busy}
          models={models}
          model={model}
          setModel={setModel}
        />
      )}

      <SourceDrawer source={selectedSource} onClose={() => setSelectedSource(null)} />
    </div>
  );
}

function Loading() {
  return (
    <div className="ins-inner">
      <div className="thinking">
        <span className="thinking-dot" />
        <span className="thinking-text">Loading</span>
      </div>
    </div>
  );
}
