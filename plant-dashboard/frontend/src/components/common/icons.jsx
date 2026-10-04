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

// Loop mark (brand logo), filled with the current text color.
export const IconLogo = (p) => (
  <svg width={20} height={20} viewBox="0 0 256 256" aria-hidden {...p}>
    <path
      fill="currentColor"
      d="M128 22 C162.31 22 191.45 44.16 201.89 74.95 L171.37 92.57 C167.84 71.81 149.77 56 128 56 C103.7 56 84 75.7 84 100 L84 143.01 L50.27 162.49 C50.09 160.35 50 158.18 50 156 L50 100 C50 56.92 84.92 22 128 22 Z M54.11 181.05 L84.63 163.43 C88.16 184.19 106.23 200 128 200 C152.3 200 172 180.3 172 156 L172 112.99 L205.73 93.51 C205.91 95.65 206 97.82 206 100 L206 156 C206 199.08 171.08 234 128 234 C93.69 234 64.55 211.84 54.11 181.05 Z M147 128 C147 138.49 138.49 147 128 147 C117.51 147 109 138.49 109 128 C109 117.51 117.51 109 128 109 C138.49 109 147 117.51 147 128 Z"
    />
  </svg>
);

export const IconSidebar = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </svg>
);

export const IconNewChat = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconBook = (p) => (
  <svg {...base} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </svg>
);

export const IconArrowUp = (p) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

export const IconChevronDown = (p) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconCheck = (p) => (
  <svg {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconCopy = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export const IconTrash = (p) => (
  <svg {...base} {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="m6 6 1 14h10l1-14" />
  </svg>
);

export const IconAlert = (p) => (
  <svg {...base} {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconActivity = (p) => (
  <svg {...base} {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export const IconGauge = (p) => (
  <svg {...base} {...p}>
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);

export const IconRuler = (p) => (
  <svg {...base} {...p}>
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z" />
    <path d="m14.5 12.5 2-2" />
    <path d="m11.5 9.5 2-2" />
    <path d="m8.5 6.5 2-2" />
    <path d="m17.5 15.5 2-2" />
  </svg>
);

export const IconShield = (p) => (
  <svg {...base} {...p}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

export const IconExternal = (p) => (
  <svg {...base} {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconTarget = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

export const IconSparkle = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3c.4 4.6 2.4 6.6 7 7-4.6.4-6.6 2.4-7 7-.4-4.6-2.4-6.6-7-7 4.6-.4 6.6-2.4 7-7z" />
  </svg>
);

export const IconUser = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const IconHelp = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconChevronUpDown = (p) => (
  <svg {...base} {...p}>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
);

export const IconPin = (p) => (
  <svg {...base} {...p}>
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

export const IconChat = (p) => (
  <svg {...base} {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
  </svg>
);

// Solid padlock: marks a search scope that is locked to one P&ID.
export const IconLock = (p) => (
  <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" />
  </svg>
);

export const IconWrench = (p) => (
  <svg {...base} {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const IconDoc = (p) => (
  <svg {...base} {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

export const IconChevronRight = (p) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconChart = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M21 20H3" />
  </svg>
);

export const IconUpload = (p) => (
  <svg {...base} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const IconFilePdf = (p) => (
  <svg {...base} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13v4" />
    <path d="M9 13h2a1.5 1.5 0 0 0 0-3H9" />
    <path d="M14 17h1.5a2.5 2.5 0 0 0 0-5H14v5z" />
  </svg>
);

export const IconPlus = (p) => (
  <svg {...base} {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

