interface LogoMarkProps {
  className?: string
  /** Rotates the lighthouse beam like a radar sweep (disabled for reduced motion via CSS). */
  animated?: boolean
}

/** The Fyrvakt mark: a lighthouse whose beam doubles as a radar sweep, catching a ship. */
export function LogoMark({ className, animated = false }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="lm-bg" cx="50%" cy="58%" r="70%">
          <stop offset="0" stopColor="#0d2a3d" />
          <stop offset="1" stopColor="#04111c" />
        </radialGradient>
        <linearGradient
          id="lm-beam"
          x1="256"
          y1="206"
          x2="470"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffc24b" stopOpacity=".95" />
          <stop offset="1" stopColor="#ffc24b" stopOpacity="0" />
        </linearGradient>
        <clipPath id="lm-scope">
          <circle cx="256" cy="280" r="214" />
        </clipPath>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#lm-bg)" />
      <g fill="none" stroke="#3ee6c1" strokeOpacity=".28" strokeWidth="7">
        <circle cx="256" cy="280" r="76" />
        <circle cx="256" cy="280" r="146" />
        <circle cx="256" cy="280" r="214" strokeOpacity=".18" />
      </g>
      <g
        clipPath="url(#lm-scope)"
        className={animated ? 'motion-safe:animate-sweep' : undefined}
        style={{ transformOrigin: '256px 212px', transformBox: 'view-box' }}
      >
        <path d="M256 212 L500 58 L500 262 Z" fill="url(#lm-beam)" />
      </g>
      <g transform="translate(398 172) rotate(62)">
        <circle r="34" fill="#3ee6c1" fillOpacity=".2" />
        <path
          d="M0 -24 C9 -14 12 -4 12 8 L12 20 L-12 20 L-12 8 C-12 -4 -9 -14 0 -24 Z"
          fill="#3ee6c1"
        />
      </g>
      <path d="M236 402 L246 230 L266 230 L276 402 Z" fill="#f4ecd8" />
      <path d="M240.6 330 L271.4 330 L272.8 354 L239.2 354 Z" fill="#e2574c" />
      <path d="M243.5 272 L268.5 272 L269.6 292 L242.4 292 Z" fill="#e2574c" />
      <rect x="238" y="200" width="36" height="30" rx="5" fill="#ffc24b" />
      <path d="M230 202 L256 176 L282 202 Z" fill="#f4ecd8" />
      <path
        d="M136 418 q30 -18 60 0 t60 0 t60 0 t60 0"
        fill="none"
        stroke="#3ee6c1"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-[0.14em] uppercase ${className}`}>
      Fyr<span className="text-beacon">vakt</span>
    </span>
  )
}
