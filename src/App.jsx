import { useEffect, useMemo, useState } from 'react';
import { FlagsmithProvider, useExperiment } from '@flagsmith/flagsmith/react';
import {
  flagsmith,
  getFlagsmithOptions,
  registerUnloadFlush,
  trackCardCreated,
} from './lib/flagsmith.js';
import { fetchGitHubProfile, SAMPLE_FALLBACK_PROFILE } from './lib/github.js';
import HudBackground from './components/HudBackground.jsx';
import LottieSlot from './components/LottieSlot.jsx';
import HoloCard from './components/HoloCard.jsx';
import ScanSequence from './components/ScanSequence.jsx';
import Lab from './pages/Lab.jsx';

// ─── Sample profile shown in the hero (never fires a conversion) ──────────
const SAMPLE_PROFILE = {
  username: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
  bio: 'I love open source and caffeine.',
  followers: 14200,
  publicRepos: 8,
  totalStars: 3100,
  topLanguages: ['TypeScript', 'Go', 'Rust'],
  rarity: 'Epic',
};

const VIBES = [
  { id: 'cyberpunk', label: 'Cyberpunk',  desc: 'Crisp neon contrast' },
  { id: 'solaris',   label: 'Solaris',    desc: 'Deep orbital tone'   },
  { id: 'obsidian',  label: 'Obsidian',   desc: 'Quiet monochrome'    },
];

const ACCENTS = [
  { id: 'cyan',    label: 'Sky Cyan',      hex: '#38bdf8' },
  { id: 'violet',  label: 'Soft Violet',   hex: '#a78bfa' },
  { id: 'emerald', label: 'Mint Emerald',  hex: '#34d399' },
];

