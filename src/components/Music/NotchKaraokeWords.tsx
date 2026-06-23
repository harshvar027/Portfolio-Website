import type { CSSProperties } from "react"
import { getWordSyncState } from "../../lib/lrclib/parseLrc"
import "./NotchKaraokeWords.css"

export type NotchKaraokeVariant = "compact" | "expanded" | "stage"

type NotchKaraokeWordsProps = {
  text: string
  lineStartMs: number
  lineEndMs: number
  positionMs: number
  variant?: NotchKaraokeVariant
  isActive?: boolean
  isPast?: boolean
}

const splitLyricTokens = (text: string): string[] =>
  text.split(/(\s+)/).filter((part) => part.length > 0)

const getClassPrefix = (variant: NotchKaraokeVariant): string => {
  if (variant === "stage") return "lyrics-stage"
  if (variant === "expanded") return "notch-karaoke-expanded"
  return "notch-karaoke"
}

const NotchKaraokeWords = ({
  text,
  lineStartMs,
  lineEndMs,
  positionMs,
  variant = "compact",
  isActive = true,
  isPast = false,
}: NotchKaraokeWordsProps) => {
  const prefix = getClassPrefix(variant)
  const tokens = splitLyricTokens(text)
  const wordSync = isActive
    ? getWordSyncState(text, lineStartMs, lineEndMs, positionMs)
    : { activeWordIndex: -1, wordProgress: 0 }

  let wordCursor = 0

  return (
    <>
      {tokens.map((token, i) => {
        const isSpace = /^\s+$/.test(token)

        if (isSpace) {
          return (
            <span
              key={`space-${i}`}
              className={`${prefix}-space`}
              aria-hidden="true"
            >
              {token}
            </span>
          )
        }

        const wordIndex = wordCursor
        wordCursor += 1

        const isSung = isPast || (isActive && wordIndex < wordSync.activeWordIndex)
        const isSinging = isActive && wordIndex === wordSync.activeWordIndex
        const singProgress = isSinging ? wordSync.wordProgress : isSung ? 1 : 0

        const wordClass = [
          `${prefix}-word`,
          isSung ? `${prefix}-word-sung` : "",
          isSinging ? `${prefix}-word-singing` : "",
          !isActive && !isPast ? `${prefix}-word-upcoming` : "",
        ]
          .filter(Boolean)
          .join(" ")

        return (
          <span
            key={`word-${i}-${token}`}
            className={wordClass}
            style={{ "--word-progress": singProgress } as CSSProperties}
          >
            <span className={`${prefix}-word-fill`}>{token}</span>
          </span>
        )
      })}
    </>
  )
}

export default NotchKaraokeWords
