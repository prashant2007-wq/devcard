import { useEffect, useState } from 'react';
import LottieSlot from './LottieSlot.jsx';

const STEPS = [
  'Fetching GitHub profile…',
  'Analyzing repositories & languages…',
  'Computing rarity tier…',
];

/**
 * Calm frosted-glass loading state shown while GitHub data is fetched.
 */
export default function ScanSequence({ username }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 280);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-panel scan-panel fade-up" role="status" aria-live="polite">
      <div className="scan-loader-wrap">
        <LottieSlot
          slot="scan-loader"
          className="scan-lottie"
          fallback={<div className="spinner" />}
        />
      </div>
      <p className="scan-handle">@{username}</p>
      <p className="scan-step">{STEPS[stepIdx]}</p>
    </div>
  );
}
