// Represents a single "thought" node in the BitRot void canvas
export interface Thought {
  id: string;
  text: string;
  x: number; // Canvas X coordinate (in pixels, canvas space)
  y: number; // Canvas Y coordinate (in pixels, canvas space)
  health: number; // 0–100 representing integrity/freshness
  createdAt: number; // Unix timestamp
  tags?: string[];
}

export type ThoughtHealthStatus = "critical" | "decaying" | "fading" | "healthy";

export function getHealthStatus(health: number): ThoughtHealthStatus {
  if (health <= 20) return "critical";
  if (health <= 45) return "decaying";
  if (health <= 70) return "fading";
  return "healthy";
}

export function getHealthColor(health: number): string {
  if (health <= 20) return "#ff2d55"; // Crimson — critical
  if (health <= 45) return "#ff9f0a"; // Amber — decaying
  if (health <= 70) return "#ffd60a"; // Yellow — fading
  return "#30d158";                   // Green  — healthy
}
