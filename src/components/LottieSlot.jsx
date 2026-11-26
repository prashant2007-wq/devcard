import { useEffect, useRef, useState } from 'react';

/**
 * Lazy-loaded Lottie wrapper for named animation slots (`card-reveal`, `scan-loader`, `heading-glitch`).
 * Checks `/animations/<slot>.json` and respects `prefers-reduced-motion`.
 * If the file is missing or reduced motion is enabled, renders `fallback` seamlessly.
 */
export default function LottieSlot({ slot, fallback = null, className = '', loop = true }) {
  const containerRef = useRef(null);
  const [useLottie, setUseLottie] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let cancelled = false;
    let animInstance = null;

    async function load() {
      try {
        const res = await fetch(`/animations/${slot}.json`);
        if (!res.ok) return;
        const animationData = await res.json();
        if (cancelled) return;

        const lottie = (await import('lottie-web')).default;
        if (cancelled || !containerRef.current) return;

        setUseLottie(true);
        animInstance = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay: true,
          animationData,
        });
      } catch {
        // Missing or invalid animation file: silently keep CSS/code fallback.
      }
    }

    load();
    return () => {
      cancelled = true;
      animInstance?.destroy();
    };
  }, [slot, loop]);

  if (!useLottie) {
    return (
      <>
        <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />
        {fallback}
      </>
    );
  }

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
