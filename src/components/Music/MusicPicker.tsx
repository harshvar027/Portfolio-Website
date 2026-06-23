import { FormEvent, useEffect, useState } from "react";
import { useMusicReactive } from "../../context/MusicReactiveContext";
import type { SpotifyTrack } from "../../lib/spotify/types";
import "./MusicPicker.css";

type Step = "invite" | "search";

type MusicPickerProps = {
  showInviteOnOpen?: boolean;
  onClose?: () => void;
};

const MusicPicker = ({
  showInviteOnOpen = false,
  onClose,
}: MusicPickerProps) => {
  const {
    inviteChoice,
    spotifyConfigured,
    spotifyConnected,
    authError,
    acceptInvite,
    declineInvite,
    loginSpotify,
    searchPreviewTracks,
    playPreviewTrack,
    playTrack,
  } = useMusicReactive();

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (showInviteOnOpen && inviteChoice === "pending") {
      setStep("invite");
      return;
    }
    setStep("search");
  }, [showInviteOnOpen, inviteChoice]);

  const handleYes = () => {
    acceptInvite();
    setStep("search");
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setLocalError(null);
    try {
      const tracks = await searchPreviewTracks(query.trim());
      setResults(tracks);
      if (tracks.length === 0) {
        setLocalError("No songs found — try another name or artist.");
      }
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Search failed. Try again."
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePickTrack = async (track: SpotifyTrack) => {
    setLoadingTrackId(track.id);
    setLocalError(null);
    try {
      if (spotifyConnected) {
        await playTrack(track);
      } else {
        await playPreviewTrack(track);
      }
      onClose?.();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not play this track."
      );
    } finally {
      setLoadingTrackId(null);
    }
  };

  const errorMessage = localError || authError;

  if (step === "invite") {
    return (
      <div className="music-picker">
        <span className="music-picker-kicker">Soundtrack your visit</span>
        <h2 className="music-picker-title">Want music while you explore?</h2>
        <p className="music-picker-copy">
          Pick any Spotify song and the portfolio will pulse, glow, and react
          to the beat as you scroll — with live synced lyrics in the skyline box.
        </p>
        <div className="music-picker-actions">
          <button
            type="button"
            className="music-picker-btn music-picker-btn-primary"
            onClick={handleYes}
          >
            Yes — pick a song
          </button>
          <button
            type="button"
            className="music-picker-btn"
            onClick={() => {
              declineInvite();
              onClose?.();
            }}
          >
            No thanks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="music-picker">
      <span className="music-picker-badge">Welcome · 30s previews</span>
      <h2 className="music-picker-title">What should we play?</h2>
      <p className="music-picker-copy">
        Search by song or artist — no login needed. Live lyrics sync in the
        Soundscape section as the site reacts to the beat.
      </p>

      <div
        className={`music-picker-connect ${spotifyConnected ? "connected" : ""}`}
      >
        <p>
          {spotifyConnected
            ? "Spotify Premium connected — full tracks when available."
            : "Optional: connect Spotify Premium for full-track playback."}
        </p>
        {!spotifyConnected ? (
          <button
            type="button"
            className="music-picker-btn music-picker-btn-sm"
            onClick={() => loginSpotify()}
            disabled={!spotifyConfigured}
          >
            Connect Spotify
          </button>
        ) : (
          <span className="music-picker-badge">Premium ready</span>
        )}
      </div>

      {!spotifyConfigured && (
        <p className="music-picker-note">
          Add <code>SPOTIFY_CLIENT_SECRET</code> and{" "}
          <code>VITE_SPOTIFY_CLIENT_ID</code> to enable search.
        </p>
      )}

      <form className="music-picker-search" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Blinding Lights, The Weeknd"
          disabled={searching}
        />
        <button
          type="submit"
          className="music-picker-btn music-picker-btn-primary music-picker-btn-sm"
          disabled={searching || !query.trim()}
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {errorMessage && <p className="music-picker-error">{errorMessage}</p>}

      {results.length > 0 && (
        <ul className="music-picker-results">
          {results.map((track) => {
            const hasPreview = Boolean(track.previewUrl);
            const canPlay = spotifyConnected || hasPreview;

            return (
            <li key={track.id}>
              <button
                type="button"
                className="music-picker-track"
                onClick={() => handlePickTrack(track)}
                disabled={loadingTrackId === track.id || !canPlay}
                title={
                  !canPlay
                    ? "No preview available for this track"
                    : spotifyConnected
                      ? "Play full track"
                      : "Play 30s preview"
                }
              >
                {track.albumArt ? (
                  <img src={track.albumArt} alt="" />
                ) : (
                  <span className="music-picker-track-fallback">♪</span>
                )}
                <span className="music-picker-track-meta">
                  <strong>{track.name}</strong>
                  <small>
                    {track.artists}
                    {!spotifyConnected && hasPreview ? " · 30s preview" : ""}
                    {!hasPreview && !spotifyConnected ? " · no preview" : ""}
                  </small>
                </span>
                <span className="music-picker-track-action">
                  {loadingTrackId === track.id
                    ? "…"
                    : !canPlay
                      ? "—"
                      : "Play"}
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      )}

      <div className="music-picker-actions" style={{ marginTop: 18 }}>
        <button
          type="button"
          className="music-picker-btn"
          onClick={() => {
            declineInvite();
            onClose?.();
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default MusicPicker;
