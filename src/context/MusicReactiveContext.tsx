import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHaptics } from "../hooks/useHaptics";
import { useMusicAnalysis } from "../hooks/useMusicAnalysis";
import { useSpotify, consumeSpotifyReturnFlag } from "../hooks/useSpotify";
import type { AudioMetrics } from "../lib/audioAnalysis";
import { getMoodForTrack, type MoodTheme } from "../lib/moodEngine";
import type { SpotifyTrack } from "../lib/spotify/types";

type InviteChoice = "pending" | "accepted" | "declined";

type MusicReactiveContextValue = {
  isPlaying: boolean;
  activeTrack: SpotifyTrack | null;
  playbackMode: "spotify" | "preview" | null;
  metrics: AudioMetrics;
  mood: MoodTheme;
  volume: number;
  spotifyConfigured: boolean;
  spotifyConnected: boolean;
  authError: string | null;
  inviteChoice: InviteChoice;
  showInvite: boolean;
  acceptInvite: () => void;
  declineInvite: () => void;
  reopenInvite: () => void;
  openMusicSearch: () => void;
  dismissInvite: () => void;
  openInviteAfterLoad: () => void;
  loginSpotify: () => Promise<void>;
  logoutSpotify: () => Promise<void>;
  searchTracks: (query: string) => Promise<SpotifyTrack[]>;
  playTrack: (track: SpotifyTrack) => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (v: number) => void;
  hapticsSupported: boolean;
};

const INVITE_KEY = "portfolio-music-invite";
const MusicReactiveContext = createContext<MusicReactiveContextValue | null>(
  null
);

function readInviteChoice(): InviteChoice {
  const value = sessionStorage.getItem(INVITE_KEY);
  if (value === "accepted" || value === "declined") return value;
  return "pending";
}

export function MusicReactiveProvider({ children }: PropsWithChildren) {
  const [inviteChoice, setInviteChoice] = useState<InviteChoice>(readInviteChoice);
  const [showInvite, setShowInvite] = useState(false);
  const [playing, setPlaying] = useState(false);

  const spotify = useSpotify();
  const trackRef = useRef<SpotifyTrack | null>(null);
  trackRef.current = spotify.activeTrack;

  const getTrack = useCallback(() => trackRef.current, []);
  const getPlaybackMode = useCallback(() => spotify.playbackMode, [spotify.playbackMode]);
  const getIsPlaying = useCallback(
    () => playing && spotify.isPlaying(),
    [playing, spotify]
  );

  const { metrics, reset } = useMusicAnalysis(
    spotify.getAnalyser,
    getTrack,
    getIsPlaying,
    getPlaybackMode
  );

  const { supported: hapticsSupported, syncWithMetrics, stop: stopHaptics } =
    useHaptics();

  const mood = useMemo(
    () => getMoodForTrack(spotify.activeTrack),
    [spotify.activeTrack]
  );

  useEffect(() => {
    if (consumeSpotifyReturnFlag()) {
      sessionStorage.setItem(INVITE_KEY, "accepted");
      setInviteChoice("accepted");
      setShowInvite(true);
    }
  }, []);

  useEffect(() => {
    setPlaying(spotify.isPlaying());
  }, [spotify.activeTrack, spotify.playbackMode, spotify.isPlaying]);

  useEffect(() => {
    if (!playing) {
      syncWithMetrics({
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0,
        energy: 0,
        bpm: 90,
        beat: false,
        beatIntensity: 0,
        drop: false,
        buildUp: 0,
      });
      return;
    }
    syncWithMetrics(metrics);
  }, [playing, metrics, syncWithMetrics]);

  const acceptInvite = useCallback(() => {
    sessionStorage.setItem(INVITE_KEY, "accepted");
    setInviteChoice("accepted");
  }, []);

  const declineInvite = useCallback(() => {
    sessionStorage.setItem(INVITE_KEY, "declined");
    setInviteChoice("declined");
    setShowInvite(false);
  }, []);

  const reopenInvite = useCallback(() => {
    sessionStorage.setItem(INVITE_KEY, "accepted");
    setInviteChoice("accepted");
    setShowInvite(true);
  }, []);

  const openMusicSearch = useCallback(() => {
    sessionStorage.setItem(INVITE_KEY, "accepted");
    setInviteChoice("accepted");
    setShowInvite(true);
  }, []);

  const dismissInvite = useCallback(() => {
    setShowInvite(false);
  }, []);

  const openInviteAfterLoad = useCallback(() => {
    if (inviteChoice === "pending") {
      setShowInvite(true);
    }
  }, [inviteChoice]);

  const playTrack = useCallback(
    async (track: SpotifyTrack) => {
      await spotify.playTrack(track);
      setPlaying(true);
      setShowInvite(false);
    },
    [spotify]
  );

  const stop = useCallback(async () => {
    await spotify.stop();
    stopHaptics();
    reset();
    setPlaying(false);
  }, [spotify, stopHaptics, reset]);

  const value = useMemo(
    () => ({
      isPlaying: playing,
      activeTrack: spotify.activeTrack,
      playbackMode: spotify.playbackMode,
      metrics,
      mood,
      volume: spotify.volume,
      spotifyConfigured: spotify.configured,
      spotifyConnected: spotify.connected,
      authError: spotify.authError,
      inviteChoice,
      showInvite,
      acceptInvite,
      declineInvite,
      reopenInvite,
      openMusicSearch,
      dismissInvite,
      openInviteAfterLoad,
      loginSpotify: spotify.login,
      logoutSpotify: spotify.logout,
      searchTracks: spotify.search,
      playTrack,
      stop,
      setVolume: spotify.setVolume,
      hapticsSupported,
    }),
    [
      playing,
      spotify,
      metrics,
      mood,
      inviteChoice,
      showInvite,
      acceptInvite,
      declineInvite,
      reopenInvite,
      openMusicSearch,
      dismissInvite,
      openInviteAfterLoad,
      playTrack,
      stop,
      hapticsSupported,
    ]
  );

  return (
    <MusicReactiveContext.Provider value={value}>
      {children}
    </MusicReactiveContext.Provider>
  );
}

export function useMusicReactive() {
  const ctx = useContext(MusicReactiveContext);
  if (!ctx) {
    throw new Error("useMusicReactive must be used within MusicReactiveProvider");
  }
  return ctx;
}
