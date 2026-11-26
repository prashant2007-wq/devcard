import { useEffect, useRef, useState } from 'react';

const ACCENT_COLORS = {
  cyan:    { primary: '#38bdf8', secondary: '#818cf8' },
  violet:  { primary: '#a78bfa', secondary: '#f472b6' },
  emerald: { primary: '#34d399', secondary: '#38bdf8' },
};

const RARITY_STYLES = {
  Mythic:    { color: '#f472b6', glow: 'rgba(244,114,182,0.22)' },
  Legendary: { color: '#fbbf24', glow: 'rgba(251,191,36,0.2)' },
  Epic:      { color: '#a78bfa', glow: 'rgba(167,139,250,0.2)' },
  Rare:      { color: '#38bdf8', glow: 'rgba(56,189,248,0.18)' },
  Common:    { color: '#94a3b8', glow: 'rgba(148,163,184,0.12)' },
};

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value === 0) { setDisplay(value); return; }
    let start = null; let rafId;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 500, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

/**
 * Reusable holographic card — works for both the sample hero card
 * and the generated result card. Pass `isSample` for the floating
 * wrapper + "Sample" label; pass `showReveal` for the mount animation.
 */
export default function HoloCard({
  profile,
  accent = 'cyan',
  isSample = false,
  showReveal = false,
  className = '',
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });

  const accentTheme = ACCENT_COLORS[accent] || ACCENT_COLORS.cyan;
  const rarityTheme = RARITY_STYLES[profile.rarity] || RARITY_STYLES.Common;

  // Desktop: cursor tilt
  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top)  / rect.height;
    setTilt({ rx: (0.5 - py) * 10, ry: (px - 0.5) * 10, gx: px * 100, gy: py * 100 });
  };
  const resetTilt = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });

  // Mobile: device orientation
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const handler = (e) => {
      if (e.beta == null) return;
      setTilt({
        rx: Math.max(-7, Math.min(7, -(e.beta - 45) * 0.2)),
        ry: Math.max(-7, Math.min(7,   e.gamma * 0.2)),
        gx: 50 + (e.gamma ?? 0) * 2,
        gy: 50 - ((e.beta ?? 45) - 45) * 2,
      });
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  const card = (
    <div
      ref={cardRef}
      className={`holo-card ${showReveal ? 'card-reveal-anim' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      style={{
        '--rx': `${tilt.rx}deg`,
        '--ry': `${tilt.ry}deg`,
        '--gx': `${tilt.gx}%`,
        '--gy': `${tilt.gy}%`,
        '--accent': accentTheme.primary,
        '--rarity-color': rarityTheme.color,
        '--rarity-glow': rarityTheme.glow,
      }}
    >
      <div className="holo-foil" aria-hidden="true" />
      <div className="holo-glare" aria-hidden="true" />
      <div className="card-inner">
        <div className="card-top">
          <span className="mono-label" style={{ marginBottom: 0 }}>DEVCARD</span>
          <span className="rarity-badge">{profile.rarity}</span>
        </div>
        <div className="card-identity">
          <img
            src={profile.avatarUrl}
            alt={isSample ? 'Sample avatar' : `${profile.username} avatar`}
            className="card-avatar"
            width="60"
            height="60"
          />
          <div>
            <div className="card-name">{profile.name}</div>
            <div className="card-handle">@{profile.username}</div>
          </div>
        </div>
        <p className="card-bio">{profile.bio}</p>
        <div className="card-stats">
          <div className="stat-box">
            <span className="stat-value"><AnimatedCounter value={profile.totalStars} /></span>
            <span className="mono-label" style={{ marginBottom: 0 }}>STARS</span>
          </div>
          <div className="stat-box">
            <span className="stat-value"><AnimatedCounter value={profile.publicRepos} /></span>
            <span className="mono-label" style={{ marginBottom: 0 }}>REPOS</span>
          </div>
          <div className="stat-box">
            <span className="stat-value"><AnimatedCounter value={profile.followers} /></span>
            <span className="mono-label" style={{ marginBottom: 0 }}>FOLLOWERS</span>
          </div>
        </div>
        <div className="card-langs">
          {profile.topLanguages.map((lang) => (
            <span key={lang} className="lang-pill">{lang}</span>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isSample) return card;

  return (
    <div className="hero-card-wrap">
      <span className="sample-label" aria-label="This is a sample card">SAMPLE</span>
      {card}
    </div>
  );
}
