/**
 * SCI OS design tokens — extracted from Shell genome.
 * Do not replace with vendor themes. Additive scale for ECL/DIL consoles.
 */
export const sciTokens = {
  schema: "sci-os-design-tokens/v1",
  label: "ALPHA_NON_PRODUCTION",
  color: {
    snow: "#F7F8FA",
    fog: "#E8ECF0",
    graphite: "#2C333A",
    navy: "#0B1F33",
    red: "#C8102E",
    ice: "#D6E4F0",
    ok: "#1B7A4E",
    warn: "#B45309",
    unknown: "#5C6770",
    info: "#1F4E79",
    surface: "#ffffff",
    surfaceMuted: "#fafbfc",
    surfaceRaised: "#ffffff",
  },
  typography: {
    fontFamily: '"SF Pro Text","Segoe UI",system-ui,sans-serif',
    brandSize: "1.35rem",
    display: "1.75rem",
    title: "1.15rem",
    body: "1rem",
    meta: "0.75rem",
    overline: "0.65rem",
  },
  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.5rem",
    6: "2rem",
    8: "3rem",
  },
  grid: {
    columns: 12,
    gutter: "0.75rem",
    maxWidth: "1180px",
  },
  elevation: {
    0: "none",
    1: "0 1px 0 rgba(11,31,51,0.06)",
    2: "0 8px 24px rgba(11,31,51,0.08)",
    3: "0 18px 50px rgba(11,31,51,0.18)",
  },
  motion: {
    duration: "180ms",
    micro: "150ms",
    macro: "300ms",
    critical: "0ms",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
  radius: "0",
  focus: "2px solid #0B1F33",
  density: {
    COMFORTABLE: { spaceScale: 1.15, fontScale: 1.05 },
    STANDARD: { spaceScale: 1, fontScale: 1 },
    EXPERT: { spaceScale: 0.9, fontScale: 0.95 },
  },
  risk: {
    approve: "navy-action",
    reject: "red",
    hold: "warn",
    proposalNotDone: "warn-badge",
  },
  rhythm: {
    12: "0.75rem",
    24: "1.5rem",
    48: "3rem",
  },
  evidence: {
    available: "ice-border",
    missing: "UNKNOWN label required",
  },
};

export default sciTokens;
