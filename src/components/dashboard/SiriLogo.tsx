// Siri-like animated logo for dashboard header
import React from "react";

const SiriLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
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
      d="M16 32c8-8 24-8 32 0"
      stroke="url(#waveGradient)"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <path
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

export default SiriLogo;
