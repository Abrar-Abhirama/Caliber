import { IconChart, IconSearch } from "../common/icons.jsx";

// Chat | Inspect | Reliability switch centered in the top bar (like ChatGPT's Chat / Work).
export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle" role="group" aria-label="Mode">
      <button type="button" aria-pressed={mode === "chat"} onClick={() => onChange("chat")}>
        Chat
      </button>
      <button type="button" aria-pressed={mode === "inspect"} onClick={() => onChange("inspect")}>
        <IconSearch width={16} height={16} />
        Inspect
      </button>
      <button type="button" aria-pressed={mode === "reliability"} onClick={() => onChange("reliability")}>
        <IconChart width={16} height={16} />
        Reliability
      </button>
    </div>
  );
}
