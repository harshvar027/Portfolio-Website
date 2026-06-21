declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }

  namespace Spotify {
    interface Player {
      connect(): Promise<boolean>;
      disconnect(): void;
      addListener(
        event: "ready" | "not_ready" | "player_state_changed" | "initialization_error" | "authentication_error" | "account_error" | "playback_error",
        callback: (data: unknown) => void
      ): void;
      removeListener(
        event: "ready" | "not_ready" | "player_state_changed" | "initialization_error" | "authentication_error" | "account_error" | "playback_error",
        callback?: (data: unknown) => void
      ): void;
      getCurrentState(): Promise<PlaybackState | null>;
      setVolume(volume: number): Promise<void>;
      pause(): Promise<void>;
      resume(): Promise<void>;
    }

    interface PlaybackState {
      paused: boolean;
      position: number;
      duration: number;
    }

    interface PlayerInit {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }

    const Player: new (options: PlayerInit) => Player;
  }
}

export {};