// ─── Post-generation actions panel ───────────────────────────────────────
function ActionsPanel({ profile, vibe, accent }) {
  const [copied, setCopied] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const svgUrl = `${origin}/api/card?username=${encodeURIComponent(profile.username)}&vibe=${encodeURIComponent(vibe)}&accent=${encodeURIComponent(accent)}`;
  const readmeSnippet = `![${profile.username}'s DevCard](${svgUrl})`;
  const shareUrl = `${origin}/?u=${encodeURIComponent(profile.username)}&vibe=${encodeURIComponent(vibe)}&accent=${encodeURIComponent(accent)}`;

  const copy = async (label, text) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, 1280, 540);
    g.addColorStop(0, '#07090f'); g.addColorStop(1, '#111827');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 540);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 1256, 516);
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 20px monospace';
    ctx.fillText('DEVCARD', 64, 68);
    ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 52px sans-serif';
    ctx.fillText(profile.name.slice(0, 24), 64, 150);
    ctx.fillStyle = '#38bdf8'; ctx.font = '26px monospace';
    ctx.fillText(`@${profile.username}`, 64, 198);
    ctx.fillStyle = '#94a3b8'; ctx.font = '24px sans-serif';
    ctx.fillText((profile.bio || '').slice(0, 68), 64, 250);
    ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 40px sans-serif';
    ctx.fillText(String(profile.totalStars.toLocaleString()), 64, 356);
    ctx.fillText(String(profile.publicRepos.toLocaleString()), 360, 356);
    ctx.fillText(String(profile.followers.toLocaleString()), 660, 356);
    ctx.fillStyle = '#64748b'; ctx.font = '18px monospace';
    ['STARS','REPOS','FOLLOWERS'].forEach((l,i) => ctx.fillText(l, [64,360,660][i], 390));
    ctx.fillStyle = '#cbd5e1'; ctx.font = '22px monospace';
    ctx.fillText(profile.topLanguages.join('  •  '), 64, 466);
    const a = document.createElement('a');
    a.download = `devcard-${profile.username}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <div className="glass-panel actions-panel fade-up">
      <div className="embed-box">
        <label className="mono-label" htmlFor="readme-embed">GITHUB README EMBED</label>
        <div className="embed-row">
          <input
            id="readme-embed" type="text" readOnly value={readmeSnippet}
            className="glass-input mono-sm" onClick={(e) => e.target.select()}
          />
          <button type="button" className="glass-btn primary"
            onClick={() => copy('embed', readmeSnippet)}>
            {copied === 'embed' ? 'Copied ✓' : 'Copy Markdown'}
          </button>
        </div>
      </div>
      <div className="action-buttons">
        <button type="button" className="glass-btn" onClick={downloadPng}>Download PNG</button>
        <button type="button" className="glass-btn" onClick={() => copy('share', shareUrl)}>
          {copied === 'share' ? 'Link Copied ✓' : 'Copy Share Link'}
        </button>
      </div>
    </div>
  );
}

// ─── Main onboarding workspace (experiment arms live here) ───────────────
function OnboardingWorkspace() {
  // ⚡ Experiment: evaluates flag + records $flag_exposure. DO NOT CHANGE.
  const onboardingFlag = useExperiment('onboarding_flow');
  const isQuizFlow = onboardingFlag?.value === 'quiz';

  const [quizStep, setQuizStep] = useState(1);
  const [vibe,   setVibe]   = useState('cyberpunk');
  const [accent, setAccent] = useState('cyan');
  const [username, setUsername] = useState('');

  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState('');
  const [profile,  setProfile]  = useState(null);

  // Shared link: load card without firing conversion
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    if (!u) return;
    setVibe(params.get('vibe') || 'cyberpunk');
    setAccent(params.get('accent') || 'cyan');
    setUsername(u);
    setScanning(true);
    fetchGitHubProfile(u)
      .then(setProfile).catch((e) => setError(e.message))
      .finally(() => setScanning(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(''); setProfile(null); setScanning(true);
    try {
      const [data] = await Promise.all([
        fetchGitHubProfile(username),
        new Promise((r) => setTimeout(r, 850)),
      ]);
      setProfile(data);
      // ⚡ Conversion event — DO NOT CHANGE.
      await trackCardCreated();
    } catch (err) {
      setError(err.message || 'Failed to generate DevCard.');
    } finally {
      setScanning(false);
    }
  };

  // Derive the preview profile: use generated profile or sample
  const previewProfile = profile
    ? { ...profile }
    : { ...SAMPLE_PROFILE };

  if (profile && !scanning) {
    return (
      <main className="app-shell">
        <div className="main-content" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
            <header className="top-bar">
              <a href="/" className="brand-link">DevCard</a>
              <a href="/lab" className="glass-btn">Experiment Lab →</a>
            </header>
            <div className="card-stage fade-up">
              <HoloCard
                profile={profile}
                accent={accent}
                isSample={Boolean(profile.isSampleFallback)}
                showReveal
              />
              {profile.isSampleFallback && (
                <div className="notice-banner">
                  Showing built-in sample card (GitHub was unreachable or rate-limited). This
                  fallback is not counted as an experiment conversion.
                </div>
              )}
              {!profile.isSampleFallback && (
                <ActionsPanel profile={profile} vibe={vibe} accent={accent} />
              )}
              <div className="reset-wrap">
                <button type="button" className="glass-btn"
                  onClick={() => { setProfile(null); setError(''); setQuizStep(1); }}>
                  Generate another card
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <a href="/" className="brand-link">DevCard</a>
        <a href="/lab" className="glass-btn">Experiment Lab →</a>
      </header>

      <div className="main-content">
        <div className="hero-grid">
          {/* ── Left: headline + onboarding form ── */}
          <div className="hero-left">
            <div>
              <span className="pill-badge">
                <span className="live-dot" /> GitHub Developer Card
              </span>
            </div>

            <h1 className="hero-title">
              Your GitHub,{' '}
              <span className="gradient-word">
                <LottieSlot slot="heading-glitch" fallback={<span>distilled.</span>} />
              </span>
            </h1>

            <p className="hero-sub">
              Generate a holographic developer card from your public GitHub profile — ready to
              embed in your README or share anywhere.
            </p>

            {/* Onboarding panel — identical glass styling for both arms */}
            {!scanning && (
              <div className="glass-panel fade-up">
                {isQuizFlow ? (
                  /* ── Quiz arm (3-step) ── */
                  <div className="quiz-flow">
                    <div className="quiz-progress">
                      <span className="mono-label">STEP {quizStep} OF 3</span>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${(quizStep / 3) * 100}%` }} />
                      </div>
                    </div>

                    {quizStep === 1 && (
                      <div className="quiz-step">
                        <label className="mono-label">CHOOSE CARD STYLE</label>
                        <div className="option-grid">
                          {VIBES.map((item) => (
                            <button key={item.id} type="button"
                              className={`option-card ${vibe === item.id ? 'selected' : ''}`}
                              onClick={() => setVibe(item.id)}>
                              <strong>{item.label}</strong>
                              <span>{item.desc}</span>
                            </button>
                          ))}
                        </div>
                        <div className="quiz-nav">
                          <button type="button" className="glass-btn primary" onClick={() => setQuizStep(2)}>
                            Continue →
                          </button>
                        </div>
                      </div>
                    )}

                    {quizStep === 2 && (
                      <div className="quiz-step">
                        <label className="mono-label">CHOOSE ACCENT COLOUR</label>
                        <div className="option-grid">
                          {ACCENTS.map((item) => (
                            <button key={item.id} type="button"
                              className={`option-card ${accent === item.id ? 'selected' : ''}`}
                              onClick={() => setAccent(item.id)}>
                              <span className="swatch" style={{ backgroundColor: item.hex }} aria-hidden="true" />
                              <strong>{item.label}</strong>
                            </button>
                          ))}
                        </div>
                        <div className="quiz-nav">
                          <button type="button" className="glass-btn" onClick={() => setQuizStep(1)}>← Back</button>
                          <button type="button" className="glass-btn primary" onClick={() => setQuizStep(3)}>Continue →</button>
                        </div>
                      </div>
                    )}

                    {quizStep === 3 && (
                      <form onSubmit={handleGenerate} className="quiz-step">
                        <label className="mono-label" htmlFor="gh-quiz">GITHUB USERNAME</label>
                        <div className="input-row">
                          <input id="gh-quiz" type="text" className="glass-input"
                            placeholder="e.g. torvalds" value={username}
                            onChange={(e) => setUsername(e.target.value)} autoFocus required />
                          <button type="submit" className="glass-btn primary">Generate Card</button>
                        </div>
                        <div className="quiz-nav">
                          <button type="button" className="glass-btn" onClick={() => setQuizStep(2)}>← Back</button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  /* ── Instant arm (1-field) ── */
                  <form onSubmit={handleGenerate} className="instant-flow">
                    <label className="mono-label" htmlFor="gh-instant">GITHUB USERNAME</label>
                    <div className="input-row">
                      <input id="gh-instant" type="text" className="glass-input"
                        placeholder="e.g. torvalds" value={username}
                        onChange={(e) => setUsername(e.target.value)} autoFocus required />
                      <button type="submit" className="glass-btn primary">Generate Card</button>
                    </div>
                  </form>
                )}

                {error && (
                  <div className="error-banner">
                    <p style={{ marginBottom: 10 }}>{error}</p>
                    <button
                      type="button"
                      className="glass-btn"
                      onClick={() => {
                        setError('');
                        setProfile(SAMPLE_FALLBACK_PROFILE);
                      }}
                    >
                      Preview Sample Card Instead
                    </button>
                  </div>
                )}
                <p className="privacy-note">No sign-up. Uses public GitHub data.</p>
              </div>
            )}

            {scanning && <ScanSequence username={username} />}
          </div>

          {/* ── Right: hero sample card (live-updates with quiz selections) ── */}
          <div className="hero-right">
            <HoloCard profile={previewProfile} accent={accent} isSample />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const flagsmithOptions = useMemo(() => getFlagsmithOptions(), []);
  const isLabRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/lab');

  // ⚡ Flush on unload — DO NOT CHANGE.
  useEffect(() => { return registerUnloadFlush(); }, []);

  return (
    <FlagsmithProvider flagsmith={flagsmith} options={flagsmithOptions}>
      <HudBackground />
      {isLabRoute ? <Lab /> : <OnboardingWorkspace />}
    </FlagsmithProvider>
  );
}
