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

const METRICS_UPDATE_MS = 50;

function metricsChanged(a: AudioMetrics, b: AudioMetrics): boolean {
  return (
    Math.abs(a.bass - b.bass) > 0.02 ||
    Math.abs(a.mid - b.mid) > 0.02 ||
    Math.abs(a.treble - b.treble) > 0.02 ||
    Math.abs(a.energy - b.energy) > 0.02 ||
    Math.abs(a.bpm - b.bpm) > 0.5 ||
    a.beat !== b.beat ||
    a.drop !== b.drop
  );
}

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
  playbackMode: () => "spotify" | "preview" | null,
  onFrameMetrics?: (metrics: AudioMetrics) => void
) {
  const [metrics, setMetrics] = useState<AudioMetrics>(IDLE_METRICS);
  const stateRef = useRef(createAnalysisState());
  const rafRef = useRef(0);
  const loopActiveRef = useRef(false);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const startedAtRef = useRef(0);
  const lastPublishRef = useRef(0);
  const metricsRef = useRef<AudioMetrics>(IDLE_METRICS);
  const onFrameRef = useRef(onFrameMetrics);
  onFrameRef.current = onFrameMetrics;

  const publishMetrics = useCallback((next: AudioMetrics, force = false) => {
    const prev = metricsRef.current;
    metricsRef.current = next;

    const now = performance.now();
    const shouldPublish =
      force ||
      now - lastPublishRef.current >= METRICS_UPDATE_MS ||
      metricsChanged(prev, next);

    if (shouldPublish) {
      lastPublishRef.current = now;
      onFrameRef.current?.(next);
      setMetrics((state) => (metricsChanged(state, next) ? next : state));
    }
  }, []);

  const tick = useCallback(() => {
    const analyser = getAnalyser();
    const playing = isPlaying();
    const track = getTrack();
    const mode = playbackMode();

    if (!playing || !track) {
      const decayed =
        metricsRef.current.energy > 0.01
          ? {
              ...IDLE_METRICS,
              energy: metricsRef.current.energy * 0.92,
              bass: metricsRef.current.bass * 0.92,
            }
          : IDLE_METRICS;

      publishMetrics(decayed, decayed.energy < 0.01);

      if (decayed.energy < 0.01) {
        loopActiveRef.current = false;
        rafRef.current = 0;
        return;
      }

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
      publishMetrics(next);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (!startedAtRef.current) startedAtRef.current = performance.now();
    const elapsed = performance.now() - startedAtRef.current;
    publishMetrics(simulatedMetrics(track, elapsed, metricsRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, [getAnalyser, getTrack, isPlaying, playbackMode, publishMetrics]);

  const ensureLoop = useCallback(() => {
    if (loopActiveRef.current) return;
    loopActiveRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    ensureLoop();
    return () => {
      loopActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [ensureLoop]);

  const reset = useCallback(() => {
    stateRef.current = createAnalysisState();
    startedAtRef.current = 0;
    lastPublishRef.current = 0;
    metricsRef.current = IDLE_METRICS;
    setMetrics(IDLE_METRICS);
  }, []);

  return { metrics, metricsRef, reset, ensureLoop };
}
