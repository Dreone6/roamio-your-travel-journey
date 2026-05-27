import { ReactNode } from "react";

/**
 * Scopes the cream + Fraunces + amber partner-portal theme to this subtree only.
 * Outside /partners the locked Sora/dark Roavr brand stays untouched.
 */
export function PartnerThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen partner-scope"
      style={{
        background: "#FAF6F0",
        color: "#1A1714",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        .partner-scope .font-fraunces { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .partner-scope .font-dm { font-family: 'DM Sans', system-ui, sans-serif; }
      `}</style>
      {children}
    </div>
  );
}

export const PARTNER = {
  cream: "#FAF6F0",
  cream2: "#F2EBDE",
  ink: "#1A1714",
  ink2: "#4A4239",
  ink3: "#8A8076",
  amber: "#D97706",
  amberSoft: "#FCD9A1",
  navy: "#0D0F1C",
  navySoft: "#1A1F36",
  sage: "#6B8E5A",
  border: "#E8DFCE",
  white: "#FFFFFF",
};
