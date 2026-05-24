"use client";

// ─── ThoughtCard ──────────────────────────────────────────────────────────────
//
// A single thought node rendered on the VoidCanvas.
//
// Vitality (0–100) controls both the visual fidelity and the decay effects:
//   ≥ 40   → Crisp: Inter font, full opacity, no glitch
//   < 40   → Decayed: JetBrains Mono, reduced opacity, jitter + chroma + slices

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThoughtCardProps {
  id: string;
  text: string;
  x: number;        // canvas-space X (px), card is centered on this point
  y: number;        // canvas-space Y (px), card is centered on this point
  vitality: number; // 0–100; drives color, font, opacity, and glitch intensity
  tags?: string[];
  /** Called when the user clicks the SHOCK button — lowers vitality by 20 */
  onShock?: () => void;
  /** Forwarded to the outermost div so VoidCanvas can block pan propagation */
  onPointerDown?: (e: React.PointerEvent) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type VitalityTier = "healthy" | "fading" | "decaying" | "critical";

function getTier(v: number): VitalityTier {
  if (v >= 70) return "healthy";
  if (v >= 40) return "fading";
  if (v >= 20) return "decaying";
  return "critical";
}

/** Accent color per tier — used for border, bar, badge, and glow */
const TIER_COLOR: Record<VitalityTier, string> = {
  healthy:  "#30d158",
  fading:   "#ffd60a",
  decaying: "#ff9f0a",
  critical: "#ff2d55",
};

/** Human-readable label shown in the status badge */
const TIER_LABEL: Record<VitalityTier, string> = {
  healthy:  "healthy",
  fading:   "fading",
  decaying: "decaying",
  critical: "critical",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThoughtCard({
  id,
  text,
  x,
  y,
  vitality,
  tags = [],
  onShock,
  onPointerDown,
}: ThoughtCardProps) {
  const tier    = getTier(vitality);
  const color   = TIER_COLOR[tier];
  const label   = TIER_LABEL[tier];
  const isDecayed = vitality < 40;  // threshold: below 40 → full glitch regime

  // ── Opacity ────────────────────────────────────────────────────────────────
  // Above 40 → scales linearly 0.75 → 1.0. Below 40 → scales 0.28 → 0.68.
  const opacity = isDecayed
    ? 0.28 + (vitality / 40) * 0.40
    : 0.75 + ((vitality - 40) / 60) * 0.25;

  // ── CSS class lists ────────────────────────────────────────────────────────
  const wrapperClasses = [
    "absolute select-none group",
    // Jitter only when decayed — animates the translate(-50%,-50%) wrapper
    isDecayed ? "glitch-card" : "",
  ].join(" ").trim();

  const textClasses = [
    "break-words leading-[1.55]",
    // Font: Inter when healthy, JetBrains Mono when decayed
    isDecayed ? "font-mono text-[12px]" : "font-sans text-[13px] font-medium",
    // Chromatic aberration
    isDecayed ? "glitch-text" : "",
  ].join(" ").trim();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      id={`card-${id}`}
      data-card="true"
      className={wrapperClasses}
      style={{
        left:    x,
        top:     y,
        // The glitch-jitter keyframe already emits translate(-50%,-50%) + offset;
        // when no jitter, we set it here via style.
        transform: isDecayed ? undefined : "translate(-50%, -50%)",
        opacity,
        pointerEvents: "auto",
        zIndex: 1,
      }}
      onPointerDown={onPointerDown}
      role="article"
      aria-label={`Thought: ${text}, vitality ${vitality}%`}
    >
      {/* ── Ambient glow ──────────────────────────────────────────────────── */}
      <div
        className="absolute -inset-4 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${color}${isDecayed ? "22" : "15"} 0%, transparent 68%)`,
          // Extra pulse on critical cards (independent of jitter)
          animation: tier === "critical"
            ? "bitrot-pulse 1.1s ease-in-out infinite"
            : undefined,
        }}
      />

      {/* ── Card surface ──────────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl border w-[220px] px-4 py-3 transition-transform duration-200 ease-out group-hover:scale-[1.03] group-hover:-translate-y-0.5"
        style={{
          // Decayed cards get a darker, grimier background
          background: isDecayed
            ? "linear-gradient(145deg, rgba(6,4,10,0.97) 0%, rgba(12,8,18,0.94) 100%)"
            : "linear-gradient(145deg, rgba(9,9,18,0.94) 0%, rgba(16,16,30,0.88) 100%)",
          borderColor: `${color}${isDecayed ? "70" : "50"}`,
          boxShadow: isDecayed
            // Corrupted: harsher, more visible glow
            ? `0 0 0 1px ${color}2a, 0 0 18px ${color}1a, 0 6px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)`
            : `0 0 0 1px ${color}1a, 0 8px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
          backdropFilter: "blur(12px)",
          // Decayed: scanline overlay via repeating-linear-gradient
          backgroundImage: isDecayed
            ? `linear-gradient(145deg, rgba(6,4,10,0.97) 0%, rgba(12,8,18,0.94) 100%),
               repeating-linear-gradient(
                 0deg,
                 transparent,
                 transparent 2px,
                 rgba(0,0,0,0.18) 2px,
                 rgba(0,0,0,0.18) 4px
               )`
            : undefined,
        }}
      >
        {/* ── Vitality bar ────────────────────────────────────────────────── */}
        <div
          className="mb-2.5 h-[3px] w-full rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${vitality}%`,
              background: isDecayed
                // Decayed bar flickers between red and orange without JS
                ? `linear-gradient(90deg, #ff2d55cc, ${color})`
                : `linear-gradient(90deg, ${color}bb, ${color})`,
              boxShadow: `0 0 ${isDecayed ? 8 : 5}px ${color}`,
              transition: "width 0.6s ease",
            }}
          />
        </div>

        {/* ── Body text + glitch slices ──────────────────────────────────── */}
        {/*
            .glitch-slice uses ::before/::after with attr(data-text) to create
            the colored slice duplicates. The data-text attribute must equal the
            rendered text so the pseudo-elements show the same content.
        */}
        <p
          className={`${textClasses} ${isDecayed ? "glitch-slice" : ""}`}
          data-text={isDecayed ? text : undefined}
          style={{ color: isDecayed ? `rgba(200,185,255,${opacity})` : `rgba(218,218,255,${opacity})` }}
        >
          {text}
        </p>

        {/* ── Footer row ──────────────────────────────────────────────────── */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color }}
          >
            {vitality.toFixed(0)}%
          </span>

          <div className="flex items-center gap-1.5">
            {/* SHOCK button — visible on hover, always pointer-enabled */}
            {onShock && (
              <button
                id={`shock-btn-${id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onShock();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[9px] font-mono px-1.5 py-[2px] rounded active:scale-95"
                style={{
                  background: "rgba(255,45,85,0.12)",
                  border: "1px solid rgba(255,45,85,0.35)",
                  color: "rgba(255,80,110,0.85)",
                  cursor: "pointer",
                }}
                aria-label="Shock this thought — reduces vitality by 20"
              >
                ⚡ shock
              </button>
            )}

            <span
              className="text-[9px] uppercase tracking-widest px-1.5 py-[2px] rounded-full font-mono"
              style={{
                background: `${color}1a`,
                color,
                border: `1px solid ${color}44`,
                // Badge text also gets chroma shift when decayed
                animation: isDecayed
                  ? "glitch-text-chroma 0.28s steps(1) infinite"
                  : undefined,
              }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`text-[9px] px-1.5 py-[2px] rounded-md ${isDecayed ? "font-mono" : ""}`}
                style={{
                  background: isDecayed
                    ? "rgba(255,30,60,0.07)"
                    : "rgba(255,255,255,0.05)",
                  color: isDecayed
                    ? `rgba(255,120,140,0.65)`
                    : "rgba(170,170,210,0.65)",
                  border: isDecayed ? "1px solid rgba(255,30,60,0.15)" : undefined,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Decayed-only: corruption noise caption ──────────────────────── */}
        {isDecayed && (
          <div
            className="mt-2 font-mono text-[8px] tracking-widest opacity-40"
            style={{ color: "#ff2d55" }}
          >
            ERR_INTEGRITY_{(100 - vitality).toFixed(0).padStart(3, "0")}
          </div>
        )}
      </div>
    </div>
  );
}
