"use client";

import { useRef, useState } from "react";

/** A 3D game box that tilts toward the cursor — no idle spin, front face is the cover art. */
export function GameBox({
  href,
  cover,
  title,
  back,
}: {
  href: string;
  cover: string;
  title: string;
  back: string[];
}) {
  const scene = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (event: React.PointerEvent) => {
    const rect = scene.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 22, y: px * 30 });
  };

  return (
    <a
      ref={scene}
      className="box-scene"
      href={href}
      aria-label={`Play ${title} in your browser`}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="box"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="box-face box-front">
          <img src={cover} alt={`${title} box art`} />
        </div>
        <div className="box-face box-back">
          {back.map((line) => (
            <span key={line}>{line}</span>
          ))}
          <span className="play">PLAY ▸</span>
        </div>
        <div className="box-face box-spine">{title.toUpperCase()}</div>
        <div className="box-face box-spine box-spine-right">WASM.COM.BR</div>
        <div className="box-face box-top" />
        <div className="box-face box-bottom" />
      </div>
      <span className="box-caption">{title}</span>
    </a>
  );
}
