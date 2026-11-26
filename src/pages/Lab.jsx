import { useEffect, useState } from 'react';
import LottieSlot from '../components/LottieSlot.jsx';

function formatPercent(val) {
  if (val == null || Number.isNaN(Number(val))) return '—';
  const num = Number(val);
  // Handle either 0..1 or 0..100 from Flagsmith API
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(1)}%`;
}

function toPercentNumber(val) {
  if (val == null || Number.isNaN(Number(val))) return 0;
  const num = Number(val);
  return Math.max(0, Math.min(100, num <= 1 ? num * 100 : num));
}

/**
 * Normalizes Flagsmith's /experiments/532/results/ response into an array
 * of variant rows for display.
 */
function parseVariants(results) {
  if (!results) return [];
  const raw = results.variants || results.results || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((v) => ({
    key: v.variant_key || v.key || v.name || 'control',
    label:
      (v.variant_key || v.key || v.name) === 'quiz'
        ? '3-Step Setup Quiz (quiz)'
        : '1-Field Instant (control)',
    exposures: v.exposures ?? v.total_exposures ?? v.sample_size ?? 0,
    conversions: v.conversions ?? v.metric_conversions ?? v.events ?? 0,
    conversionRate: v.conversion_rate ?? v.rate ?? null,
    winProbability: v.win_probability ?? v.chance_to_win ?? null,
  }));
}

export default function Lab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lab')
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((err) => setData({ error: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const variants = parseVariants(data?.results);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <a href="/" className="brand-link">
          <span className="status-dot" />
          DEVCARD // MISSION CONTROL
        </a>
        <a href="/" className="hud-btn">
          ← BACK TO APP
        </a>
      </header>

      <section className="hero-header">
        <span className="status-chip">
          <span className="pulse-dot" /> EXPERIMENT LAB // ID #532
        </span>
        <h1 className="hero-title">
          <LottieSlot
            slot="heading-glitch"
            fallback={<span>ONBOARDING EXPERIMENT</span>}
          />
        </h1>
        <p className="hero-sub">
          Hypothesis: A one-field instant onboarding (&ldquo;enter GitHub username, get your
          card&rdquo;) produces more created cards per visitor than a 3-step setup quiz (pick
          vibe, pick accent colour, then username), because less friction before the payoff wins.
        </p>
      </section>

      <section className="hud-panel lab-panel">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <div className="lab-meta">
          <div>
            <span className="hud-label">FLAG // METRIC</span>
            <p className="mono-val">
              onboarding_flow (50/50) → card_created (occurrence, up)
            </p>
          </div>
          <div>
            <span className="hud-label">STATUS</span>
            <p className="mono-val status-tag">
              {(data?.status || (loading ? 'LOADING...' : 'UNKNOWN')).toUpperCase()}
            </p>
          </div>
        </div>

        {loading && <p className="mono-muted">Querying Flagsmith Experimentation API...</p>}

        {!loading && data?.error && <p className="error-banner">{data.error}</p>}

        {!loading && data && !data.configured && (
          <div className="notice-banner">
            <strong>API Key Needed:</strong> {data.message}
          </div>
        )}

        {!loading && variants.length > 0 && (
          <div className="variant-grid">
            {variants.map((v) => {
              const winPct = toPercentNumber(v.winProbability);
              return (
                <article key={v.key} className="variant-card">
                  <div className="variant-head">
                    <h3>{v.label}</h3>
                    <span className="status-chip">{v.key}</span>
                  </div>
                  <div className="variant-metrics">
                    <div>
                      <span className="hud-label">EXPOSURES</span>
                      <p className="metric-num">{v.exposures}</p>
                    </div>
                    <div>
                      <span className="hud-label">CONVERSIONS</span>
                      <p className="metric-num">{v.conversions}</p>
                    </div>
                    <div>
                      <span className="hud-label">CONV. RATE</span>
                      <p className="metric-num">{formatPercent(v.conversionRate)}</p>
                    </div>
                  </div>
                  <div className="win-bar-wrap">
                    <div className="win-bar-label">
                      <span>WIN PROBABILITY</span>
                      <span>{formatPercent(v.winProbability)}</span>
                    </div>
                    <div className="win-bar-track">
                      <div className="win-bar-fill" style={{ width: `${winPct}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && data?.configured && variants.length === 0 && !data?.error && (
          <p className="mono-muted">
            No warehouse results aggregated yet. Once real visitors trigger exposures and{' '}
            <code>card_created</code> events, Flagsmith updates results here (refreshable every 5
            minutes).
          </p>
        )}
      </section>

      <section className="hud-panel lab-notes">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
        <h2 className="section-title">WHAT WE LEARNED &amp; WHAT WE&apos;D SHIP</h2>
        <p className="notes-body">
          This live panel tracks real visitor sessions only (any verification traffic run before
          launch is kept separate and clearly labelled as simulated). By isolating onboarding steps
          behind <code>onboarding_flow</code> while keeping visual design identical across both
          arms, we measure pure friction vs. personalization intent. Once real traffic reaches
          significance in Flagsmith, we will ship the winning flow as the 100% default and keep
          customisation optional post-card-creation.
        </p>
      </section>
    </main>
  );
}
