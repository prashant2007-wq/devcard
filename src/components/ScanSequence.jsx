import { useEffect, useRef, useState } from 'react';
import LottieSlot from './LottieSlot.jsx';

const STEPS = [
  'Fetching GitHub profile…',
  'Analyzing repositories…',
  'Computing rarity tier…',
];

export default function ScanSequence({ username }) {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStepIdx((p) => (p < STEPS.length - 1 ? p + 1 : p)), 280);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass-panel scan-panel fade-up" role="status" aria-live="polite">
      <div className="scan-loader-wrap">
        <LottieSlot slot="scan-loader" fallback={<div className="spinner" />} />
      </div>
      <p className="scan-handle">@{username}</p>
      <p className="scan-step">{STEPS[stepIdx]}</p>
    </div>
  );
}
