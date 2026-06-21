export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  uri: string;
  previewUrl: string | null;
  tempo?: number;
  energy?: number;
  valence?: number;
  danceability?: number;
};

export type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type SpotifySearchResponse = {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      uri: string;
      preview_url: string | null;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
    }>;
  };
};

export type SpotifyAudioFeatures = {
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
};

export type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};
