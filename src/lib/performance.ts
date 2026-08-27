/**
 * Performance Optimization Utilities
 */

/**
 * Lazy load images with Intersection Observer
 */
export function setupLazyLoading(selector = 'img[data-src]') {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    document.querySelectorAll<HTMLImageElement>(selector).forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img = entry.target as HTMLImageElement;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01,
  });

  document.querySelectorAll(selector).forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Debounce function for search inputs, scroll handlers, etc.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll, resize handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Virtual scroll helper for large lists
 */
export function useVirtualList<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number
) {
  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;

  return {
    totalHeight,
    visibleCount,
    getItemStyle: (index: number, scrollTop: number) => ({
      position: 'absolute' as const,
      top: 0,
      transform: `translateY(${index * itemHeight - scrollTop}px)`,
    }),
  };
}

/**
 * Preload critical resources
 */
export function preloadResources(urls: string[]) {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Measure rendering performance
 */
export function measureRenderTime(callback: () => void) {
  const start = performance.now();
  callback();
  const end = performance.now();
  console.log(`Render time: ${(end - start).toFixed(2)}ms`);
  return end - start;
}
