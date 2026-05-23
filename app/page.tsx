import VoidCanvas from "@/components/VoidCanvas";
import { Thought } from "@/types/thought";

// ─── Placeholder Thoughts ────────────────────────────────────────────────────
// These seed the canvas with demo data. Replace with DB-driven data later.

const PLACEHOLDER_THOUGHTS: Thought[] = [
  {
    id: "1",
    text: "The universe tends toward entropy. So do ideas.",
    x: 300,
    y: 240,
    health: 92,
    createdAt: Date.now() - 1000 * 60 * 5,
    tags: ["philosophy", "entropy"],
  },
  {
    id: "2",
    text: "Finish the distributed cache invalidation RFC.",
    x: 720,
    y: 180,
    health: 64,
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    tags: ["engineering", "urgent"],
  },
  {
    id: "3",
    text: "Why does nostalgia feel sharper at 2 AM?",
    x: 500,
    y: 480,
    health: 41,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    tags: ["introspection"],
  },
  {
    id: "4",
    text: "Read: Gödel, Escher, Bach — chapter 6.",
    x: 960,
    y: 380,
    health: 18,
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    tags: ["reading", "math"],
  },
  {
    id: "5",
    text: "There is beauty in the half-remembered.",
    x: 200,
    y: 560,
    health: 76,
    createdAt: Date.now() - 1000 * 60 * 30,
    tags: ["writing"],
  },
  {
    id: "6",
    text: "Build a time-capsule for code commits.",
    x: 820,
    y: 600,
    health: 55,
    createdAt: Date.now() - 1000 * 60 * 90,
    tags: ["project idea"],
  },
  {
    id: "7",
    text: "Call Mom — it has been too long.",
    x: 440,
    y: 320,
    health: 9,
    createdAt: Date.now() - 1000 * 60 * 60 * 120,
    tags: ["personal"],
  },
];

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <VoidCanvas thoughts={PLACEHOLDER_THOUGHTS} />
    </main>
  );
}
