export type LrcLine = {
  timeMs: number;
  text: string;
};

export type LrclibResponse = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

export type LyricsState = {
  lines: LrcLine[];
  isSynced: boolean;
  instrumental: boolean;
  loading: boolean;
  error: string | null;
};
