import { useEffect, useState } from 'react';
import LottieSlot from '../components/LottieSlot.jsx';

function formatPercent(val) {
  if (val == null || Number.isNaN(Number(val))) return '—';
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(1)}%`;
}

function toPercentNumber(val) {
  if (val == null || Number.isNaN(Number(val))) return 0;
  const num = Number(val);
  return Math.max(0, Math.min(100, num <= 1 ? num * 100 : num));
}

function parseVariants(results) {
  if (!results) return [];
  const raw = results.variants || results.results || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((v) => {
    const key = v.variant_key || v.key || v.name || 'control';
    return {
      key,
      label: key === 'quiz' ? '3-Step Quiz' : 'Instant (Control)',
      exposures: Number(v.exposures ?? v.total_exposures ?? v.sample_size ?? 0),
      conversions: Number(v.conversions ?? v.metric_conversions ?? v.events ?? 0),
      conversionRate: v.conversion_rate ?? v.rate ?? null,
      winProbability: v.win_probability ?? v.chance_to_win ?? null,
    };
  });
}

function buildLearningSummary(variants) {
  const totalExposures = variants.reduce((sum, v) => sum + v.exposures, 0);
  if (totalExposures === 0) {
    return null;
  }

  const sorted = [...variants].sort(
    (a, b) => toPercentNumber(b.winProbability) - toPercentNumber(a.winProbability)
  );
  const leader = sorted[0];
  const summaryParts = variants.map(
    (v) =>
      `${v.label}: ${v.conversions}/${v.exposures} (${formatPercent(v.conversionRate)}, win prob. ${formatPercent(v.winProbability)})`
  );

  return `Observed ${totalExposures} total exposures across real visitors — ${summaryParts.join(' vs. ')}. Currently leading: ${leader.label}.`;
}

export default function Lab() {
  const [data, setData] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLab() {
      try {
        const res = await fetch('/api/lab');
        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          throw new Error(
            'Experiment API returned a non-JSON response. Make sure the local API middleware or Vercel serverless function is running.'
          );
        }

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || `Lab API returned status ${res.status}.`);
        }

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.message || 'Unable to load experiment data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLab();
    return () => {
      cancelled = true;
    };
  }, []);

  const variants = parseVariants(data?.results);
  const learningSummary = buildLearningSummary(variants);
  const isMissingKey = data?.errorCode === 'MISSING_FLAGSMITH_API_KEY';

  return (
    <main className="app-shell">
      <header className="top-bar">
        <a href="/" className="brand-link">
          DevCard
        </a>
        <a href="/" className="glass-btn">
          ← Back to App
        </a>
      </header>

      <section className="hero-header fade-up">
        <span className="pill-badge">
          <span className="live-dot" /> Experiment #532
        </span>
        <h1 className="hero-title">
          <LottieSlot
            slot="heading-glitch"
            fallback={<span>Onboarding Experiment</span>}
          />
        </h1>
        <p className="hero-sub">
          Hypothesis: a one-field instant onboarding (&ldquo;enter GitHub username, get your
          card&rdquo;) produces more created cards per visitor than a 3-step setup quiz, because
          less friction before the payoff wins.
        </p>
      </section>

      <section className="glass-panel lab-panel fade-up">
        <div className="lab-meta">
          <div>
            <span className="mono-label">FLAG &amp; METRIC</span>
            <p className="meta-value">onboarding_flow (50/50) → card_created</p>
          </div>
          <div>
            <span className="mono-label">STATUS</span>
            <p className="meta-value accent-text">
              {loading ? 'Loading…' : (data?.status || 'Unavailable').toUpperCase()}
            </p>
          </div>
        </div>

        {loading && <p className="muted-text">Loading experiment metrics…</p>}

        {!loading && fetchError && <p className="error-banner">{fetchError}</p>}

        {!loading && !fetchError && isMissingKey && (
          <div className="notice-banner">
            API key not configured. Add <code>FLAGSMITH_API_KEY</code> to <code>.env</code> or
            Vercel Environment Variables to view live results.
          </div>
        )}

        {!loading && !fetchError && !isMissingKey && variants.length > 0 && (
          <div className="variant-grid">
            {variants.map((v) => {
              const winPct = toPercentNumber(v.winProbability);
              return (
                <article key={v.key} className="variant-card">
                  <div className="variant-head">
                    <h3>{v.label}</h3>
                    <span className="mono-label">{v.key}</span>
                  </div>
                  <div className="variant-metrics">
                    <div>
                      <span className="mono-label">EXPOSURES</span>
                      <p className="metric-num">{v.exposures}</p>
                    </div>
                    <div>
                      <span className="mono-label">CONVERSIONS</span>
                      <p className="metric-num">{v.conversions}</p>
                    </div>
                    <div>
                      <span className="mono-label">RATE</span>
                      <p className="metric-num">{formatPercent(v.conversionRate)}</p>
                    </div>
                  </div>
                  <div className="win-bar-wrap">
                    <div className="win-bar-label">
                      <span className="mono-label">WIN PROBABILITY</span>
                      <span className="mono-label">{formatPercent(v.winProbability)}</span>
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

        {!loading && !fetchError && !isMissingKey && variants.length === 0 && (
          <p className="muted-text">
            Pending: experiment collecting data. Results will appear here once real visitor
            exposures and <code>card_created</code> events are aggregated.
          </p>
        )}
      </section>

      <section className="glass-panel lab-notes fade-up">
        <h2 className="section-title">What we learned &amp; what we&apos;d ship</h2>
        <p className="muted-text">
          {learningSummary || 'Pending: experiment collecting data'}
        </p>
      </section>
    </main>
  );
}
