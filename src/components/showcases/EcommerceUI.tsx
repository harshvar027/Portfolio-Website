import { useMemo } from "react";

type Product = {
  name: string;
  price: string;
  from: string;
  to: string;
  icon: string;
};

const ROW_A: Product[] = [
  { name: "Aero Runners", price: "$129", from: "#ff9a9e", to: "#fad0c4", icon: "👟" },
  { name: "Lumen Watch", price: "$219", from: "#a1c4fd", to: "#c2e9fb", icon: "⌚" },
  { name: "Nova Cam", price: "$349", from: "#fbc2eb", to: "#a6c1ee", icon: "📷" },
  { name: "Echo Buds", price: "$89", from: "#84fab0", to: "#8fd3f4", icon: "🎧" },
];

const ROW_B: Product[] = [
  { name: "Flux Pack", price: "$74", from: "#f6d365", to: "#fda085", icon: "🎒" },
  { name: "Pixel Pad", price: "$499", from: "#5ee7df", to: "#b490ca", icon: "📱" },
  { name: "Glow Lamp", price: "$59", from: "#d299c2", to: "#fef9d7", icon: "💡" },
  { name: "Drift Board", price: "$159", from: "#f093fb", to: "#f5576c", icon: "🛹" },
];

const Card = ({ p }: { p: Product }) => (
  <div className="sc-shop-card">
    <div
      className="sc-shop-thumb"
      style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
    >
      <span>{p.icon}</span>
    </div>
    <div className="sc-shop-meta">
      <span className="sc-shop-name">{p.name}</span>
      <span className="sc-shop-price">{p.price}</span>
    </div>
  </div>
);

const EcommerceUI = () => {
  // duplicate rows so the marquee loops seamlessly
  const rowA = useMemo(() => [...ROW_A, ...ROW_A], []);
  const rowB = useMemo(() => [...ROW_B, ...ROW_B], []);

  return (
    <div className="sc sc-shop" data-cursor="disable">
      <div className="sc-shop-bg">
        <span className="sc-shop-grid" />
        <span className="sc-shop-orb sc-shop-orb-1" />
        <span className="sc-shop-orb sc-shop-orb-2" />
      </div>

      <div className="sc-shop-ui">
        <div className="sc-shop-top">
          <span className="sc-shop-brand">LUMINA</span>
          <div className="sc-shop-actions">
            <span className="sc-shop-search" />
            <span className="sc-shop-cart">🛍 3</span>
          </div>
        </div>

        <div className="sc-shop-rows">
          <div className="sc-shop-track sc-shop-left">
            {rowA.map((p, i) => (
              <Card key={`a-${i}`} p={p} />
            ))}
          </div>
          <div className="sc-shop-track sc-shop-right">
            {rowB.map((p, i) => (
              <Card key={`b-${i}`} p={p} />
            ))}
          </div>
        </div>

        <div className="sc-shop-cta">
          <button type="button">Shop the drop →</button>
        </div>
      </div>
    </div>
  );
};

export default EcommerceUI;
