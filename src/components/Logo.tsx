export function Logo({ size = 22, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--ink)" />
        <line x1="9" y1="22" x2="16" y2="11" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="11" x2="23" y2="17" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="22" x2="23" y2="17" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="22" r="3" fill="#ffffff" />
        <circle cx="16" cy="11" r="3" fill="#5eead4" />
        <circle cx="23" cy="17" r="3" fill="#ffffff" />
      </svg>
      {wordmark && <span className="font-display text-[17px] font-bold tracking-tight text-ink">GROW AI</span>}
    </span>
  );
}
