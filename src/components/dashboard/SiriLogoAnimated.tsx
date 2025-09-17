// Animated Siri-like logo for dashboard header
import React, { useEffect, useRef } from "react";

const SiriLogoAnimated: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const waveRef1 = useRef<SVGPathElement>(null);
  const waveRef2 = useRef<SVGPathElement>(null);

  useEffect(() => {
    let frame = 0;
    let running = true;
    function animate() {
      if (!running) return;
      frame += 1;
      const t = frame / 20;
      // Animate the wave paths with sine curves
      const wave1 = `M16 32 C24 ${32 - 8 * Math.sin(t)}, 40 ${32 + 8 * Math.sin(t)}, 48 32`;
      const wave2 = `M16 32 C24 ${32 + 8 * Math.cos(t)}, 40 ${32 - 8 * Math.cos(t)}, 48 32`;
      if (waveRef1.current) waveRef1.current.setAttribute("d", wave1);
      if (waveRef2.current) waveRef2.current.setAttribute("d", wave2);
      requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block" }}
    >
      <defs>
        <radialGradient id="siriGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="60%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#0084FF" />
        </radialGradient>
        <linearGradient id="waveGradient" x1="0" y1="32" x2="64" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6C63FF" />
          <stop offset="1" stopColor="#00CFFF" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#siriGradient)" stroke="#fff" strokeWidth="2" />
      <path
        ref={waveRef1}
        d="M16 32c8-8 24-8 32 0"
        stroke="url(#waveGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        ref={waveRef2}
        d="M16 32c8 8 24 8 32 0"
        stroke="url(#waveGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <circle cx="32" cy="32" r="8" fill="#fff" opacity="0.15" />
    </svg>
  );
};

export default SiriLogoAnimated;
