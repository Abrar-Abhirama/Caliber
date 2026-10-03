import { useState } from "react";

// P&ID preview: the real drawing when the knowledge base has one, otherwise a schematic placeholder.
export default function PidThumb({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <span className={`ins-thumb ${className}`}>
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className={`ins-thumb ${className}`} aria-hidden="true">
      <svg viewBox="0 0 300 132" preserveAspectRatio="xMidYMid meet">
        <rect x="46" y="28" width="34" height="66" rx="17" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
        <path d="M63 94v18h77" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="152" cy="112" r="11" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
        <path d="M163 112h70V40h52" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="m225 66 8-6 8 6-8 6z" fill="#fff" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="106" cy="34" r="9" fill="#fff" stroke="var(--muted)" strokeWidth="1.2" />
        <path d="M80 34h17" stroke="var(--muted)" />
      </svg>
    </span>
  );
}
