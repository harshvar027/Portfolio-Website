import { FormEvent, useState } from "react";
import { MdArrowOutward } from "react-icons/md";
import "./styles/Comments.css";

type Status = "idle" | "sending" | "success" | "error";

const Comments = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus("error");
      setFeedback("Please write something before sending.");
      return;
    }

    setStatus("sending");
    setFeedback("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
      setFeedback("Thanks for your comment! It has been saved.");
      setName("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setFeedback(
        err instanceof Error ? err.message : "Could not send your comment."
      );
    }
  };

  return (
    <div className="comments-section section-container" id="comments">
      <div className="comments-container">
        <h3>Leave a Comment</h3>
        <p className="comments-subtitle">
          Got feedback, an idea, or just something to say about the site? Drop it
          below.
        </p>
        <form className="comments-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="comments-input"
            placeholder="Your name (optional)"
            value={name}
            maxLength={100}
            data-cursor="disable"
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="comments-textarea"
            placeholder="Write your comment, suggestions or implementation ideas..."
            value={message}
            maxLength={2000}
            rows={5}
            data-cursor="disable"
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="comments-bottom">
            {feedback && (
              <span className={`comments-feedback comments-feedback-${status}`}>
                {feedback}
              </span>
            )}
            <button
              type="submit"
              className="comments-submit"
              data-cursor="disable"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending" : "Send Comment"}
              <MdArrowOutward />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Comments;
