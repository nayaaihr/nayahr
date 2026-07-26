// NayaHR brand mark (navy bars + coral diagonal + dot) as inline SVG.
// Server-safe, no client JS. Reused on the sign-in / sign-up screens.

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <line x1="15" y1="17.5" x2="15" y2="33.5" stroke="#241a40" strokeWidth="8.6" strokeLinecap="round" />
      <line x1="33.5" y1="20" x2="33.5" y2="33.5" stroke="#241a40" strokeWidth="8.6" strokeLinecap="round" />
      <line x1="15" y1="32" x2="33.5" y2="17" stroke="#ec6a49" strokeWidth="8.6" strokeLinecap="round" />
      <circle cx="33.5" cy="12" r="4.3" fill="#ec6a49" />
    </svg>
  );
}

export function BrandLockup({ tagline = "AI-native HRIS, built for Indian businesses" }: { tagline?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 26 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
        <BrandMark size={38} />
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#241a40" }}>NayaHR</span>
      </div>
      <div style={{ fontSize: 13.5, color: "#6b6b70", marginTop: 8 }}>{tagline}</div>
    </div>
  );
}
