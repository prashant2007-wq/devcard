import { useEffect, useMemo, useState } from 'react';
import { FlagsmithProvider, useExperiment } from '@flagsmith/flagsmith/react';
import {
  flagsmith,
  getFlagsmithOptions,
  registerUnloadFlush,
  trackCardCreated,
} from './lib/flagsmith.js';
import { fetchGitHubProfile } from './lib/github.js';
import HudBackground from './components/HudBackground.jsx';
import LottieSlot from './components/LottieSlot.jsx';
import ScanSequence from './components/ScanSequence.jsx';
import DevCard from './components/DevCard.jsx';
import Lab from './pages/Lab.jsx';

const VIBES = [
  { id: 'cyberpunk', label: 'CYBERPUNK', desc: 'High-contrast neon grid' },
  { id: 'solaris', label: 'SOLARIS', desc: 'Deep orbital telemetry' },
  { id: 'obsidian', label: 'OBSIDIAN', desc: 'Stealth monochrome' },
];

const ACCENTS = [
  { id: 'cyan', label: 'NEON CYAN', hex: '#00f0ff' },
  { id: 'violet', label: 'PLASMA VIOLET', hex: '#b55cff' },
  { id: 'emerald', label: 'MATRIX EMERALD', hex: '#00ffaa' },
];

function OnboardingWorkspace() {
  // Evaluates `onboarding_flow` and records $flag_exposure for the identified visitor.
  const onboardingFlag = useExperiment('onboarding_flow');
  const isQuizFlow = onboardingFlag?.value === 'quiz';

  const [quizStep, setQuizStep] = useState(1);
  const [vibe, setVibe] = useState('cyberpunk');
  const [accent, setAccent] = useState('cyan');
  const [username, setUsername] = useState('');

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  // If opened via a shared link (?u=username), load the card directly without firing onboarding conversion.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUser = params.get('u');
    if (!sharedUser) return;

    const sharedVibe = params.get('vibe') || 'cyberpunk';
    const sharedAccent = params.get('accent') || 'cyan';
    setVibe(sharedVibe);
    setAccent(sharedAccent);
    setUsername(sharedUser);
    setScanning(true);

    fetchGitHubProfile(sharedUser)
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setScanning(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setProfile(null);
    setScanning(true);

    try {
      const [data] = await Promise.all([
        fetchGitHubProfile(username),
        new Promise((r) => setTimeout(r, 950)),
      ]);
      setProfile(data);
      // Track conversion ONLY after the card is actually created.
      await trackCardCreated();
    } catch (err) {
      setError(err.message || 'Failed to generate DevCard.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="top-bar">
        <a href="/" className="brand-link">
          <span className="status-dot" />
          DEVCARD // 2040
        </a>
        <a href="/lab" className="hud-btn">
          EXPERIMENT LAB →
        </a>
      </header>

      <section className="hero-header">
        <span className="status-chip">
          <span className="pulse-dot" /> SCAN READY // GITHUB TELEMETRY
        </span>
        <h1 className="hero-title">
          <LottieSlot
            slot="heading-glitch"
            fallback={<span>HOLOGRAPHIC DEVCARD</span>}
          />
        </h1>
        <p className="hero-sub">
          Mint a 2040 holographic developer card from your GitHub profile. Embed it live in your
          README or export as PNG.
        </p>
      </section>

      {!profile && !scanning && (
        <section className="hud-panel onboarding-panel">
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />

          {isQuizFlow ? (
            <div className="quiz-flow">
              <div className="quiz-progress">
                <span>STEP 0{quizStep} / 03</span>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${(quizStep / 3) * 100}%` }}
                  />
                </div>
              </div>

              {quizStep === 1 && (
                <div className="quiz-step">
                  <label className="hud-label">01 // SELECT CARD VIBE</label>
                  <div className="option-grid">
                    {VIBES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`option-card ${vibe === item.id ? 'selected' : ''}`}
                        onClick={() => setVibe(item.id)}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.desc}</span>
                      </button>
                    ))}
                  </div>
                  <div className="quiz-nav">
                    <button
                      type="button"
                      className="hud-btn primary"
                      onClick={() => setQuizStep(2)}
                    >
                      NEXT: ACCENT →
                    </button>
                  </div>
                </div>
              )}

              {quizStep === 2 && (
                <div className="quiz-step">
                  <label className="hud-label">02 // SELECT ACCENT FREQUENCY</label>
                  <div className="option-grid">
                    {ACCENTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`option-card ${accent === item.id ? 'selected' : ''}`}
                        onClick={() => setAccent(item.id)}
                      >
                        <span
                          className="swatch"
                          style={{ backgroundColor: item.hex }}
                          aria-hidden="true"
                        />
                        <strong>{item.label}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="quiz-nav">
                    <button
                      type="button"
                      className="hud-btn"
                      onClick={() => setQuizStep(1)}
                    >
                      ← BACK
                    </button>
                    <button
                      type="button"
                      className="hud-btn primary"
                      onClick={() => setQuizStep(3)}
                    >
                      NEXT: USERNAME →
                    </button>
                  </div>
                </div>
              )}

              {quizStep === 3 && (
                <form onSubmit={handleGenerate} className="quiz-step">
                  <label className="hud-label" htmlFor="gh-user-quiz">
                    03 // ENTER GITHUB HANDLE
                  </label>
                  <div className="input-row">
                    <input
                      id="gh-user-quiz"
                      type="text"
                      className="hud-input"
                      placeholder="e.g. torvalds"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      required
                    />
                    <button type="submit" className="hud-btn primary">
                      GENERATE CARD
                    </button>
                  </div>
                  <div className="quiz-nav">
                    <button
                      type="button"
                      className="hud-btn"
                      onClick={() => setQuizStep(2)}
                    >
                      ← BACK
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="instant-flow">
              <label className="hud-label" htmlFor="gh-user-instant">
                GITHUB USERNAME <span className="caret" aria-hidden="true">_</span>
              </label>
              <div className="input-row">
                <input
                  id="gh-user-instant"
                  type="text"
                  className="hud-input"
                  placeholder="e.g. torvalds"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="hud-btn primary">
                  GENERATE CARD
                </button>
              </div>
            </form>
          )}

          {error && <p className="error-banner">{error}</p>}
        </section>
      )}

      {scanning && <ScanSequence username={username} />}

      {profile && !scanning && (
        <>
          <DevCard profile={profile} vibe={vibe} accent={accent} />
          <div className="reset-wrap">
            <button
              type="button"
              className="hud-btn"
              onClick={() => {
                setProfile(null);
                setError('');
                setQuizStep(1);
              }}
            >
              SCAN ANOTHER DEVELOPER
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function App() {
  const flagsmithOptions = useMemo(() => getFlagsmithOptions(), []);
  const isLabRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/lab');

  useEffect(() => {
    return registerUnloadFlush();
  }, []);

  return (
    <FlagsmithProvider flagsmith={flagsmith} options={flagsmithOptions}>
      <HudBackground />
      {isLabRoute ? <Lab /> : <OnboardingWorkspace />}
    </FlagsmithProvider>
  );
}
