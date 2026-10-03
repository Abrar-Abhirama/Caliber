import { IconLogo } from "./icons.jsx";

// Single place to swap in the real logo image later (e.g. <img src="/logo.png" alt="" />).
// The mark takes its color from CSS (`color`), so each placement can tint it.
export default function BrandLogo({ size = 28, className = "" }) {
  return (
    <span className={`brand-mark ${className}`} style={{ width: size, height: size }} title="Plant Assistant">
      <IconLogo width={size} height={size} />
    </span>
  );
}
