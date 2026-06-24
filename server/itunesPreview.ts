const ITUNES_SEARCH = "https://itunes.apple.com/search"
const FETCH_TIMEOUT_MS = 8_000

type ItunesResult = {
  trackName?: string
  artistName?: string
  previewUrl?: string
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const primaryArtist = (artists: string) =>
  artists.split(",")[0]?.trim() ?? artists

const scoreMatch = (trackName: string, artistName: string, result: ItunesResult) => {
  if (!result.previewUrl || !result.trackName || !result.artistName) return -1

  const wantedTrack = normalize(trackName)
  const wantedArtist = normalize(primaryArtist(artistName))
  const resultTrack = normalize(result.trackName)
  const resultArtist = normalize(result.artistName)

  let score = 0
  if (resultTrack === wantedTrack) score += 4
  else if (resultTrack.includes(wantedTrack) || wantedTrack.includes(resultTrack)) {
    score += 2
  }

  if (resultArtist === wantedArtist) score += 3
  else if (
    resultArtist.includes(wantedArtist) ||
    wantedArtist.includes(resultArtist)
  ) {
    score += 1
  }

  return score
}

export async function resolveItunesPreview(
  trackName: string,
  artistName: string
): Promise<string | null> {
  const term = `${trackName} ${primaryArtist(artistName)}`.trim()
  if (!term) return null

  const params = new URLSearchParams({
    term,
    entity: "song",
    limit: "8",
  })

  const res = await fetch(`${ITUNES_SEARCH}?${params.toString()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) return null

  const data = (await res.json()) as { results?: ItunesResult[] }
  const results = data.results ?? []
  if (results.length === 0) return null

  let best: ItunesResult | null = null
  let bestScore = -1

  for (const result of results) {
    const score = scoreMatch(trackName, artistName, result)
    if (score > bestScore) {
      bestScore = score
      best = result
    }
  }

  if (bestScore <= 0) {
    const fallback = results.find((result) => result.previewUrl)
    return fallback?.previewUrl ?? null
  }

  return best?.previewUrl ?? null
}

export async function enrichTracksWithPreviews<
  T extends { name: string; artists: string; previewUrl: string | null },
>(tracks: T[]): Promise<T[]> {
  const missing = tracks.some((track) => !track.previewUrl)
  if (!missing) return tracks

  return Promise.all(
    tracks.map(async (track) => {
      if (track.previewUrl) return track
      const previewUrl = await resolveItunesPreview(track.name, track.artists)
      if (!previewUrl) return track
      return { ...track, previewUrl }
    })
  )
}
