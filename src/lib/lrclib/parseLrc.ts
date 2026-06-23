import type { LrcLine } from "./types"

const LRC_LINE_RE = /^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s?(.*)/

export type LyricSyncState = {
  activeIndex: number
  lineProgress: number
  lineStartMs: number
  lineEndMs: number
}

export type WordSyncState = {
  activeWordIndex: number
  wordProgress: number
}

const splitLyricWords = (text: string): string[] =>
  text.split(/(\s+)/).filter((part) => part.length > 0)

export const getWordSyncState = (
  text: string,
  lineStartMs: number,
  lineEndMs: number,
  positionMs: number
): WordSyncState => {
  const tokens = splitLyricWords(text)
  const words = tokens.filter((token) => !/^\s+$/.test(token))

  if (words.length === 0) {
    return { activeWordIndex: -1, wordProgress: 0 }
  }

  const span = Math.max(lineEndMs - lineStartMs, 1)
  const elapsed = Math.min(Math.max(positionMs - lineStartMs, 0), span)
  const lineProgress = elapsed / span

  const weights = words.map((word) => Math.max(word.length, 1))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  let accumulated = 0
  for (let i = 0; i < words.length; i++) {
    const wordStart = accumulated / totalWeight
    accumulated += weights[i]
    const wordEnd = accumulated / totalWeight

    if (lineProgress <= wordEnd || i === words.length - 1) {
      const wordSpan = Math.max(wordEnd - wordStart, 0.001)
      const wordProgress = Math.min(
        1,
        Math.max(0, (lineProgress - wordStart) / wordSpan)
      )
      return { activeWordIndex: i, wordProgress }
    }
  }

  return { activeWordIndex: words.length - 1, wordProgress: 1 }
}

export const parseLrc = (lrc: string): LrcLine[] => {
  const results: LrcLine[] = []

  for (const line of lrc.split("\n")) {
    const match = line.match(LRC_LINE_RE)
    if (!match) continue

    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const frac = match[3]
    const hundredths =
      frac.length === 2 ? parseInt(frac, 10) * 10 : parseInt(frac, 10)
    const timeMs = (minutes * 60 + seconds) * 1000 + hundredths
    const text = match[4].trim()

    if (text.length > 0) {
      results.push({ timeMs, text })
    }
  }

  return results.sort((a, b) => a.timeMs - b.timeMs)
}

export const parsePlainLyrics = (plain: string, durationMs: number): LrcLine[] => {
  const texts = plain
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (texts.length === 0) return []

  const sliceMs = Math.max(durationMs / texts.length, 2000)

  return texts.map((text, index) => ({
    timeMs: Math.round(index * sliceMs),
    text,
  }))
}

export const getLyricSyncState = (
  lines: LrcLine[],
  positionMs: number,
  isSynced: boolean
): LyricSyncState => {
  const empty = {
    activeIndex: -1,
    lineProgress: 0,
    lineStartMs: 0,
    lineEndMs: 0,
  }

  if (lines.length === 0) return empty

  if (!isSynced) {
    return { ...empty, activeIndex: 0 }
  }

  let low = 0
  let high = lines.length - 1
  let active = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (lines[mid].timeMs <= positionMs) {
      active = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (active < 0) return empty

  const lineStartMs = lines[active].timeMs
  const lineEndMs =
    active < lines.length - 1
      ? lines[active + 1].timeMs
      : lineStartMs + 8000
  const span = Math.max(lineEndMs - lineStartMs, 1)
  const lineProgress = Math.min(
    1,
    Math.max(0, (positionMs - lineStartMs) / span)
  )

  return {
    activeIndex: active,
    lineProgress,
    lineStartMs,
    lineEndMs,
  }
}

/** @deprecated Use getLyricSyncState */
export const findActiveLineIndex = (
  lines: LrcLine[],
  positionMs: number,
  isSynced: boolean
): number => getLyricSyncState(lines, positionMs, isSynced).activeIndex
