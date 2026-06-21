import { PropsWithChildren } from "react";
import { useTilt } from "../hooks/useTilt";

type TiltCardProps = PropsWithChildren<{
  className?: string;
  maxTilt?: number;
  depth?: number;
  hoverOnly?: boolean;
  hoverScale?: number;
}>;

const TiltCard = ({
  children,
  className = "",
  maxTilt = 14,
  depth = 28,
  hoverOnly = false,
  hoverScale = 1.04,
}: TiltCardProps) => {
  const { ref, innerRef, glareRef, shadowRef, onEnter, onMove, onLeave } =
    useTilt<HTMLDivElement>({
      maxTilt,
      scale: hoverScale,
      depth,
      hoverOnly,
    });

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div ref={shadowRef} className="tilt-card-shadow" aria-hidden="true" />
      <div ref={innerRef} className="tilt-card-inner">
        {children}
        <div ref={glareRef} className="tilt-card-glare" aria-hidden="true" />
      </div>
    </div>
  );
};

export default TiltCard;
