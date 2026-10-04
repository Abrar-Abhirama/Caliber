import { useState } from "react";

const STORAGE_KEY = "plant-hub-theme";

function readTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Fall through to the system preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Call once before first render so the page never flashes the wrong theme.
export function initTheme() {
  document.documentElement.dataset.theme = readTheme();
}

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const IconSun = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
  </svg>
);

const IconMoon = () => (
  <svg {...base}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

// One tap flips between light and dark.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || readTheme());
  const dark = theme === "dark";

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme just won't persist.
    }
  };

  return (
    <div className="theme-row">
      <button type="button" className="nav-item" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
        {dark ? <IconSun /> : <IconMoon />}
        {dark ? "Light mode" : "Dark mode"}
      </button>
    </div>
  );
}
