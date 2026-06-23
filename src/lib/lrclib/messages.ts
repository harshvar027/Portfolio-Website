export const LYRICS_NOT_FOUND = "Can't find lyrics"

export const toLyricsUserMessage = (error: unknown): string => {
  if (!error) return LYRICS_NOT_FOUND
  return LYRICS_NOT_FOUND
}
