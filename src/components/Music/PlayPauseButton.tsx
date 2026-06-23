import type { KeyboardEvent, MouseEvent } from "react"

type PlayPauseButtonProps = {
  isPaused: boolean
  onToggle: () => void
  className?: string
  size?: "sm" | "md"
  label?: string
}

const PlayPauseButton = ({
  isPaused,
  onToggle,
  className = "",
  size = "md",
  label,
}: PlayPauseButtonProps) => {
  const ariaLabel = label ?? (isPaused ? "Resume playback" : "Pause playback")

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onToggle()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <button
      type="button"
      className={`play-pause-btn play-pause-btn-${size} ${className}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-pressed={!isPaused}
    >
      {isPaused ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="play-pause-btn-icon">
          <path d="M8 5.5v13l11-6.5L8 5.5z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="play-pause-btn-icon">
          <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}

export default PlayPauseButton
