'use client';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type AnalyticsParameters = Record<string, string | number | boolean | undefined>;

function dispatch(command: unknown[]) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag(...command);
    return;
  }

  window.setTimeout(() => {
    if (typeof window.gtag === 'function') window.gtag(...command);
  }, 500);
}

export function trackPageView(path: string) {
  dispatch(['event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  }]);
}

export function trackAnalyticsEvent(name: string, parameters: AnalyticsParameters = {}) {
  dispatch(['event', name, parameters]);
}
