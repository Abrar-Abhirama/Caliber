import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "../common/icons.jsx";
import { useDismiss } from "../common/useDismiss.js";

// Compact pill button with a rounded menu. Used under the composer (opens upward) and for page filters
// (`placement="down"`). Keyboard: Enter/Space/ArrowDown opens, arrows move, Enter picks, Esc closes.
export default function PillSelect({
  label,
  icon,
  items,
  value,
  onChange,
  ariaLabel,
  menuTitle,
  placement = "up",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  // On open, focus the selected item so the arrows start from it.
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, items.findIndex((it) => it.value === value));
    itemRefs.current[i]?.focus();
  }, [open, items, value]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKey = (e) => {
    const list = itemRefs.current.filter(Boolean);
    const i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") buttonRef.current?.focus();
    }
  };

  return (
    <div className={`pill-select ${className}`} ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="pill-btn"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${label}`}
        title={ariaLabel}
      >
        {icon}
        <span className="pill-label">{label}</span>
        <IconChevronDown width={13} height={13} />
      </button>

      {open && (
        <div className={`picker-menu ${placement === "up" ? "up" : "down"}`} role="menu" aria-label={ariaLabel} onKeyDown={onMenuKey}>
          {menuTitle && <div className="picker-menu-title">{menuTitle}</div>}
          <ul>
            {items.map((it, i) => (
              <li key={it.value || "none"} role="none">
                <button
                  ref={(el) => (itemRefs.current[i] = el)}
                  type="button"
                  role="menuitemradio"
                  aria-checked={it.value === value}
                  className="picker-item"
                  onClick={() => pick(it.value)}
                >
                  <span className="picker-item-text">
                    <span className="picker-item-title">{it.title}</span>
                    {it.desc && <span className="picker-item-desc">{it.desc}</span>}
                  </span>
                  {it.value === value && <IconCheck width={18} height={18} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
