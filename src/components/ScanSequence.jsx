import { useEffect, useState } from 'react';
import LottieSlot from './LottieSlot.jsx';

const STEPS = [
  'CONTACTING GITHUB TELEMETRY...',
  'PARSING REPOSITORIES & LANGUAGES...',
  'COMPUTING RARITY MATRIX...',
  'SYNTHESIZING HOLOGRAPHIC FOIL...',
];

/**
 * Terminal-style scan sequence shown while GitHub data is fetched
 * and before the DevCard materialises.
 */
export default function ScanSequence({ username }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 260);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hud-panel scan-panel" role="status" aria-live="polite">
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <div className="scan-loader-wrap">
        <LottieSlot
          slot="scan-loader"
          className="scan-lottie"
          fallback={<div className="scan-ring" />}
        />
      </div>

      <p className="scan-target">TARGET // @{username}</p>
      <div className="scan-logs">
        {STEPS.slice(0, stepIdx + 1).map((line, i) => (
          <div key={line} className={`scan-line ${i === stepIdx ? 'active' : 'done'}`}>
            <span className="scan-prefix">{i === stepIdx ? '>' : '✓'}</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
