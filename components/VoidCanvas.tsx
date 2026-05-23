"use client";

import { useCallback, useEffect, useRef, useState, WheelEvent } from "react";
import { Thought, getHealthColor, getHealthStatus } from "@/types/thought";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoidCanvasProps {
  thoughts: Thought[];
  onThoughtClick?: (thought: Thought) => void;
}

interface CanvasTransform {
  x: number; // Pan offset X
  y: number; // Pan offset Y
  scale: number; // Zoom level
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;
const ZOOM_SENSITIVITY = 0.001;
const GRID_SIZE = 60;

// ─── ThoughtNode Component ────────────────────────────────────────────────────

function ThoughtNode({
  thought,
  onClick,
}: {
  thought: Thought;
  onClick?: (t: Thought) => void;
}) {
  const healthColor = getHealthColor(thought.health);
  const status = getHealthStatus(thought.health);
  const opacity = 0.3 + (thought.health / 100) * 0.7; // Low health = more transparent

  return (
    <div
      id={`thought-${thought.id}`}
      className="thought-node absolute select-none cursor-pointer group"
      style={{
        left: thought.x,
        top: thought.y,
        transform: "translate(-50%, -50%)",
        opacity,
      }}
      onClick={() => onClick?.(thought)}
      role="button"
      aria-label={`Thought: ${thought.text}, health ${thought.health}%`}
    >
      {/* Pulsing glow ring */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          boxShadow: `0 0 ${24 + thought.health * 0.3}px ${healthColor}40`,
          background: `radial-gradient(ellipse at center, ${healthColor}10 0%, transparent 70%)`,
          animation: status === "critical" ? "pulse-critical 1.2s ease-in-out infinite" : "none",
        }}
      />

      {/* Card body */}
      <div
        className="relative rounded-xl border backdrop-blur-sm px-4 py-3 min-w-[140px] max-w-[260px] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,18,0.92) 0%, rgba(18,18,32,0.85) 100%)`,
          borderColor: `${healthColor}55`,
          boxShadow: `0 0 0 1px ${healthColor}22, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Health bar */}
        <div className="mb-2 h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${thought.health}%`,
              background: `linear-gradient(90deg, ${healthColor}cc, ${healthColor})`,
              boxShadow: `0 0 6px ${healthColor}`,
            }}
          />
        </div>

        {/* Text content */}
        <p className="text-sm leading-snug font-medium" style={{ color: `rgba(230,230,255,${opacity})` }}>
          {thought.text}
        </p>

        {/* Footer: health % + status badge */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px]" style={{ color: healthColor }}>
            {thought.health.toFixed(0)}% integrity
          </span>
          <span
            className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full"
            style={{
              background: `${healthColor}22`,
              color: healthColor,
              border: `1px solid ${healthColor}44`,
            }}
          >
            {status}
          </span>
        </div>

        {/* Tags */}
        {thought.tags && thought.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {thought.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(180,180,220,0.7)" }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VoidCanvas ───────────────────────────────────────────────────────────────

export default function VoidCanvas({ thoughts, onThoughtClick }: VoidCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformRef = useRef(transform);

  // Keep ref in sync so event handlers always see fresh values
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // ── Pointer drag (pan) ───────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
    document.body.style.cursor = "grabbing";
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
  }, []);

  // ── Wheel zoom (pinch-to-zoom also fires this on trackpad) ───────────────
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => {
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta * prev.scale));
      const scaleRatio = newScale / prev.scale;

      // Zoom toward cursor position
      return {
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio,
        scale: newScale,
      };
    });
  }, []);

  // ── Reset view ───────────────────────────────────────────────────────────
  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // ── Grid dots ────────────────────────────────────────────────────────────
  const gridPattern = `radial-gradient(circle, rgba(80,80,130,0.35) 1px, transparent 1px)`;
  const gridSize = GRID_SIZE * transform.scale;

  return (
    <div
      ref={containerRef}
      id="void-canvas"
      className="relative w-full h-screen overflow-hidden"
      style={{ background: "#050508", cursor: "grab" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      aria-label="BitRot void canvas — infinite thought space"
    >
      {/* Animated dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: gridPattern,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${transform.x % gridSize}px ${transform.y % gridSize}px`,
          opacity: Math.min(1, transform.scale * 0.8 + 0.2),
          transition: "opacity 0.3s",
        }}
      />

      {/* Ambient vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(5,5,8,0.7) 100%)",
        }}
      />

      {/* Canvas world — all thoughts are positioned here */}
      <div
        id="void-canvas-world"
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {thoughts.map((thought) => (
          <ThoughtNode key={thought.id} thought={thought} onClick={onThoughtClick} />
        ))}

        {/* Empty state */}
        {thoughts.length === 0 && (
          <div
            className="absolute flex flex-col items-center gap-3 text-center"
            style={{ left: "50vw", top: "50vh", transform: "translate(-50%, -50%)" }}
          >
            <div className="text-5xl mb-2 opacity-30">⬚</div>
            <p className="text-slate-600 text-sm font-mono tracking-widest uppercase">The void is empty.</p>
            <p className="text-slate-700 text-xs">Add your first thought to begin.</p>
          </div>
        )}
      </div>

      {/* ── HUD overlay ──────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 pointer-events-none z-10">
        {/* Zoom indicator */}
        <div
          className="font-mono text-[11px] px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(10,10,20,0.8)",
            border: "1px solid rgba(80,80,130,0.3)",
            color: "rgba(150,150,200,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          {(transform.scale * 100).toFixed(0)}%
        </div>

        {/* Thought count */}
        <div
          className="font-mono text-[11px] px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(10,10,20,0.8)",
            border: "1px solid rgba(80,80,130,0.3)",
            color: "rgba(150,150,200,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          {thoughts.length} thought{thoughts.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Reset view button */}
      <button
        id="reset-view-btn"
        onClick={resetView}
        className="absolute bottom-6 left-6 z-10 font-mono text-[11px] px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "rgba(10,10,20,0.8)",
          border: "1px solid rgba(80,80,130,0.3)",
          color: "rgba(150,150,200,0.8)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
        aria-label="Reset canvas view to origin"
      >
        ⌖ reset view
      </button>

      {/* Top-left title */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1
          className="font-mono text-lg font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          BitRot
        </h1>
        <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(120,120,160,0.6)" }}>
          drag · scroll to zoom · click thoughts
        </p>
      </div>

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes pulse-critical {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .thought-node { transition: opacity 0.5s ease; }
      `}</style>
    </div>
  );
}
