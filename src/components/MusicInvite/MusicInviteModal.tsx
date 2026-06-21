import { useMusicReactive } from "../../context/MusicReactiveContext";
import MusicPicker from "../Music/MusicPicker";
import "./MusicInvite.css";

const MusicInviteModal = () => {
  const { showInvite, dismissInvite } = useMusicReactive();

  if (!showInvite) return null;

  return (
    <div className="music-invite-backdrop" role="presentation">
      <div
        className="music-invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="music-invite-title"
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
        <MusicPicker
          layout="modal"
          showInviteOnOpen
          onClose={dismissInvite}
        />
      </div>
    </div>
  );
};

export default MusicInviteModal;
