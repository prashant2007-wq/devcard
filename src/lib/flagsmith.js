import flagsmith from '@flagsmith/flagsmith';

const VISITOR_STORAGE_KEY = 'devcard_visitor_id';
let memoryFallbackId = null;

/**
 * Returns a persistent anonymous visitor ID for Flagsmith identity.
 * Uses localStorage inside try/catch (safe in private browsing / restricted storage),
 * with an optional `?visitor=` query param for testing distinct identities.
 */
export function getVisitorId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('visitor');
    if (override && override.trim()) {
      return override.trim();
    }

    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const created =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `anon_${crypto.randomUUID()}`
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
    return created;
  } catch {
    if (!memoryFallbackId) {
      memoryFallbackId = `anon_mem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    return memoryFallbackId;
  }
}

/**
 * Options passed to FlagsmithProvider so the visitor is identified
 * and events are enabled BEFORE any experiment flag is evaluated.
 */
export function getFlagsmithOptions() {
  return {
    environmentID: import.meta.env.VITE_FLAGSMITH_ENV_KEY,
    identity: getVisitorId(),
    enableEvents: true,
  };
}

/**
 * Records the conversion event (`card_created`, case-sensitive)
 * and flushes buffered events immediately so short sessions aren't lost.
 */
export async function trackCardCreated() {
  flagsmith.trackEvent('card_created');
  await flagsmith.flushEvents();
}

/**
 * Registers page-unload listeners to flush any buffered Flagsmith events
 * before the visitor navigates away or closes the tab.
 */
export function registerUnloadFlush() {
  const handleUnload = () => {
    void flagsmith.flushEvents();
  };
  window.addEventListener('pagehide', handleUnload);
  window.addEventListener('beforeunload', handleUnload);

  return () => {
    window.removeEventListener('pagehide', handleUnload);
    window.removeEventListener('beforeunload', handleUnload);
  };
}

export { flagsmith };
