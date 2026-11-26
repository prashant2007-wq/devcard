import { useEffect, useRef, useState } from 'react';
import LottieSlot from './LottieSlot.jsx';

const ACCENT_MAP = {
  cyan: { primary: '#38bdf8', secondary: '#818cf8' },
  violet: { primary: '#a78bfa', secondary: '#f472b6' },
  emerald: { primary: '#34d399', secondary: '#38bdf8' },
};

const RARITY_STYLES = {
  Mythic: { color: '#f472b6', glow: 'rgba(244, 114, 182, 0.22)' },
  Legendary: { color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.2)' },
  Epic: { color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.2)' },
  Rare: { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.18)' },
  Common: { color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.12)' },
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
    const duration = 500;
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
 * Hero frosted-glass DevCard with subtle holographic sheen, gentle 3D tilt,
 * README SVG embed snippet, PNG download, and shareable link.
 */
export default function DevCard({ profile, vibe = 'cyberpunk', accent = 'cyan' }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [copied, setCopied] = useState('');

  const accentTheme = ACCENT_MAP[accent] || ACCENT_MAP.cyan;
  const rarityTheme = RARITY_STYLES[profile.rarity] || RARITY_STYLES.Common;

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const onOrient = (e) => {
      if (e.beta == null || e.gamma == null) return;
      const rx = Math.max(-7, Math.min(7, (e.beta - 45) * 0.2));
      const ry = Math.max(-7, Math.min(7, e.gamma * 0.2));
      setTilt({ rx: -rx, ry, gx: 50 + ry * 3, gy: 50 + rx * 3 });
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
      rx: (0.5 - py) * 10,
      ry: (px - 0.5) * 10,
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
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 540);

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 1256, 516);

    ctx.fillStyle = accentTheme.primary;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`DEVCARD`, 64, 72);

    ctx.fillStyle = rarityTheme.color;
    ctx.fillText(profile.rarity.toUpperCase(), 1080, 72);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(profile.name.slice(0, 24), 64, 158);

    ctx.fillStyle = accentTheme.primary;
    ctx.font = '26px monospace';
    ctx.fillText(`@${profile.username}`, 64, 204);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText((profile.bio || '').slice(0, 68), 64, 254);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(String(profile.totalStars.toLocaleString()), 64, 360);
    ctx.fillText(String(profile.publicRepos.toLocaleString()), 360, 360);
    ctx.fillText(String(profile.followers.toLocaleString()), 660, 360);

    ctx.fillStyle = '#64748b';
    ctx.font = '18px monospace';
    ctx.fillText('STARS', 64, 394);
    ctx.fillText('REPOS', 360, 394);
    ctx.fillText('FOLLOWERS', 660, 394);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '22px monospace';
    ctx.fillText(profile.topLanguages.join('  •  '), 64, 470);

    const link = document.createElement('a');
    link.download = `devcard-${profile.username}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <section className="card-stage">
      <div
        ref={cardRef}
        className="holo-card"
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
            <span className="mono-label">DEVCARD</span>
            <span className="rarity-badge">{profile.rarity}</span>
          </div>

          <div className="card-identity">
            <img
              src={profile.avatarUrl}
              alt={`${profile.username} avatar`}
              className="card-avatar"
              width="68"
              height="68"
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
              <span className="mono-label">STARS</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">
                <AnimatedCounter value={profile.publicRepos} />
              </span>
              <span className="mono-label">REPOS</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">
                <AnimatedCounter value={profile.followers} />
              </span>
              <span className="mono-label">FOLLOWERS</span>
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

      <div className="glass-panel actions-panel fade-up">
        <div className="embed-box">
          <label className="mono-label" htmlFor="readme-embed">
            GITHUB README EMBED
          </label>
          <div className="embed-row">
            <input
              id="readme-embed"
              type="text"
              readOnly
              value={readmeSnippet}
              className="glass-input mono-sm"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className="glass-btn primary"
              onClick={() => copyText('embed', readmeSnippet)}
            >
              {copied === 'embed' ? 'Copied' : 'Copy Markdown'}
            </button>
          </div>
        </div>

        <div className="action-buttons">
          <button type="button" className="glass-btn" onClick={downloadPng}>
            Download PNG
          </button>
          <button
            type="button"
            className="glass-btn"
            onClick={() => copyText('share', shareUrl)}
          >
            {copied === 'share' ? 'Link Copied' : 'Copy Share Link'}
          </button>
        </div>
      </div>
    </section>
  );
}
