import type { AudioMetrics } from "./audioAnalysis";
import type { SpotifyTrack } from "./spotify/types";

export type MoodId = "lofi" | "edm" | "rock" | "classical" | "ambient" | "jazz";

export type MoodTheme = {
  id: MoodId;
  label: string;
  accent: string;
  accentDeep: string;
  accentPink: string;
  bgGlowA: string;
  bgGlowB: string;
  particleSpeed: number;
  particleCount: number;
  pulseStrength: number;
  motionSpeed: number;
};

const MOODS: Record<MoodId, MoodTheme> = {
  lofi: {
    id: "lofi",
    label: "Lo-Fi",
    accent: "#a8b4ff",
    accentDeep: "#6b7fd4",
    accentPink: "#c4a8ff",
    bgGlowA: "rgba(107, 127, 212, 0.35)",
    bgGlowB: "rgba(168, 180, 255, 0.2)",
    particleSpeed: 0.4,
    particleCount: 48,
    pulseStrength: 0.35,
    motionSpeed: 0.6,
  },
  edm: {
    id: "edm",
    label: "EDM",
    accent: "#00f5ff",
    accentDeep: "#7f40ff",
    accentPink: "#fb8dff",
    bgGlowA: "rgba(0, 245, 255, 0.4)",
    bgGlowB: "rgba(251, 141, 255, 0.35)",
    particleSpeed: 1.8,
    particleCount: 90,
    pulseStrength: 0.85,
    motionSpeed: 2.2,
  },
  rock: {
    id: "rock",
    label: "Rock",
    accent: "#ff6b35",
    accentDeep: "#c41e1e",
    accentPink: "#ff9a5c",
    bgGlowA: "rgba(196, 30, 30, 0.4)",
    bgGlowB: "rgba(255, 107, 53, 0.3)",
    particleSpeed: 1.4,
    particleCount: 72,
    pulseStrength: 0.75,
    motionSpeed: 1.6,
  },
  classical: {
    id: "classical",
    label: "Classical",
    accent: "#f5e6c8",
    accentDeep: "#c9a227",
    accentPink: "#fff8e7",
    bgGlowA: "rgba(201, 162, 39, 0.25)",
    bgGlowB: "rgba(245, 230, 200, 0.15)",
    particleSpeed: 0.5,
    particleCount: 40,
    pulseStrength: 0.3,
    motionSpeed: 0.45,
  },
  ambient: {
    id: "ambient",
    label: "Ambient",
    accent: "#8ec5ff",
    accentDeep: "#4a7fd4",
    accentPink: "#b8d4ff",
    bgGlowA: "rgba(74, 127, 212, 0.3)",
    bgGlowB: "rgba(142, 197, 255, 0.2)",
    particleSpeed: 0.35,
    particleCount: 56,
    pulseStrength: 0.28,
    motionSpeed: 0.5,
  },
  jazz: {
    id: "jazz",
    label: "Jazz",
    accent: "#ffb347",
    accentDeep: "#c9782a",
    accentPink: "#ffd699",
    bgGlowA: "rgba(201, 120, 42, 0.3)",
    bgGlowB: "rgba(255, 179, 71, 0.2)",
    particleSpeed: 0.55,
    particleCount: 44,
    pulseStrength: 0.32,
    motionSpeed: 0.65,
  },
};

const GENRE_TO_MOOD: Record<string, MoodId> = {
  lofi: "lofi",
  ambient: "ambient",
  electronic: "edm",
  jazz: "jazz",
  classical: "classical",
  rock: "rock",
};

export function getMoodForTrack(track: SpotifyTrack | null): MoodTheme {
  if (!track) return MOODS.lofi;

  const energy = track.energy ?? 0.5;
  const valence = track.valence ?? 0.5;
  const dance = track.danceability ?? 0.5;

  if (energy > 0.72 && dance > 0.6) return MOODS.edm;
  if (energy > 0.68 && valence < 0.45) return MOODS.rock;
  if (energy < 0.35) return MOODS.ambient;
  if (dance > 0.55 && valence > 0.45 && energy < 0.6) return MOODS.jazz;
  if (valence > 0.65 && energy < 0.55) return MOODS.classical;
  if (energy < 0.55) return MOODS.lofi;
  return MOODS.edm;
}

/** @deprecated kept for legacy references */
export function getMoodForGenre(genre: string | null): MoodTheme {
  if (!genre) return MOODS.lofi;
  return MOODS[GENRE_TO_MOOD[genre] as MoodId] ?? MOODS.lofi;
}

export function applyMoodToDocument(mood: MoodTheme, metrics: AudioMetrics) {
  const root = document.documentElement;
  const energyBoost = 1 + metrics.energy * 0.35;

  root.style.setProperty("--music-accent", mood.accent);
  root.style.setProperty("--music-accent-deep", mood.accentDeep);
  root.style.setProperty("--music-accent-pink", mood.accentPink);
  root.style.setProperty("--music-glow-a", mood.bgGlowA);
  root.style.setProperty("--music-glow-b", mood.bgGlowB);
  root.style.setProperty(
    "--music-pulse",
    String(metrics.bass * mood.pulseStrength * energyBoost)
  );
  root.style.setProperty(
    "--music-energy",
    String(metrics.energy * energyBoost)
  );
  root.style.setProperty("--music-bpm-factor", String(metrics.bpm / 120));
}

export function getMoodClass(moodId: MoodId): string {
  return `music-mood-${moodId}`;
}
