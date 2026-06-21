const VERIFIER_KEY = "spotify_pkce_verifier";
const REDIRECT_KEY = "spotify_pkce_redirect";
const OAUTH_CODE_KEY = "spotify_oauth_handled_code";

function randomString(length: number) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hash;
}

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Spotify rejects `localhost` — loopback must use 127.0.0.1. */
function normalizeLoopbackOrigin(origin: string) {
  if (origin.startsWith("http://localhost:")) {
    return origin.replace("http://localhost", "http://127.0.0.1");
  }
  if (origin.startsWith("https://localhost:")) {
    return origin.replace("https://localhost", "https://127.0.0.1");
  }
  return origin;
}

/** Must exactly match a Redirect URI in the Spotify app dashboard. */
export function getSpotifyRedirectUri() {
  const origin = normalizeLoopbackOrigin(window.location.origin);
  const current = `${origin}/`;
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();

  if (!configured) return current;

  try {
    const configuredUrl = new URL(configured);
    if (configuredUrl.origin === origin) {
      const path = configuredUrl.pathname || "/";
      return `${configuredUrl.origin}${path.endsWith("/") ? path : `${path}/`}`;
    }
  } catch {
    /* fall back to current origin */
  }

  return current;
}

export function clearOAuthQueryFromUrl() {
  window.history.replaceState({}, "", window.location.pathname || "/");
}

export function getSpotifyClientId() {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
}

export function isSpotifyConfigured() {
  return Boolean(getSpotifyClientId()?.trim());
}

function savePkceSession(verifier: string, redirectUri: string) {
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(REDIRECT_KEY, redirectUri);
}

function readPkceSession() {
  return {
    verifier: localStorage.getItem(VERIFIER_KEY),
    redirectUri: localStorage.getItem(REDIRECT_KEY),
  };
}

function clearPkceSession() {
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(REDIRECT_KEY);
}

export function markOAuthCodeHandled(code: string) {
  sessionStorage.setItem(OAUTH_CODE_KEY, code);
}

export function isOAuthCodeHandled(code: string) {
  return sessionStorage.getItem(OAUTH_CODE_KEY) === code;
}

export async function createPkcePair() {
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const redirectUri = getSpotifyRedirectUri();
  savePkceSession(verifier, redirectUri);
  return { verifier, challenge, redirectUri };
}

export async function buildSpotifyAuthUrl() {
  const clientId = getSpotifyClientId()?.trim();
  if (!clientId) {
    throw new Error(
      "Spotify Client ID is missing. Add VITE_SPOTIFY_CLIENT_ID to .env and redeploy on Vercel."
    );
  }

  const { challenge, redirectUri } = await createPkcePair();
  const scopes = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const clientId = getSpotifyClientId()?.trim();
  const { verifier, redirectUri } = readPkceSession();

  if (!clientId) {
    throw new Error(
      "Spotify Client ID is missing. Add VITE_SPOTIFY_CLIENT_ID in Vercel env vars and redeploy."
    );
  }

  if (!verifier) {
    throw new Error(
      "Login session expired. Click Connect Spotify again (use the same browser tab)."
    );
  }

  const redirect_uri = redirectUri || getSpotifyRedirectUri();

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri,
    code_verifier: verifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  clearPkceSession();

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (detail.includes("invalid_grant")) {
      throw new Error(
        "Spotify login expired. Click Connect Spotify again."
      );
    }
    if (detail.includes("redirect_uri")) {
      throw new Error(
        `Redirect URI mismatch. Spotify dashboard must include: ${redirect_uri}`
      );
    }
    throw new Error("Failed to connect Spotify account. Try again.");
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = getSpotifyClientId()?.trim();
  if (!clientId) throw new Error("Spotify Client ID is not configured");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error("Spotify session expired — please sign in again");
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}
