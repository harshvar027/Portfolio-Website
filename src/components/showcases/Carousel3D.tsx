import { useMemo } from "react";

type Card = {
  label: string;
  sub: string;
  from: string;
  to: string;
};

const CARDS: Card[] = [
  { label: "Discover", sub: "Editorial", from: "#ff6ec4", to: "#7873f5" },
  { label: "Motion", sub: "Reels", from: "#42e695", to: "#3bb2b8" },
  { label: "Studio", sub: "Brand", from: "#f7971e", to: "#ffd200" },
  { label: "Pulse", sub: "Music", from: "#00c6ff", to: "#0072ff" },
  { label: "Nova", sub: "Gallery", from: "#fc5c7d", to: "#6a82fb" },
  { label: "Bloom", sub: "Stories", from: "#a8ff78", to: "#78ffd6" },
  { label: "Echo", sub: "Audio", from: "#f857a6", to: "#ff5858" },
  { label: "Drift", sub: "Travel", from: "#7f00ff", to: "#e100ff" },
];

const Carousel3D = () => {
  const angle = 360 / CARDS.length;
  const cards = useMemo(() => CARDS, []);

  return (
    <div className="sc sc-carousel" data-cursor="disable">
      <div className="sc-carousel-stage">
        <div className="sc-carousel-ring">
          {cards.map((card, i) => (
            <div
              key={card.label}
              className="sc-carousel-card"
              style={{
                transform: `rotateY(${i * angle}deg) translateZ(230px)`,
                background: `linear-gradient(150deg, ${card.from}, ${card.to})`,
              }}
            >
              <span className="sc-carousel-sub">{card.sub}</span>
              <span className="sc-carousel-label">{card.label}</span>
              <span className="sc-carousel-dot" />
            </div>
          ))}
        </div>
        <div className="sc-carousel-floor" />
      </div>
    </div>
  );
};

export default Carousel3D;
