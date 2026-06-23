import { useEffect, useRef, useState } from "react"

export const useSmoothPlaybackPosition = (
  playbackPositionMs: number,
  isPlaying: boolean,
  isPaused: boolean
) => {
  const anchorRef = useRef({
    positionMs: playbackPositionMs,
    timestamp: performance.now(),
  })
  const [smoothPositionMs, setSmoothPositionMs] = useState(playbackPositionMs)

  useEffect(() => {
    anchorRef.current = {
      positionMs: playbackPositionMs,
      timestamp: performance.now(),
    }
    setSmoothPositionMs(playbackPositionMs)
  }, [playbackPositionMs])

  useEffect(() => {
    if (!isPlaying || isPaused) return

    let raf = 0
    const tick = () => {
      const { positionMs, timestamp } = anchorRef.current
      const elapsed = performance.now() - timestamp
      setSmoothPositionMs(positionMs + elapsed)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, isPaused, playbackPositionMs])

  return smoothPositionMs
}
