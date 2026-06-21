import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeFrame,
  createAnalysisState,
  type AudioMetrics,
} from "../lib/audioAnalysis";
import type { SpotifyTrack } from "../lib/spotify/types";

const IDLE_METRICS: AudioMetrics = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  energy: 0,
  bpm: 90,
  beat: false,
  beatIntensity: 0,
  drop: false,
  buildUp: 0,
};

function simulatedMetrics(
  track: SpotifyTrack,
  elapsedMs: number,
  prev: AudioMetrics
): AudioMetrics {
  const bpm = track.tempo ?? 120;
  const energy = track.energy ?? 0.6;
  const beatPeriod = 60_000 / bpm;
  const phase = (elapsedMs % beatPeriod) / beatPeriod;
  const beat = phase < 0.12;
  const pulse = beat ? 1 : Math.max(0, 1 - phase * 2.5);
  const wave = 0.45 + Math.sin(elapsedMs / 420) * 0.18;

  return {
    bass: Math.min(1, energy * 0.85 * pulse + wave * 0.15),
    mid: Math.min(1, energy * 0.65 * wave + pulse * 0.2),
    treble: Math.min(1, energy * 0.45 * (1 - pulse * 0.3) + wave * 0.1),
    volume: Math.min(1, 0.35 + energy * 0.45),
    energy: Math.min(1, energy * 0.75 + pulse * 0.25),
    bpm,
    beat,
    beatIntensity: beat ? energy : prev.beatIntensity * 0.85,
    drop: beat && energy > 0.78 && phase < 0.04,
    buildUp: Math.min(1, phase > 0.65 ? (phase - 0.65) / 0.35 : 0),
  };
}

export function useMusicAnalysis(
  getAnalyser: () => AnalyserNode | null,
  getTrack: () => SpotifyTrack | null,
  isPlaying: () => boolean,
  playbackMode: () => "spotify" | "preview" | null
) {
  const [metrics, setMetrics] = useState<AudioMetrics>(IDLE_METRICS);
  const stateRef = useRef(createAnalysisState());
  const rafRef = useRef(0);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const startedAtRef = useRef(0);

  const tick = useCallback(() => {
    const analyser = getAnalyser();
    const playing = isPlaying();
    const track = getTrack();
    const mode = playbackMode();

    if (!playing || !track) {
      setMetrics((prev) =>
        prev.energy > 0.01
          ? {
              ...IDLE_METRICS,
              energy: prev.energy * 0.92,
              bass: prev.bass * 0.92,
            }
          : IDLE_METRICS
      );
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (mode === "preview" && analyser) {
      if (!dataRef.current) {
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      const bpmHint = track.tempo ?? 120;
      const next = analyzeFrame(
        analyser,
        dataRef.current,
        stateRef.current,
        bpmHint
      );
      setMetrics(next);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (!startedAtRef.current) startedAtRef.current = performance.now();
    const elapsed = performance.now() - startedAtRef.current;
    setMetrics((prev) => simulatedMetrics(track, elapsed, prev));
    rafRef.current = requestAnimationFrame(tick);
  }, [getAnalyser, getTrack, isPlaying, playbackMode]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const reset = useCallback(() => {
    stateRef.current = createAnalysisState();
    startedAtRef.current = 0;
    setMetrics(IDLE_METRICS);
  }, []);

  return { metrics, reset };
}
