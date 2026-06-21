export type AudioMetrics = {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  energy: number;
  bpm: number;
  beat: boolean;
  beatIntensity: number;
  drop: boolean;
  buildUp: number;
};

const BEAT_COOLDOWN_MS = 120;

export function createAnalyser(ctx: AudioContext): AnalyserNode {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.75;
  return analyser;
}

export function analyzeFrame(
  analyser: AnalyserNode,
  data: Uint8Array<ArrayBuffer>,
  state: {
    lastBeat: number;
    energyHistory: number[];
    bpmEstimate: number;
    beatTimes: number[];
  },
  genreBpmHint = 90
): AudioMetrics {
  analyser.getByteFrequencyData(data);

  const len = data.length;
  const bassEnd = Math.floor(len * 0.08);
  const midEnd = Math.floor(len * 0.45);

  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;
  let totalSum = 0;

  for (let i = 0; i < len; i++) {
    const v = data[i] / 255;
    totalSum += v;
    if (i < bassEnd) bassSum += v;
    else if (i < midEnd) midSum += v;
    else trebleSum += v;
  }

  const bass = bassSum / Math.max(bassEnd, 1);
  const mid = midSum / Math.max(midEnd - bassEnd, 1);
  const treble = trebleSum / Math.max(len - midEnd, 1);
  const volume = totalSum / len;
  const energy = bass * 0.45 + mid * 0.35 + treble * 0.2;

  state.energyHistory.push(energy);
  if (state.energyHistory.length > 32) state.energyHistory.shift();

  const avgEnergy =
    state.energyHistory.reduce((a, b) => a + b, 0) /
    Math.max(state.energyHistory.length, 1);
  const buildUp = Math.max(0, Math.min(1, (energy - avgEnergy + 0.15) * 2));

  const now = performance.now();
  const beatThreshold = 0.28 + avgEnergy * 0.35;
  let beat = false;
  let beatIntensity = 0;

  if (bass > beatThreshold && now - state.lastBeat > BEAT_COOLDOWN_MS) {
    beat = true;
    beatIntensity = Math.min(1, (bass - beatThreshold) * 3);
    state.lastBeat = now;
    state.beatTimes.push(now);
    if (state.beatTimes.length > 8) state.beatTimes.shift();

    if (state.beatTimes.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < state.beatTimes.length; i++) {
        intervals.push(state.beatTimes[i] - state.beatTimes[i - 1]);
      }
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 200 && avgInterval < 2000) {
        state.bpmEstimate = Math.round(60000 / avgInterval);
      }
    }
  }

  const recentLow = state.energyHistory.slice(-8, -2);
  const recentAvg =
    recentLow.length > 0
      ? recentLow.reduce((a, b) => a + b, 0) / recentLow.length
      : avgEnergy;
  const drop = energy > 0.55 && recentAvg < 0.25 && bass > 0.4;

  return {
    bass,
    mid,
    treble,
    volume,
    energy,
    bpm: state.bpmEstimate || genreBpmHint,
    beat,
    beatIntensity,
    drop,
    buildUp,
  };
}

export function createAnalysisState() {
  return {
    lastBeat: 0,
    energyHistory: [] as number[],
    bpmEstimate: 0,
    beatTimes: [] as number[],
  };
}
