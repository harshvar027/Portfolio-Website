import { useCallback, useRef } from "react";
import type { AudioMetrics } from "../lib/audioAnalysis";

export function useHaptics() {
  const lastVibrateRef = useRef(0);
  const supported =
    typeof navigator !== "undefined" && "vibrate" in navigator;

  const pulse = useCallback(
    (pattern: number | number[]) => {
      if (!supported) return;
      try {
        navigator.vibrate(pattern);
      } catch {
        /* noop */
      }
    },
    [supported]
  );

  const syncWithMetrics = useCallback(
    (metrics: AudioMetrics) => {
      if (!supported) return;

      const now = performance.now();
      const minGap = metrics.energy > 0.6 ? 80 : 140;

      if (metrics.drop && now - lastVibrateRef.current > 400) {
        pulse([80, 40, 120, 40, 160]);
        lastVibrateRef.current = now;
        return;
      }

      if (metrics.beat && now - lastVibrateRef.current > minGap) {
        const strength = Math.round(12 + metrics.beatIntensity * 28);
        if (metrics.bass > 0.5) {
          pulse(strength);
        } else {
          pulse(Math.max(8, strength - 6));
        }
        lastVibrateRef.current = now;
        return;
      }

      if (metrics.buildUp > 0.65 && now - lastVibrateRef.current > 200) {
        pulse(Math.round(6 + metrics.buildUp * 10));
        lastVibrateRef.current = now;
      }
    },
    [pulse, supported]
  );

  const stop = useCallback(() => {
    if (supported) {
      try {
        navigator.vibrate(0);
      } catch {
        /* noop */
      }
    }
  }, [supported]);

  return { supported, syncWithMetrics, stop, pulse };
}
