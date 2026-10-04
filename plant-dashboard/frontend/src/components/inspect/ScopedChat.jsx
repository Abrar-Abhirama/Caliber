import { Markdown, ModelLabel, CopyButton } from "../chatbot/ChatMessage.jsx";
import Composer from "../chatbot/Composer.jsx";
import ModelPicker from "../chatbot/ModelPicker.jsx";
import { IconAlert, IconLock, IconLogo } from "../common/icons.jsx";

// Answers to questions asked inside a P&ID set. Sources are already limited to the set by the backend.
export function ScopedAnswers({ answers, pid, onSelectSource }) {
  if (!answers.length) return null;
  return (
    <div className="ins-answers" aria-live="polite">
      {answers.map((a) => (
        <div key={a.id} id={`ans-${a.id}`} className="ins-reply">
          <span className="msg-avatar">
            <IconLogo width={18} height={18} />
          </span>
          <div className="ins-reply-body">
            <p className="ins-reply-q">{a.question}</p>
            {a.loading ? (
              <div className="thinking">
                <span className="thinking-dot" />
                <span className="thinking-text">Searching {pid}</span>
              </div>
            ) : a.error ? (
              <div className="msg-error" role="alert">
                <IconAlert width={18} height={18} />
                <span>{a.error}</span>
              </div>
            ) : (
              <>
                <Markdown text={a.data.answer} sources={a.data.sources} onSelectSource={onSelectSource} />
                {a.data.steps?.length > 0 && (
                  <ol className="ins-reply-steps">
                    {a.data.steps.map((s, i) => (
                      <li key={i}>
                        <Markdown text={s} sources={a.data.sources} onSelectSource={onSelectSource} />
                      </li>
                    ))}
                  </ol>
                )}
                <div className="ins-reply-src">
                  {a.data.sources?.length ? (
                    <>
                      <span>Sources, all from {pid}:</span>
                      {a.data.sources.map((s) => (
                        <button key={s.ref} type="button" className="citation" onClick={() => onSelectSource(s)} title={s.title}>
                          {s.ref}
                        </button>
                      ))}
                    </>
                  ) : (
                    <span>No linked record in {pid} matched this question.</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                  <CopyButton
                    text={[
                      a.question ? `Question: ${a.question}` : "",
                      a.data?.answer || "",
                      a.data?.steps?.length ? `Steps:\n${a.data.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "",
                      a.data?.sources?.length ? `Sources:\n${a.data.sources.map((s) => `- [${s.ref}] ${s.title || s.ref}`).join("\n")}` : "",
                    ]
                      .filter(Boolean)
                      .join("\n\n")}
                    title="Copy answer"
                  />
                  <ModelLabel message={a.data} />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Composer pinned under Inspect steps 2 and 3.
export function ScopeBar({ pid, opl, onSend, busy, models, model, setModel }) {
  const header = (
    <div className="ins-scope">
      <span>Searching only in</span>
      <span className="ins-scope-chip">
        <IconLock width={12} height={12} />
        {pid}
      </span>
      {opl && <span className="ins-scope-chip is-light">{opl}</span>}
      <span>· other P&amp;IDs are excluded</span>
    </div>
  );
  return (
    <div className="ins-scopebar">
      <Composer
        onSend={onSend}
        disabled={busy}
        header={header}
        placeholder={opl ? `Ask about ${opl}` : `Ask about ${pid}`}
        tools={<ModelPicker models={models} value={model} onChange={setModel} />}
      />
    </div>
  );
}
