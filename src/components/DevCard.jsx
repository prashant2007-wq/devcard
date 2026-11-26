import { useEffect, useRef, useState } from 'react';
import LottieSlot from './LottieSlot.jsx';

const ACCENT_MAP = {
  cyan: { primary: '#00f0ff', secondary: '#0077ff', label: 'NEON CYAN' },
  violet: { primary: '#b55cff', secondary: '#ff2e93', label: 'PLASMA VIOLET' },
  emerald: { primary: '#00ffaa', secondary: '#00b894', label: 'MATRIX EMERALD' },
};

const RARITY_STYLES = {
  Mythic: { color: '#ff2e93', glow: 'rgba(255, 46, 147, 0.35)' },
  Legendary: { color: '#ffb800', glow: 'rgba(255, 184, 0, 0.32)' },
  Epic: { color: '#b55cff', glow: 'rgba(181, 92, 255, 0.3)' },
  Rare: { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.25)' },
  Common: { color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.18)' },
};

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value === 0) {
      setDisplay(value);
      return;
    }

    let start = null;
    const duration = 650;
    let rafId = null;

    const tick = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

/**
 * Interactive holographic DevCard with 3D cursor/device tilt,
 * conic-gradient foil, rarity aura, README embed snippet, PNG download, and share link.
 */
export default function DevCard({ profile, vibe = 'cyberpunk', accent = 'cyan' }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [copied, setCopied] = useState('');

  const accentTheme = ACCENT_MAP[accent] || ACCENT_MAP.cyan;
  const rarityTheme = RARITY_STYLES[profile.rarity] || RARITY_STYLES.Common;
  const isHighRarity = ['Epic', 'Legendary', 'Mythic'].includes(profile.rarity);

  // Device orientation tilt on mobile
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const onOrient = (e) => {
      if (e.beta == null || e.gamma == null) return;
      const rx = Math.max(-10, Math.min(10, (e.beta - 45) * 0.25));
      const ry = Math.max(-10, Math.min(10, e.gamma * 0.25));
      setTilt({
        rx: -rx,
        ry,
        gx: 50 + ry * 3,
        gy: 50 + rx * 3,
      });
    };

    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, []);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 16,
      ry: (px - 0.5) * 16,
      gx: px * 100,
      gy: py * 100,
    });
  };

  const resetTilt = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const svgUrl = `${origin}/api/card?username=${encodeURIComponent(profile.username)}&vibe=${encodeURIComponent(vibe)}&accent=${encodeURIComponent(accent)}`;
  const readmeSnippet = `![${profile.username}'s DevCard](${svgUrl})`;
  const shareUrl = `${origin}/?u=${encodeURIComponent(profile.username)}&vibe=${encodeURIComponent(vibe)}&accent=${encodeURIComponent(accent)}`;

  const copyText = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('Copy failed');
    }
  };

  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1280, 540);
    grad.addColorStop(0, '#060913');
    grad.addColorStop(0.55, '#0d1526');
    grad.addColorStop(1, '#090d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 540);

    ctx.strokeStyle = accentTheme.primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 1256, 516);

    ctx.fillStyle = accentTheme.primary;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`DEVCARD // ${vibe.toUpperCase()}`, 64, 72);

    ctx.fillStyle = rarityTheme.color;
    ctx.fillText(`[${profile.rarity.toUpperCase()}]`, 1040, 72);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(profile.name.slice(0, 24), 64, 158);

    ctx.fillStyle = accentTheme.primary;
    ctx.font = '28px monospace';
    ctx.fillText(`@${profile.username}`, 64, 206);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText((profile.bio || '').slice(0, 68), 64, 256);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(String(profile.totalStars.toLocaleString()), 64, 360);
    ctx.fillText(String(profile.publicRepos.toLocaleString()), 360, 360);
    ctx.fillText(String(profile.followers.toLocaleString()), 660, 360);

    ctx.fillStyle = '#64748b';
    ctx.font = '20px monospace';
    ctx.fillText('STARS', 64, 396);
    ctx.fillText('REPOS', 360, 396);
    ctx.fillText('FOLLOWERS', 660, 396);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px monospace';
    ctx.fillText(`TOP STACK: ${profile.topLanguages.join('  •  ')}`, 64, 472);

    const link = document.createElement('a');
    link.download = `devcard-${profile.username}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <section className="card-stage">
      <div
        ref={cardRef}
        className={`holo-card ${isHighRarity ? 'high-rarity' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetTilt}
        style={{
          '--rx': `${tilt.rx}deg`,
          '--ry': `${tilt.ry}deg`,
          '--gx': `${tilt.gx}%`,
          '--gy': `${tilt.gy}%`,
          '--accent': accentTheme.primary,
          '--accent-2': accentTheme.secondary,
          '--rarity-color': rarityTheme.color,
          '--rarity-glow': rarityTheme.glow,
        }}
      >
        <LottieSlot slot="card-reveal" loop={false} className="card-reveal-lottie" />
        <div className="holo-foil" aria-hidden="true" />
        <div className="holo-glare" aria-hidden="true" />

        <div className="card-inner">
          <div className="card-top">
            <span className="status-chip">DEVCARD // {vibe.toUpperCase()}</span>
            <span className="rarity-badge">{profile.rarity.toUpperCase()}</span>
          </div>

          <div className="card-identity">
            <img
              src={profile.avatarUrl}
              alt={`${profile.username} avatar`}
              className="card-avatar"
              width="72"
              height="72"
            />
            <div>
              <h2 className="card-name">{profile.name}</h2>
              <p className="card-handle">@{profile.username}</p>
            </div>
          </div>

          <p className="card-bio">{profile.bio}</p>

          <div className="card-stats">
            <div className="stat-box">
              <span className="stat-value">
                <AnimatedCounter value={profile.totalStars} />
              </span>
              <span className="stat-label">STARS</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">
                <AnimatedCounter value={profile.publicRepos} />
              </span>
              <span className="stat-label">REPOS</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">
                <AnimatedCounter value={profile.followers} />
              </span>
              <span className="stat-label">FOLLOWERS</span>
            </div>
          </div>

          <div className="card-langs">
            {profile.topLanguages.map((lang) => (
              <span key={lang} className="lang-pill">
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Real-use hooks: README SVG embed, PNG download, Share link */}
      <div className="hud-panel actions-panel">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <div className="embed-box">
          <label className="hud-label" htmlFor="readme-embed">
            GITHUB README EMBED (LIVE SVG)
          </label>
          <div className="embed-row">
            <input
              id="readme-embed"
              type="text"
              readOnly
              value={readmeSnippet}
              className="hud-input mono-sm"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className="hud-btn primary"
              onClick={() => copyText('embed', readmeSnippet)}
            >
              {copied === 'embed' ? 'COPIED ✓' : 'COPY MD'}
            </button>
          </div>
        </div>

        <div className="action-buttons">
          <button type="button" className="hud-btn" onClick={downloadPng}>
            DOWNLOAD PNG
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={() => copyText('share', shareUrl)}
          >
            {copied === 'share' ? 'LINK COPIED ✓' : 'COPY SHARE LINK'}
          </button>
        </div>
      </div>
    </section>
  );
}
