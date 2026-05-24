"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Thought } from "@/types/thought";
import ThoughtCard from "@/components/ThoughtCard";
import {
  ThoughtRow,
  fetchThoughts,
  insertThought,
  shockThought,
  supabase,
} from "@/utils/supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pan {
  x: number;
  y: number;
}

interface ModalState {
  open: boolean;
  canvasX: number; // position in canvas-space where the card will land
  canvasY: number;
}

type RealtimeStatus = "connecting" | "live" | "error";

// ─── Row → Thought adapter ────────────────────────────────────────────────────
// Converts a Supabase ThoughtRow (snake_case, DB types) to the Thought shape
// the rest of the UI consumes. Keeps ThoughtCard props interface unchanged.

function rowToThought(row: ThoughtRow): Thought {
  return {
    id:        row.id,
    text:      row.content,
    x:         row.x_pos,
    y:         row.y_pos,
    health:    row.vitality,
    createdAt: new Date(row.created_at).getTime(),
    tags:      [],
  };
}

// ─── AddThoughtModal ──────────────────────────────────────────────────────────

function AddThoughtModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea when the modal mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      onConfirm(trimmed);
    },
    [text, onConfirm]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const trimmed = text.trim();
        if (trimmed) onConfirm(trimmed);
      }
    },
    [text, onCancel, onConfirm]
  );

  return (
    /* Backdrop */
    <div
      id="add-thought-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(5,5,8,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Dialog */}
      <div
        id="add-thought-modal"
        className="relative w-full max-w-md rounded-2xl border px-6 py-5 shadow-2xl"
        style={{
          background:
            "linear-gradient(145deg, rgba(10,10,20,0.98) 0%, rgba(18,18,36,0.96) 100%)",
          borderColor: "rgba(100,100,180,0.25)",
          boxShadow:
            "0 0 0 1px rgba(100,100,180,0.1), 0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
          animation: "modal-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="mb-4">
          <h2
            id="modal-title"
            className="text-sm font-semibold tracking-tight"
            style={{ color: "rgba(220,220,255,0.9)" }}
          >
            Drop a thought
          </h2>
          <p
            className="text-[11px] mt-0.5 font-mono"
            style={{ color: "rgba(120,120,160,0.65)" }}
          >
            It will appear at your cursor position.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Textarea */}
          <textarea
            ref={inputRef}
            id="thought-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            rows={3}
            maxLength={400}
            className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-zinc-600"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(100,100,180,0.22)",
              color: "rgba(218,218,255,0.88)",
              caretColor: "#a78bfa",
              lineHeight: "1.55",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(167,139,250,0.45)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(100,100,180,0.22)")
            }
          />

          {/* Char count */}
          <div
            className="mt-1 text-right font-mono text-[10px]"
            style={{ color: "rgba(100,100,140,0.5)" }}
          >
            {text.length}/400
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              id="modal-cancel-btn"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:bg-white/5 active:scale-95"
              style={{ color: "rgba(130,130,170,0.8)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="modal-confirm-btn"
              disabled={!text.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)",
                color: "#fff",
                boxShadow: "0 2px 12px rgba(167,139,250,0.35)",
              }}
            >
              Drop ↵
            </button>
          </div>
        </form>

        {/* Keyboard hint */}
        <p
          className="mt-3 text-center font-mono text-[9px]"
          style={{ color: "rgba(80,80,110,0.6)" }}
        >
          ⌘↵ to drop · Esc to cancel · click outside to dismiss
        </p>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── VoidCanvas ───────────────────────────────────────────────────────────────

const CANVAS_SIZE = 4000; // virtual canvas dimensions (px)
const GRID_DOT_SPACING = 28; // dot grid cell size (px in canvas-space)

export default function VoidCanvas() {
  // ── State ────────────────────────────────────────────────────────────────
  const [thoughts, setThoughts]     = useState<Thought[]>([]);
  const [loading, setLoading]       = useState(true);
  const [rtStatus, setRtStatus]     = useState<RealtimeStatus>("connecting");
  const [pan, setPan]               = useState<Pan>({ x: 0, y: 0 });
  const [ripples, setRipples]       = useState<{ id: string; x: number; y: number }[]>([]);
  const [modal, setModal]           = useState<ModalState>({
    open: false,
    canvasX: 0,
    canvasY: 0,
  });

  // ── Refs ─────────────────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null);
  const isPanning     = useRef(false);
  const pointerMoved  = useRef(false);
  const panOrigin     = useRef<{ px: number; py: number; panX: number; panY: number }>({
    px: 0, py: 0, panX: 0, panY: 0,
  });
  const panRef = useRef(pan);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    fetchThoughts().then((rows) => {
      setThoughts(rows.map(rowToThought));
      setLoading(false);
    });
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  // A single Supabase channel listens for INSERT, UPDATE, and DELETE events
  // on the `thoughts` table and applies them to local state. Every browser
  // tab subscribed to the same project will receive these events instantly.
  useEffect(() => {
    const channel = supabase
      .channel("bitrot-thoughts-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thoughts" },
        (payload) => {
          const newThought = rowToThought(payload.new as ThoughtRow);
          setThoughts((prev) => {
            // Guard against duplicate rows (e.g. optimistic + realtime)
            if (prev.some((t) => t.id === newThought.id)) return prev;
            return [...prev, newThought];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "thoughts" },
        (payload) => {
          const updated = rowToThought(payload.new as ThoughtRow);
          setThoughts((prev) => {
            const oldThought = prev.find((t) => t.id === updated.id);
            
            // If the new vitality is lower than the previous local state vitality,
            // it represents a SHOCK or DECAY event from the network.
            // (Note: The prompt example mentioned "higher", but shock decreases vitality!)
            if (oldThought && updated.health < oldThought.health) {
              // Trigger the ripple effect safely outside the React render cycle
              setTimeout(() => {
                const rippleId = crypto.randomUUID();
                setRipples((rPrev) => [...rPrev, { id: rippleId, x: updated.x, y: updated.y }]);
                
                // Clean up the DOM after the animation completes
                setTimeout(() => {
                  setRipples((rPrev) => rPrev.filter((r) => r.id !== rippleId));
                }, 800);
              }, 0);
            }

            return prev.map((t) => (t.id === updated.id ? updated : t));
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "thoughts" },
        (payload) => {
          const deletedId = (payload.old as Partial<ThoughtRow>).id;
          if (deletedId) {
            setThoughts((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRtStatus("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRtStatus("error");
      });

    // Unsubscribe when the component unmounts (tab close / route change)
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Convert a viewport (clientX/Y) coordinate to canvas-space coordinates. */
  const viewportToCanvas = useCallback(
    (clientX: number, clientY: number): { cx: number; cy: number } => {
      const rect = containerRef.current!.getBoundingClientRect();
      const cx = clientX - rect.left - panRef.current.x;
      const cy = clientY - rect.top - panRef.current.y;
      return { cx, cy };
    },
    []
  );

  // ── Panning ───────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-card]")) return;
      if (e.button !== 0) return;
      isPanning.current  = true;
      pointerMoved.current = false;
      panOrigin.current  = {
        px: e.clientX, py: e.clientY,
        panX: panRef.current.x, panY: panRef.current.y,
      };
      containerRef.current?.setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panOrigin.current.px;
      const dy = e.clientY - panOrigin.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pointerMoved.current = true;
      setPan({ x: panOrigin.current.panX + dx, y: panOrigin.current.panY + dy });
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Double-click → open modal ─────────────────────────────────────────────

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-card]")) return;
      const { cx, cy } = viewportToCanvas(e.clientX, e.clientY);
      setModal({ open: true, canvasX: cx, canvasY: cy });
    },
    [viewportToCanvas]
  );

  // ── Modal confirm — write to Supabase; realtime event updates local state ─
  // We do NOT call setThoughts here. The INSERT event from the realtime
  // subscription will arrive in milliseconds and update all subscribers.

  const handleModalConfirm = useCallback(
    async (text: string) => {
      let sanitizedText = text.trim().substring(0, 280);
      // Basic HTML tag stripping as a defense-in-depth measure
      sanitizedText = sanitizedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      if (!sanitizedText) {
        setModal({ open: false, canvasX: 0, canvasY: 0 });
        return;
      }

      setModal({ open: false, canvasX: 0, canvasY: 0 });
      await insertThought(sanitizedText, modal.canvasX, modal.canvasY);
      // State update happens via the realtime INSERT handler above
    },
    [modal.canvasX, modal.canvasY]
  );

  const handleModalCancel = useCallback(() => {
    setModal({ open: false, canvasX: 0, canvasY: 0 });
  }, []);

  // ── SHOCK handler ─────────────────────────────────────────────────────────
  // Subtract 20 vitality from a thought. The UPDATE realtime event will
  // propagate the new value to every connected canvas instantly.

  const handleShock = useCallback(async (id: string) => {
    // ── Client-side spam guard ──────────────────────────────────────────────
    const now = Date.now();
    const historyJson = localStorage.getItem("epitaph_shock_history");
    let history: number[] = historyJson ? JSON.parse(historyJson) : [];
    
    // Filter out timestamps older than 60 seconds
    history = history.filter(time => now - time < 60000);
    
    if (history.length >= 3) {
      console.warn("[Epitaph] Rate limit exceeded: Max 3 shocks per 60 seconds.");
      return; // Block the request
    }
    
    history.push(now);
    localStorage.setItem("epitaph_shock_history", JSON.stringify(history));

    // We do NOT spawn the ripple here. We let the database update process,
    // and when the realtime UPDATE event arrives, the listener above triggers
    // the ripple for ALL clients simultaneously (including us).
    await shockThought(id, 20);
  }, []);

  // ── Grid background calculation ───────────────────────────────────────────
  // The dot grid shifts with the pan offset so it feels infinite
  const dotOffsetX = ((pan.x % GRID_DOT_SPACING) + GRID_DOT_SPACING) % GRID_DOT_SPACING;
  const dotOffsetY = ((pan.y % GRID_DOT_SPACING) + GRID_DOT_SPACING) % GRID_DOT_SPACING;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Canvas container ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        id="void-canvas"
        className="w-screen h-screen overflow-hidden bg-zinc-950 relative"
        style={{
          cursor: isPanning.current ? "grabbing" : "crosshair",
          // Dotted grid — pure CSS, zero JS overhead
          backgroundImage: `radial-gradient(circle, rgba(90,90,130,0.38) 1.2px, transparent 1.2px)`,
          backgroundSize: `${GRID_DOT_SPACING}px ${GRID_DOT_SPACING}px`,
          backgroundPosition: `${dotOffsetX}px ${dotOffsetY}px`,
          userSelect: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        aria-label="Epitaph void canvas — double-click to add a thought, drag to explore"
      >
        {/* Subtle radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 38%, rgba(9,9,11,0.65) 100%)",
          }}
        />

        {/* ── World layer — everything here scrolls with the pan ───────── */}
        <div
          id="void-canvas-world"
          className="absolute top-0 left-0 will-change-transform"
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          {/* Canvas boundary hint (very faint) */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              border: "1px dashed rgba(80,80,120,0.12)",
              boxShadow: "inset 0 0 120px rgba(80,80,120,0.04)",
            }}
          />

          {/* Loading skeleton */}
          {loading && (
            <div
              className="absolute flex items-center gap-2"
              style={{ left: "50vw", top: "50vh", transform: "translate(-50%,-50%)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "120ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "240ms" }} />
              <span className="font-mono text-[11px] ml-1" style={{ color: "rgba(130,100,200,0.6)" }}>syncing…</span>
            </div>
          )}

          {/* Shockwave ripples */}
          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="absolute rounded-full border-2 border-cyan-400 pointer-events-none animate-shockwave w-[600px] h-[600px]"
              style={{
                left: ripple.x,
                top: ripple.y,
              }}
            />
          ))}

          {/* Thought cards */}
          {thoughts.map((thought) => (
            <ThoughtCard
              key={thought.id}
              id={thought.id}
              text={thought.text}
              x={thought.x}
              y={thought.y}
              vitality={thought.health}
              tags={thought.tags}
              onPointerDown={(e) => e.stopPropagation()}
              onShock={() => handleShock(thought.id)}
            />
          ))}

          {/* Double-click target indicator — shows where card will land */}
          {modal.open && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: modal.canvasX,
                top: modal.canvasY,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: "#a78bfa",
                  boxShadow: "0 0 0 6px rgba(167,139,250,0.18), 0 0 20px rgba(167,139,250,0.4)",
                  animation: "target-ping 0.9s ease-out infinite",
                }}
              />
            </div>
          )}
        </div>

        {/* ── HUD ──────────────────────────────────────────────────────── */}

        {/* Top-left: branding */}
        <div className="absolute top-5 left-5 z-10 pointer-events-none">
          <h1
            className="font-mono text-base font-bold tracking-tight leading-none"
            style={{
              background:
                "linear-gradient(135deg, #a78bfa 0%, #60a5fa 55%, #34d399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Epitaph
          </h1>
          <p
            className="font-mono text-[10px] mt-1"
            style={{ color: "rgba(100,100,140,0.55)" }}
          >
            drag to pan · double-click to add
          </p>
        </div>

        {/* Bottom-right: stats */}
        <div className="absolute bottom-5 right-5 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
          {/* Realtime connection status */}
          <div
            className="flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-md"
            style={{
              background: "rgba(9,9,18,0.75)",
              border: `1px solid ${
                rtStatus === "live"  ? "rgba(48,209,88,0.35)"  :
                rtStatus === "error" ? "rgba(255,45,85,0.35)"  :
                                       "rgba(80,80,130,0.28)"
              }`,
              color: rtStatus === "live"  ? "rgba(48,209,88,0.8)"  :
                     rtStatus === "error" ? "rgba(255,45,85,0.8)"  :
                                            "rgba(130,130,175,0.75)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: rtStatus === "live"  ? "#30d158" :
                            rtStatus === "error" ? "#ff2d55" : "#888",
                animation: rtStatus === "live" ? "bitrot-pulse 2s ease-in-out infinite" : undefined,
              }}
            />
            {rtStatus === "live" ? "realtime live" : rtStatus === "error" ? "disconnected" : "connecting…"}
          </div>
          <HudPill>
            {thoughts.length} node{thoughts.length !== 1 ? "s" : ""}
          </HudPill>
          <HudPill>
            {Math.round(pan.x)},{Math.round(pan.y)}
          </HudPill>
        </div>

        {/* Bottom-left: hint */}
        <div className="absolute bottom-5 left-5 z-10 pointer-events-none">
          <HudPill>4000 × 4000 canvas</HudPill>
        </div>

        {/* Global keyframes */}
        <style>{`
          @keyframes bitrot-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.35; }
          }
          @keyframes target-ping {
            0%   { box-shadow: 0 0 0 0 rgba(167,139,250,0.55), 0 0 20px rgba(167,139,250,0.4); }
            100% { box-shadow: 0 0 0 14px rgba(167,139,250,0), 0 0 20px rgba(167,139,250,0); }
          }
        `}</style>
      </div>

      {/* ── Modal (rendered outside canvas so it sits on top) ────────────── */}
      {modal.open && (
        <AddThoughtModal
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </>
  );
}

// ─── HudPill ─────────────────────────────────────────────────────────────────

function HudPill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] px-2.5 py-1 rounded-md"
      style={{
        background: "rgba(9,9,18,0.75)",
        border: "1px solid rgba(80,80,130,0.28)",
        color: "rgba(130,130,175,0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}
