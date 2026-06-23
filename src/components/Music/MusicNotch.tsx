import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { createPortal } from "react-dom"
import { useMusicReactive } from "../../context/MusicReactiveContext"
import { useSmoothPlaybackPosition } from "../../hooks/useSmoothPlaybackPosition"
import { getLyricSyncState } from "../../lib/lrclib/parseLrc"
import NotchKaraokeWords from "./NotchKaraokeWords"
import PlayPauseButton from "./PlayPauseButton"
import "./PlayPauseButton.css"
import "./NotchKaraokeWords.css"
import "./MusicNotch.css"

const COMPACT_BARS = 4
const EXPANDED_BARS = 12
const LERP = 0.14

const BAR_PHASES = Array.from({ length: EXPANDED_BARS }, (_, i) => ({
  speed: 1.6 + (i % 5) * 0.35,
  offset: i * 0.72 + (i % 3) * 0.4,
  amp: 0.28 + (i % 4) * 0.06,
}))

const formatTime = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, "0")}`
}

const getLineEndMs = (
  lines: { timeMs: number }[],
  index: number
): number => {
  if (index < lines.length - 1) return lines[index + 1].timeMs
  return lines[index].timeMs + 8000
}

type MarqueeTextProps = {
  text: string
  className?: string
}

const MarqueeText = ({ text, className = "" }: MarqueeTextProps) => {
  const needsMarquee = text.length > 22

  if (!needsMarquee) {
    return <span className={className}>{text}</span>
  }

  return (
    <div className="music-notch-marquee" aria-hidden="true">
      <span className={`music-notch-marquee-track ${className}`}>
        {text}
        <span className="music-notch-marquee-gap" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        {text}
      </span>
    </div>
  )
}

const MusicNotch = () => {
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [beatPulse, setBeatPulse] = useState(false)
  const notchRef = useRef<HTMLDivElement>(null)
  const prevTrackIdRef = useRef<string | null>(null)
  const prevBeatRef = useRef(false)

  const {
    isPlaying,
    isPaused,
    activeTrack,
    playbackMode,
    playbackPositionMs,
    metrics,
    lyricsLines,
    lyricsSynced,
    lyricsInstrumental,
    lyricsLoading,
    lyricsError,
    openMusicSearch,
    togglePause,
    stop,
  } = useMusicReactive()

  const smoothPositionMs = useSmoothPlaybackPosition(
    playbackPositionMs,
    isPlaying,
    isPaused
  )

  const syncState = useMemo(
    () => getLyricSyncState(lyricsLines, smoothPositionMs, lyricsSynced),
    [lyricsLines, smoothPositionMs, lyricsSynced]
  )

  const activeLyricIndex = syncState.activeIndex
  const hasLyrics = lyricsLines.length > 0 && !lyricsInstrumental && !lyricsError
  const showKaraoke = hasLyrics && !lyricsLoading

  const compactBarRefs = useRef<(HTMLSpanElement | null)[]>([])
  const expandedBarRefs = useRef<(HTMLSpanElement | null)[]>([])
  const metricsRef = useRef(metrics)
  const heightsRef = useRef<number[]>(
    Array.from({ length: EXPANDED_BARS }, (_, i) => 0.38 + (i % 3) * 0.08)
  )

  metricsRef.current = metrics

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!activeTrack) return
    if (prevTrackIdRef.current !== activeTrack.id) {
      setExpanded(false)
      prevTrackIdRef.current = activeTrack.id
    }
  }, [activeTrack])

  useEffect(() => {
    if (isPaused) setExpanded(false)
  }, [isPaused])

  useEffect(() => {
    if (!expanded) return

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (notchRef.current?.contains(target)) return
      setExpanded(false)
    }

    const handleKeyDown = (e: Event) => {
      if ((e as globalThis.KeyboardEvent).key === "Escape") setExpanded(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [expanded])

  useEffect(() => {
    if (!metrics.beat || prevBeatRef.current) return
    setBeatPulse(true)
    const t = window.setTimeout(() => setBeatPulse(false), 180)
    prevBeatRef.current = true
    return () => window.clearTimeout(t)
  }, [metrics.beat])

  useEffect(() => {
    if (!metrics.beat) prevBeatRef.current = false
  }, [metrics.beat])

  useEffect(() => {
    if (!isPlaying) return

    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const { bass, mid, treble, energy, beat } = metricsRef.current
      const t = (now - start) / 1000
      const travel = t * 2.4

      for (let i = 0; i < EXPANDED_BARS; i++) {
        const { speed, offset, amp } = BAR_PHASES[i]
        const flow = Math.sin(travel * 0.85 - i * 0.55) * 0.12
        const pulse =
          0.42 +
          Math.sin(t * speed + offset) * amp +
          Math.sin(t * speed * 0.55 + offset * 1.7) * (amp * 0.45) +
          flow
        const band = i < 4 ? bass : i < 8 ? mid : treble
        const beatBoost = beat ? 0.14 : 0
        const target = Math.min(
          1,
          Math.max(0.14, 0.2 + band * 0.55 + energy * 0.26 + pulse * 0.38 + beatBoost)
        )
        heightsRef.current[i] +=
          (target - heightsRef.current[i]) * LERP
      }

      const applyBar = (el: HTMLSpanElement, h: number, compact: boolean) => {
        const scale = h
        const drift = Math.sin(travel + h * 4) * (compact ? 0.6 : 1)
        el.style.transform = `translateY(${drift}px) scaleY(${scale})`
        el.style.opacity = String(0.62 + h * 0.38)
      }

      compactBarRefs.current.forEach((el, i) => {
        if (!el) return
        applyBar(el, heightsRef.current[i] ?? 0.35, true)
      })

      expandedBarRefs.current.forEach((el, i) => {
        if (!el) return
        applyBar(el, heightsRef.current[i] ?? 0.35, false)
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])

  const handleTogglePause = (e?: MouseEvent) => {
    e?.stopPropagation()
    void togglePause()
  }

  const handleShellActivate = () => {
    setExpanded((v) => !v)
  }

  const handleShellKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    handleShellActivate()
  }

  const handleExpandClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setExpanded((v) => !v)
  }

  const handleStop = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    void stop()
    setExpanded(false)
  }

  const handlePointerEnter = () => setHovered(true)
  const handlePointerLeave = () => setHovered(false)

  if (!mounted || !isPlaying || !activeTrack) return null

  const progress =
    activeTrack.durationMs > 0
      ? Math.min(1, smoothPositionMs / activeTrack.durationMs)
      : 0

  const activeLine =
    activeLyricIndex >= 0 ? lyricsLines[activeLyricIndex] : null
  const prevLine =
    activeLyricIndex > 0 ? lyricsLines[activeLyricIndex - 1] : null
  const nextLine =
    activeLyricIndex >= 0 && activeLyricIndex < lyricsLines.length - 1
      ? lyricsLines[activeLyricIndex + 1]
      : null

  const notchClass = [
    "music-notch",
    lyricsSynced && showKaraoke ? "music-notch-lyrics-synced" : "",
    beatPulse ? "music-notch-beat" : "",
    hovered && !expanded ? "music-notch-hovered" : "",
    expanded ? "music-notch-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const renderCompactLyrics = () => {
    if (lyricsLoading) {
      return (
        <div className="music-notch-lyric-skeleton" aria-hidden="true">
          <span />
        </div>
      )
    }

    if (lyricsInstrumental) {
      return (
        <div className="music-notch-lyric-fallback">
          <span className="music-notch-lyric-badge">Instrumental</span>
        </div>
      )
    }

    if (lyricsError || lyricsLines.length === 0) {
      return (
        <div className="music-notch-lyric-fallback">
          <MarqueeText text={activeTrack.name} className="music-notch-lyric-fallback-text" />
          <span className="music-notch-lyric-badge music-notch-lyric-badge-muted">No lyrics</span>
        </div>
      )
    }

    if (!activeLine) {
      return (
        <div className="music-notch-lyric-fallback">
          <MarqueeText text={activeTrack.name} className="music-notch-lyric-fallback-text" />
        </div>
      )
    }

    return (
      <div className="music-notch-lyric-line">
        {!lyricsSynced && (
          <span className="music-notch-estimated-dot" aria-label="Estimated timing" title="Estimated timing" />
        )}
        <div className="music-notch-lyric-karaoke">
          <NotchKaraokeWords
            text={activeLine.text}
            lineStartMs={activeLine.timeMs}
            lineEndMs={getLineEndMs(lyricsLines, activeLyricIndex)}
            positionMs={smoothPositionMs}
            variant="compact"
            isActive
          />
        </div>
      </div>
    )
  }

  return createPortal(
    <>
      {expanded && (
        <div
          className="music-notch-backdrop"
          aria-hidden="true"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        ref={notchRef}
        className={notchClass}
        role="region"
        aria-label={`Now playing: ${activeTrack.name} by ${activeTrack.artists}`}
        aria-expanded={expanded}
      >
        <div
          className="music-notch-shell"
          role="button"
          tabIndex={0}
          data-cursor="disable"
          onClick={handleShellActivate}
          onKeyDown={handleShellKeyDown}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          aria-label={expanded ? "Collapse player" : "Expand player"}
        >
          <div className="music-notch-shadow" aria-hidden="true" />
          <div className="music-notch-compact">
            {expanded && activeTrack.albumArt && (
              <div
                className="music-notch-expanded-bg"
                style={{ backgroundImage: `url("${activeTrack.albumArt}")` }}
                aria-hidden="true"
              />
            )}
            <div className="music-notch-glass" aria-hidden="true" />
            <div className="music-notch-border-ring" aria-hidden="true" />

            <div className="music-notch-row">
              {activeTrack.albumArt ? (
                <img
                  className="music-notch-art"
                  src={activeTrack.albumArt}
                  alt=""
                />
              ) : (
                <span className="music-notch-art-fallback">♪</span>
              )}

              <div className="music-notch-wave" aria-hidden="true">
                {Array.from({ length: COMPACT_BARS }).map((_, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      compactBarRefs.current[i] = el
                    }}
                    className="music-notch-bar"
                  />
                ))}
              </div>

              {renderCompactLyrics()}

              <button
                type="button"
                className="music-notch-expand-btn"
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse player" : "Expand player"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d={expanded ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="music-notch-expanded-panel">
              <div className="music-notch-expanded-panel-inner">
                <div className="music-notch-expanded-top">
                  <div className={`music-notch-expanded-art-wrap ${beatPulse ? "music-notch-art-beat" : ""}`}>
                    {activeTrack.albumArt ? (
                      <img
                        className="music-notch-expanded-art"
                        src={activeTrack.albumArt}
                        alt=""
                      />
                    ) : (
                      <span className="music-notch-expanded-art-fallback">♪</span>
                    )}
                  </div>
                  <div className="music-notch-expanded-meta">
                    <strong>{activeTrack.name}</strong>
                    <span>
                      {activeTrack.artists} · {formatTime(smoothPositionMs)} / {formatTime(activeTrack.durationMs)}
                    </span>
                    <div className="music-notch-expanded-badges">
                      {lyricsSynced && showKaraoke && (
                        <span className="music-notch-sync-badge">Synced</span>
                      )}
                      {playbackMode === "preview" && (
                        <span className="music-notch-preview-badge">Preview</span>
                      )}
                      {showKaraoke && !lyricsSynced && (
                        <span className="music-notch-estimated-badge">Estimated</span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="music-notch-progress"
                  role="progressbar"
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Playback progress"
                >
                  <div
                    className="music-notch-progress-fill"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                </div>

                <div
                  className="music-notch-karaoke-zone"
                  role="log"
                  aria-live="polite"
                  aria-label="Live lyrics"
                >
                  {lyricsLoading && (
                    <div className="music-notch-karaoke-skeleton" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}

                  {!lyricsLoading && lyricsInstrumental && (
                    <p className="music-notch-karaoke-empty">Instrumental — no lyrics</p>
                  )}

                  {!lyricsLoading && !lyricsInstrumental && (lyricsError || lyricsLines.length === 0) && (
                    <p className="music-notch-karaoke-empty">Lyrics not available for this track</p>
                  )}

                  {!lyricsLoading && showKaraoke && (
                    <>
                      {prevLine && (
                        <p className="music-notch-karaoke-line music-notch-karaoke-line-past">
                          <NotchKaraokeWords
                            text={prevLine.text}
                            lineStartMs={prevLine.timeMs}
                            lineEndMs={getLineEndMs(lyricsLines, activeLyricIndex - 1)}
                            positionMs={smoothPositionMs}
                            variant="expanded"
                            isPast
                          />
                        </p>
                      )}
                      {activeLine && (
                        <p className="music-notch-karaoke-line music-notch-karaoke-line-active">
                          <NotchKaraokeWords
                            text={activeLine.text}
                            lineStartMs={activeLine.timeMs}
                            lineEndMs={getLineEndMs(lyricsLines, activeLyricIndex)}
                            positionMs={smoothPositionMs}
                            variant="expanded"
                            isActive
                          />
                        </p>
                      )}
                      {nextLine && (
                        <p className="music-notch-karaoke-line music-notch-karaoke-line-next">
                          <NotchKaraokeWords
                            text={nextLine.text}
                            lineStartMs={nextLine.timeMs}
                            lineEndMs={getLineEndMs(lyricsLines, activeLyricIndex + 1)}
                            positionMs={smoothPositionMs}
                            variant="expanded"
                            isActive={false}
                          />
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="music-notch-expanded-wave" aria-hidden="true">
                  {Array.from({ length: EXPANDED_BARS }).map((_, i) => (
                    <span
                      key={i}
                      ref={(el) => {
                        expandedBarRefs.current[i] = el
                      }}
                      className="music-notch-bar music-notch-bar-lg"
                    />
                  ))}
                </div>

                <div className="music-notch-expanded-actions">
                  <PlayPauseButton
                    isPaused={isPaused}
                    onToggle={() => handleTogglePause()}
                    size="md"
                    className="play-pause-btn-notch music-notch-play-btn-expanded"
                  />
                  <button
                    type="button"
                    className="music-notch-action"
                    onClick={(e) => {
                      e.stopPropagation()
                      openMusicSearch()
                    }}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className="music-notch-action music-notch-action-stop"
                    onClick={handleStop}
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export default MusicNotch
