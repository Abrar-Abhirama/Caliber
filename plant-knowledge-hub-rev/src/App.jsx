import { useCallback, useEffect, useState } from "react";
import { loadHub } from "./lib/hub.js";
import { connectAI } from "./lib/ai.js";
import { tickTwin } from "./lib/assets.js";
import Header from "./components/Header.jsx";
import AskView from "./components/AskView.jsx";
import DocumentsView from "./components/DocumentsView.jsx";
import SourceDrawer from "./components/SourceDrawer.jsx";
import Placeholder from "./components/Placeholder.jsx";

export default function App(){
  const [hub, setHub] = useState(null);
  const [error, setError] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiState, setAiState] = useState("connecting");
  const [view, setView] = useState(() => (location.hash.slice(1) || "ask"));
  const [asset, setAsset] = useState("GA-1201A");
  const [open, setOpen] = useState(null);   // {ref, qset} of the source shown in the drawer
  const [, setTick] = useState(0);

  useEffect(() => { loadHub().then(setHub).catch(e => setError(e.message)); }, []);
  useEffect(() => { connectAI().then(c => { setAi(c); setAiState(c ? "live" : "offline"); }); }, []);
  useEffect(() => { const t = setInterval(() => { tickTwin(); setTick(n => n + 1); }, 2000); return () => clearInterval(t); }, []);
  useEffect(() => { history.replaceState(null, "", "#" + view); }, [view]);
  const onOpen = useCallback((ref, qset) => setOpen({ref, qset}), []);
  const onClose = useCallback(() => setOpen(null), []);

  return (
    <>
      <Header hub={hub} aiState={aiState} view={view} setView={setView} />
      <main>
        <div className="view" style={{marginTop: 16}}>
          {error && <div className="caution"><b>Could not load data</b><div>{error}. Run the build scripts (see README) so public/data/ exists.</div></div>}
          {!hub && !error && <div className="card">Loading the knowledge base…</div>}
          {hub && view === "ask" && <AskView hub={hub} ai={ai} asset={asset} setAsset={setAsset} onOpen={onOpen} />}
          {hub && view === "docs" && <DocumentsView hub={hub} onOpen={onOpen} />}
          {hub && !["ask", "docs"].includes(view) && <Placeholder view={view} />}
        </div>
      </main>
      {hub && <SourceDrawer hub={hub} open={open} onClose={onClose} />}
    </>
  );
}
