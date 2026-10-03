import { useLayoutEffect, useRef, useState } from "react";
import { IconArrowUp } from "../common/icons.jsx";

const MAX_HEIGHT = 200;

// `tools` renders on the left of the bottom row, under the text field (asset and model pickers).
// `header` renders above the text field (Inspect mode uses it for the search scope line).
export default function Composer({ onSend, disabled, assetContext, autoFocus, tools, header, placeholder }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  // Grow the textarea with its content, up to MAX_HEIGHT.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {header}
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder || (assetContext ? `Ask about ${assetContext}` : "Ask anything")}
        aria-label="Message"
        autoFocus={autoFocus}
      />
      <div className="composer-row">
        <div className="composer-tools">{tools}</div>
        <button
          type="submit"
          className="send-btn"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          title="Send message"
        >
          <IconArrowUp width={18} height={18} />
        </button>
      </div>
    </form>
  );
}
