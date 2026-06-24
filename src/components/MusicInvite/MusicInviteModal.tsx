import { useEffect, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useMusicReactive } from "../../context/MusicReactiveContext";
import MusicPicker from "../Music/MusicPicker";
import "./MusicInvite.css";

const MusicInviteModal = () => {
  const { showInvite, dismissInvite } = useMusicReactive();
  const [mounted, setMounted] = useState(false);

  const isVisible = showInvite;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") dismissInvite();
    };

    document.body.classList.add("music-invite-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("music-invite-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, dismissInvite]);

  const handleBackdropClick = () => {
    dismissInvite();
  };

  const handleBackdropKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dismissInvite();
    }
  };

  if (!mounted || !isVisible) return null;

  return createPortal(
    <div
      className="music-invite-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      tabIndex={-1}
    >
      <div
        className="music-invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="music-invite-title"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="music-invite-close"
          aria-label="Close"
          onClick={dismissInvite}
        >
          ×
        </button>
        <div id="music-invite-title" className="sr-only">
          Pick a song for your visit
        </div>
        <MusicPicker showInviteOnOpen onClose={dismissInvite} />
      </div>
    </div>,
    document.body
  );
};

export default MusicInviteModal;
