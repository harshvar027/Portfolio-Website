import { FormEvent, useEffect, useState } from "react";
import { useMusicReactive } from "../../context/MusicReactiveContext";
import type { SpotifyTrack } from "../../lib/spotify/types";
import "./MusicPicker.css";

type Step = "invite" | "search" | "playing" | "declined";

type MusicPickerProps = {
  layout: "modal" | "card";
  showInviteOnOpen?: boolean;
  onClose?: () => void;
};

const MusicPicker = ({
  layout,
  showInviteOnOpen = false,
  onClose,
}: MusicPickerProps) => {
  const {
    isPlaying,
    activeTrack,
    playbackMode,
    metrics,
    mood,
    volume,
    inviteChoice,
    spotifyConfigured,
    spotifyConnected,
    authError,
    acceptInvite,
    declineInvite,
    loginSpotify,
    searchTracks,
    playTrack,
    stop,
    setVolume,
    hapticsSupported,
  } = useMusicReactive();

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaying && activeTrack) {
      setStep("playing");
      return;
    }
    if (inviteChoice === "declined" && layout === "card") {
      setStep("declined");
      return;
    }
    if (showInviteOnOpen && inviteChoice === "pending" && layout === "modal") {
      setStep("invite");
      return;
    }
    setStep("search");
  }, [
    isPlaying,
    activeTrack,
    inviteChoice,
    layout,
    showInviteOnOpen,
  ]);

  const handleYes = () => {
    acceptInvite();
    setStep("search");
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim() || !spotifyConnected) return;

    setSearching(true);
    setLocalError(null);
    try {
      const tracks = await searchTracks(query.trim());
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
      await playTrack(track);
      setStep("playing");
      if (layout === "modal") onClose?.();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not play this track."
      );
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleStop = async () => {
    await stop();
    setResults([]);
    setQuery("");
    setStep(inviteChoice === "declined" ? "declined" : "search");
  };

  const errorMessage = localError || authError;

  if (step === "invite") {
    return (
      <div className="music-picker">
        <span className="music-picker-kicker">Soundtrack your visit</span>
        <h2 className="music-picker-title">Want music while you explore?</h2>
        <p className="music-picker-copy">
          Pick any Spotify song and the portfolio will pulse, glow, and react
          to the beat as you scroll.
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

  if (step === "declined") {
    return (
      <div className="music-picker">
        <span className="music-picker-badge">Soundscape</span>
        <h2 className="music-picker-title">No music for now</h2>
        <p className="music-picker-copy">
          Search any song below when you&apos;re ready — the whole site will
          sync to your pick.
        </p>
        <div className="music-picker-actions">
          <button
            type="button"
            className="music-picker-btn music-picker-btn-primary"
            onClick={() => {
              acceptInvite();
              setStep("search");
            }}
          >
            Pick a song
          </button>
        </div>
      </div>
    );
  }

  if (step === "playing" && activeTrack) {
    return (
      <div className="music-picker">
        <span className="music-picker-badge">
          Now playing · {mood.label}
          {playbackMode === "preview" ? " · preview" : ""}
        </span>

        <div className="music-picker-playing-head">
          {activeTrack.albumArt && (
            <img
              className="music-picker-playing-art"
              src={activeTrack.albumArt}
              alt=""
            />
          )}
          <div className="music-picker-playing-meta">
            <h3>{activeTrack.name}</h3>
            <p>{activeTrack.artists}</p>
          </div>
        </div>

        <div className="music-picker-metrics" aria-hidden="true">
          <MetricBar label="Bass" value={metrics.bass} />
          <MetricBar label="Mid" value={metrics.mid} />
          <MetricBar label="Treble" value={metrics.treble} />
          <MetricBar label="Energy" value={metrics.energy} />
        </div>

        <div className="music-picker-stats">
          <span>{Math.round(metrics.bpm)} BPM</span>
          <span>{Math.round(metrics.volume * 100)}% vol</span>
          {hapticsSupported && <span>Haptics on</span>}
          {metrics.drop && <span className="music-picker-drop">DROP</span>}
        </div>

        <div className="music-picker-visualizer" aria-hidden="true">
          {[...Array(7)].map((_, i) => (
            <span
              key={i}
              className="music-picker-bar"
              style={{
                animationDelay: `${i * 0.08}s`,
                animationDuration: `${0.5 + (1 - metrics.energy) * 0.4}s`,
              }}
            />
          ))}
        </div>

        <div className="music-picker-volume">
          <label htmlFor={`music-vol-${layout}`}>Volume</label>
          <input
            id={`music-vol-${layout}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>

        <div className="music-picker-actions">
          <button
            type="button"
            className="music-picker-btn music-picker-btn-primary"
            onClick={() => setStep("search")}
          >
            Change song
          </button>
          <button
            type="button"
            className="music-picker-btn"
            onClick={handleStop}
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="music-picker">
      <span className="music-picker-badge">
        {layout === "modal" ? "Welcome" : "Soundscape"} · Spotify
      </span>
      <h2 className="music-picker-title">What should we play?</h2>
      <p className="music-picker-copy">
        Search by song or artist. The site reacts to your soundtrack in real
        time.
      </p>

      <div
        className={`music-picker-connect ${spotifyConnected ? "connected" : ""}`}
      >
        <p>
          {spotifyConnected
            ? "Spotify connected — search and play full tracks."
            : "Connect Spotify Premium to search and play songs."}
        </p>
        {!spotifyConnected ? (
          <button
            type="button"
            className="music-picker-btn music-picker-btn-primary music-picker-btn-sm"
            onClick={() => loginSpotify()}
            disabled={!spotifyConfigured}
          >
            Connect
          </button>
        ) : (
          <span className="music-picker-badge">Ready</span>
        )}
      </div>

      {!spotifyConfigured && (
        <p className="music-picker-note">
          Add <code>VITE_SPOTIFY_CLIENT_ID</code> to enable Spotify search.
        </p>
      )}

      <form className="music-picker-search" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Blinding Lights, The Weeknd"
          disabled={!spotifyConnected || searching}
        />
        <button
          type="submit"
          className="music-picker-btn music-picker-btn-primary music-picker-btn-sm"
          disabled={!spotifyConnected || searching || !query.trim()}
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {errorMessage && <p className="music-picker-error">{errorMessage}</p>}

      {results.length > 0 && (
        <ul className="music-picker-results">
          {results.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                className="music-picker-track"
                onClick={() => handlePickTrack(track)}
                disabled={loadingTrackId === track.id}
              >
                {track.albumArt ? (
                  <img src={track.albumArt} alt="" />
                ) : (
                  <span className="music-picker-track-fallback">♪</span>
                )}
                <span className="music-picker-track-meta">
                  <strong>{track.name}</strong>
                  <small>{track.artists}</small>
                </span>
                <span className="music-picker-track-action">
                  {loadingTrackId === track.id ? "…" : "Play"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {layout === "modal" && (
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
      )}
    </div>
  );
};

const MetricBar = ({ label, value }: { label: string; value: number }) => (
  <div className="music-picker-metric">
    <span>{label}</span>
    <div className="music-picker-metric-track">
      <div
        className="music-picker-metric-fill"
        style={{ transform: `scaleX(${Math.min(1, value * 1.4)})` }}
      />
    </div>
  </div>
);

export default MusicPicker;
