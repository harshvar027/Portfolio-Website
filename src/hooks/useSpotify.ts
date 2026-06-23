import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAudioFeatures,
  playOnDevice,
  searchSpotifyTracks,
} from "../lib/spotify/api";
import {
  buildSpotifyAuthUrl,
  clearOAuthQueryFromUrl,
  exchangeCodeForTokens,
  isOAuthCodeHandled,
  isSpotifyConfigured,
  markOAuthCodeHandled,
  refreshAccessToken,
} from "../lib/spotify/pkce";
import type { SpotifyTokens, SpotifyTrack } from "../lib/spotify/types";

const TOKEN_KEY = "spotify_tokens";
const RETURN_KEY = "spotify-open-search";

export function consumeSpotifyReturnFlag() {
  const shouldOpen = sessionStorage.getItem(RETURN_KEY) === "1";
  if (shouldOpen) sessionStorage.removeItem(RETURN_KEY);
  return shouldOpen;
}

function readTokens(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as SpotifyTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: SpotifyTokens | null) {
  if (tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function loadSpotifySdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Spotify?.Player) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://sdk.scdn.co/spotify-player.js"]'
    );
    if (existing) {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Spotify player"));
    document.body.appendChild(script);
  });
}

export function useSpotify() {
  const [connected, setConnected] = useState(() => Boolean(readTokens()));
  const [playerReady, setPlayerReady] = useState(false);
  const [activeTrack, setActiveTrack] = useState<SpotifyTrack | null>(null);
  const [playbackMode, setPlaybackMode] = useState<"spotify" | "preview" | null>(
    null
  );
  const [volume, setVolumeState] = useState(0.7);
  const [authError, setAuthError] = useState<string | null>(null);
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const playbackModeRef = useRef(playbackMode);
  playbackModeRef.current = playbackMode;

  const tokensRef = useRef<SpotifyTokens | null>(readTokens());
  const playerRef = useRef<Spotify.Player | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const oauthProcessingRef = useRef(false);

  const getAccessToken = useCallback(async () => {
    let tokens = tokensRef.current;
    if (!tokens) throw new Error("Not connected to Spotify");

    if (Date.now() >= tokens.expiresAt - 60_000) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      tokens = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
        expiresAt: Date.now() + refreshed.expires_in * 1000,
      };
      tokensRef.current = tokens;
      writeTokens(tokens);
    }

    return tokens.accessToken;
  }, []);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (ctxRef.current?.state !== "closed") {
      ctxRef.current?.close().catch(() => undefined);
    }
    ctxRef.current = null;
  }, []);

  const stopInternal = useCallback(async () => {
    stopPreview();
    setPlaybackMode(null);
    setActiveTrack(null);
    setPlaybackPositionMs(0);
    setIsPaused(false);
    try {
      await playerRef.current?.pause();
    } catch {
      /* noop */
    }
  }, [stopPreview]);

  const initPlayerInternal = useCallback(async () => {
    if (playerRef.current || !tokensRef.current) return;

    await loadSpotifySdk();

    const player = new window.Spotify.Player({
      name: "Portfolio Experience",
      getOAuthToken: (cb) => {
        getAccessToken()
          .then(cb)
          .catch(() => cb(""));
      },
      volume: volumeRef.current,
    });

    player.addListener("ready", (data: unknown) => {
      const { device_id } = data as { device_id: string };
      deviceIdRef.current = device_id;
      setPlayerReady(true);
    });

    player.addListener("not_ready", () => {
      setPlayerReady(false);
    });

    player.addListener("account_error", () => {
      setAuthError("Spotify Premium is required for full-track playback.");
    });

    player.addListener("authentication_error", () => {
      setAuthError("Spotify session expired. Please connect again.");
      tokensRef.current = null;
      writeTokens(null);
      setConnected(false);
    });

    player.addListener("autoplay_failed", () => {
      setAuthError(
        "Browser blocked Spotify audio — click play again to hear sound."
      );
    });

    player.addListener("player_state_changed", (data: unknown) => {
      const state = data as Spotify.PlaybackState | null;
      if (!state) return;
      setPlaybackPositionMs(state.position);
      setIsPaused(state.paused);
    });

    const connectedOk = await player.connect();
    if (!connectedOk) {
      throw new Error("Could not connect Spotify player");
    }

    playerRef.current = player;
  }, [getAccessToken]);

  const waitForDevice = useCallback(
    async (timeoutMs = 8_000) => {
      if (!playerRef.current && tokensRef.current) {
        void initPlayerInternal();
      }
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (deviceIdRef.current) return deviceIdRef.current;
        if (!playerRef.current && tokensRef.current) {
          await initPlayerInternal();
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(
        "Spotify player is still starting — try again in a moment."
      );
    },
    [initPlayerInternal]
  );

  const initPlayer = useCallback(async () => {
    await initPlayerInternal();
  }, [initPlayerInternal]);

  const handleOAuthReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setAuthError("Spotify connection was cancelled.");
      clearOAuthQueryFromUrl();
      return;
    }

    if (!code) return;
    if (isOAuthCodeHandled(code) || oauthProcessingRef.current) {
      clearOAuthQueryFromUrl();
      return;
    }

    oauthProcessingRef.current = true;
    markOAuthCodeHandled(code);
    clearOAuthQueryFromUrl();

    try {
      const payload = await exchangeCodeForTokens(code);
      const tokens: SpotifyTokens = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: Date.now() + payload.expires_in * 1000,
      };
      tokensRef.current = tokens;
      writeTokens(tokens);
      setConnected(true);
      setAuthError(null);
      sessionStorage.setItem(RETURN_KEY, "1");
      await initPlayer();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Could not connect Spotify"
      );
    } finally {
      oauthProcessingRef.current = false;
    }
  }, [initPlayer]);

  useEffect(() => {
    handleOAuthReturn();
  }, [handleOAuthReturn]);

  useEffect(() => {
    if (connected && tokensRef.current) {
      initPlayer().catch(() => undefined);
    }
    return () => {
      stopPreview();
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [connected, initPlayer, stopPreview]);

  useEffect(() => {
    if (playbackMode !== "preview") return;

    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && playbackModeRef.current === "preview") {
        setPlaybackPositionMs(audio.currentTime * 1000);
        setIsPaused(audio.paused);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playbackMode]);

  useEffect(() => {
    if (playbackMode !== "spotify" || !playerRef.current) return;

    let raf = 0;
    let lastPoll = 0;

    const tick = (now: number) => {
      if (playbackModeRef.current !== "spotify") return;

      if (now - lastPoll >= 50) {
        lastPoll = now;
        playerRef.current
          ?.getCurrentState()
          .then((state) => {
            if (!state || playbackModeRef.current !== "spotify") return;
            setPlaybackPositionMs(state.position);
            setIsPaused(state.paused);
          })
          .catch(() => undefined);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playbackMode, playerReady]);

  const login = useCallback(async () => {
    if (!isSpotifyConfigured()) {
      setAuthError(
        "Add VITE_SPOTIFY_CLIENT_ID to your .env file to enable Spotify."
      );
      return;
    }
    const url = await buildSpotifyAuthUrl();
    window.location.href = url;
  }, []);

  const logout = useCallback(async () => {
    await stopInternal();
    playerRef.current?.disconnect();
    playerRef.current = null;
    tokensRef.current = null;
    writeTokens(null);
    setConnected(false);
    setPlayerReady(false);
    deviceIdRef.current = null;
  }, [stopInternal]);

  const search = useCallback(
    async (query: string) => {
      const token = await getAccessToken();
      return searchSpotifyTracks(token, query.trim());
    },
    [getAccessToken]
  );

  const waitForAudioReady = (audio: HTMLAudioElement) =>
    new Promise<void>((resolve, reject) => {
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve();
        return;
      }

      const onReady = () => {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onError);
        reject(new Error("Could not load preview audio."));
      };
      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });

  const activateSpotifyAudio = useCallback(async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.activateElement();
    } catch {
      /* noop */
    }
  }, []);

  const playPreview = useCallback(
    async (track: SpotifyTrack) => {
      if (!track.previewUrl) {
        throw new Error("No preview available for this track.");
      }

      stopPreview();

      const audio = new Audio();
      audio.volume = volumeRef.current;
      audio.loop = true;
      audio.preload = "auto";
      audio.src = track.previewUrl;

      await waitForAudioReady(audio);
      await audio.play();

      audioRef.current = audio;
      setPlaybackMode("preview");
      setActiveTrack(track);
      setPlaybackPositionMs(0);
      setIsPaused(false);
    },
    [stopPreview]
  );

  const playPreviewOnly = useCallback(
    async (track: SpotifyTrack) => {
      if (!track.previewUrl) {
        throw new Error("No 30-second preview available for this track.");
      }

      setAuthError(null);
      await stopInternal();
      await playPreview(track);
    },
    [playPreview, stopInternal]
  );

  const playTrack = useCallback(
    async (track: SpotifyTrack) => {
      setAuthError(null);
      await stopInternal();

      const token = await getAccessToken();

      void fetchAudioFeatures(token, track.id).then((features) => {
        if (!features) return;
        setActiveTrack((prev) =>
          prev?.id === track.id
            ? {
                ...prev,
                tempo: features.tempo,
                energy: features.energy,
                valence: features.valence,
                danceability: features.danceability,
              }
            : prev
        );
      });

      await activateSpotifyAudio();

      try {
        const deviceId = await waitForDevice();
        await playOnDevice(token, deviceId, track.uri);
        stopPreview();
        await playerRef.current?.resume();
        setPlaybackMode("spotify");
        setActiveTrack(track);
        setPlaybackPositionMs(0);
        setIsPaused(false);
        setAuthError(null);
      } catch (err) {
        if (!track.previewUrl) throw err;

        await playPreview(track);
        setAuthError(
          err instanceof Error
            ? `${err.message} Playing 30s preview instead.`
            : "Playing preview instead."
        );
      }
    },
    [
      activateSpotifyAudio,
      getAccessToken,
      playPreview,
      stopInternal,
      stopPreview,
      waitForDevice,
    ]
  );

  const stop = useCallback(async () => {
    await stopInternal();
  }, [stopInternal]);

  const togglePause = useCallback(async () => {
    if (playbackModeRef.current === "preview") {
      const audio = audioRef.current;
      if (!audio) return;

      if (audio.paused) {
        if (ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }
        await audio.play();
        setIsPaused(false);
      } else {
        audio.pause();
        setIsPaused(true);
      }
      return;
    }

    if (playbackModeRef.current !== "spotify" || !playerRef.current) return;

    try {
      const state = await playerRef.current.getCurrentState();
      if (!state) return;

      if (state.paused) {
        await playerRef.current.resume();
        setIsPaused(false);
      } else {
        await playerRef.current.pause();
        setIsPaused(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  const setVolume = useCallback(
    async (value: number) => {
      setVolumeState(value);
      if (gainRef.current) {
        gainRef.current.gain.value = value;
      }
      if (audioRef.current) {
        audioRef.current.volume = value;
      }
      try {
        await playerRef.current?.setVolume(value);
      } catch {
        /* noop */
      }
    },
    []
  );

  const getAnalyser = useCallback(() => analyserRef.current, []);
  const isPlaying = useCallback(
    () => playbackMode !== null && activeTrack !== null,
    [playbackMode, activeTrack]
  );

  return {
    configured: isSpotifyConfigured(),
    connected,
    playerReady,
    activeTrack,
    playbackMode,
    volume,
    authError,
    playbackPositionMs,
    isPaused,
    login,
    logout,
    search,
    playPreviewOnly,
    playTrack,
    stop,
    togglePause,
    setVolume,
    getAnalyser,
    isPlaying,
  };
}
