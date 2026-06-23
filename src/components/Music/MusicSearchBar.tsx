import { FormEvent, useEffect, useRef, useState } from "react"
import { useMusicReactive } from "../../context/MusicReactiveContext"
import type { SpotifyTrack } from "../../lib/spotify/types"
import "./MusicSearchBar.css"

const MusicSearchBar = () => {
  const {
    spotifyConfigured,
    spotifyConnected,
    authError,
    loginSpotify,
    searchPreviewTracks,
    playPreviewTrack,
    playTrack,
  } = useMusicReactive()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setLocalError(null)
    setOpen(true)
    try {
      const tracks = await searchPreviewTracks(query.trim())
      setResults(tracks)
      if (tracks.length === 0) {
        setLocalError("No songs found — try another name or artist.")
      }
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Search failed. Try again."
      )
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handlePickTrack = async (track: SpotifyTrack) => {
    setLoadingTrackId(track.id)
    setLocalError(null)
    try {
      if (spotifyConnected) {
        await playTrack(track)
      } else {
        await playPreviewTrack(track)
      }
      setOpen(false)
      setQuery("")
      setResults([])
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not play this track."
      )
    } finally {
      setLoadingTrackId(null)
    }
  }

  const handleConnectSpotify = () => {
    void loginSpotify()
  }

  const errorMessage = localError || authError

  return (
    <div className="music-search-bar-wrap" ref={wrapRef}>
      <div
        className={`music-search-connect ${spotifyConnected ? "connected" : ""}`}
      >
        <div className="music-search-connect-copy">
          <strong>
            {spotifyConnected
              ? "Spotify Premium connected"
              : "Want full tracks & better lyric sync?"}
          </strong>
          <span>
            {spotifyConnected
              ? "Full-length playback with synced lyrics."
              : "Connect Spotify Premium for the full experience."}
          </span>
        </div>
        {!spotifyConnected ? (
          <button
            type="button"
            className="music-search-connect-btn"
            onClick={handleConnectSpotify}
            disabled={!spotifyConfigured}
            aria-label="Connect Spotify Premium"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
            Connect Spotify
          </button>
        ) : (
          <span className="music-search-connect-ready">Connected</span>
        )}
      </div>

      <form className="music-search-bar" onSubmit={handleSearch}>
        <label htmlFor="soundscape-search" className="sr-only">
          Search for a song
        </label>
        <input
          id="soundscape-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search song or artist…"
          disabled={searching || !spotifyConfigured}
          autoComplete="off"
        />
        <button
          type="submit"
          className="music-search-bar-btn"
          disabled={searching || !query.trim() || !spotifyConfigured}
          aria-label="Search"
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {!spotifyConfigured && (
        <p className="music-search-bar-note">
          Add Spotify credentials to enable search.
        </p>
      )}

      {errorMessage && open && (
        <p className="music-search-bar-error" role="alert">
          {errorMessage}
        </p>
      )}

      {open && results.length > 0 && (
        <ul className="music-search-bar-results" role="listbox">
          {results.map((track) => {
            const hasPreview = Boolean(track.previewUrl)
            const canPlay = spotifyConnected || hasPreview

            return (
              <li key={track.id} role="option">
                <button
                  type="button"
                  className="music-search-bar-track"
                  onClick={() => handlePickTrack(track)}
                  disabled={loadingTrackId === track.id || !canPlay}
                  title={
                    !canPlay
                      ? "No preview available"
                      : spotifyConnected
                        ? "Play full track"
                        : "Play 30s preview"
                  }
                >
                  {track.albumArt ? (
                    <img src={track.albumArt} alt="" />
                  ) : (
                    <span className="music-search-bar-fallback">♪</span>
                  )}
                  <span className="music-search-bar-meta">
                    <strong>{track.name}</strong>
                    <small>{track.artists}</small>
                  </span>
                  <span className="music-search-bar-action">
                    {loadingTrackId === track.id
                      ? "…"
                      : !canPlay
                        ? "—"
                        : "Play"}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MusicSearchBar
