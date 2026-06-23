import { useMemo, type CSSProperties } from "react"
import { useMusicReactive } from "../../context/MusicReactiveContext"
import { useSmoothPlaybackPosition } from "../../hooks/useSmoothPlaybackPosition"
import { LYRICS_NOT_FOUND } from "../../lib/lrclib/messages"
import { getLyricSyncState } from "../../lib/lrclib/parseLrc"
import NotchKaraokeWords from "./NotchKaraokeWords"
import PlayPauseButton from "./PlayPauseButton"
import "./PlayPauseButton.css"
import "./LyricsStage.css"

type LyricsStageProps = {
  parallaxX?: number
  parallaxY?: number
}

const LINE_HEIGHT = 44
const VISIBLE_LINES = 6

const LyricsStage = ({ parallaxX = 0, parallaxY = 0 }: LyricsStageProps) => {
  const {
    isPlaying,
    isPaused,
    activeTrack,
    playbackMode,
    playbackPositionMs,
    lyricsLines,
    lyricsSynced,
    lyricsInstrumental,
    lyricsLoading,
    lyricsError,
    togglePause,
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

  const { activeIndex: lyricsActiveIndex } = syncState

  const visibleLyrics = useMemo(() => {
    if (lyricsLines.length === 0) return []

    const active = Math.max(lyricsActiveIndex, 0)
    let start = Math.max(0, active - 1)
    let end = Math.min(lyricsLines.length - 1, start + VISIBLE_LINES - 1)
    start = Math.max(0, end - VISIBLE_LINES + 1)

    return lyricsLines.slice(start, end + 1).map((line, offset) => ({
      line,
      index: start + offset,
      positionIndex: offset,
    }))
  }, [lyricsLines, lyricsActiveIndex])

  const coverUrl = activeTrack?.albumArt ?? null

  const stageStyle = {
    "--parallax-x": `${parallaxX * 8}px`,
    "--parallax-y": `${parallaxY * 5}px`,
    "--lyrics-line-height": `${LINE_HEIGHT}px`,
    "--lyrics-visible-count": VISIBLE_LINES,
    "--lyrics-cover-url": coverUrl ? `url("${coverUrl}")` : "none",
  } as CSSProperties

  const handleTogglePause = () => {
    void togglePause()
  }

  const showLyricsEmpty =
    !lyricsLoading &&
    !lyricsInstrumental &&
    (lyricsError || lyricsLines.length === 0)

  if (!isPlaying || !activeTrack) {
    return (
      <div className="lyrics-stage lyrics-stage-idle" style={stageStyle}>
        <div className="lyrics-stage-cover" aria-hidden="true" />
        <div className="lyrics-stage-scrim" aria-hidden="true" />
        <div className="lyrics-stage-idle-content">
          <span className="lyrics-stage-badge">Live lyrics</span>
          <p className="lyrics-stage-idle-title">Your soundtrack starts here</p>
          <p className="lyrics-stage-idle-copy">
            Search a track above — lyrics roll through in real time, word by
            word.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="lyrics-stage" style={stageStyle}>
      <div className="lyrics-stage-cover" aria-hidden="true" />
      <div className="lyrics-stage-scrim" aria-hidden="true" />

      <header className="lyrics-stage-header">
        <PlayPauseButton
          isPaused={isPaused}
          onToggle={handleTogglePause}
          size="md"
        />
        <div className="lyrics-stage-header-art-wrap">
          {activeTrack.albumArt ? (
            <img
              className="lyrics-stage-art"
              src={activeTrack.albumArt}
              alt=""
            />
          ) : (
            <span className="lyrics-stage-art-fallback" aria-hidden="true">
              ♪
            </span>
          )}
        </div>
        <div className="lyrics-stage-track-meta">
          <strong>{activeTrack.name}</strong>
          <span>{activeTrack.artists}</span>
        </div>
        <div className="lyrics-stage-header-badges">
          {playbackMode === "preview" && (
            <span className="lyrics-stage-preview-badge">Preview</span>
          )}
          {lyricsSynced && playbackMode !== "preview" && (
            <span className="lyrics-stage-sync-badge">Synced</span>
          )}
        </div>
      </header>

      <div
        className="lyrics-stage-viewport"
        role="log"
        aria-live="polite"
        aria-label="Synced lyrics"
      >
        {lyricsLoading && (
          <div className="lyrics-stage-status lyrics-stage-skeleton">
            <span />
            <span />
            <span />
            <span />
          </div>
        )}

        {!lyricsLoading && lyricsInstrumental && (
          <div className="lyrics-stage-empty">
            <span className="lyrics-stage-empty-icon" aria-hidden="true">🎵</span>
            <p className="lyrics-stage-empty-title">Instrumental track</p>
            <p className="lyrics-stage-empty-copy">No lyrics — just vibes</p>
          </div>
        )}

        {showLyricsEmpty && (
          <div className="lyrics-stage-empty">
            <span className="lyrics-stage-empty-icon" aria-hidden="true">🎤</span>
            <p className="lyrics-stage-empty-title">{LYRICS_NOT_FOUND}</p>
            <p className="lyrics-stage-empty-copy">
              The lyrics API didn&apos;t return anything for this track. Hit play
              and enjoy the music anyway.
            </p>
          </div>
        )}

        {!lyricsLoading && !lyricsInstrumental && lyricsLines.length > 0 && (
          <div className="lyrics-stage-scroll">
            {visibleLyrics.map(({ line, index: i, positionIndex }) => {
              const isActive = i === lyricsActiveIndex
              const isPast = lyricsActiveIndex >= 0 && i < lyricsActiveIndex
              const animationIndex = Math.abs(positionIndex)

              const nextLineStart =
                i < lyricsLines.length - 1
                  ? lyricsLines[i + 1].timeMs
                  : line.timeMs + 8000

              const lineClass = [
                "lyrics-stage-line",
                isActive ? "lyrics-stage-line-active" : "",
                isPast ? "lyrics-stage-line-past" : "",
                !isActive && !isPast ? "lyrics-stage-line-upcoming" : "",
              ]
                .filter(Boolean)
                .join(" ")

              const lineStyle = {
                "--position-index": positionIndex,
                "--animation-index": animationIndex,
              } as CSSProperties

              return (
                <p
                  key={`${line.timeMs}-${i}`}
                  className={lineClass}
                  style={lineStyle}
                >
                  <NotchKaraokeWords
                    text={line.text}
                    isActive={isActive}
                    isPast={isPast}
                    lineStartMs={line.timeMs}
                    lineEndMs={nextLineStart}
                    positionMs={smoothPositionMs}
                    variant="stage"
                  />
                </p>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default LyricsStage
