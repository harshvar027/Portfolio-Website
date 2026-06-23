import { useEffect, useMemo, useRef, useState } from "react"
import { fetchLyricsFromApi } from "../lib/lrclib/client"
import { LYRICS_NOT_FOUND, toLyricsUserMessage } from "../lib/lrclib/messages"
import { getLyricSyncState, parseLrc, parsePlainLyrics } from "../lib/lrclib/parseLrc"
import type { LrcLine } from "../lib/lrclib/types"
import type { SpotifyTrack } from "../lib/spotify/types"

type CachedLyrics = {
  lines: LrcLine[]
  isSynced: boolean
  instrumental: boolean
}

const cache = new Map<string, CachedLyrics>()

export function useLyrics(
  activeTrack: SpotifyTrack | null,
  playbackPositionMs: number,
  isPlaying: boolean,
  isPaused: boolean
) {
  const [lines, setLines] = useState<LrcLine[]>([])
  const [isSynced, setIsSynced] = useState(false)
  const [instrumental, setInstrumental] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeTrack) {
      trackIdRef.current = null
      setLines([])
      setIsSynced(false)
      setInstrumental(false)
      setLoading(false)
      setError(null)
      return
    }

    if (trackIdRef.current === activeTrack.id) return
    trackIdRef.current = activeTrack.id

    const cached = cache.get(activeTrack.id)
    if (cached) {
      setLines(cached.lines)
      setIsSynced(cached.isSynced)
      setInstrumental(cached.instrumental)
      setLoading(false)
      setError(cached.lines.length === 0 ? LYRICS_NOT_FOUND : null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setLines([])
    setIsSynced(false)
    setInstrumental(false)

    const durationSec = activeTrack.durationMs / 1000
    const firstArtist = activeTrack.artists.split(",")[0]?.trim() ?? activeTrack.artists

    void fetchLyricsFromApi(
      activeTrack.name,
      firstArtist,
      activeTrack.album,
      durationSec
    )
      .then((data) => {
        if (cancelled) return

        if (!data) {
          cache.set(activeTrack.id, { lines: [], isSynced: false, instrumental: false })
          setLines([])
          setError(LYRICS_NOT_FOUND)
          return
        }

        if (data.instrumental) {
          const entry = { lines: [], isSynced: false, instrumental: true }
          cache.set(activeTrack.id, entry)
          setInstrumental(true)
          setLines([])
          return
        }

        let parsed: LrcLine[] = []
        let synced = false

        if (data.syncedLyrics) {
          parsed = parseLrc(data.syncedLyrics)
          synced = parsed.length > 0
        }

        if (!synced && data.plainLyrics) {
          parsed = parsePlainLyrics(data.plainLyrics, activeTrack.durationMs)
          synced = parsed.length > 0
        }

        const entry = {
          lines: parsed,
          isSynced: synced,
          instrumental: false,
        }
        cache.set(activeTrack.id, entry)
        setLines(parsed)
        setIsSynced(synced)
        if (parsed.length === 0) setError(LYRICS_NOT_FOUND)
      })
      .catch((err) => {
        if (cancelled) return
        setError(toLyricsUserMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTrack])

  const syncState = useMemo(() => {
    if ((!isPlaying && !isPaused) || lines.length === 0) {
      return { activeIndex: -1, lineProgress: 0 }
    }
    return getLyricSyncState(lines, playbackPositionMs, isSynced)
  }, [lines, playbackPositionMs, isSynced, isPlaying, isPaused])

  const currentLine = useMemo(() => {
    if (syncState.activeIndex < 0) return null
    return lines[syncState.activeIndex]?.text ?? null
  }, [lines, syncState.activeIndex])

  return {
    lines,
    isSynced,
    instrumental,
    loading,
    error,
    activeIndex: syncState.activeIndex,
    lineProgress: syncState.lineProgress,
    currentLine,
  }
}
