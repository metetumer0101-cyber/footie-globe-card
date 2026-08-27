/**
 * Accessibility (A11y) Utilities
 */

/**
 * Common ARIA labels for reusable components
 */
export const ARIA_LABELS = {
  // Navigation
  MAIN_NAV: 'Ana men\u00fc',
  FOOTER_NAV: 'Alt men\u00fc',
  BREADCRUMB: 'Sayfa yolu',
  
  // Actions
  SEARCH: 'Ara',
  CLOSE: 'Kapat',
  MENU: 'Men\u00fc',
  BACK: 'Geri',
  NEXT: 'Sonraki',
  PREVIOUS: '\u00d6nceki',
  REFRESH: 'Yenile',
  RETRY: 'Tekrar dene',
  LOAD_MORE: 'Daha fazla y\u00fckle',
  
  // Content
  LOADING: 'Y\u00fckleniyor...',
  ERROR: 'Hata',
  SUCCESS: 'Ba\u015far\u0131l\u0131',
  EMPTY: 'Veri yok',
  
  // Sports
  LIVE_SCORES: 'Canli skorlar',
  MATCH_DETAILS: 'Ma\u00e7 detaylari',
  TEAM_STATS: 'Takim istatistikleri',
  PLAYER_STATS: 'Oyuncu istatistikleri',
  STANDINGS: 'Puan durumu',
} as const;

/**
 * Generate ARIA live region props
 */
export function getLiveRegionProps(
  type: 'polite' | 'assertive' | 'off' = 'polite'
) {
  return {
    'aria-live': type,
    'aria-atomic': 'true',
  };
}

/**
 * Generate skip link for keyboard navigation
 */
export const SkipLink = `
<a 
  href="#main-content" 
  class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
>
  Ana i\u00e7eri\u011fe atla
</a>
`.trim();

/**
 * Focus trap utility for modals
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown);
  
  // Focus first element
  firstFocusable?.focus();

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check if element is visible and focusable
 */
export function isFocusable(element: Element): boolean {
  const focusableTags = ['a', 'button', 'input', 'textarea', 'select', 'details'];
  const tagName = element.tagName.toLowerCase();
  
  if (!focusableTags.includes(tagName)) {
    return element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
  }
  
  return !element.hasAttribute('disabled') && !element.hasAttribute('hidden');
}
